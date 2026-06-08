import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { advertisement_id, platform } = await req.json();

    if (!advertisement_id || !platform) {
      return Response.json({ error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    // Busca o anúncio
    const advertisement = await base44.asServiceRole.entities.Advertisement.get(advertisement_id);

    if (!advertisement || advertisement.status !== 'approved') {
      return Response.json({ error: 'Anúncio não encontrado ou não aprovado' }, { status: 400 });
    }

    const pointsCost = advertisement.reward_per_share || 10;

    // Cria registro de compartilhamento
    await base44.entities.AdvertisementShare.create({
      advertisement_id,
      user_email: user.email,
      user_name: user.full_name,
      platform,
      points_earned: pointsCost,
      is_valid: true
    });

    // Atualiza contador no anúncio
    await base44.asServiceRole.entities.Advertisement.update(advertisement_id, {
      shares_count: (advertisement.shares_count || 0) + 1,
      total_points_awarded: (advertisement.total_points_awarded || 0) + pointsCost
    });

    // Debita pontos do CRIADOR do anúncio
    const creatorPoints = await base44.entities.UserPoints.filter({ user_email: advertisement.user_email });
    if (creatorPoints.length > 0) {
      await base44.entities.UserPoints.update(creatorPoints[0].id, {
        balance: Math.max(0, (creatorPoints[0].balance || 0) - pointsCost),
        total_spent: (creatorPoints[0].total_spent || 0) + pointsCost,
        last_activity: new Date().toISOString()
      });
    }

    // Registra transação para o criador
    await base44.entities.PointsTransaction.create({
      user_email: advertisement.user_email,
      user_name: advertisement.user_name,
      type: 'spent_redemption',
      points: -pointsCost,
      advertisement_id,
      description: `Compartilhamento de anúncio no ${platform}`
    });

    return Response.json({
      success: true,
      pointsCost,
      message: `-${pointsCost} pontos debitados do criador`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});