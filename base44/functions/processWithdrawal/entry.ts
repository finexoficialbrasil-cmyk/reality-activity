import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicDebitBalance } from '../../shared/atomicFinance.ts';
import { checkRateLimit, RATE_LIMITS } from '../../shared/rateLimit.ts';
import { isActorBlocked, BLOCKED_MESSAGE } from '../../shared/userGuard.ts';
import { createLedgerEntry } from '../../shared/ledger.ts';
import { adjustBurnedBalance } from '../../shared/burnedBalance.ts';

const OP = 'withdrawal';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (isActorBlocked(user)) return Response.json({ error: BLOCKED_MESSAGE }, { status: 403 });

    const { points_amount, method, payment_data, pix_key_type, request_id } = await req.json();

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    // === RATE LIMIT ===
    const rl = await checkRateLimit(base44, 'withdrawal', user.email, RATE_LIMITS.withdrawal.max, RATE_LIMITS.withdrawal.windowSeconds);
    if (!rl.allowed) {
      const errBody = { error: `Muitas solicitações de saque. Tente novamente em ${rl.retry_after_seconds || 600}s.`, rate_limited: true };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 429);
      return Response.json(errBody, { status: 429 });
    }

    if (!method || !payment_data) {
      const errBody = { error: 'Método e dados de pagamento são obrigatórios' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (method === 'pix' && !pix_key_type) {
      const errBody = { error: 'Tipo de chave PIX é obrigatório' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    const amount = Number(points_amount);
    if (isNaN(amount) || amount < 100) {
      const errBody = { error: 'Valor mínimo para saque: 100 pontos' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Busca configurações de saque (fonte confiável do servidor)
    const settingsList = await base44.asServiceRole.entities.WithdrawalSettings.list('', 1);
    const settings = settingsList[0];
    if (!settings) {
      const errBody = { error: 'Configurações de saque indisponíveis' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 500);
      return Response.json(errBody, { status: 500 });
    }

    // Valida se o método está habilitado
    if (method === 'pix' && !settings.pix_enabled) {
      const errBody = { error: 'Saque via PIX indisponível' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (method === 'bitcoin_cash' && !settings.bch_enabled) {
      const errBody = { error: 'Saque via Bitcoin Cash indisponível' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Busca saldo do usuário no servidor (fonte confiável)
    const userPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const userPoints = userPointsList[0];
    if (!userPoints) {
      const errBody = { error: 'Saldo insuficiente' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Calcula valor final usando taxa do servidor
    const buybackRate = method === 'bitcoin_cash'
      ? (Number(settings.bch_buyback_rate) || 0)
      : (Number(settings.pix_buyback_rate) || 0);
    const finalValue = amount * buybackRate;

    // === DÉBITO ATÔMICO === só debita se balance >= amount (impede saldo negativo e duplo saque)
    const debit = await atomicDebitBalance(base44, 'UserPoints', userPoints.id, amount);
    if (!debit.ok) {
      const errBody = { error: debit.error };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Cria solicitação de saque (servidor)
    await base44.asServiceRole.entities.WithdrawalRequest.create({
      user_email: user.email,
      user_name: user.full_name,
      points_amount: amount,
      method,
      payment_data,
      pix_key_type: method === 'pix' ? pix_key_type : undefined,
      buyback_rate: buybackRate,
      final_value: finalValue,
      status: 'pending',
      burned_counted: true
    });

    // Atualiza contador consolidado de pontos queimados (incremental; idempotente via ProcessedRequest)
    await adjustBurnedBalance(base44, amount);

    // Registra transação no extrato (servidor) — ledger enriquecido
    await createLedgerEntry(base44, {
      user_email: user.email,
      user_name: user.full_name,
      type: 'withdrawal_debit',
      points: -amount,
      balance_before: Number(userPoints.balance) || 0,
      balance_after: Number(debit.record.balance) || 0,
      description: `Solicitação de saque via ${method === 'bitcoin_cash' ? 'Bitcoin Cash' : 'PIX'}`,
      origin: 'withdrawal',
      destination: method,
      request_id: request_id || ''
    });

    const body = {
      success: true,
      message: 'Solicitação de saque enviada! Aguarde aprovação.',
      new_balance: Number(debit.record.balance) || 0
    };
    await recordIdempotency(base44, request_id, OP, user.email, body, 200);
    return Response.json(body);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}