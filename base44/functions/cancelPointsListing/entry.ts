import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicCreditBalance } from '../../shared/atomicFinance.ts';

const OP = 'cancel_listing';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

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

    const listing = await base44.asServiceRole.entities.PointsListing.get(listing_id);
    if (!listing) {
      const errBody = { success: false, error: 'Anúncio não encontrado' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 404);
      return Response.json(errBody, { status: 404 });
    }
    if (listing.seller_email !== user.email) {
      const errBody = { success: false, error: 'Você não pode cancelar um anúncio que não é seu' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 403);
      return Response.json(errBody, { status: 403 });
    }

    // === TRAVA ATÔMICA contra duplo reembolso: transição active→cancelled só uma vez.
    // Se updated===0, o anúncio já foi cancelado/vendido — não reembolsa de novo.
    const claim = await base44.asServiceRole.entities.PointsListing.updateMany(
      { id: listing_id, status: 'active' },
      { $set: { status: 'cancelled' } }
    );
    if (!claim || claim.updated !== 1) {
      const errBody = { success: false, error: 'Anúncio não está mais ativo' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Reembolso apenas se os pontos foram reservados na criação (ofertas novas).
    // Listings legados (reserved=false) não foram debitados — nada a reembolsar.
    let newBalance = null;
    if (listing.reserved) {
      const sellerArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
      if (sellerArr[0]) {
        const refunded = await atomicCreditBalance(base44, 'UserPoints', sellerArr[0].id, listing.points_amount);
        newBalance = Number(refunded?.balance) || 0;
      }
      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'manual_adjust',
        points: listing.points_amount,
        description: 'Pontos devolvidos — anúncio cancelado no marketplace',
        transaction_value: 0
      });
    }

    const resultBody = {
      success: true,
      message: 'Anúncio cancelado' + (listing.reserved ? ' e pontos devolvidos' : ''),
      data: { new_balance: newBalance }
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});