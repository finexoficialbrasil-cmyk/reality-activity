import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicCreditBalance } from '../../shared/atomicFinance.ts';
import { checkRateLimit, RATE_LIMITS } from '../../shared/rateLimit.ts';
import { isActorBlocked, isEmailBlocked, BLOCKED_MESSAGE } from '../../shared/userGuard.ts';
import { createLedgerEntry } from '../../shared/ledger.ts';

const OP = 'confirm_sale';

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
    const rl = await checkRateLimit(base44, 'confirm_sale', user.email, RATE_LIMITS.confirm_sale.max, RATE_LIMITS.confirm_sale.windowSeconds);
    if (!rl.allowed) {
      const errBody = { success: false, error: `Muitas confirmações de venda. Tente novamente em ${rl.retry_after_seconds || 600}s.`, rate_limited: true };
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

    // Apenas o vendedor pode confirmar
    if (listing.seller_email !== user.email) {
      const errBody = { success: false, error: 'Apenas o vendedor pode confirmar a venda' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 403);
      return Response.json(errBody, { status: 403 });
    }

    // Precisa ter um comprador identificado
    if (!listing.buyer_id || !listing.buyer_email) {
      const errBody = { success: false, error: 'Nenhum comprador identificou interesse neste anúncio ainda' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Verifica se o comprador está bloqueado
    const buyerBlocked = await isEmailBlocked(base44, listing.buyer_email);
    if (buyerBlocked) {
      const errBody = { success: false, error: 'O comprador está bloqueado e não pode receber pontos' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 403);
      return Response.json(errBody, { status: 403 });
    }

    const pts = Math.max(0, Number(listing.points_amount) || 0);
    if (pts <= 0) {
      const errBody = { success: false, error: 'Quantidade de pontos inválida no anúncio' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === RECUPERAÇÃO: listing já sold mas sem crédito (crash entre claim e credit) ===
    if (listing.status === 'sold') {
      // Verifica se o comprador já foi creditado
      const buyerTxs = await base44.asServiceRole.entities.PointsTransaction.filter(
        { listing_id, type: 'marketplace_bought' }, '-created_date', 1
      );
      if (buyerTxs && buyerTxs.length > 0) {
        // Já foi creditado — sucesso idempotente
        const resultBody = {
          success: true,
          message: 'Esta venda já foi confirmada anteriormente',
          data: { listing_id, already_sold: true, points: pts }
        };
        await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
        return Response.json(resultBody);
      }
      // Listing sold mas comprador não foi creditado — completa agora
      return await completeSale(base44, listing, user, request_id, pts, true);
    }

    if (listing.status !== 'active') {
      const errBody = { success: false, error: 'Anúncio não está mais ativo' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === TRAVA ATÔMICA: transição active → sold só uma vez ===
    const now = new Date().toISOString();
    const claim = await base44.asServiceRole.entities.PointsListing.updateMany(
      { id: listing_id, status: 'active' },
      {
        $set: {
          status: 'sold',
          sold_at: now,
          sale_confirmed_at: now,
          sale_request_id: request_id || ''
        }
      }
    );

    if (!claim || claim.updated !== 1) {
      // Concorrência: outro processo confirmou no mesmo instante
      // Re-lê e trata como já sold
      const reRead = await base44.asServiceRole.entities.PointsListing.filter({ id: listing_id });
      if (reRead[0] && reRead[0].status === 'sold') {
        return await completeSale(base44, reRead[0], user, request_id, pts, true);
      }
      const errBody = { success: false, error: 'Anúncio não está mais ativo' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Listing agora é sold — completa a transferência dos pontos reservados
    return await completeSale(base44, listing, user, request_id, pts, false);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

// Transfere os pontos reservados no listing para o comprador e cria os registros de ledger.
// `isRecovery` indica se o listing já estava sold (crash recovery) — evita re-criar ledger.
async function completeSale(base44, listing, seller, request_id, pts, isRecovery) {
  const now = new Date().toISOString();
  const totalPrice = Number(listing.total_price) || 0;
  const pricePerPoint = Number(listing.price_per_point) || 0;

  // 1. Credita o comprador (pontos já estavam reservados no listing — não há débito do vendedor)
  const buyerArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: listing.buyer_email });
  let buyerBalanceBefore = 0;
  let buyerBalanceAfter = 0;

  if (buyerArr[0]) {
    buyerBalanceBefore = Number(buyerArr[0].balance) || 0;
    const credited = await atomicCreditBalance(base44, 'UserPoints', buyerArr[0].id, pts);
    buyerBalanceAfter = Number(credited?.balance) || 0;
  } else {
    // Cria registro de UserPoints para o comprador se não existir
    const created = await base44.asServiceRole.entities.UserPoints.create({
      user_email: listing.buyer_email,
      user_name: listing.buyer_name || 'Usuário',
      balance: pts,
      total_earned: pts,
      last_activity: now
    });
    buyerBalanceAfter = pts;
  }

  // 2. Ledger do vendedor (marketplace_sold) — pontos saem da reserva, sem mudança de saldo
  //    balance_before = balance_after = saldo atual do vendedor (não muda, já foi debitado na criação)
  const sellerPtsArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: seller.email });
  const sellerBalance = sellerPtsArr[0] ? Number(sellerPtsArr[0].balance) || 0 : 0;

  await createLedgerEntry(base44, {
    user_email: seller.email,
    user_name: seller.full_name,
    type: 'marketplace_sold',
    points: -pts,
    balance_before: sellerBalance,
    balance_after: sellerBalance,
    description: `Venda de ${pts} pts no marketplace para ${listing.buyer_name}`,
    transaction_value: totalPrice,
    origin: 'marketplace_sale',
    destination: listing.buyer_email,
    original_reference: listing.id,
    listing_id: listing.id,
    transfer_email: listing.buyer_email,
    transfer_name: listing.buyer_name,
    request_id: request_id || ''
  });

  // 3. Ledger do comprador (marketplace_bought) — pontos creditados
  await createLedgerEntry(base44, {
    user_email: listing.buyer_email,
    user_name: listing.buyer_name,
    type: 'marketplace_bought',
    points: pts,
    balance_before: buyerBalanceBefore,
    balance_after: buyerBalanceAfter,
    description: `Compra de ${pts} pts no marketplace de ${seller.full_name}`,
    transaction_value: totalPrice,
    origin: 'marketplace_sale',
    destination: seller.email,
    original_reference: listing.id,
    listing_id: listing.id,
    transfer_email: seller.email,
    transfer_name: seller.full_name,
    request_id: request_id || ''
  });

  const resultBody = {
    success: true,
    message: 'Venda confirmada! Os pontos reservados foram transferidos ao comprador.',
    data: {
      listing_id: listing.id,
      points_transferred: pts,
      total_value: totalPrice,
      price_per_point: pricePerPoint,
      buyer_email: listing.buyer_email,
      buyer_name: listing.buyer_name,
      buyer_new_balance: buyerBalanceAfter,
      recovery: isRecovery
    }
  };
  await recordIdempotency(base44, request_id, OP, seller.email, resultBody, 200);
  return Response.json(resultBody);
}