import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicDebitBalance } from '../../shared/atomicFinance.ts';
import { checkRateLimit, RATE_LIMITS } from '../../shared/rateLimit.ts';
import { isActorBlocked, BLOCKED_MESSAGE } from '../../shared/userGuard.ts';
import { createLedgerEntry } from '../../shared/ledger.ts';

const OP = 'create_listing';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    if (isActorBlocked(user)) return Response.json({ success: false, error: BLOCKED_MESSAGE }, { status: 403 });

    const { points_amount, total_price, whatsapp_number, request_id } = await req.json();

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    // === RATE LIMIT ===
    const rl = await checkRateLimit(base44, 'create_listing', user.email, RATE_LIMITS.create_listing.max, RATE_LIMITS.create_listing.windowSeconds);
    if (!rl.allowed) {
      const errBody = { success: false, error: `Muitas ofertas criadas. Tente novamente em ${rl.retry_after_seconds || 3600}s.`, rate_limited: true };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 429);
      return Response.json(errBody, { status: 429 });
    }

    const pts = Math.floor(Number(points_amount) || 0);
    const price = Number(total_price) || 0;
    const whatsapp = (whatsapp_number || '').replace(/\D/g, '');

    if (!pts || pts < 1) {
      const errBody = { success: false, error: 'Quantidade de pontos inválida' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (!price || price <= 0) {
      const errBody = { success: false, error: 'Valor da venda inválido' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (whatsapp.length < 10) {
      const errBody = { success: false, error: 'WhatsApp inválido (informe DDD + número)' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Saldo do vendedor
    const sellerArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const sellerPoints = sellerArr[0];
    if (!sellerPoints) {
      const errBody = { success: false, error: 'Saldo insuficiente' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === RESERVA ATÔMICA (trava contra uso duplo de saldo) ===
    // Debita condicionalmente (balance >= pts). Duas ofertas concorrentes pelo
    // mesmo saldo: só uma vence (updated===1); a outra recebe "Saldo insuficiente".
    // Assim os mesmos pontos nunca podem ser oferecidos duas vezes nem gastos
    // em outro lugar (saque/transferência/resgate) enquanto reservados.
    const debit = await atomicDebitBalance(base44, 'UserPoints', sellerPoints.id, pts);
    if (!debit.ok) {
      const errBody = { success: false, error: debit.error };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Cria o listing com pontos reservados
    const listing = await base44.asServiceRole.entities.PointsListing.create({
      seller_email: user.email,
      seller_name: user.full_name,
      points_amount: pts,
      price_per_point: price / pts,
      total_price: price,
      whatsapp_number: whatsapp,
      status: 'active',
      reserved: true
    });

    // Extrato: reserva de pontos (ledger enriquecido)
    await createLedgerEntry(base44, {
      user_email: user.email,
      user_name: user.full_name,
      type: 'marketplace_listed',
      points: -pts,
      balance_before: Number(sellerPoints.balance) || 0,
      balance_after: Number(debit.record.balance) || 0,
      description: 'Pontos reservados para venda no marketplace',
      transaction_value: 0,
      origin: 'create_listing',
      destination: listing.id,
      original_reference: listing.id,
      request_id: request_id || ''
    });

    const resultBody = {
      success: true,
      message: 'Seus pontos foram colocados à venda (reservados)!',
      data: { listing_id: listing.id, new_balance: Number(debit.record.balance) || 0 }
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});