import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, ExternalLink, Copy, CheckCircle, Loader2, MessageCircle, Twitter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle },
  { id: 'twitter', name: 'X', Icon: Twitter },
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

      switch (platform) {
        case 'whatsapp':
          url = `https://web.whatsapp.com/send?text=${encodeURIComponent(baseMessage)}`;
          break;
        case 'twitter':
          messageText = `Achei esse produto incrível ${ad.title} e já tô ganhando pontos compartilhando! 💰 Você também pode ganhar pontos em ${siteUrl} ${productLink} #GanheComACommunity`;
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

        {/* Share Button Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <motion.button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="w-14 h-14 rounded-full bg-gold/95 flex items-center justify-center glow-gold hover:bg-gold transition-all"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                disabled={isSharing}
              >
                {isSharing ? (
                  <Loader2 className="w-6 h-6 text-background animate-spin" />
                ) : (
                  <Share2 className="w-6 h-6 text-background" />
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Menu */}
        <AnimatePresence>
          {showShareMenu && isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-20 gap-2 flex-wrap p-4"
            >
              {SHARE_PLATFORMS.map((p) => (
                <motion.button
                  key={p.id}
                  onClick={() => handleShare(p.id)}
                  disabled={isSharing}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gold/10 transition-all cursor-pointer"
                >
                  <p.Icon className="w-5 h-5 text-foreground" />
                  <span className="text-xs font-semibold text-foreground">{p.name}</span>
                  {sharedPlatform === p.id && (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 absolute -top-1 -right-1" />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs font-semibold text-gold">+{ad.reward_per_share} pts</span>
          <button
            onClick={() => window.open(ad.link, '_blank')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Ir
          </button>
        </div>
      </div>
    </motion.div>
  );
}