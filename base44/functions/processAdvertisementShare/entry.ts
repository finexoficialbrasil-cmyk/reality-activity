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

    // Verifica se o usuário é o criador do anúncio
    if (advertisement.user_email === user.email) {
      return Response.json({ error: 'Você não pode ganhar pontos compartilhando seu próprio anúncio' }, { status: 403 });
    }

    // Verifica se o anúncio ainda tem orçamento
    const budgetRemaining = advertisement.budget_remaining || 0;
    const pointsCost = advertisement.reward_per_share || 10;

    if (budgetRemaining < pointsCost) {
      return Response.json({ error: 'Orçamento do anúncio esgotado' }, { status: 400 });
    }

    // Cria registro de compartilhamento
    await base44.entities.AdvertisementShare.create({
      advertisement_id,
      user_email: user.email,
      user_name: user.full_name,
      platform,
      points_earned: pointsCost,
      is_valid: true
    });

    // Calcula novo saldo e verifica se deve pausar
    const newBudgetRemaining = budgetRemaining - pointsCost;
    const newStatus = newBudgetRemaining <= 0 ? 'inactive' : advertisement.status;

    // Atualiza anúncio com novo saldo e status
    await base44.asServiceRole.entities.Advertisement.update(advertisement_id, {
      shares_count: (advertisement.shares_count || 0) + 1,
      total_points_awarded: (advertisement.total_points_awarded || 0) + pointsCost,
      budget_remaining: newBudgetRemaining,
      status: newStatus
    });

    // Credita pontos para quem compartilhou
    const userPoints = await base44.entities.UserPoints.filter({ user_email: user.email });
    if (userPoints.length > 0) {
      await base44.entities.UserPoints.update(userPoints[0].id, {
        balance: (userPoints[0].balance || 0) + pointsCost,
        total_earned: (userPoints[0].total_earned || 0) + pointsCost,
        last_activity: new Date().toISOString()
      });
    } else {
      // Se não existe, cria novo registro
      await base44.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name,
        total_earned: pointsCost,
        balance: pointsCost,
        last_activity: new Date().toISOString()
      });
    }

    // Registra transação para quem compartilhou
    await base44.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'earned_bonus',
      points: pointsCost,
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