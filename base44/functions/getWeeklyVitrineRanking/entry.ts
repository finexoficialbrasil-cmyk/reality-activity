import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Janela de 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Busca compartilhamentos mega_link dos últimos 7 dias (service role bypassa RLS)
    const shares = await base44.asServiceRole.entities.AdvertisementShare.list('-created_date', 5000);

    // Agrega pontos por usuário
    const rankingMap = new Map();
    for (const s of shares) {
      if (s.platform !== 'mega_link') continue;
      if (!s.created_date || s.created_date < sevenDaysAgo) continue;
      if (!s.user_email) continue;

      const key = s.user_email;
      const entry = rankingMap.get(key) || {
        user_email: s.user_email,
        user_name: s.user_name || s.user_email.split('@')[0],
        total_points: 0,
        shares_count: 0
      };
      entry.total_points += s.points_earned || 0;
      entry.shares_count += 1;
      rankingMap.set(key, entry);
    }

    // Ordena por pontos e pega top 10
    const ranking = Array.from(rankingMap.values())
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 10)
      .map((r, i) => ({ ...r, position: i + 1 }));

    return Response.json({
      success: true,
      ranking,
      week_start: sevenDaysAgo,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}