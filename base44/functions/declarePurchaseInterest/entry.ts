import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { checkRateLimit, RATE_LIMITS } from '../../shared/rateLimit.ts';
import { isActorBlocked, isEmailBlocked, BLOCKED_MESSAGE } from '../../shared/userGuard.ts';

const OP = 'declare_interest';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (isActorBlocked(user)) return Response.json({ success: false, error: BLOCKED_MESSAGE }, { status: 403 });

    const { listing_id, request_id } = await req.json();

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    if (!listing_id) {
      const errBody = { success: false, error: 'listing_id é obrigatório' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === RATE LIMIT ===
    const rl = await checkRateLimit(base44, 'declare_interest', user.email, RATE_LIMITS.declare_interest.max, RATE_LIMITS.declare_interest.windowSeconds);
    if (!rl.allowed) {
      const errBody = { success: false, error: `Muitas manifestações de interesse. Tente novamente em ${rl.retry_after_seconds || 600}s.`, rate_limited: true };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 429);
      return Response.json(errBody, { status: 429 });
    }

    // Lê o listing
    const listingArr = await base44.asServiceRole.entities.PointsListing.filter({ id: listing_id });
    const listing = listingArr[0];
    if (!listing) {
      const errBody = { success: false, error: 'Anúncio não encontrado' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 404);
      return Response.json(errBody, { status: 404 });
    }

    // Não pode comprar o próprio anúncio
    if (listing.seller_email === user.email) {
      const errBody = { success: false, error: 'Você não pode comprar seu próprio anúncio' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Anúncio precisa estar ativo
    if (listing.status !== 'active') {
      const errBody = { success: false, error: 'Anúncio não está mais disponível' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Já tem um comprador diferente deste usuário?
    if (listing.buyer_id && listing.buyer_id !== user.id) {
      const errBody = { success: false, error: 'Este anúncio já tem um comprador identificado' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 409);
      return Response.json(errBody, { status: 409 });
    }

    // Já é o comprador — idempotente
    if (listing.buyer_id === user.id) {
      const resultBody = { success: true, message: 'Você já manifestou interesse neste anúncio', data: { listing_id, already_declared: true } };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
    }

    // === TRAVA ATÔMICA: só atualiza se ainda está active e sem buyer_id ===
    const claim = await base44.asServiceRole.entities.PointsListing.updateMany(
      { id: listing_id, status: 'active', buyer_id: { $exists: false } },
      {
        $set: {
          buyer_id: user.id,
          buyer_email: user.email,
          buyer_name: user.full_name,
          buyer_declared_at: new Date().toISOString()
        }
      }
    );

    if (!claim || claim.updated !== 1) {
      // Concorrência: outro comprador registrou no mesmo instante, ou já tinha buyer
      const errBody = { success: false, error: 'Este anúncio já tem um comprador identificado' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 409);
      return Response.json(errBody, { status: 409 });
    }

    const resultBody = {
      success: true,
      message: 'Interesse registrado! O vendedor verá você como comprador e poderá confirmar a venda.',
      data: { listing_id, buyer_id: user.id }
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});