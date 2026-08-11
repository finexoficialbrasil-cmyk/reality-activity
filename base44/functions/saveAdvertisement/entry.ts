import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { mode, ad_id, title, description, type, link, category, budget_total, add_credit, reward_per_share, image_url, video_url } = body;

    // Valida campos obrigatórios
    if (!title || !link || !category) {
      return Response.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 });
    }

    // Busca saldo do usuário no servidor (fonte confiável)
    const userPointsList = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });
    const userPoints = userPointsList[0];

    if (mode === 'edit') {
      // === EDIÇÃO ===
      if (!ad_id) return Response.json({ error: 'ID do anúncio é obrigatório' }, { status: 400 });

      // Busca o anúncio e valida propriedade
      const ad = await base44.asServiceRole.entities.Advertisement.get(ad_id);
      if (!ad) return Response.json({ error: 'Anúncio não encontrado' }, { status: 404 });

      if (ad.user_email !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Você não tem permissão para editar este anúncio' }, { status: 403 });
      }

      const addAmount = Math.max(0, Number(add_credit) || 0);

      // Valida saldo se vai adicionar créditos
      if (addAmount > 0) {
        if (!userPoints || (userPoints.balance || 0) < addAmount) {
          return Response.json({ error: `Saldo insuficiente. Você precisa de ${addAmount} pontos.` }, { status: 400 });
        }
      }

      const newBudgetTotal = (ad.budget_total || 0) + addAmount;
      const newBudgetRemaining = (ad.budget_remaining || 0) + addAmount;
      const shouldReactivate = newBudgetRemaining > 0;

      // Atualiza o anúncio (servidor)
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

      // Debita pontos e registra transação se adicionou créditos
      if (addAmount > 0) {
        await base44.asServiceRole.entities.UserPoints.update(userPoints.id, {
          balance: (userPoints.balance || 0) - addAmount,
          total_spent: (userPoints.total_spent || 0) + addAmount,
          last_activity: new Date().toISOString()
        });

        await base44.asServiceRole.entities.PointsTransaction.create({
          user_email: user.email,
          user_name: user.full_name,
          type: 'manual_adjust',
          points: -addAmount,
          description: `Crédito adicionado ao anúncio: ${title}`
        });
      }

      return Response.json({
        success: true,
        message: 'Anúncio atualizado com sucesso!',
        new_balance: (userPoints?.balance || 0) - addAmount,
        cost: addAmount
      });

    } else {
      // === CRIAR ===
      const budget = Number(budget_total) || 0;
      if (budget < 1) {
        return Response.json({ error: 'Orçamento deve ser maior que zero' }, { status: 400 });
      }

      if (!userPoints || (userPoints.balance || 0) < budget) {
        return Response.json({ error: `Saldo insuficiente. Você precisa de ${budget} pontos.` }, { status: 400 });
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

      // Debita pontos
      await base44.asServiceRole.entities.UserPoints.update(userPoints.id, {
        balance: (userPoints.balance || 0) - budget,
        total_spent: (userPoints.total_spent || 0) + budget,
        last_activity: new Date().toISOString()
      });

      // Registra transação
      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'manual_adjust',
        points: -budget,
        description: `Orçamento de anúncio: ${title}`
      });

      return Response.json({
        success: true,
        message: 'Anúncio publicado com sucesso!',
        new_balance: (userPoints.balance || 0) - budget,
        cost: budget
      });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}