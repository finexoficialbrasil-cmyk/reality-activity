import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicDebitBalance, atomicCreditBalance, atomicTransferPoints } from '../../shared/atomicFinance.ts';

const OP = 'transfer_email';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const {
      sender_email, sender_name,
      receiver_email, receiver_name,
      points_amount, transaction_value, note, type, listing_id, request_id
    } = await req.json();

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    if (!sender_email || !receiver_email) {
      const errBody = { success: false, error: 'Emails são obrigatórios' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (sender_email === receiver_email) {
      const errBody = { success: false, error: 'Não pode transferir para si mesmo' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (!points_amount || points_amount < 1) {
      const errBody = { success: false, error: 'Quantidade de pontos inválida' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    if (sender_email !== user.email) {
      const errBody = { success: false, error: 'Você só pode transferir seus próprios pontos' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 403);
      return Response.json(errBody, { status: 403 });
    }

    const amount = Number(points_amount);

    // Valida listing do marketplace E exige que o destinatário seja o vendedor real
    if (type === 'marketplace' && listing_id) {
      const listing = await base44.asServiceRole.entities.PointsListing.get(listing_id);
      if (!listing || listing.status !== 'active') {
        const errBody = { success: false, error: 'Anúncio já foi vendido ou removido' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }
      if (listing.points_amount !== amount) {
        const errBody = { success: false, error: 'Quantidade não corresponde ao anúncio' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }
      // PROTEÇÃO: o destinatário informado deve ser o vendedor real do listing
      if (receiver_email !== listing.seller_email) {
        const errBody = { success: false, error: 'Destinatário inválido para este anúncio' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 403);
        return Response.json(errBody, { status: 403 });
      }
    }

    // Saldo do remetente via UserPoints (service role para acesso total)
    const senderArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: sender_email });
    const senderPoints = senderArr[0];
    if (!senderPoints) {
      const errBody = { success: false, error: 'Saldo insuficiente' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === TRANSFERÊNCIA ATÔMICA (débito + crédito com reversão compensatória) ===
    // Se o crédito ao destinatário falhar, o débito do remetente é estornado,
    // garantindo que nunca fique débito sem crédito correspondente.
    const transfer = await atomicTransferPoints(base44, senderPoints.id, receiver_email, amount, receiver_name);
    if (!transfer.ok) {
      const status = transfer.phase === 'credit_failed' ? 500 : 400;
      const errBody = { success: false, error: transfer.error };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, status);
      return Response.json(errBody, { status });
    }

    // Registra transações no extrato de ambos
    const senderTxType = type === 'marketplace' ? 'marketplace_bought' : 'transfer_sent';
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: sender_email,
      user_name: sender_name || user.full_name || 'Usuário',
      type: senderTxType,
      points: -amount,
      description: note || (type === 'marketplace'
        ? 'Compra de ' + amount + ' pts no marketplace'
        : 'Transferência para ' + (receiver_name || '')),
      transfer_email: receiver_email,
      transfer_name: receiver_name || 'Usuário',
      transaction_value: transaction_value || 0
    });

    const receiverTxType = type === 'marketplace' ? 'marketplace_sold' : 'transfer_received';
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: receiver_email,
      user_name: receiver_name || 'Usuário',
      type: receiverTxType,
      points: amount,
      description: note || (type === 'marketplace'
        ? 'Venda de ' + amount + ' pts no marketplace'
        : 'Recebeu ' + amount + ' pts de ' + (sender_name || '')),
      transfer_email: sender_email,
      transfer_name: sender_name || 'Usuário',
      transaction_value: transaction_value || 0
    });

    // Registro da transferência (histórico)
    await base44.asServiceRole.entities.PointsTransfer.create({
      sender_email,
      sender_name: sender_name || user.full_name || 'Usuário',
      receiver_email,
      receiver_name: receiver_name || 'Usuário',
      points_amount: amount,
      transaction_value: transaction_value || 0,
      note: note || '',
      type: type || 'direct',
      listing_id: listing_id || null
    });

    // Atualiza listing do marketplace
    if (type === 'marketplace' && listing_id) {
      await base44.asServiceRole.entities.PointsListing.update(listing_id, {
        status: 'sold',
        buyer_email: sender_email,
        buyer_name: sender_name || user.full_name || 'Comprador',
        sold_at: new Date().toISOString()
      });
    }

    const newBalance = Number(transfer.senderRecord?.balance) || 0;

    // Cancela anúncios ativos do remetente que ele não consegue mais cumprir (saldo insuficiente)
    const myListings = await base44.asServiceRole.entities.PointsListing.filter({ seller_email: sender_email, status: 'active' });
    for (const l of myListings) {
      if (l.points_amount > newBalance) {
        await base44.asServiceRole.entities.PointsListing.update(l.id, { status: 'cancelled' });
      }
    }

    const resultBody = {
      success: true,
      message: 'Transferência realizada com sucesso!',
      data: {
        points_transferred: amount,
        sender_new_balance: newBalance,
        receiver_email,
        type: type || 'direct'
      }
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});