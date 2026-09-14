import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, ExternalLink, CheckCircle, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCategories } from '@/hooks/useCategories';
import MoneyFloatEffect from '@/components/advertisements/MoneyFloatEffect';

const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const MessageCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);

const Facebook = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const Twitter = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle, color: 'text-[#25D366] hover:bg-[#25D366]/10' },
  { id: 'telegram', name: 'Telegram', Icon: TelegramIcon, color: 'text-[#0088cc] hover:bg-[#0088cc]/10' },
  { id: 'facebook', name: 'Facebook', Icon: Facebook, color: 'text-[#1877F2] hover:bg-[#1877F2]/10' },
  { id: 'twitter', name: 'X', Icon: Twitter, color: 'text-[#FFFFFF] hover:bg-black/10' },
];

export default function AdvertisementCard({ ad, user, onPointsEarned }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedPlatform, setSharedPlatform] = useState(null);

  const handleShare = async (platform) => {
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
          `🚀 Além de divulgar promoções, ainda acumulo pontos que posso trocar por benefícios. ${siteUrl}`
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
        const msg = `${ad.title}\n\n${productLink}`;
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
        break;
      }

    }

    if (url) window.open(url, '_blank');

    // Bloqueia compartilhamento do próprio anúncio antes de chamar o backend
    if (ad.user_email === user.email) {
      toast.error('Você não pode ganhar pontos compartilhando seu próprio anúncio');
      return;
    }

    setSharedPlatform(platform);
    setIsSharing(true);

    base44.functions.invoke('processAdvertisementShare', {
      advertisement_id: ad.id,
      platform
    }).then(res => {
      toast.success(`+${res.data.pointsCost} pontos! 🎉`);
      if (onPointsEarned) onPointsEarned();
    }).catch(err => {
      const serverMsg = err?.response?.data?.error || err?.data?.error || err?.message;
      toast.error(serverMsg || 'Erro ao processar compartilhamento');
    }).finally(() => {
      setTimeout(() => {
        setSharedPlatform(null);
        setIsSharing(false);
      }, 1000);
    });
  };

  const { getCategoryLabel } = useCategories();

  const budgetPercentage = ad.budget_total ? (ad.budget_remaining / ad.budget_total) * 100 : 0;

  return (
    <motion.div
      className="relative rounded-lg overflow-hidden bg-card border border-border group transition-all duration-300 hover:border-gold/40 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Share2 className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
        )}
        <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-all" />

        {/* Category Badge */}
        <div className="absolute top-2 left-2 bg-gold/90 rounded-full px-2 py-1 text-xs font-bold text-background">
          {getCategoryLabel(ad.category)}
        </div>

      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">{ad.title}</h3>
        {ad.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{ad.description}</p>
        )}

        {/* Budget Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Orçamento</span>
            <span className="text-xs font-semibold text-gold">{ad.budget_remaining}/{ad.budget_total} pts</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gold">+{ad.reward_per_share} pts</span>
                <span className="text-xs text-muted-foreground">por compartilhamento</span>
              </div>
            </div>
            <button
              onClick={() => window.open(ad.link, '_blank')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Ir
            </button>
          </div>

          {/* Share Buttons - WhatsApp em destaque (90% mobile) + outras plataformas */}
          <div className="space-y-2">
            <MoneyFloatEffect>
              <motion.button
                onClick={() => handleShare('whatsapp')}
                disabled={isSharing}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#25D366] text-white font-semibold text-sm transition-all hover:brightness-110 relative shadow-[0_0_12px_rgba(37,211,102,0.3)]"
              >
                <MessageCircle className="w-4 h-4" />
                Compartilhar no Status
                {sharedPlatform === 'whatsapp' && (
                  <CheckCircle className="w-4 h-4 text-white absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </motion.button>
            </MoneyFloatEffect>

            <div className="flex items-center gap-1.5 justify-center">
              {SHARE_PLATFORMS.filter(p => p.id !== 'whatsapp').map((p) => (
                <MoneyFloatEffect key={p.id}>
                  <motion.button
                    onClick={() => handleShare(p.id)}
                    disabled={isSharing}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${p.color}`}
                    title={p.name}
                  >
                    <p.Icon className="w-4 h-4" />

                    {sharedPlatform === p.id && (
                      <CheckCircle className="w-3 h-3 text-green-500 absolute -top-1 -right-1" />
                    )}
                  </motion.button>
                </MoneyFloatEffect>
              ))}
            </div>
          </div>

          {/* Advertiser Info */}
          <div className="text-xs text-muted-foreground/70 pt-1 border-t border-border/40">
            Anunciado por: <span className="font-medium text-foreground">{ad.user_name}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}