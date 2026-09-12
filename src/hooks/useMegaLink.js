import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const slugFromEmail = (email) =>
  btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Hook que resolve o Mega-Link do usuário.
 * Gera (ou recupera) um código curto aleatório via backend function.
 * Enquanto o código curto não chega, usa o base64 do email como fallback.
 */
export function useMegaLink(user) {
  const [slug, setSlug] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('generateMegaLinkSlug', {});
        if (cancelled) return;
        if (res.data?.slug) setSlug(res.data.slug);
      } catch {
        // fallback silencioso para base64
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const resolvedSlug = slug || (user ? slugFromEmail(user.email) : '');
  const megaLink = user ? `${window.location.origin}/vitrine/u/${resolvedSlug}` : '';
  const isShort = !!slug;

  return { slug: resolvedSlug, megaLink, loading, isShort };
}