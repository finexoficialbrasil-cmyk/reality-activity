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

    // ===== MARKETPLACE (compra de listing) =====
    if (type === 'marketplace' && listing_id) {
      const listing = await base44.asServiceRole.entities.PointsListing.get(listing_id);
      if (!listing || listing.status !== 'active') {
        const errBody = { success: false, error: 'Anúncio já foi vendido ou removido' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }
      if (Number(listing.points_amount) !== amount) {
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

      // === TRAVA ATÔMICA contra dupla venda: transição active→sold só uma vez.
      // Dois compradores concorrentes: só um vence (updated===1). O orçamento do
      // anúncio nunca pode ser "gasto" duas vezes.
      const claim = await base44.asServiceRole.entities.PointsListing.updateMany(
        { id: listing_id, status: 'active' },
        { $set: { status: 'sold', buyer_email: sender_email, buyer_name: sender_name || user.full_name || 'Comprador', sold_at: new Date().toISOString() } }
      );
      if (!claim || claim.updated !== 1) {
        const errBody = { success: false, error: 'Anúncio indisponível (vendido ou cancelado)' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 409);
        return Response.json(errBody, { status: 409 });
      }

      if (listing.reserved) {
        // Listing com pontos reservados na criação: credita o comprador (os pontos
        // já foram debitados do vendedor). Nenhum débito extra — o orçamento não é
        // gasto duas vezes (vendedor debitado 1x na criação, comprador creditado 1x).
        const buyerArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: sender_email });
        const buyerPoints = buyerArr[0];
        if (!buyerPoints) {
          // reverte a transição para não prender o anúncio
          await base44.asServiceRole.entities.PointsListing.updateMany({ id: listing_id, status: 'sold' }, { $set: { status: 'active' } });
          const errBody = { success: false, error: 'Conta do comprador não encontrada' };
          await recordIdempotency(base44, request_id, OP, user.email, errBody, 500);
          return Response.json(errBody, { status: 500 });
        }
        const credited = await atomicCreditBalance(base44, 'UserPoints', buyerPoints.id, amount);

        await base44.asServiceRole.entities.PointsTransaction.create({
          user_email: sender_email,
          user_name: sender_name || user.full_name || 'Usuário',
          type: 'marketplace_bought',
          points: amount,
          description: 'Compra de ' + amount + ' pts no marketplace',
          transfer_email: receiver_email,
          transfer_name: receiver_name || 'Usuário',
          transaction_value: transaction_value || 0
        });

        await base44.asServiceRole.entities.PointsTransfer.create({
          sender_email,
          sender_name: sender_name || user.full_name || 'Usuário',
          receiver_email,
          receiver_name: receiver_name || 'Usuário',
          points_amount: amount,
          transaction_value: transaction_value || 0,
          note: note || '',
          type: 'marketplace',
          listing_id
        });

        const resultBody = {
          success: true,
          message: 'Compra realizada com sucesso!',
          data: { points_transferred: amount, sender_new_balance: Number(credited?.balance) || 0, receiver_email, type: 'marketplace' }
        };
        await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
        return Response.json(resultBody);
      }

      // Listing legado (sem reserva): fluxo antigo preservado — debita comprador, credita vendedor.
      const senderArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: sender_email });
      const senderPoints = senderArr[0];
      if (!senderPoints) {
        await base44.asServiceRole.entities.PointsListing.updateMany({ id: listing_id, status: 'sold' }, { $set: { status: 'active' } });
        const errBody = { success: false, error: 'Saldo insuficiente' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }
      const transfer = await atomicTransferPoints(base44, senderPoints.id, receiver_email, amount, receiver_name);
      if (!transfer.ok) {
        await base44.asServiceRole.entities.PointsListing.updateMany({ id: listing_id, status: 'sold' }, { $set: { status: 'active' } });
        const status = transfer.phase === 'credit_failed' ? 500 : 400;
        const errBody = { success: false, error: transfer.error };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, status);
        return Response.json(errBody, { status });
      }
      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: sender_email,
        user_name: sender_name || user.full_name || 'Usuário',
        type: 'marketplace_bought',
        points: -amount,
        description: 'Compra de ' + amount + ' pts no marketplace',
        transfer_email: receiver_email,
        transfer_name: receiver_name || 'Usuário',
        transaction_value: transaction_value || 0
      });
      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: receiver_email,
        user_name: receiver_name || 'Usuário',
        type: 'marketplace_sold',
        points: amount,
        description: 'Venda de ' + amount + ' pts no marketplace',
        transfer_email: sender_email,
        transfer_name: sender_name || 'Usuário',
        transaction_value: transaction_value || 0
      });
      await base44.asServiceRole.entities.PointsTransfer.create({
        sender_email,
        sender_name: sender_name || user.full_name || 'Usuário',
        receiver_email,
        receiver_name: receiver_name || 'Usuário',
        points_amount: amount,
        transaction_value: transaction_value || 0,
        note: note || '',
        type: 'marketplace',
        listing_id
      });
      const resultBody = {
        success: true,
        message: 'Compra realizada com sucesso!',
        data: { points_transferred: amount, sender_new_balance: Number(transfer.senderRecord?.balance) || 0, receiver_email, type: 'marketplace' }
      };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
    }

    // ===== TRANSFERÊNCIA DIRETA =====
    const senderArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: sender_email });
    const senderPoints = senderArr[0];
    if (!senderPoints) {
      const errBody = { success: false, error: 'Saldo insuficiente' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }
    const transfer = await atomicTransferPoints(base44, senderPoints.id, receiver_email, amount, receiver_name);
    if (!transfer.ok) {
      const status = transfer.phase === 'credit_failed' ? 500 : 400;
      const errBody = { success: false, error: transfer.error };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, status);
      return Response.json(errBody, { status });
    }
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: sender_email,
      user_name: sender_name || user.full_name || 'Usuário',
      type: 'transfer_sent',
      points: -amount,
      description: note || ('Transferência para ' + (receiver_name || '')),
      transfer_email: receiver_email,
      transfer_name: receiver_name || 'Usuário',
      transaction_value: transaction_value || 0
    });
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: receiver_email,
      user_name: receiver_name || 'Usuário',
      type: 'transfer_received',
      points: amount,
      description: note || ('Recebeu ' + amount + ' pts de ' + (sender_name || '')),
      transfer_email: sender_email,
      transfer_name: sender_name || 'Usuário',
      transaction_value: transaction_value || 0
    });
    await base44.asServiceRole.entities.PointsTransfer.create({
      sender_email,
      sender_name: sender_name || user.full_name || 'Usuário',
      receiver_email,
      receiver_name: receiver_name || 'Usuário',
      points_amount: amount,
      transaction_value: transaction_value || 0,
      note: note || '',
      type: 'direct',
      listing_id: null
    });
    const newBalance = Number(transfer.senderRecord?.balance) || 0;
    const resultBody = {
      success: true,
      message: 'Transferência realizada com sucesso!',
      data: {
        points_transferred: amount,
        sender_new_balance: newBalance,
        receiver_email,
        type: 'direct'
      }
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});