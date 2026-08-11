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

    // Cria registro de compartilhamento (service role — bypassa RLS admin-only)
    await base44.asServiceRole.entities.AdvertisementShare.create({
      advertisement_id,
      user_email: user.email,
      user_name: user.full_name,
      platform,
      points_earned: pointsCost,
      is_valid: true
    });

    // Calcula novo saldo e verifica se deve pausar
    const newBudgetRemaining = budgetRemaining - pointsCost;
    const budgetZeroed = newBudgetRemaining <= 0;
    
    // Se zerou, ativa cooldown de 24h
    const cooldownUntil = budgetZeroed ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    // Atualiza anúncio com novo saldo, status e cooldown
    const updateData = {
      shares_count: (advertisement.shares_count || 0) + 1,
      total_points_awarded: (advertisement.total_points_awarded || 0) + pointsCost,
      budget_remaining: Math.max(newBudgetRemaining, 0),
      status: budgetZeroed ? 'inactive' : advertisement.status
    };
    
    if (cooldownUntil) {
      updateData.cooldown_until = cooldownUntil;
    }

    await base44.asServiceRole.entities.Advertisement.update(advertisement_id, updateData);

    // Credita pontos para quem compartilhou (service role — bypassa RLS admin-only)
    const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    if (userPoints.length > 0) {
      await base44.asServiceRole.entities.UserPoints.update(userPoints[0].id, {
        balance: (userPoints[0].balance || 0) + pointsCost,
        total_earned: (userPoints[0].total_earned || 0) + pointsCost,
        last_activity: new Date().toISOString()
      });
    } else {
      // Se não existe, cria novo registro
      await base44.asServiceRole.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name,
        total_earned: pointsCost,
        balance: pointsCost,
        last_activity: new Date().toISOString()
      });
    }

    // Registra transação para quem compartilhou
    await base44.asServiceRole.entities.PointsTransaction.create({
     user_email: user.email,
     user_name: user.full_name,
     type: 'earned_bonus',
     points: pointsCost,
     advertisement_id,
     description: `Compartilhamento de anúncio no ${platform}`
    });

    // Registra transação de gasto para o anunciante
    await base44.asServiceRole.entities.PointsTransaction.create({
     user_email: advertisement.user_email,
     user_name: advertisement.user_name,
     type: 'spent_redemption',
     points: -pointsCost,
     advertisement_id,
     description: `Compartilhamento de "${advertisement.title}" no ${platform}`
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