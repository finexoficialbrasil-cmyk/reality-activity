import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, ExternalLink, Copy, CheckCircle, Loader2, MessageCircle, Twitter, Facebook } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle, color: 'text-[#25D366] hover:bg-[#25D366]/10' },
  { id: 'facebook', name: 'Facebook', Icon: Facebook, color: 'text-[#1877F2] hover:bg-[#1877F2]/10' },
  { id: 'twitter', name: 'X', Icon: Twitter, color: 'text-[#000000] hover:bg-black/10' },
];

export default function AdvertisementCard({ ad, user, onPointsEarned }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedPlatform, setSharedPlatform] = useState(null);

  const handleShare = async (platform) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    setIsSharing(true);
    try {
      const res = await base44.functions.invoke('processAdvertisementShare', {
        advertisement_id: ad.id,
        platform
      });

      const rewardPoints = res.data.pointsCost;
      const productLink = ad.link;
      const siteUrl = window.location.origin;

      let messageText = '';
      let url = '';

      const baseMessage = `Oii! 👋 Tô ganhando ${rewardPoints} pontos só por compartilhar esse produto incrível! 🎁\n\n✨ Confira: ${ad.title}\n${productLink}\n\nQuer ganhar pontos como eu? Acessa: ${siteUrl}`;

      const isMobile = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      switch (platform) {
        case 'whatsapp':
          url = isMobile 
            ? `whatsapp://send?text=${encodeURIComponent(baseMessage)}`
            : `https://web.whatsapp.com/send?text=${encodeURIComponent(baseMessage)}`;
          break;
        case 'facebook':
          const facebookMessage = `Confira: ${ad.title} - ${productLink}\n\nEu tô ganhando pontos compartilhando isso! ${siteUrl}`;
          if (isMobile) {
            url = `fb://page/${siteUrl}`;
          } else {
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}&quote=${encodeURIComponent(facebookMessage)}`;
          }
          break;
        case 'twitter':
          messageText = `Achei esse produto incrível "${ad.title}" e já tô ganhando pontos compartilhando! 💰\n${productLink}\n\nVocê também pode ganhar pontos em ${siteUrl}\n#GanheComACommunity`;
          url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(messageText)}`;
          break;
      }

      if (url) {
        window.open(url, '_blank');
      }

      setSharedPlatform(platform);
      toast.success(`+${rewardPoints} pontos! 🎉`);
      if (onPointsEarned) onPointsEarned();

      setTimeout(() => {
        setShowShareMenu(false);
        setSharedPlatform(null);
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Erro ao compartilhar');
    } finally {
      setIsSharing(false);
    }
  };

  const categoryLabels = {
    mercado_livre: '💰 Mercado Livre',
    shopee: '🛒 Shopee',
    tiktok_shop: '🎵 TikTok Shop',
    amazon: '📦 Amazon',
    produtos_digitais: '💻 Produtos Digitais',
    servicos: '🔧 Serviços',
    outros: '⭐ Outros'
  };

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
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Share2 className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
        )}
        <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-all" />

        {/* Category Badge */}
        <div className="absolute top-2 left-2 bg-gold/90 rounded-full px-2 py-1 text-xs font-bold text-background">
          {categoryLabels[ad.category]}
        </div>

        {/* Share Buttons - Always visible */}
        <div className="absolute bottom-2 left-0 right-0 z-20 flex items-center gap-1 justify-center">
          {SHARE_PLATFORMS.map((p) => (
            <motion.button
              key={p.id}
              onClick={() => handleShare(p.id)}
              disabled={isSharing}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg hover:bg-gold/20 transition-all cursor-pointer text-muted-foreground hover:text-gold"
              title={p.name}
            >
              <p.Icon className="w-4 h-4" />
              {sharedPlatform === p.id && (
                <CheckCircle className="w-3 h-3 text-green-500 absolute -top-1 -right-1" />
              )}
            </motion.button>
          ))}
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
            <span className="text-xs font-semibold text-gold">+{ad.reward_per_share} pts</span>
            <button
              onClick={() => window.open(ad.link, '_blank')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Ir
            </button>
          </div>
          {/* Share Buttons */}
          <div className="flex items-center gap-1 justify-center">
            {SHARE_PLATFORMS.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => handleShare(p.id)}
                disabled={isSharing}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${p.color}`}
                title={p.name}
              >
                <p.Icon className="w-4 h-4" />
                {sharedPlatform === p.id && (
                  <CheckCircle className="w-3 h-3 text-green-500 absolute -top-1 -right-1" />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}