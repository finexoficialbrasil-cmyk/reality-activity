import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SLUG_LEN = 8;

function generateSlug(): string {
  const arr = new Uint8Array(SLUG_LEN);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < SLUG_LEN; i++) {
    out += CHARSET[arr[i] % CHARSET.length];
  }
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await base44.asServiceRole.entities.UserPoints.filter({ user_email: user.email });

    if (existing[0]?.mega_link_slug) {
      return Response.json({ slug: existing[0].mega_link_slug });
    }

    let slug = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug();
      const conflict = await base44.asServiceRole.entities.UserPoints.filter({ mega_link_slug: candidate });
      if (conflict.length === 0) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      return Response.json({ error: 'Não foi possível gerar um código único' }, { status: 500 });
    }

    if (existing[0]) {
      await base44.asServiceRole.entities.UserPoints.update(existing[0].id, { mega_link_slug: slug });
    } else {
      await base44.asServiceRole.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        mega_link_slug: slug
      });
    }

    return Response.json({ slug });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}