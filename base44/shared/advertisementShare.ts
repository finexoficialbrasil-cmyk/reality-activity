// Shared logic for processing a single advertisement share.
// Used by both processAdvertisementShare (single) and bulkShareAdvertisements (batch).

export async function processSingleShare(base44, user, advertisement, platform) {
  // Already fetched advertisement passed in; validate state
  if (!advertisement || advertisement.status !== 'approved') {
    return { ok: false, error: 'Anúncio não encontrado ou não aprovado' };
  }

  // Cannot share own ad
  if (advertisement.user_email === user.email) {
    return { ok: false, error: 'Você não pode ganhar pontos compartilhando seu próprio anúncio' };
  }

  // Check budget
  const budgetRemaining = advertisement.budget_remaining || 0;
  const rewardPerShare = advertisement.reward_per_share || 10;

  if (budgetRemaining <= 0) {
    return { ok: false, error: 'Orçamento do anúncio esgotado' };
  }

  // Pay what's left: if balance < reward, pay the balance and zero out
  const pointsCost = Math.min(budgetRemaining, rewardPerShare);

  // Create share record (service role — bypasses RLS admin-only)
  await base44.asServiceRole.entities.AdvertisementShare.create({
    advertisement_id: advertisement.id,
    user_email: user.email,
    user_name: user.full_name,
    platform,
    points_earned: pointsCost,
    is_valid: true
  });

  // Calculate new balance and check if should pause
  const newBudgetRemaining = budgetRemaining - pointsCost;
  const budgetZeroed = newBudgetRemaining <= 0;

  // If zeroed, activate 24h cooldown
  const cooldownUntil = budgetZeroed ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

  // Update ad with new balance, status and cooldown
  const updateData = {
    shares_count: (advertisement.shares_count || 0) + 1,
    total_points_awarded: (advertisement.total_points_awarded || 0) + pointsCost,
    budget_remaining: Math.max(newBudgetRemaining, 0),
    status: budgetZeroed ? 'inactive' : advertisement.status
  };

  if (cooldownUntil) {
    updateData.cooldown_until = cooldownUntil;
  }

  await base44.asServiceRole.entities.Advertisement.update(advertisement.id, updateData);

  // Credit points to the sharer (service role — bypasses RLS admin-only)
  const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
  if (userPoints.length > 0) {
    await base44.asServiceRole.entities.UserPoints.update(userPoints[0].id, {
      balance: (userPoints[0].balance || 0) + pointsCost,
      total_earned: (userPoints[0].total_earned || 0) + pointsCost,
      last_activity: new Date().toISOString()
    });
  } else {
    await base44.asServiceRole.entities.UserPoints.create({
      user_email: user.email,
      user_name: user.full_name,
      total_earned: pointsCost,
      balance: pointsCost,
      last_activity: new Date().toISOString()
    });
  }

  // Register transaction for sharer
  await base44.asServiceRole.entities.PointsTransaction.create({
    user_email: user.email,
    user_name: user.full_name,
    type: 'earned_bonus',
    points: pointsCost,
    advertisement_id: advertisement.id,
    description: `Compartilhamento de anúncio no ${platform}`
  });

  // Register spend transaction for advertiser
  await base44.asServiceRole.entities.PointsTransaction.create({
    user_email: advertisement.user_email,
    user_name: advertisement.user_name,
    type: 'spent_redemption',
    points: -pointsCost,
    advertisement_id: advertisement.id,
    description: `Compartilhamento de "${advertisement.title}" no ${platform}`
  });

  return { ok: true, pointsCost };
}