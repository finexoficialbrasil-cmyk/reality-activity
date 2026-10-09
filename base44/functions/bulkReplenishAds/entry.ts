import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getIdempotentResult, recordIdempotency, decodeIdempotentResult } from '../../shared/idempotency.ts';
import { atomicDebitBalance } from '../../shared/atomicFinance.ts';

const OP = 'bulk_replenish';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { ad_ids, credit_per_ad, request_id } = body;

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) {
      const replay = decodeIdempotentResult(prior);
      if (replay) return Response.json(replay, { status: prior.result_status || 200 });
    }

    if (!Array.isArray(ad_ids) || ad_ids.length === 0) {
      const errBody = { error: 'Selecione ao menos um anúncio' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    const credit = Math.max(0, Number(credit_per_ad) || 0);
    if (credit <= 0) {
      const errBody = { error: 'Valor de crédito deve ser maior que zero' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Busca saldo do usuário (fonte confiável)
    const userPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const userPoints = userPointsList[0];

    const totalCost = credit * ad_ids.length;

    if (!userPoints) {
      const errBody = { error: `Saldo insuficiente. Você precisa de ${totalCost} pontos.` };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // === DÉBITO ATÔMICO DO CUSTO TOTAL === (só debita se balance >= totalCost)
    const debit = await atomicDebitBalance(base44, 'UserPoints', userPoints.id, totalCost);
    if (!debit.ok) {
      const errBody = { error: `Saldo insuficiente. Você precisa de ${totalCost} pontos (${credit} × ${ad_ids.length} anúncios).` };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
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
      // Nenhum válido — reembolsa o débito (devolve pontos)
      await base44.asServiceRole.entities.UserPoints.update(userPoints.id, {
        balance: (Number(debit.record.balance) || 0) + totalCost,
        total_spent: Math.max(0, (Number(debit.record.total_spent) || 0) - totalCost)
      });
      const errBody = { error: 'Nenhum anúncio válido encontrado para repor' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    const actualCost = credit * replenishedCount;

    // Se nem todos foram repostos, reembolsa a diferença
    if (replenishedCount < ad_ids.length) {
      const refund = credit * (ad_ids.length - replenishedCount);
      await base44.asServiceRole.entities.UserPoints.update(userPoints.id, {
        balance: (Number(debit.record.balance) || 0) + refund,
        total_spent: Math.max(0, (Number(debit.record.total_spent) || 0) - refund)
      });
    }

    // Registra transação única
    await base44.asServiceRole.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'manual_adjust',
      points: -actualCost,
      description: `Reposição em massa: ${replenishedCount} anúncio(s) × ${credit} pts`
    });

    const resultBody = {
      success: true,
      message: `${replenishedCount} anúncio(s) reabastecido(s) com ${credit} pts cada`,
      replenished_count: replenishedCount,
      credit_per_ad: credit,
      total_cost: actualCost,
      new_balance: (Number(debit.record.balance) || 0) + (replenishedCount < ad_ids.length ? credit * (ad_ids.length - replenishedCount) : 0)
    };
    await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
    return Response.json(resultBody);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}