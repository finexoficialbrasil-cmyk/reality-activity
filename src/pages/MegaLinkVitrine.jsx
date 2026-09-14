import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePublicData } from '@/hooks/usePublicData';
import { motion } from 'framer-motion';
import { ExternalLink, Share2, Loader2, Zap, Gift, Sparkles, Cpu } from 'lucide-react';
import { toast } from 'sonner';

const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
);
const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const SHARE_OPTS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: WhatsAppIcon, color: 'text-[#25D366]' },
  { id: 'telegram', name: 'Telegram', Icon: TelegramIcon, color: 'text-[#0088cc]' },
  { id: 'facebook', name: 'Facebook', Icon: FacebookIcon, color: 'text-[#1877F2]' },
  { id: 'twitter', name: 'X', Icon: XIcon, color: 'text-foreground' },
];

const CYAN = '#00f2ff';
const PINK = '#ff007a';

// Cores oficiais das marcas — visitantes reconhecem marcas grandes e confiam mais
const BRAND_COLORS = {
  mercadolivre: '#FFE600',
  mercado_livre: '#FFE600',
  mercado_livre: '#FFE600',
  airbnb: '#FF5A5F',
  amazon: '#FF9900',
  shopee: '#EE4D2D',
  magalu: '#0086FF',
  magazineluiza: '#0086FF',
  americanas: '#E60012',
  aliexpress: '#E62E04',
  shein: '#F2F2F2',
  mercadopago: '#00B1EA',
  netflix: '#E50914',
  spotify: '#1DB954',
  ifood: '#EA1D2C',
  olx: '#6E278E',
  ebay: '#E53238',
  walmart: '#FFC220',
  apple: '#A8A8A8',
  google: '#4285F4',
  microsoft: '#00A4EF',
  samsung: '#1428A0',
  nike: '#FF6900',
  adidas: '#FFFFFF',
  coca: '#F40009',
  pepsi: '#004B93',
  starbucks: '#00704A',
  mcdonalds: '#FFC72C',
  burger: '#E5A728',
  netshoes: '#FF1F4B',
  kabum: '#8DC63F',
  pichau: '#FF5500',
  terabithia: '#00C2FF',
  mercadolivrebrasil: '#FFE600',
};

const getBrandColor = (category) => {
  if (!category) return null;
  const slug = String(category).toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
  return BRAND_COLORS[slug] || null;
};

// Decide cor do texto (escuro/claro) com base na luminância da cor da marca
const getContrastColor = (hex) => {
  if (!hex) return '#000';
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#000' : '#fff';
};

// Formata o slug da categoria para exibição amigável (ex: mercado_livre -> Mercado Livre)
const formatBrandLabel = (category) => {
  if (!category) return 'anúncio';
  return String(category)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function MegaLinkVitrine() {
  const { userSlug } = useParams();
  const { data: publicData, isLoading: publicLoading, error: publicError } = usePublicData();
  const [ads, setAds] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [pointsEarned, setPointsEarned] = useState(0);
  const [alreadyCounted, setAlreadyCounted] = useState(false);
  const [shareMenuFor, setShareMenuFor] = useState(null);
  const [user, setUser] = useState(null);
  const [trackError, setTrackError] = useState(false);
  const ownerEmailRef = useRef('');

  // Decodifica email do dono: base64 (legado, instantâneo) ou aguarda trackMegaLinkClick (slug curto)
  useEffect(() => {
    try {
      const decoded = atob(userSlug.replace(/-/g, '+').replace(/_/g, '/'));
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded)) {
        ownerEmailRef.current = decoded;
        setOwnerEmail(decoded);
        setOwnerName(decoded.split('@')[0]);
      }
    } catch {
      // slug curto — dono será resolvido via trackMegaLinkClick
    }
  }, [userSlug]);

  // Filtra anúncios públicos (do hook cacheado, não exige login) removendo os do dono
  useEffect(() => {
    if (!publicData?.advertisements || !ownerEmail) return;
    setAds(publicData.advertisements.filter(a => a.user_email !== ownerEmail));
  }, [publicData, ownerEmail]);

  // Auth em paralelo (não bloqueia render — visitantes anônimos são ok)
  useEffect(() => {
    let cancelled = false;
    base44.auth.isAuthenticated().then(async (auth) => {
      if (auth && !cancelled) {
        try { setUser(await base44.auth.me()); } catch {}
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // BACKGROUND: credita pontos sem bloquear a tela (fire-and-forget)
  useEffect(() => {
    let cancelled = false;
    const getVisitorId = () => {
      try {
        let id = localStorage.getItem('ra_visitor_id');
        if (!id) {
          id = 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem('ra_visitor_id', id);
        }
        return id;
      } catch {
        return null;
      }
    };
    base44.functions.invoke('trackMegaLinkClick', { slug: userSlug, visitor_id: getVisitorId() })
      .then(res => {
        if (cancelled) return;
        const data = res.data;
        if (data?.success) {
          setPointsEarned(data.points_earned || 0);
          setAlreadyCounted(!!data.already_counted);
          // Slug curto: resolve dono e anúncios a partir da resposta do servidor
          if (data.owner_email && !ownerEmailRef.current) {
            ownerEmailRef.current = data.owner_email;
            setOwnerEmail(data.owner_email);
            setOwnerName(data.owner_name || data.owner_email.split('@')[0]);
            if (data.ads) setAds(data.ads);
          }
        }
      })
      .catch(() => { if (!cancelled) setTrackError(true); });
    return () => { cancelled = true; };
  }, [userSlug]);

  const loading = ads.length === 0 && (publicLoading || !ownerEmail);
  const error = publicError
    ? (publicError.message || 'Erro ao carregar vitrine')
    : (trackError && !ownerEmail ? 'Vitrine não encontrada' : null);

  const handleShareSingle = async (ad, platform) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    const productLink = ad.link;
    const siteUrl = window.location.origin;
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let url = '';

    switch (platform) {
      case 'whatsapp': {
        const msg = [
          `🚨 Oferta imperdível...`,
          ``,
          `📌 ${ad.title}`,
          `${productLink}`,
          ``,
          `—`,
          `🚀 Além de divulgar promoções, ainda acumulo pontos que posso trocar por benefícios. https://realityactivity.com`
        ].join('\n');
        url = isMobile
          ? `whatsapp://send?text=${encodeURIComponent(msg)}`
          : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        break;
      }
      case 'telegram': {
        const msg = `${ad.title}\n\n${productLink}\n\nvia ${siteUrl}`;
        url = `https://t.me/share/url?url=${encodeURIComponent(productLink)}&text=${encodeURIComponent(msg)}`;
        break;
      }
      case 'facebook': {
        const msg = `${ad.title}\n\n${productLink}`;
        if (isMobile && navigator.share) {
          navigator.share({ title: ad.title, text: msg, url: productLink }).catch(() => {});
        } else {
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(msg)}`;
        }
        break;
      }
      case 'twitter': {
        const msg = [
          `🚨 Oferta imperdível...`,
          ``,
          `📌 ${ad.title}`,
          `${productLink}`,
          ``,
          `—`,
          `🚀 Além de divulgar promoções, ainda acumulo pontos que posso trocar por benefícios. https://realityactivity.com`
        ].join('\n');
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
        break;
      }
    }

    if (url) window.open(url, '_blank');
    setShareMenuFor(null);

    if (ad.user_email === user.email) {
      toast.error('Você não pode ganhar pontos compartilhando seu próprio anúncio');
      return;
    }

    base44.functions.invoke('processAdvertisementShare', {
      advertisement_id: ad.id,
      platform
    }).then(res => {
      toast.success(`+${res.data.pointsCost} pontos! 🎉`);
    }).catch(err => {
      const serverMsg = err?.response?.data?.error || err?.data?.error || err?.message;
      toast.error(serverMsg || 'Erro ao processar compartilhamento');
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] cyber-grid flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: CYAN }} />
          <p className="font-cyber-mono text-xs tracking-widest" style={{ color: CYAN }}>CARREGANDO VITRINE...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] cyber-grid flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-bold mb-2" style={{ color: PINK }}>SYSTEM ERROR</p>
          <p className="font-cyber-mono text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] cyber-grid">
      <div className="flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside className="md:sticky md:top-0 md:h-screen md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r p-5 md:p-6 flex flex-col" style={{ borderColor: 'hsl(190 100% 50% / 0.15)' }}>
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: CYAN, boxShadow: `0 0 20px ${CYAN}55` }}>
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="font-cyber-mono text-[10px] tracking-[0.2em] text-muted-foreground leading-none mb-1">VITRINE DE</p>
              <h1 className="font-grotesk font-bold text-lg text-white leading-none capitalize truncate max-w-[180px]">{ownerName}</h1>
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md mb-5 self-start" style={{ background: CYAN, color: '#000' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-cyber-mono text-xs font-bold tracking-wide">{ads.length} OFERTAS</span>
          </div>

          {/* Notification Box */}
          {pointsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="pixel-border rounded-lg p-3.5 mb-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 flex-shrink-0" style={{ color: PINK }} />
                <span className="font-cyber-mono text-[10px] tracking-widest" style={{ color: PINK }}>PONTOS CREDITADOS</span>
              </div>
              <p className="text-sm text-white font-medium leading-snug">
                Você ajudou <span className="font-bold capitalize" style={{ color: PINK }}>{ownerName}</span> a ganhar <span className="font-bold" style={{ color: CYAN }}>+{pointsEarned}</span> pontos! 🎉
              </p>
            </motion.div>
          )}

          {alreadyCounted && (
            <div className="rounded-lg p-3 mb-4 border" style={{ borderColor: 'hsl(190 100% 50% / 0.2)', background: 'hsl(190 100% 50% / 0.05)' }}>
              <p className="font-cyber-mono text-[10px] tracking-widest text-muted-foreground mb-1">STATUS</p>
              <p className="text-xs text-white">Bem-vindo de volta! Seu clique já foi contado.</p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-auto pt-4 border-t" style={{ borderColor: 'hsl(190 100% 50% / 0.1)' }}>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-md p-2.5 border" style={{ borderColor: 'hsl(190 100% 50% / 0.15)', background: 'hsl(190 100% 50% / 0.03)' }}>
                <p className="font-cyber-mono text-[9px] tracking-widest text-muted-foreground mb-0.5">LINKS</p>
                <p className="font-grotesk font-bold text-lg" style={{ color: CYAN }}>{ads.length}</p>
              </div>
              <div className="rounded-md p-2.5 border" style={{ borderColor: 'hsl(330 100% 50% / 0.15)', background: 'hsl(330 100% 50% / 0.03)' }}>
                <p className="font-cyber-mono text-[9px] tracking-widest text-muted-foreground mb-0.5">PTS</p>
                <p className="font-grotesk font-bold text-lg" style={{ color: PINK }}>{pointsEarned}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-black" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Reality Activity</p>
                <p className="font-cyber-mono text-[9px] text-muted-foreground leading-none mt-0.5">Compartilhe e ganhe</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content - Grid */}
        <main className="flex-1 p-4 md:p-6">
          {ads.length === 0 ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="text-center">
                <Share2 className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-cyber-mono text-xs text-muted-foreground tracking-widest">NENHUM ANÚNCIO DISPONÍVEL</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {ads.map((ad, i) => (
                <CyberCard key={ad.id} ad={ad} index={i} onShare={setShareMenuFor} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Share menu for individual ad */}
      {shareMenuFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShareMenuFor(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="relative w-full max-w-md bg-[#0d0e11] border-t rounded-t-2xl p-5"
            style={{ borderColor: 'hsl(190 100% 50% / 0.3)', boxShadow: `0 -10px 40px ${CYAN}22` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pb-3">
              <div className="w-12 h-1.5 rounded-full" style={{ background: 'hsl(190 100% 50% / 0.3)' }} />
            </div>
            <p className="font-cyber-mono text-[10px] tracking-widest text-muted-foreground mb-1">COMPARTILHAR</p>
            <p className="text-sm font-semibold text-white mb-4 truncate">{shareMenuFor.title}</p>
            <div className="grid grid-cols-4 gap-2">
              {SHARE_OPTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleShareSingle(shareMenuFor, p.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors"
                  style={{ borderColor: 'hsl(190 100% 50% / 0.1)' }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'hsl(190 100% 50% / 0.08)' }}>
                    <p.Icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{p.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function BudgetMeter({ remaining, total }) {
  const pct = total ? remaining / total : 0;
  const segments = 8;
  const filled = Math.max(0, Math.round(pct * segments));
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filled;
        const isLast = i === filled - 1;
        return (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all"
            style={{
              background: isFilled ? (isLast ? PINK : CYAN) : '#1a1a1e',
              boxShadow: isFilled ? `0 0 6px ${isLast ? PINK : CYAN}` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

function CyberCard({ ad, index, onShare }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="cyber-border rounded-xl bg-[#0d0e11] flex flex-col overflow-hidden hover:glow-cyan transition-all"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'hsl(190 100% 50% / 0.12)' }}>
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5" style={{ color: CYAN }} />
          {(() => {
            const brandColor = getBrandColor(ad.category);
            const label = formatBrandLabel(ad.category);
            if (brandColor) {
              return (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full font-grotesk text-[10px] font-bold leading-none"
                  style={{ background: brandColor, color: getContrastColor(brandColor) }}
                >
                  {label}
                </span>
              );
            }
            return (
              <span className="font-cyber-mono text-[9px] tracking-widest uppercase text-muted-foreground">
                {label}
              </span>
            );
          })()}
        </div>
        <BudgetMeter remaining={ad.budget_remaining} total={ad.budget_total} />
      </div>

      {/* Image */}
      <div className="relative aspect-[16/10] bg-[#15161a] overflow-hidden">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Share2 className="w-8 h-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #0d0e11 0%, transparent 40%)` }} />
      </div>

      {/* Body */}
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-grotesk font-bold text-sm text-white line-clamp-2 mb-1.5 leading-snug">{ad.title}</h3>
        {ad.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{ad.description}</p>
        )}

        {/* Budget label */}
        <div className="flex items-center justify-between mb-3 mt-auto">
          <span className="font-cyber-mono text-[9px] tracking-widest text-muted-foreground">BUDGET</span>
          <span className="font-cyber-mono text-xs font-bold" style={{ color: CYAN }}>
            {ad.budget_remaining}<span className="text-muted-foreground">/</span>{ad.budget_total}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={ad.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-grotesk font-bold text-xs transition-all hover:brightness-110"
            style={{ background: CYAN, color: '#000', boxShadow: `0 0 12px ${CYAN}44` }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ir
          </a>
          <button
            onClick={() => onShare(ad)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-grotesk font-bold text-xs transition-all hover:bg-[#ff007a]/10"
            style={{ border: `1px solid ${PINK}`, color: PINK }}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}