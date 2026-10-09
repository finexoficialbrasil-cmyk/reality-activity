import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveOwnerEmail } from '../../shared/megaLinkSlug.ts';

/**
 * Versão RÁPIDA do trackMegaLinkClick: resolve o dono, busca os anúncios elegíveis
 * e verifica duplicidade de clique — SEM creditar pontos.
 * O credenciamento pesado fica a cargo do trackMegaLinkClick, chamado em background
 * pelo cliente após a UI já ter renderizado.
 *
 * Usa o MESMO fingerprint server-side do trackMegaLinkClick para que o status
 * "already_counted" exibido ao visitante seja consistente com o credenciamento.
 */
function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { slug } = await req.json();

    if (!slug) {
      return Response.json({ error: 'Slug obrigatório' }, { status: 400 });
    }

    const resolved = await resolveOwnerEmail(base44, slug);
    if (!resolved) {
      return Response.json({ error: 'Slug inválido' }, { status: 400 });
    }
    const ownerEmail = resolved.email;
    const ownerName = resolved.name;

    // === FINGERPRINT SERVER-SIDE (consistente com trackMegaLinkClick) ===
    let authUser = null;
    try { authUser = await base44.auth.me(); } catch {}

    const forwarded = req.headers.get('x-forwarded-for');
    const rawIp = (forwarded ? forwarded.split(',')[0].trim() : null)
      || req.headers.get('x-real-ip')
      || req.headers.get('cf-connecting-ip')
      || '';
    const rawUa = req.headers.get('user-agent') || '';

    let fingerprint;
    let canDetect = true;
    if (authUser && authUser.email) {
      fingerprint = `user:${authUser.email}`;
    } else if (rawIp && rawIp !== 'unknown') {
      fingerprint = `ip:${rawIp}:ua:${hashStr(rawUa)}`;
    } else {
      fingerprint = 'unknown';
      canDetect = false;
    }

    // Busca anúncios elegíveis (aprovados, ativos, com orçamento, não do dono)
    const allAds = await base44.asServiceRole.entities.Advertisement.list('-reward_per_share', 500);
    const eligibleAds = allAds
      .filter(ad =>
        ad.status === 'approved' &&
        ad.is_active !== false &&
        (ad.budget_remaining || 0) > 0 &&
        ad.user_email !== ownerEmail
      )
      .sort((a, b) => (b.reward_per_share || 0) - (a.reward_per_share || 0) || (new Date(b.created_date).getTime() - new Date(a.created_date).getTime()));

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

    // Verifica clique duplicado nas últimas 24h (mesmo dono + fingerprint server-side)
    let alreadyCounted = false;
    if (canDetect) {
      const recentShares = await base44.asServiceRole.entities.AdvertisementShare.filter(
        { user_email: ownerEmail, platform: 'mega_link' },
        '-created_date',
        50
      );
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      alreadyCounted = recentShares.some(s =>
        s.visitor_ip === fingerprint &&
        s.created_date >= yesterday
      );
    }

    return Response.json({
      success: true,
      already_counted: !!alreadyCounted,
      ads: adsForClient,
      owner_email: ownerEmail,
      owner_name: ownerName
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}