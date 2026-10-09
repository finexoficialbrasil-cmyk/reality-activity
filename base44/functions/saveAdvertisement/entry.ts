import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getIdempotentResult, recordIdempotency } from '../../shared/idempotency.ts';
import { atomicDebitBalance } from '../../shared/atomicFinance.ts';

const OP = 'save_ad';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { mode, ad_id, title, description, type, link, category, budget_total, add_credit, reward_per_share, image_url, video_url, request_id } = body;

    // === IDEMPOTÊNCIA ===
    const prior = await getIdempotentResult(base44, request_id, OP);
    if (prior) return Response.json(prior.result.body, { status: prior.result_status || 200 });

    // Valida campos obrigatórios
    if (!title || !link || !category) {
      const errBody = { error: 'Preencha todos os campos obrigatórios' };
      await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
      return Response.json(errBody, { status: 400 });
    }

    // Busca saldo do usuário no servidor (fonte confiável)
    const userPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const userPoints = userPointsList[0];

    if (mode === 'edit') {
      if (!ad_id) {
        const errBody = { error: 'ID do anúncio é obrigatório' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }

      const ad = await base44.asServiceRole.entities.Advertisement.get(ad_id);
      if (!ad) {
        const errBody = { error: 'Anúncio não encontrado' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 404);
        return Response.json(errBody, { status: 404 });
      }

      if (ad.user_email !== user.email && user.role !== 'admin') {
        const errBody = { error: 'Você não tem permissão para editar este anúncio' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 403);
        return Response.json(errBody, { status: 403 });
      }

      const addAmount = Math.max(0, Number(add_credit) || 0);

      // === DÉBITO ATÔMICO se vai adicionar créditos ===
      if (addAmount > 0) {
        if (!userPoints) {
          const errBody = { error: `Saldo insuficiente. Você precisa de ${addAmount} pontos.` };
          await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
          return Response.json(errBody, { status: 400 });
        }
        const debit = await atomicDebitBalance(base44, 'UserPoints', userPoints.id, addAmount);
        if (!debit.ok) {
          const errBody = { error: `Saldo insuficiente. Você precisa de ${addAmount} pontos.` };
          await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
          return Response.json(errBody, { status: 400 });
        }
      }

      const newBudgetTotal = (ad.budget_total || 0) + addAmount;
      const newBudgetRemaining = (ad.budget_remaining || 0) + addAmount;
      const shouldReactivate = newBudgetRemaining > 0;

      const updateData = {
        title,
        description: description || '',
        type: type || 'image',
        link,
        category,
        budget_total: newBudgetTotal,
        budget_remaining: newBudgetRemaining,
        reward_per_share: Number(reward_per_share) || 10,
        image_url: image_url || '',
        video_url: video_url || '',
        ...(shouldReactivate ? { is_active: true, status: 'approved', cooldown_until: null } : {})
      };

      await base44.asServiceRole.entities.Advertisement.update(ad_id, updateData);

      // Registra transação se adicionou créditos
      if (addAmount > 0) {
        await base44.asServiceRole.entities.PointsTransaction.create({
          user_email: user.email,
          user_name: user.full_name,
          type: 'manual_adjust',
          points: -addAmount,
          description: `Crédito adicionado ao anúncio: ${title}`
        });
      }

      const resultBody = {
        success: true,
        message: 'Anúncio atualizado com sucesso!',
        new_balance: addAmount > 0 ? (Number(userPoints.balance) - addAmount) : (Number(userPoints?.balance) || 0),
        cost: addAmount
      };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);

    } else {
      // === CRIAR ===
      const budget = Number(budget_total) || 0;
      if (budget < 1) {
        const errBody = { error: 'Orçamento deve ser maior que zero' };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }

      if (!userPoints) {
        const errBody = { error: `Saldo insuficiente. Você precisa de ${budget} pontos.` };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }

      // === DÉBITO ATÔMICO ===
      const debit = await atomicDebitBalance(base44, 'UserPoints', userPoints.id, budget);
      if (!debit.ok) {
        const errBody = { error: `Saldo insuficiente. Você precisa de ${budget} pontos.` };
        await recordIdempotency(base44, request_id, OP, user.email, errBody, 400);
        return Response.json(errBody, { status: 400 });
      }

      // Cria o anúncio (servidor)
      await base44.asServiceRole.entities.Advertisement.create({
        title,
        description: description || '',
        type: type || 'image',
        link,
        category,
        budget_total: budget,
        budget_remaining: budget,
        reward_per_share: Number(reward_per_share) || 10,
        image_url: image_url || '',
        video_url: video_url || '',
        user_email: user.email,
        user_name: user.full_name,
        status: 'approved',
        is_active: true
      });

      // Registra transação
      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'manual_adjust',
        points: -budget,
        description: `Orçamento de anúncio: ${title}`
      });

      const resultBody = {
        success: true,
        message: 'Anúncio publicado com sucesso!',
        new_balance: Number(debit.record.balance) || 0,
        cost: budget
      };
      await recordIdempotency(base44, request_id, OP, user.email, resultBody, 200);
      return Response.json(resultBody);
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}