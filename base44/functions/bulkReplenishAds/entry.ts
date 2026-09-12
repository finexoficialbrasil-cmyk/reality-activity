import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { ad_ids, credit_per_ad } = body;

    if (!Array.isArray(ad_ids) || ad_ids.length === 0) {
      return Response.json({ error: 'Selecione ao menos um anúncio' }, { status: 400 });
    }

    const credit = Math.max(0, Number(credit_per_ad) || 0);
    if (credit <= 0) {
      return Response.json({ error: 'Valor de crédito deve ser maior que zero' }, { status: 400 });
    }

    // Busca saldo do usuário (fonte confiável)
    const userPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const userPoints = userPointsList[0];

    const totalCost = credit * ad_ids.length;

    if (!userPoints || (userPoints.balance || 0) < totalCost) {
      return Response.json({
        error: `Saldo insuficiente. Você precisa de ${totalCost} pontos (${credit} × ${ad_ids.length} anúncios).`
      }, { status: 400 });
    }

    // Processa cada anúncio: valida propriedade e adiciona créditos
    let replenishedCount = 0;
    const replenishedTitles = [];

    for (const adId of ad_ids) {
      try {
        const ad = await base44.asServiceRole.entities.Advertisement.get(adId);
        if (!ad) continue;

        if (ad.user_email !== user.email && user.role !== 'admin') continue;

        const newBudgetTotal = (ad.budget_total || 0) + credit;
        const newBudgetRemaining = (ad.budget_remaining || 0) + credit;
        const shouldReactivate = newBudgetRemaining > 0;

        await base44.asServiceRole.entities.Advertisement.update(adId, {
          budget_total: newBudgetTotal,
          budget_remaining: newBudgetRemaining,
          ...(shouldReactivate ? { is_active: true, status: 'approved', cooldown_until: null } : {})
        });

        replenishedCount++;
        replenishedTitles.push(ad.title);
      } catch (e) {
        // skip individual failures
      }
    }

    if (replenishedCount === 0) {
      return Response.json({ error: 'Nenhum anúncio válido encontrado para repor' }, { status: 400 });
    }

    const actualCost = credit * replenishedCount;

    // Debita pontos do usuário (uma vez)
    await base44.asServiceRole.entities.UserPoints.update(userPoints.id, {
      balance: (userPoints.balance || 0) - actualCost,
      total_spent: (userPoints.total_spent || 0) + actualCost,
      last_activity: new Date().toISOString()
    });

    // Registra transação única
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'manual_adjust',
      points: -actualCost,
      description: `Reposição em massa: ${replenishedCount} anúncio(s) × ${credit} pts`
    });

    return Response.json({
      success: true,
      message: `${replenishedCount} anúncio(s) reabastecido(s) com ${credit} pts cada`,
      replenished_count: replenishedCount,
      credit_per_ad: credit,
      total_cost: actualCost,
      new_balance: (userPoints.balance || 0) - actualCost
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}