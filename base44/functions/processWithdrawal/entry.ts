import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const { points_amount, method, payment_data, pix_key_type } = await req.json();

    if (!method || !payment_data) {
      return Response.json({ error: 'Método e dados de pagamento são obrigatórios' }, { status: 400 });
    }
    if (method === 'pix' && !pix_key_type) {
      return Response.json({ error: 'Tipo de chave PIX é obrigatório' }, { status: 400 });
    }

    const amount = Number(points_amount);
    if (isNaN(amount) || amount < 100) {
      return Response.json({ error: 'Valor mínimo para saque: 100 pontos' }, { status: 400 });
    }

    // Busca configurações de saque (fonte confiável do servidor)
    const settingsList = await base44.asServiceRole.entities.WithdrawalSettings.list('', 1);
    const settings = settingsList[0];
    if (!settings) {
      return Response.json({ error: 'Configurações de saque indisponíveis' }, { status: 500 });
    }

    // Valida se o método está habilitado
    if (method === 'pix' && !settings.pix_enabled) {
      return Response.json({ error: 'Saque via PIX indisponível' }, { status: 400 });
    }
    if (method === 'bitcoin_cash' && !settings.bch_enabled) {
      return Response.json({ error: 'Saque via Bitcoin Cash indisponível' }, { status: 400 });
    }

    // Busca saldo do usuário no servidor (fonte confiável)
    const userPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const userPoints = userPointsList[0];
    if (!userPoints || (userPoints.balance || 0) < amount) {
      return Response.json({ error: 'Saldo insuficiente' }, { status: 400 });
    }

    // Calcula valor final usando taxa do servidor
    const buybackRate = method === 'bitcoin_cash'
      ? (settings.bch_buyback_rate || 0)
      : (settings.pix_buyback_rate || 0);
    const finalValue = amount * buybackRate;

    // Deduz pontos do usuário (servidor)
    await base44.asServiceRole.entities.UserPoints.update(userPoints.id, {
      balance: (userPoints.balance || 0) - amount,
      total_spent: (userPoints.total_spent || 0) + amount,
      last_activity: new Date().toISOString()
    });

    // Cria solicitação de saque (servidor)
    await base44.asServiceRole.entities.WithdrawalRequest.create({
      user_email: user.email,
      user_name: user.full_name,
      points_amount: amount,
      method,
      payment_data,
      pix_key_type: method === 'pix' ? pix_key_type : undefined,
      buyback_rate: buybackRate,
      final_value: finalValue,
      status: 'pending'
    });

    // Registra transação no extrato (servidor)
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'manual_adjust',
      points: -amount,
      description: `Solicitação de saque via ${method === 'bitcoin_cash' ? 'Bitcoin Cash' : 'PIX'}`
    });

    return Response.json({
      success: true,
      message: 'Solicitação de saque enviada! Aguarde aprovação.',
      new_balance: (userPoints.balance || 0) - amount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}