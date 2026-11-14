import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveOwnerEmail } from '../../shared/megaLinkSlug.ts';
import { isEmailBlocked, getClientIp } from '../../shared/userGuard.ts';

// Registra cada clique em um anúncio da vitrine do Mega-Link.
// Serve para o contador permanente de cliques por categoria exibido ao dono.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { slug, advertisement_id } = await req.json().catch(() => ({}));

    if (!slug) {
      return Response.json({ error: 'Slug obrigatório' }, { status: 400 });
    }

    const resolved = await resolveOwnerEmail(base44, slug);
    if (!resolved) {
      return Response.json({ error: 'Slug inválido' }, { status: 400 });
    }

    if (await isEmailBlocked(base44, resolved.email)) {
      return Response.json({ error: 'O proprietário deste Mega-Link está bloqueado.' }, { status: 403 });
    }

    // Categoria vem do anúncio no banco (não do cliente) para não ser forjada.
    let category = null;
    if (advertisement_id) {
      const ad = await base44.asServiceRole.entities.Advertisement.get(advertisement_id)
        .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      category = ad?.category || null;
    }

    await base44.asServiceRole.entities.MegaLinkClick.create({
      owner_email: resolved.email,
      click_type: 'ad_click',
      category,
      advertisement_id: advertisement_id || null,
      visitor_fingerprint: getClientIp(req) || 'unknown',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}