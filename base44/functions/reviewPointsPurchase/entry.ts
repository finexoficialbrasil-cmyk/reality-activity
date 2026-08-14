import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado — apenas administradores' }, { status: 403 });
    }

    const { purchase_id, action, rejection_reason } = await req.json();

    if (!purchase_id || !action) {
      return Response.json({ error: 'purchase_id e action obrigatórios' }, { status: 400 });
    }

    const purchases = await base44.asServiceRole.entities.PointsPurchase.filter({ id: purchase_id });
    const purchase = purchases[0];

    if (!purchase) {
      return Response.json({ error: 'Compra não encontrada' }, { status: 404 });
    }

    if (action === 'approve') {
      // Não aprovar se já foi aprovado e creditado
      if (purchase.status === 'approved' && purchase.points_credited) {
        return Response.json({ error: 'Compra já foi aprovada' }, { status: 400 });
      }

      await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
        status: 'approved',
        approval_type: 'manual',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
        rejection_reason: null
      });

      // Credita pontos se ainda não foi creditado
      if (!purchase.points_credited) {
        const totalPoints = (purchase.points_requested || 0) + (purchase.bonus_points || 0);

        const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: purchase.user_email });
        if (userPoints.length > 0) {
          await base44.asServiceRole.entities.UserPoints.update(userPoints[0].id, {
            balance: (userPoints[0].balance || 0) + totalPoints,
            total_earned: (userPoints[0].total_earned || 0) + totalPoints,
            last_activity: new Date().toISOString()
          });
        } else {
          await base44.asServiceRole.entities.UserPoints.create({
            user_email: purchase.user_email,
            user_name: purchase.user_name,
            total_earned: totalPoints,
            balance: totalPoints,
            last_activity: new Date().toISOString()
          });
        }

        await base44.asServiceRole.entities.PointsTransaction.create({
          user_email: purchase.user_email,
          user_name: purchase.user_name,
          type: 'earned_bonus',
          points: totalPoints,
          description: `Compra aprovada manualmente: ${purchase.points_requested} pts (R$ ${purchase.amount_paid})`
        });

        await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
          points_credited: true
        });
      }

      return Response.json({ success: true, message: 'Compra aprovada e pontos creditados' });

    } else if (action === 'reject') {
      if (!rejection_reason) {
        return Response.json({ error: 'Motivo da rejeição é obrigatório' }, { status: 400 });
      }

      await base44.asServiceRole.entities.PointsPurchase.update(purchase_id, {
        status: 'rejected',
        approval_type: 'manual',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
        rejection_reason
      });

      return Response.json({ success: true, message: 'Compra rejeitada' });

    } else {
      return Response.json({ error: 'Ação inválida. Use approve ou reject.' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});