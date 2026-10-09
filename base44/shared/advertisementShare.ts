// Shared logic for processing a single advertisement share.
// Used by both processAdvertisementShare (single) and bulkShareAdvertisements (batch),
// and by trackMegaLinkClick (mega-link, with skipCooldown).
//
// PROTEÇÃO ATÔMICA: o débito do orçamento do anúncio é feito com updateMany
// condicional (budget_remaining >= pointsCost), garantindo que o orçamento
// nunca fique negativo e que duas requisições simultâneas não consumam mais
// pontos do que existe disponível.

import { atomicDebitField, atomicCreditBalance } from './atomicFinance.ts';
import { createLedgerEntry } from './ledger.ts';

export async function processSingleShare(base44, user, advertisement, platform, extraShareFields = {}, options = {}) {
  // Already fetched advertisement passed in; validate state
  if (!advertisement || advertisement.status !== 'approved') {
    return { ok: false, error: 'Anúncio não encontrado ou não aprovado' };
  }

  // Cannot share own ad
  if (advertisement.user_email === user.email) {
    return { ok: false, error: 'Você não pode ganhar pontos compartilhando seu próprio anúncio' };
  }

  // Check budget
  const budgetRemaining = Number(advertisement.budget_remaining) || 0;
  const rewardPerShare = Number(advertisement.reward_per_share) || 10;

  if (budgetRemaining <= 0) {
    return { ok: false, error: 'Orçamento do anúncio esgotado' };
  }

  // 24h cooldown per user/ad: if the user already earned points on this ad in
  // the last 24h, the share still happens but no points are credited.
  // SKIPPED for mega_link clicks — the per-visitor duplicate check is done by
  // trackMegaLinkClick (server-side fingerprint + per-IP cap).
  if (!options.skipCooldown) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentShares = await base44.asServiceRole.entities.AdvertisementShare.filter({
      advertisement_id: advertisement.id,
      user_email: user.email,
      is_valid: true,
      created_date: { $gte: twentyFourHoursAgo }
    });

    if (recentShares.length > 0) {
      // Register a non-credited share (keeps the share flow intact)
      await base44.asServiceRole.entities.AdvertisementShare.create({
        advertisement_id: advertisement.id,
        user_email: user.email,
        user_name: user.full_name,
        platform,
        points_earned: 0,
        is_valid: false,
        ...extraShareFields
      });

      // Compute remaining cooldown time for the message
      const lastShareDate = new Date(recentShares[0].created_date);
      const nextAvailable = new Date(lastShareDate.getTime() + 24 * 60 * 60 * 1000);
      const msRemaining = nextAvailable.getTime() - Date.now();
      const hoursRemaining = Math.max(1, Math.ceil(msRemaining / (60 * 60 * 1000)));

      return {
        ok: true,
        pointsCost: 0,
        alreadyEarned: true,
        cooldownMessage: `Você já ganhou pontos por este anúncio. Volte em ${hoursRemaining}h para ganhar de novo.`
      };
    }
  }

  // Pay what's left: if balance < reward, pay the balance and zero out
  const pointsCost = Math.min(budgetRemaining, rewardPerShare);
  if (pointsCost <= 0) {
    return { ok: false, error: 'Orçamento do anúncio esgotado' };
  }

  // === DÉBITO ATÔMICO DO ORÇAMENTO DO ANÚNCIO ===
  // updateMany condicional: só debita se budget_remaining >= pointsCost.
  // Retorna updated=1 (aplicou) ou updated=0 (orçamento insuficiente/concorrência).
  const debit = await atomicDebitField(
    base44,
    'Advertisement',
    advertisement.id,
    'budget_remaining',
    pointsCost,
    { shares_count: 1, total_points_awarded: pointsCost }
  );

  if (!debit.ok) {
    // Orçamento esgotado ou concorrência venceu — NÃO credita pontos ao usuário.
    return { ok: false, error: debit.error || 'Orçamento do anúncio esgotado' };
  }

  const updatedAd = debit.record;
  const newBudgetRemaining = Number(updatedAd.budget_remaining) || 0;
  const budgetZeroed = newBudgetRemaining <= 0;

  // Se zerou, ativa cooldown de 24h e marca como inativo (atualização separada, idempotente)
  if (budgetZeroed) {
    const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.Advertisement.update(advertisement.id, {
      status: 'inactive',
      cooldown_until: cooldownUntil
    }).catch(() => {});
  }

  // Create share record (service role — bypasses RLS admin-only)
  await base44.asServiceRole.entities.AdvertisementShare.create({
    advertisement_id: advertisement.id,
    user_email: user.email,
    user_name: user.full_name,
    platform,
    points_earned: pointsCost,
    is_valid: true,
    ...extraShareFields
  });

  // Credit points to the sharer (atomic $inc, or create if first time)
  const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
  let sharerBalanceBefore = null;
  let sharerBalanceAfter = null;
  if (userPoints.length > 0) {
    sharerBalanceBefore = Number(userPoints[0].balance) || 0;
    const credited = await atomicCreditBalance(base44, 'UserPoints', userPoints[0].id, pointsCost);
    sharerBalanceAfter = Number(credited?.balance) || 0;
  } else {
    await base44.asServiceRole.entities.UserPoints.create({
      user_email: user.email,
      user_name: user.full_name,
      total_earned: pointsCost,
      balance: pointsCost,
      last_activity: new Date().toISOString()
    });
    sharerBalanceBefore = 0;
    sharerBalanceAfter = pointsCost;
  }

  const requestId = options.request_id || '';
  const origin = options.origin || 'share';

  // Register transaction for sharer (ledger enriquecido)
  await createLedgerEntry(base44, {
    user_email: user.email,
    user_name: user.full_name,
    type: 'earned_bonus',
    points: pointsCost,
    balance_before: sharerBalanceBefore,
    balance_after: sharerBalanceAfter,
    advertisement_id: advertisement.id,
    description: `Compartilhamento de anúncio no ${platform}`,
    origin,
    destination: advertisement.id,
    original_reference: advertisement.id,
    request_id: requestId
  });

  // Register spend transaction for advertiser (sem saldo de usuário — é orçamento do anúncio)
  await createLedgerEntry(base44, {
    user_email: advertisement.user_email,
    user_name: advertisement.user_name,
    type: 'spent_redemption',
    points: -pointsCost,
    advertisement_id: advertisement.id,
    description: `Compartilhamento de "${advertisement.title}" no ${platform}`,
    origin,
    destination: user.email,
    original_reference: advertisement.id,
    request_id: requestId
  });

  return { ok: true, pointsCost };
}