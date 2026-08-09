import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateTransferId, generateVerificationCode } from '../../shared/transferUtils.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const clientUa = req.headers.get('user-agent') || '';
    const { receiver_key, points_amount, verification_code, sender_ip, sender_user_agent } = body;

    if (!receiver_key || !points_amount) {
      return Response.json({ error: 'Chave do destinatário e quantidade são obrigatórios' }, { status: 400 });
    }

    const amount = Number(points_amount);
    if (isNaN(amount) || amount <= 0) {
      return Response.json({ error: 'Quantidade inválida' }, { status: 400 });
    }

    // Get settings
    const settingsList = await base44.asServiceRole.entities.TransferSettings.list('', 1);
    const settings = settingsList[0] || {
      enabled: true, min_per_transfer: 100, max_per_transfer: 10000,
      daily_limit: 50000, daily_max_transfers: 10, risk_threshold: 5000,
      new_account_threshold: 3000, new_account_days: 7
    };

    if (!settings.enabled) {
      return Response.json({ error: 'Transferências estão temporariamente desativadas.' }, { status: 403 });
    }

    if (amount < settings.min_per_transfer) {
      return Response.json({ error: `Valor mínimo: ${settings.min_per_transfer} pontos` }, { status: 400 });
    }
    if (amount > settings.max_per_transfer) {
      return Response.json({ error: `Valor máximo por transferência: ${settings.max_per_transfer} pontos` }, { status: 400 });
    }

    // Get sender's key
    const senderKeys = await base44.asServiceRole.entities.UserTransferKey.filter({ user_email: user.email });
    let senderKey = senderKeys[0];
    if (!senderKey) {
      return Response.json({ error: 'Você não possui uma chave de transferência.' }, { status: 400 });
    }
    if (senderKey.is_blocked) {
      return Response.json({ error: 'Suas transferências estão temporariamente bloqueadas por segurança.' }, { status: 403 });
    }

    // Resolve receiver
    const receiverKeys = await base44.asServiceRole.entities.UserTransferKey.filter({ transfer_key: receiver_key });
    const receiverKeyRecord = receiverKeys[0];
    if (!receiverKeyRecord) {
      return Response.json({ error: 'Chave do destinatário não encontrada' }, { status: 404 });
    }
    if (receiverKeyRecord.user_email === user.email) {
      return Response.json({ error: 'Você não pode transferir para si mesmo' }, { status: 400 });
    }
    if (receiverKeyRecord.is_blocked) {
      return Response.json({ error: 'A chave do destinatário está bloqueada' }, { status: 403 });
    }

    // Get sender's points
    const senderPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const senderPoints = senderPointsList[0];
    if (!senderPoints || senderPoints.balance < amount) {
      return Response.json({ error: 'Saldo insuficiente' }, { status: 400 });
    }

    // Check daily limits
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayTransfers = await base44.asServiceRole.entities.PointsTransfer.filter({
      sender_email: user.email,
      status: { $in: ['completed', 'under_review'] },
      created_date: { $gte: todayStart }
    });

    if (todayTransfers.length >= settings.daily_max_transfers) {
      return Response.json({ error: `Você atingiu o limite de ${settings.daily_max_transfers} transferências por dia.` }, { status: 400 });
    }
    const todayVolume = todayTransfers.reduce((sum, t) => sum + t.points_amount, 0);
    if (todayVolume + amount > settings.daily_limit) {
      return Response.json({ error: `Você atingiu o limite diário de ${settings.daily_limit} pontos.` }, { status: 400 });
    }

    // === RISK ANALYSIS ===
    let riskLevel = 'low';
    let riskReason = '';
    let requires2fa = false;

    // New account check
    const accountAgeDays = (now.getTime() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < (settings.new_account_days || 7) && amount > (settings.new_account_threshold || 3000)) {
      riskLevel = 'high';
      riskReason = 'Conta nova movimentando volume elevado';
      requires2fa = true;
    }

    // High volume check
    if (amount > (settings.risk_threshold || 5000)) {
      if (riskLevel === 'low') { riskLevel = 'medium'; }
      if (riskLevel !== 'high') { riskReason = `Transferência acima do limite de risco (${settings.risk_threshold} pts)`; }
      requires2fa = true;
    }

    // Repeated transfers between same accounts (last 24h)
    const recentSamePair = await base44.asServiceRole.entities.PointsTransfer.filter({
      sender_email: user.email,
      receiver_email: receiverKeyRecord.user_email,
      created_date: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() }
    });
    if (recentSamePair.length >= 3) {
      riskLevel = 'high';
      riskReason = 'Muitas transferências repetidas entre as mesmas contas';
      requires2fa = true;
    }

    // Many transfers in short time (last hour)
    const lastHour = await base44.asServiceRole.entities.PointsTransfer.filter({
      sender_email: user.email,
      created_date: { $gte: new Date(now.getTime() - 60 * 60 * 1000).toISOString() }
    });
    if (lastHour.length >= 5) {
      riskLevel = 'high';
      riskReason = 'Muitas transferências em pouco tempo';
      requires2fa = true;
    }

    // === 2FA FOR HIGH-RISK ===
    if (requires2fa && !verification_code) {
      const code = generateVerificationCode();
      const expiry = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.UserTransferKey.update(senderKey.id, {
        pending_2fa_code: code,
        pending_2fa_expiry: expiry,
        pending_transfer_data: {
          receiver_key,
          points_amount: amount,
          sender_ip: clientIp || sender_ip || '',
          sender_user_agent: sender_user_agent || ''
        }
      });

      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: 'Código de Segurança - Transferência de Pontos',
          body: `Olá ${user.full_name},\n\nSeu código de segurança para confirmar a transferência de ${amount} pontos é:\n\n  ${code}\n\nEste código expira em 10 minutos.\n\nSe você não solicitou esta transferência, ignore este e-mail e entre em contato com o suporte.`
        });
      } catch (e) {
        // Email may fail if user not registered in SendEmail allowlist
      }

      return Response.json({
        needs_verification: true,
        message: 'Código de segurança enviado para seu e-mail.',
        risk_level: riskLevel
      });
    }

    // Validate 2FA code
    if (requires2fa && verification_code) {
      if (!senderKey.pending_2fa_code || senderKey.pending_2fa_code !== verification_code) {
        return Response.json({ error: 'Código de verificação inválido' }, { status: 400 });
      }
      if (new Date(senderKey.pending_2fa_expiry) < now) {
        return Response.json({ error: 'Código de verificação expirado. Solicite novamente.' }, { status: 400 });
      }
      await base44.asServiceRole.entities.UserTransferKey.update(senderKey.id, {
        pending_2fa_code: '',
        pending_2fa_expiry: '',
        pending_transfer_data: {}
      });
    }

    // Determine final status
    let status = 'completed';
    if (riskLevel === 'high') {
      status = 'under_review';
    }

    // === ATOMIC TRANSFER ===
    const transferId = generateTransferId();

    // 1. Deduct from sender
    await base44.asServiceRole.entities.UserPoints.update(senderPoints.id, {
      balance: senderPoints.balance - amount,
      total_spent: (senderPoints.total_spent || 0) + amount
    });

    // 2. Add to receiver
    const receiverPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: receiverKeyRecord.user_email });
    if (receiverPointsList[0]) {
      const rp = receiverPointsList[0];
      await base44.asServiceRole.entities.UserPoints.update(rp.id, {
        balance: rp.balance + amount,
        total_earned: (rp.total_earned || 0) + amount
      });
    } else {
      await base44.entities.UserPoints.create({
        user_email: receiverKeyRecord.user_email,
        user_name: receiverKeyRecord.user_name,
        balance: amount,
        total_earned: amount
      });
    }

    // 3. Create transfer record (audit)
    await base44.asServiceRole.entities.PointsTransfer.create({
      transfer_id: transferId,
      sender_email: user.email,
      sender_name: user.full_name,
      sender_key: senderKey.transfer_key,
      receiver_email: receiverKeyRecord.user_email,
      receiver_name: receiverKeyRecord.user_name,
      receiver_key: receiver_key,
      points_amount: amount,
      status: status,
      risk_level: riskLevel,
      risk_reason: riskReason,
      sender_ip: clientIp || sender_ip || '',
      sender_user_agent: clientUa || sender_user_agent || '',
      requires_2fa: requires2fa,
      processed_date: now.toISOString()
    });

    // 4. Create points transactions (ledger)
    await base44.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'transfer_sent',
      points: -amount,
      transfer_email: receiverKeyRecord.user_email,
      transfer_name: receiverKeyRecord.user_name,
      description: `Transferência ${transferId} para ${receiverKeyRecord.user_name}`
    });

    await base44.entities.PointsTransaction.create({
      user_email: receiverKeyRecord.user_email,
      user_name: receiverKeyRecord.user_name,
      type: 'transfer_received',
      points: amount,
      transfer_email: user.email,
      transfer_name: user.full_name,
      description: `Transferência ${transferId} recebida de ${user.full_name}`
    });

    // 5. Update sender key stats
    await base44.asServiceRole.entities.UserTransferKey.update(senderKey.id, {
      transfers_count: (senderKey.transfers_count || 0) + 1,
      total_volume: (senderKey.total_volume || 0) + amount
    });

    return Response.json({
      success: true,
      transfer_id: transferId,
      status: status,
      risk_level: riskLevel,
      message: status === 'under_review'
        ? 'Transferência registrada e em análise pelo administrador.'
        : 'Transferência concluída com sucesso!'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}