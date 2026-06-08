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

    const pointsEarned = advertisement.reward_per_share || 10;

    // Cria registro de compartilhamento
    await base44.entities.AdvertisementShare.create({
      advertisement_id,
      user_email: user.email,
      user_name: user.full_name,
      platform,
      points_earned: pointsEarned,
      is_valid: true
    });

    // Atualiza contador no anúncio
    await base44.asServiceRole.entities.Advertisement.update(advertisement_id, {
      shares_count: (advertisement.shares_count || 0) + 1,
      total_points_awarded: (advertisement.total_points_awarded || 0) + pointsEarned
    });

    // Atualiza pontos do usuário
    const userPoints = await base44.entities.UserPoints.filter({ user_email: user.email });
    if (userPoints.length > 0) {
      await base44.entities.UserPoints.update(userPoints[0].id, {
        balance: (userPoints[0].balance || 0) + pointsEarned,
        total_earned: (userPoints[0].total_earned || 0) + pointsEarned,
        last_activity: new Date().toISOString()
      });
    } else {
      await base44.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name,
        balance: pointsEarned,
        total_earned: pointsEarned,
        last_activity: new Date().toISOString()
      });
    }

    // Cria transação
    await base44.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'earned_bonus',
      points: pointsEarned,
      advertisement_id,
      description: `Compartilhou anúncio no ${platform}`
    });

    return Response.json({
      success: true,
      pointsEarned,
      message: `+${pointsEarned} pontos ganhos!`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});