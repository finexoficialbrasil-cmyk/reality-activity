import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req, { allowPublic: true });

    const [videos, companies, allAds, withdrawals] = await Promise.all([
      base44.asServiceRole.entities.Video.filter({ is_active: true }, '-order', 12),
      base44.asServiceRole.entities.Company.filter({ is_active: true }, 'order', 20),
      base44.asServiceRole.entities.Advertisement.list('-created_date', 500),
      base44.asServiceRole.entities.WithdrawalRequest.filter({ status: { $ne: 'rejected' } }, '-created_date', 500)
    ]);

    const advertisements = allAds.filter(a => a.status === 'approved' && a.is_active && a.budget_remaining > 0);

    // Saldo queimado = soma de pontos de todos os saques não rejeitados
    const burnedBalance = withdrawals
      .reduce((sum, w) => sum + (w.points_amount || 0), 0);

    return Response.json({ videos, companies, advertisements, burnedBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});