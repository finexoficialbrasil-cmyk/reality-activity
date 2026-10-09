import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { processSingleShare } from '../../shared/advertisementShare.ts';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';

const OP = 'share';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { advertisement_id, platform, request_id } = await req.json();

    // === IDEMPOTÊNCIA === reenvio da mesma requisição não processa de novo
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    if (!advertisement_id || !platform) {
      const errBody = { error: 'Parâmetros obrigatórios faltando' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Fetch the ad
    const advertisement = await base44.asServiceRole.entities.Advertisement.get(advertisement_id);

    const result = await processSingleShare(base44, user, advertisement, platform);

    if (!result.ok) {
      const errBody = { error: result.error };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    const body = {
      success: true,
      pointsCost: result.pointsCost,
      alreadyEarned: result.alreadyEarned === true,
      message: result.alreadyEarned
        ? result.cooldownMessage
        : `-${result.pointsCost} pontos debitados do criador`
    };
    await recordIdempotency(base44, request_id, OP, user.email, body, 200);
    return Response.json(body);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}