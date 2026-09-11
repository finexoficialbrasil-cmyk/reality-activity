import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ExternalLink, Share2, Loader2, Zap, Gift, Sparkles } from 'lucide-react';
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

export default function MegaLinkVitrine() {
  const { userSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [pointsEarned, setPointsEarned] = useState(0);
  const [alreadyCounted, setAlreadyCounted] = useState(false);
  const [error, setError] = useState(null);
  const [shareMenuFor, setShareMenuFor] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('trackMegaLinkClick', { slug: userSlug });
        const data = res.data;
        if (data?.success) {
          setAds(data.ads || []);
          setPointsEarned(data.points_earned || 0);
          setAlreadyCounted(!!data.already_counted);
          try {
            const email = atob(userSlug.replace(/-/g, '+').replace(/_/g, '/'));
            setOwnerName(email.split('@')[0]);
          } catch {
            setOwnerName('Reality Activity');
          }
        } else {
          setError(data?.error || 'Erro ao carregar vitrine');
        }
      } catch (err) {
        setError(err?.message || 'Erro ao carregar vitrine');
      } finally {
        setLoading(false);
      }
    })();
  }, [userSlug]);

  const handleShareSingle = (ad, platform) => {
    const siteUrl = window.location.origin;
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const msg = `${ad.title}\n\n${ad.link}\n\nvia ${siteUrl}`;
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = isMobile ? `whatsapp://send?text=${encodeURIComponent(msg)}` : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(ad.link)}&text=${encodeURIComponent(msg)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ad.link)}&quote=${encodeURIComponent(msg)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
        break;
    }
    if (url) window.open(url, '_blank');
    setShareMenuFor(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Carregando vitrine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive text-lg font-semibold mb-2">Ops!</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center glow-gold">
              <Zap className="w-5 h-5 text-background" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Vitrine de</p>
              <p className="text-sm font-bold text-foreground capitalize leading-none">{ownerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-semibold text-gold">{ads.length} ofertas</span>
          </div>
        </div>
      </header>

      {/* Click feedback banner */}
      {pointsEarned > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto px-4 pt-3"
        >
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
            <Gift className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-400 font-medium">Você ajudou {ownerName} a ganhar +{pointsEarned} pontos! 🎉</p>
          </div>
        </motion.div>
      )}
      {alreadyCounted && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Bem-vindo de volta! Seu clique já foi contado.</p>
          </div>
        </div>
      )}

      {/* Carousel */}
      {ads.length === 0 ? (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center">
            <Share2 className="w-14 h-14 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum anúncio disponível nesta vitrine no momento.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map(ad => (
              <VitrineCard key={ad.id} ad={ad} onShare={setShareMenuFor} />
            ))}
          </div>

          {/* Mobile horizontal carousel */}
          <div className="md:hidden flex gap-3 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
            {ads.map(ad => (
              <div key={ad.id} className="snap-start flex-shrink-0 w-[85%]" style={{ scrollSnapAlign: 'start' }}>
                <VitrineCard ad={ad} onShare={setShareMenuFor} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border mt-6 py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded bg-gold flex items-center justify-center">
              <Zap className="w-4 h-4 text-background" />
            </div>
            <span className="text-sm font-bold text-foreground">Reality Activity</span>
          </div>
          <p className="text-xs text-muted-foreground">Compartilhe e ganhe pontos</p>
        </div>
      </footer>

      {/* Share menu for individual ad */}
      {shareMenuFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShareMenuFor(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="relative w-full max-w-md bg-card border-t border-border rounded-t-2xl p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pb-3">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-3 truncate">Compartilhar: {shareMenuFor.title}</p>
            <div className="grid grid-cols-4 gap-2">
              {SHARE_OPTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleShareSingle(shareMenuFor, p.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
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

function VitrineCard({ ad, onShare }) {
  const budgetPct = ad.budget_total ? (ad.budget_remaining / ad.budget_total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden bg-card border border-border flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Share2 className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}
        {ad.category && (
          <div className="absolute top-2 left-2 bg-gold/90 rounded-full px-2.5 py-1 text-xs font-bold text-background">
            {ad.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1">{ad.title}</h3>
        {ad.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">{ad.description}</p>
        )}

        {/* Budget bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Orçamento</span>
            <span className="text-xs font-semibold text-gold">{ad.budget_remaining}/{ad.budget_total}</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gold" style={{ width: `${budgetPct}%` }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <a
            href={ad.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-gold to-yellow-300 text-background font-bold text-xs hover:from-gold-dark hover:to-yellow-400 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ir
          </a>
          <button
            onClick={() => onShare(ad)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-xs hover:bg-secondary/70 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}