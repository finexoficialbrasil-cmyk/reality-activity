import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { advertisement_id } = await req.json();
    if (!advertisement_id) {
      return Response.json({ error: 'advertisement_id required' }, { status: 400 });
    }

    const ad = await base44.asServiceRole.entities.Advertisement.get(advertisement_id);
    if (!ad) return Response.json({ error: 'Advertisement not found' }, { status: 404 });

    if (ad.user_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const refundAmount = Math.max(0, ad.budget_remaining || 0);
    let refunded = 0;

    if (refundAmount > 0 && ad.user_email) {
      const userPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: ad.user_email });
      if (userPoints.length > 0) {
        const up = userPoints[0];
        await base44.asServiceRole.entities.UserPoints.update(up.id, {
          balance: (up.balance || 0) + refundAmount,
          total_spent: Math.max(0, (up.total_spent || 0) - refundAmount),
          last_activity: new Date().toISOString()
        });
      }

      await base44.asServiceRole.entities.PointsTransaction.create({
        user_email: ad.user_email,
        user_name: ad.user_name || user.full_name,
        type: 'manual_adjust',
        points: refundAmount,
        description: `Estorno de saldo ao excluir anúncio: ${ad.title}`
      });

      refunded = refundAmount;
    }

    await base44.asServiceRole.entities.Advertisement.delete(advertisement_id);

    return Response.json({ success: true, refunded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}