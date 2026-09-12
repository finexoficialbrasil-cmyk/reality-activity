import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { processSingleShare } from '../../shared/advertisementShare.ts';
import { resolveOwnerEmail } from '../../shared/megaLinkSlug.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { slug, visitor_id } = await req.json();

    if (!slug) {
      return Response.json({ error: 'Slug obrigatório' }, { status: 400 });
    }

    // Resolve owner email: base64 (legado) ou código curto (novo)
    const resolved = await resolveOwnerEmail(base44, slug);
    if (!resolved) {
      return Response.json({ error: 'Slug inválido' }, { status: 400 });
    }
    const ownerEmail = resolved.email;
    const ownerName = resolved.name;

    // Get visitor IP
    const forwarded = req.headers.get('x-forwarded-for');
    const visitorIp = (forwarded ? forwarded.split(',')[0].trim() : null)
      || req.headers.get('x-real-ip')
      || 'unknown';

    // Fingerprint confiável por visitante: prefere o visitor_id (UUID do localStorage),
    // cai para IP. 'unknown' nunca bloqueia (evita falsos positivos em ambientes sem IP).
    const fingerprint = visitor_id || visitorIp;
    const canDetect = fingerprint && fingerprint !== 'unknown';

    // Fetch eligible ads (approved, active, with budget, not owned by link owner)
    const allAds = await base44.asServiceRole.entities.Advertisement.list('-created_date', 500);
    const eligibleAds = allAds.filter(ad =>
      ad.status === 'approved' &&
      ad.is_active !== false &&
      (ad.budget_remaining || 0) > 0 &&
      ad.user_email !== ownerEmail
    );

    const adsForClient = eligibleAds.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      image_url: a.image_url,
      link: a.link,
      category: a.category,
      reward_per_share: a.reward_per_share,
      budget_remaining: a.budget_remaining,
      budget_total: a.budget_total,
      user_email: a.user_email
    }));

    // Check for duplicate click in last 24h (same IP, same owner)
    const recentShares = await base44.asServiceRole.entities.AdvertisementShare.list('-created_date', 500);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const duplicate = canDetect && recentShares.some(s =>
      s.platform === 'mega_link' &&
      s.user_email === ownerEmail &&
      s.visitor_ip === fingerprint &&
      s.created_date >= yesterday
    );

    if (duplicate) {
      return Response.json({
        success: true,
        already_counted: true,
        points_earned: 0,
        ads: adsForClient,
        owner_email: ownerEmail,
        owner_name: ownerName
      });
    }

    // Credit points to link owner: process ALL eligible ads as mega_link shares
    let pointsEarned = 0;
    if (eligibleAds.length > 0) {
      const ownerPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: ownerEmail });
      const ownerName = ownerPoints[0]?.user_name || ownerEmail.split('@')[0];
      const pseudoUser = { email: ownerEmail, full_name: ownerName };

      for (const ad of eligibleAds) {
        try {
          const result = await processSingleShare(base44, pseudoUser, ad, 'mega_link', { visitor_ip: fingerprint });
          if (result.ok) {
            pointsEarned += result.pointsCost;
          }
        } catch (e) {
          // skip ads that fail (e.g. budget exhausted)
        }
      }
    }

    return Response.json({
      success: true,
      already_counted: false,
      points_earned: pointsEarned,
      ads: adsForClient,
      owner_email: ownerEmail,
      owner_name: ownerName
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}