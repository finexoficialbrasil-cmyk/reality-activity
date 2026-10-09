import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { recordAudit } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/userGuard.ts';
import { createLedgerEntry } from '../../shared/ledger.ts';
import { adjustWithdrawalBurned } from '../../shared/burnedBalance.ts';

const OP = 'withdrawal_decision';

// Decisão administrativa de saque: aprovação (pending→processing) ou recusa
// (qualquer status→rejected com devolução de pontos).
//
// IDEMPOTENTE: um mesmo request_id nunca reprocessa. Um mesmo saque recusado
// nunca devolve os pontos duas vezes — a devolução só ocorre se o saque NÃO
// estiver já rejeitado. Reenviar a mesma requisição retorna a resposta armazenada.
//
// Tudo acontece no backend: validação, mudança de status, devolução atômica de
// pontos, registro de transação no ledger e trilha de auditoria.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Acesso negado — apenas administradores' }, { status: 403 });

    const body = await req.json();
    const { withdrawal_id, action, reason, request_id } = body;

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    if (!withdrawal_id || !action) {
      const errBody = { error: 'withdrawal_id e action são obrigatórios' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      const errBody = { error: 'action deve ser "approve" ou "reject"' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (action === 'reject' && !reason) {
      const errBody = { error: 'Motivo da recusa é obrigatório' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Carrega o saque (tolera ID inválido sem crashar)
    let withdrawal = null;
    try {
      const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ id: withdrawal_id });
      withdrawal = withdrawals[0];
    } catch (e) { /* id malformado — trata como não encontrado */ }
    if (!withdrawal) {
      const errBody = { error: 'Saque não encontrado' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 404);
      return Response.json(errBody, { status: 404 });
    }

    const adminIp = getClientIp(req);

    // ====================== APROVAÇÃO ======================
    if (action === 'approve') {
      // Só aprova se estiver pending
      if (withdrawal.status !== 'pending') {
        const errBody = { error: `Saque não pode ser aprovado (status atual: ${withdrawal.status})`, current_status: withdrawal.status };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }

      const valueBefore = { status: withdrawal.status };
      await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal_id, {
        status: 'processing',
        processed_date: new Date().toISOString()
      });
      const valueAfter = { status: 'processing' };

      await recordAudit(base44, user, 'withdrawal_approve', {
        target_type: 'WithdrawalRequest',
        target_id: withdrawal_id,
        target_email: withdrawal.user_email,
        value_before: valueBefore,
        value_after: valueAfter,
        request_id,
        ip: adminIp,
        metadata: { points: withdrawal.points_amount, final_value: withdrawal.final_value, method: withdrawal.method }
      });

      const resultBody = { success: true, action: 'approve', message: 'Saque aprovado - em processamento', withdrawal_id, new_status: 'processing' };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
    }

    // ====================== RECUSA ======================
    // Pode recusar de qualquer status não-rejeitado. Se já está rejeitado,
    // é idempotente: retorna sucesso sem devolver pontos de novo.
    if (withdrawal.status === 'rejected') {
      const resultBody = { success: true, action: 'reject', message: 'Saque já estava recusado', withdrawal_id, new_status: 'rejected', already_rejected: true };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
    }

    const valueBefore = { status: withdrawal.status, balance_before_refund: null };

    // Devolução atômica dos pontos ao usuário
    const ptsArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: withdrawal.user_email });
    const userPoints = ptsArr[0];
    let refundBalanceBefore = null;
    let refundBalanceAfter = null;

    if (userPoints) {
      refundBalanceBefore = Number(userPoints.balance) || 0;
      // Crédito atômico (devolução)
      await base44.asServiceRole.entities.UserPoints.updateMany(
        { id: userPoints.id },
        {
          $inc: { balance: withdrawal.points_amount, total_earned: withdrawal.points_amount },
          $set: {
            total_spent: Math.max(0, (Number(userPoints.total_spent) || 0) - withdrawal.points_amount),
            last_activity: new Date().toISOString()
          }
        }
      );
      const updated = await base44.asServiceRole.entities.UserPoints.get(userPoints.id);
      refundBalanceAfter = Number(updated.balance) || 0;
    }

    // Atualiza status do saque
    await base44.asServiceRole.entities.WithdrawalRequest.update(withdrawal_id, {
      status: 'rejected',
      rejection_reason: reason,
      processed_date: new Date().toISOString()
    });

    // Decrementa contador consolidado de pontos queimados (idempotente via flag burned_counted)
    await adjustWithdrawalBurned(base44, withdrawal, withdrawal.points_amount, false);

    // Ledger: devolução com saldo anterior/posterior
    if (userPoints) {
      await createLedgerEntry(base44, {
        user_email: withdrawal.user_email,
        user_name: withdrawal.user_name || '',
        type: 'withdrawal_refund',
        points: withdrawal.points_amount,
        balance_before: refundBalanceBefore,
        balance_after: refundBalanceAfter,
        description: `Saque recusado - pontos retornados (${reason})`,
        origin: 'withdrawal_decision',
        original_reference: withdrawal_id,
        request_id: request_id || ''
      });
    }

    const valueAfter = { status: 'rejected', rejection_reason: reason, balance_after_refund: refundBalanceAfter };

    await recordAudit(base44, user, 'withdrawal_reject', {
      target_type: 'WithdrawalRequest',
      target_id: withdrawal_id,
      target_email: withdrawal.user_email,
      value_before: valueBefore,
      value_after: valueAfter,
      reason,
      request_id,
      ip: adminIp,
      metadata: { points: withdrawal.points_amount, refund_balance_before: refundBalanceBefore, refund_balance_after: refundBalanceAfter }
    });

    const resultBody = {
      success: true,
      action: 'reject',
      message: 'Saque recusado e pontos devolvidos',
      withdrawal_id,
      new_status: 'rejected',
      refund_balance_before: refundBalanceBefore,
      refund_balance_after: refundBalanceAfter
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}