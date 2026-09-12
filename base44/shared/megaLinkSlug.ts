const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tenta decodificar um slug base64url (formato legado) para email.
 * Retorna o email se válido, ou null se o slug não for base64 de um email.
 */
export function decodeBase64Slug(slug: string): string | null {
  try {
    const decoded = atob(slug.replace(/-/g, '+').replace(/_/g, '/'));
    return EMAIL_REGEX.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Resolve um slug de Mega-Link para o email e nome do dono.
 * Suporta dois formatos:
 *  - base64url do email (legado, mantido por compatibilidade)
 *  - código curto aleatório (novo, armazenado em UserPoints.mega_link_slug)
 */
export async function resolveOwnerEmail(
  base44: any,
  slug: string
): Promise<{ email: string; name: string } | null> {
  const decoded = decodeBase64Slug(slug);
  if (decoded) {
    return { email: decoded, name: decoded.split('@')[0] };
  }
  const matches = await base44.asServiceRole.entities.UserPoints.filter({ mega_link_slug: slug });
  if (matches[0]) {
    const up = matches[0];
    return {
      email: up.user_email,
      name: up.user_name || up.user_email.split('@')[0]
    };
  }
  return null;
}