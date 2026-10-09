import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { recordAudit } from '../../shared/auditLog.ts';
import { getClientIp } from '../../shared/userGuard.ts';

const OP = 'set_user_block';

// Bloqueia ou desbloqueia um usuário (marca is_blocked no registro de User).
// Idempotente: mesmo request_id não reprocessa. Mesmo usuário já no estado
// desejado retorna sucesso sem efeito colateral.
//
// Registra trilha de auditoria com valor anterior/posterior.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (admin.role !== 'admin') return Response.json({ error: 'Acesso negado — apenas administradores' }, { status: 403 });

    const body = await req.json();
    const { user_email, block, reason, request_id } = body;

    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    if (!user_email) {
      const errBody = { error: 'user_email é obrigatório' };
      await recordIdempotency(base44, request_id, OP, admin.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (typeof block !== 'boolean') {
      const errBody = { error: 'block deve ser true ou false' };
      await recordIdempotency(base44, request_id, OP, admin.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (block && !reason) {
      const errBody = { error: 'Motivo do bloqueio é obrigatório' };
      await recordIdempotency(base44, request_id, OP, admin.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Não permite bloquear a si mesmo ou outro admin
    if (user_email === admin.email) {
      const errBody = { error: 'Você não pode bloquear a si mesmo' };
      await recordIdempotency(base44, request_id, OP, admin.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Busca o usuário alvo
    const targetUsers = await base44.asServiceRole.entities.User.filter({ email: user_email });
    const target = targetUsers[0];
    if (!target) {
      const errBody = { error: 'Usuário não encontrado' };
      await recordIdempotency(base44, request_id, OP, admin.email, errBody, 404);
      return Response.json(errBody, { status: 404 });
    }
    if (target.role === 'admin') {
      const errBody = { error: 'Não é possível bloquear um administrador' };
      await recordIdempotency(base44, request_id, OP, admin.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    const valueBefore = { is_blocked: !!target.is_blocked, blocked_reason: target.blocked_reason || '' };

    // Atualiza o usuário
    const updateData = block
      ? { is_blocked: true, blocked_reason: reason, blocked_at: new Date().toISOString(), blocked_by: admin.email }
      : { is_blocked: false, blocked_reason: '', blocked_at: '', blocked_by: '' };

    await base44.asServiceRole.entities.User.update(target.id, updateData);

    const valueAfter = { is_blocked: block, blocked_reason: block ? reason : '' };

    await recordAudit(base44, admin, block ? 'user_block' : 'user_unblock', {
      target_type: 'User',
      target_id: target.id,
      target_email: user_email,
      value_before: valueBefore,
      value_after: valueAfter,
      reason: block ? reason : '',
      request_id,
      ip: getClientIp(req)
    });

    const resultBody = {
      success: true,
      message: block ? 'Usuário bloqueado com sucesso' : 'Usuário desbloqueado com sucesso',
      user_email,
      is_blocked: block
    };
    await recordIdempotency(base44, request_id, OP, admin.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}