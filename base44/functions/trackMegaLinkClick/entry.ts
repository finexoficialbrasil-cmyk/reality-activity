import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { processSingleShare } from '../../shared/advertisementShare.ts';
import { resolveOwnerEmail } from '../../shared/megaLinkSlug.ts';

// Antifraude do Mega-Link:
// - Fingerprint server-side (NUNCA confia em localStorage/visitor_id do cliente):
//     usuário autenticado → "user:<email>"
//     anônimo → "ip:<ip>:ua:<hash(user-agent)>"
// - Deduplicação por dono + fingerprint nas últimas 24h (1 crédito por visitante real).
// - Limite por IP por dono: no máximo MAX_CREDITS_PER_IP créditos vindos do
//   mesmo IP para o mesmo dono em 24h. Isso permite uma rede real (escritório,
//   família) creditar o dono várias vezes, mas impede que uma única pessoa gere
//   centenas de "visitantes" limpando o navegador.
// - IP 'unknown' (sem header de IP) → não credita (não há como distinguir).

const MAX_CREDITS_PER_IP_PER_OWNER_24H = 5;

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

    // === FINGERPRINT SERVER-SIDE ===
    // Tenta identificar o usuário autenticado (sinal mais forte). Se anônimo,
    // usa IP + User-Agent (controlados pelo servidor, não pelo navegador).
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
      // Sem IP e sem usuário — não há como distinguir visitantes. Não credita.
      fingerprint = 'unknown';
      canDetect = false;
    }

    // Fetch eligible ads (approved, active, with budget, not owned by link owner)
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

    // Se não há como detectar unicidade, mostra os anúncios mas NÃO credita pontos.
    if (!canDetect) {
      return Response.json({
        success: true,
        already_counted: false,
        points_earned: 0,
        not_credited_reason: 'Não foi possível identificar a origem do acesso.',
        ads: adsForClient,
        owner_email: ownerEmail,
        owner_name: ownerName
      });
    }

    // Busca compartilhamentos mega_link recentes deste dono (últimas 24h)
    const recentShares = await base44.asServiceRole.entities.AdvertisementShare.list('-created_date', 500);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const ownerRecent = recentShares.filter(s =>
      s.platform === 'mega_link' &&
      s.user_email === ownerEmail &&
      s.created_date >= yesterday
    );

    // 1. Deduplicação: mesmo dono + mesmo fingerprint nas últimas 24h → já contou
    const duplicate = ownerRecent.some(s => s.visitor_ip === fingerprint);
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

    // 2. Limite por IP por dono (antifraude): conta quantos créditos distintos
    //    vieram do mesmo IP para este dono nas últimas 24h.
    let ipPrefix = null;
    if (rawIp && rawIp !== 'unknown') {
      ipPrefix = `ip:${rawIp}:`;
    }
    const ipCreditsToday = ipPrefix
      ? ownerRecent.filter(s => (s.visitor_ip || '').startsWith(ipPrefix)).length
      : 0;

    if (ipCreditsToday >= MAX_CREDITS_PER_IP_PER_OWNER_24H) {
      // Limite atingido para este IP — mostra anúncios mas não credita (proteção antifraude).
      return Response.json({
        success: true,
        already_counted: true,
        points_earned: 0,
        not_credited_reason: 'Limite de créditos por IP atingido para hoje.',
        ads: adsForClient,
        owner_email: ownerEmail,
        owner_name: ownerName
      });
    }

    // Credit points to link owner: process ALL eligible ads as mega_link shares
    let pointsEarned = 0;
    if (eligibleAds.length > 0) {
      const ownerPoints = await base44.asServiceRole.entities.UserPoints.filter({ user_email: ownerEmail });
      const ownerNameFromPoints = ownerPoints[0]?.user_name || ownerEmail.split('@')[0];
      const pseudoUser = { email: ownerEmail, full_name: ownerNameFromPoints };

      for (const ad of eligibleAds) {
        try {
          const result = await processSingleShare(base44, pseudoUser, ad, 'mega_link', { visitor_ip: fingerprint }, { skipCooldown: true });
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