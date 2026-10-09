import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req, { allowPublic: true });

    const [videos, companies, allAds, summary] = await Promise.all([
      base44.asServiceRole.entities.Video.filter({ is_active: true }, '-order', 12),
      base44.asServiceRole.entities.Company.filter({ is_active: true }, 'order', 20),
      base44.asServiceRole.entities.Advertisement.filter({ status: 'approved', is_active: true, budget_remaining: { $gt: 0 } }, '-reward_per_share', 500),
      // Saldo queimado: lê o total consolidado de FinancialSummary (O(1) — sem varrer saques)
      base44.asServiceRole.entities.FinancialSummary.list('', 1)
    ]);

    // Anúncios públicos: strip dados internos do anunciante (email/nome/motivos)
    const advertisements = allAds
      .sort((a, b) => (b.reward_per_share || 0) - (a.reward_per_share || 0) || (new Date(b.created_date).getTime() - new Date(a.created_date).getTime()))
      .map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        type: a.type,
        image_url: a.image_url,
        video_url: a.video_url,
        link: a.link,
        category: a.category,
        budget_total: a.budget_total,
        budget_remaining: a.budget_remaining,
        reward_per_share: a.reward_per_share,
        is_active: a.is_active,
        is_bulk_shareable: a.is_bulk_shareable,
        order: a.order
      }));

    // Empresas públicas: strip email/phone (não necessários na interface pública)
    const publicCompanies = companies.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logo_url: c.logo_url,
      cover_image_url: c.cover_image_url,
      description: c.description,
      category: c.category,
      website: c.website,
      is_partner: c.is_partner,
      is_active: c.is_active,
      order: c.order
    }));

    // Saldo queimado = total consolidado em FinancialSummary (atualizado incrementalmente)
    const burnedBalance = summary && summary.length > 0 ? (Number(summary[0].burned_balance) || 0) : 0;

    return Response.json({ videos, companies: publicCompanies, advertisements, burnedBalance });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});