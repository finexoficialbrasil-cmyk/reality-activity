import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const {
      sender_email, sender_name,
      receiver_email, receiver_name,
      points_amount, transaction_value, note, type, listing_id
    } = await req.json();

    if (!sender_email || !receiver_email) {
      return Response.json({ success: false, error: 'Emails são obrigatórios' }, { status: 400 });
    }
    if (sender_email === receiver_email) {
      return Response.json({ success: false, error: 'Não pode transferir para si mesmo' }, { status: 400 });
    }
    if (!points_amount || points_amount < 1) {
      return Response.json({ success: false, error: 'Quantidade de pontos inválida' }, { status: 400 });
    }
    if (sender_email !== user.email) {
      return Response.json({ success: false, error: 'Você só pode transferir seus próprios pontos' }, { status: 403 });
    }

    // Saldo do remetente via UserPoints (service role para acesso total)
    const senderArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: sender_email });
    const senderPoints = senderArr[0];
    if (!senderPoints || (senderPoints.balance || 0) < points_amount) {
      return Response.json({ success: false, error: 'Saldo insuficiente' }, { status: 400 });
    }

    // Valida listing do marketplace
    if (type === 'marketplace' && listing_id) {
      const listing = await base44.asServiceRole.entities.PointsListing.get(listing_id);
      if (!listing || listing.status !== 'active') {
        return Response.json({ success: false, error: 'Anúncio já foi vendido ou removido' }, { status: 400 });
      }
      if (listing.points_amount !== points_amount) {
        return Response.json({ success: false, error: 'Quantidade não corresponde ao anúncio' }, { status: 400 });
      }
    }

    // Deduz do remetente
    await base44.asServiceRole.entities.UserPoints.update(senderPoints.id, {
      balance: senderPoints.balance - points_amount,
      total_spent: (senderPoints.total_spent || 0) + points_amount,
      last_activity: new Date().toISOString()
    });

    // Credita o destinatário
    const receiverArr = await base44.asServiceRole.entities.UserPoints.filter({ user_email: receiver_email });
    if (receiverArr.length > 0) {
      const rp = receiverArr[0];
      await base44.asServiceRole.entities.UserPoints.update(rp.id, {
        balance: (rp.balance || 0) + points_amount,
        total_earned: (rp.total_earned || 0) + points_amount,
        last_activity: new Date().toISOString()
      });
    } else {
      await base44.asServiceRole.entities.UserPoints.create({
        user_email: receiver_email,
        user_name: receiver_name || 'Usuário',
        balance: points_amount,
        total_earned: points_amount,
        last_activity: new Date().toISOString()
      });
    }

    // Registra transações no extrato de ambos
    const senderTxType = type === 'marketplace' ? 'marketplace_bought' : 'transfer_sent';
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: sender_email,
      user_name: sender_name || user.full_name || 'Usuário',
      type: senderTxType,
      points: -points_amount,
      description: note || (type === 'marketplace'
        ? 'Compra de ' + points_amount + ' pts no marketplace'
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
      points: points_amount,
      description: note || (type === 'marketplace'
        ? 'Venda de ' + points_amount + ' pts no marketplace'
        : 'Recebeu ' + points_amount + ' pts de ' + (sender_name || '')),
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
      points_amount,
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

    const newBalance = senderPoints.balance - points_amount;

    return Response.json({
      success: true,
      message: 'Transferência realizada com sucesso!',
      data: {
        points_transferred: points_amount,
        sender_new_balance: newBalance,
        receiver_email,
        type: type || 'direct'
      }
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});