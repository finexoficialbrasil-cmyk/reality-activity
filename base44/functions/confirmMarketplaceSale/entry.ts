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

    const { listing_id, request_id, points_quantity } = await req.json();

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

    // === RECUPERAÇÃO DE CRASH: esta venda já foi processada? ===
    // Verifica se já existe transação marketplace_bought com este request_id
    const existingTx = await base44.asServiceRole.entities.PointsTransaction.filter(
      { listing_id, request_id: request_id || '', type: 'marketplace_bought' }, '-created_date', 1
    );
    if (existingTx && existingTx.length > 0) {
      const alreadyPts = Math.abs(Number(existingTx[0].points) || 0);
      const resultBody = {
        success: true,
        message: 'Esta venda já foi confirmada anteriormente',
        data: { listing_id, already_sold: true, points: alreadyPts }
      };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
    }

    const remaining = Math.max(0, Math.floor(Number(listing.points_amount) || 0));

    // Listing totalmente vendido
    if (listing.status === 'sold' || remaining <= 0) {
      const resultBody = {
        success: true,
        message: 'Este anúncio já foi totalmente vendido',
        data: { listing_id, already_sold: true, points: 0 }
      };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
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

    // === Determina a quantidade a vender (parcial ou total) ===
    let saleQty = Math.max(0, Math.floor(Number(points_quantity) || 0));
    if (saleQty <= 0) {
      // Backward compat: se não veio points_quantity, usa buyer_declared_quantity ou total restante
      saleQty = Math.max(0, Math.floor(Number(listing.buyer_declared_quantity) || 0));
      if (saleQty <= 0) saleQty = remaining;
    }

    // Valida: 0 < saleQty <= remaining
    if (saleQty <= 0 || saleQty > remaining) {
      const errBody = { success: false, error: `Quantidade inválida. Disponível: ${remaining} pts` };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Valida: não pode vender mais que o comprador declarou (se declarou quantidade)
    const declaredQty = Math.max(0, Math.floor(Number(listing.buyer_declared_quantity) || 0));
    if (declaredQty > 0 && saleQty > declaredQty) {
      const errBody = { success: false, error: `Quantidade superior à solicitada pelo comprador (${declaredQty} pts)` };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    if (listing.status !== 'active') {
      const errBody = { success: false, error: 'Anúncio não está mais ativo' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === RECUPERAÇÃO DE CRASH: decremento já feito mas crédito não completou? ===
    // Se sale_request_id bate com este request_id, o decremento já ocorreu — só completar o crédito
    if (listing.sale_request_id && listing.sale_request_id === request_id) {
      return await completeSale(base44, listing, user, request_id, saleQty, remaining);
    }

    // === TRAVA ATÔMICA: decrementa points_amount condicionalmente ===
    const now = new Date().toISOString();
    const pricePerPoint = Number(listing.price_per_point) || 0;
    const newRemaining = remaining - saleQty;
    const saleValue = saleQty * pricePerPoint;
    const newTotalPrice = newRemaining * pricePerPoint;

    const updateSet: Record<string, any> = {
      total_price: newTotalPrice,
      sale_request_id: request_id || '',
      sale_confirmed_at: now
    };

    // Define original_points_amount na primeira venda (para listings antigos sem o campo)
    if (!listing.original_points_amount) {
      updateSet.original_points_amount = remaining + saleQty;
    }

    // Se zerou, marca como sold
    if (newRemaining === 0) {
      updateSet.status = 'sold';
      updateSet.sold_at = now;
    }

    const claim = await base44.asServiceRole.entities.PointsListing.updateMany(
      { id: listing_id, status: 'active', points_amount: remaining },
      {
        $inc: { points_amount: -saleQty, partial_sales_count: 1 },
        $set: updateSet
      }
    );

    if (!claim || claim.updated !== 1) {
      // Concorrência: outro processo alterou o listing entre leitura e update
      const reRead = await base44.asServiceRole.entities.PointsListing.filter({ id: listing_id });
      const reListing = reRead[0];

      // Verifica se esta venda já foi processada
      const reExistingTx = await base44.asServiceRole.entities.PointsTransaction.filter(
        { listing_id, request_id: request_id || '', type: 'marketplace_bought' }, '-created_date', 1
      );
      if (reExistingTx && reExistingTx.length > 0) {
        const resultBody = {
          success: true,
          message: 'Esta venda já foi confirmada anteriormente',
          data: { listing_id, already_sold: true, points: Math.abs(Number(reExistingTx[0].points) || 0) }
        };
        await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
        return Response.json(resultBody);
      }

      // Sale_request_id bate? Decremento já feito — completar crédito
      if (reListing && reListing.sale_request_id === request_id) {
        return await completeSale(base44, reListing, user, request_id, saleQty, remaining);
      }

      if (reListing && reListing.status === 'sold') {
        const resultBody = {
          success: true,
          message: 'Este anúncio já foi totalmente vendido',
          data: { listing_id, already_sold: true, points: 0 }
        };
        await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
        return Response.json(resultBody);
      }

      const errBody = { success: false, error: 'Concorrência detectada — tente novamente' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 409);
      return Response.json(errBody, { status: 409 });
    }

    // Listing decrementado — completa a transferência dos pontos ao comprador
    // Re-lê o listing para obter o estado pós-decremento (buyer fields ainda presentes)
    const postListing = await base44.asServiceRole.entities.PointsListing.filter({ id: listing_id });
    return await completeSale(base44, postListing[0] || listing, user, request_id, saleQty, newRemaining);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

// Transfere os pontos reservados no listing para o comprador e cria os registros de ledger.
// Após creditar o comprador, limpa os campos de buyer se o listing ainda estiver ativo (venda parcial).
async function completeSale(base44, listing, seller, request_id, saleQty, newRemaining) {
  const now = new Date().toISOString();
  const pricePerPoint = Number(listing.price_per_point) || 0;
  const saleValue = saleQty * pricePerPoint;

  // 1. Credita o comprador (pontos já estavam reservados no listing — não há débito do vendedor)
  const buyerArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: listing.buyer_email });
  let buyerBalanceBefore = 0;
  let buyerBalanceAfter = 0;

  if (buyerArr[0]) {
    buyerBalanceBefore = Number(buyerArr[0].balance) || 0;
    const credited = await atomicCreditBalance(base44, 'UserPoints', buyerArr[0].id, saleQty);
    buyerBalanceAfter = Number(credited?.balance) || 0;
  } else {
    await base44.asServiceRole.entities.UserPoints.create({
      user_email: listing.buyer_email,
      user_name: listing.buyer_name || 'Usuário',
      balance: saleQty,
      total_earned: saleQty,
      last_activity: now
    });
    buyerBalanceAfter = saleQty;
  }

  // 2. Ledger do vendedor (marketplace_sold) — pontos saem da reserva, sem mudança de saldo
  const sellerPtsArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: seller.email });
  const sellerBalance = sellerPtsArr[0] ? Number(sellerPtsArr[0].balance) || 0 : 0;

  await createLedgerEntry(base44, {
    user_email: seller.email,
    user_name: seller.full_name,
    type: 'marketplace_sold',
    points: -saleQty,
    balance_before: sellerBalance,
    balance_after: sellerBalance,
    description: `Venda de ${saleQty} pts no marketplace para ${listing.buyer_name}`,
    transaction_value: saleValue,
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
    points: saleQty,
    balance_before: buyerBalanceBefore,
    balance_after: buyerBalanceAfter,
    description: `Compra de ${saleQty} pts no marketplace de ${seller.full_name}`,
    transaction_value: saleValue,
    origin: 'marketplace_sale',
    destination: seller.email,
    original_reference: listing.id,
    listing_id: listing.id,
    transfer_email: seller.email,
    transfer_name: seller.full_name,
    request_id: request_id || ''
  });

  // 4. Se venda parcial (listing ainda ativo), limpa campos de buyer para próximo comprador
  if (newRemaining > 0) {
    await base44.asServiceRole.entities.PointsListing.updateMany(
      { id: listing.id, sale_request_id: request_id || '' },
      {
        $unset: {
          buyer_id: '',
          buyer_email: '',
          buyer_name: '',
          buyer_declared_at: '',
          buyer_declared_quantity: '',
          sale_request_id: ''
        }
      }
    ).catch(() => {});
  }

  const isFullSale = newRemaining === 0;
  const resultBody = {
    success: true,
    message: isFullSale
      ? 'Venda confirmada! Anúncio totalmente vendido.'
      : `Venda parcial confirmada! ${saleQty} pts transferidos. Restam ${newRemaining} pts no anúncio.`,
    data: {
      listing_id: listing.id,
      points_transferred: saleQty,
      sale_value: saleValue,
      price_per_point: pricePerPoint,
      buyer_email: listing.buyer_email,
      buyer_name: listing.buyer_name,
      buyer_new_balance: buyerBalanceAfter,
      remaining_points: newRemaining,
      fully_sold: isFullSale
    }
  };
  await recordIdempotency(base44, request_id, OP, seller.email, resultBody, 200);
  return Response.json(resultBody);
}