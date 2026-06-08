import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, ExternalLink, Copy, CheckCircle, Loader2, MessageCircle, Instagram, Facebook, Youtube, Music, Twitter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle },
  { id: 'instagram', name: 'Instagram', Icon: Instagram },
  { id: 'facebook', name: 'Facebook', Icon: Facebook },
  { id: 'youtube', name: 'YouTube', Icon: Youtube },
  { id: 'tiktok', name: 'TikTok', Icon: Music },
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
      // Processa compartilhamento
      const res = await base44.functions.invoke('processAdvertisementShare', {
        advertisement_id: ad.id,
        platform
      });

      // Gera link compartilhável
      const shareText = `Confira: ${ad.title}`;
      const shareUrl = ad.link;
      let url;

      switch (platform) {
        case 'whatsapp':
          url = `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`;
          break;
        case 'instagram':
          url = `https://instagram.com/`;
          navigator.clipboard.writeText(shareUrl);
          toast.info('Link copiado! Cole no Instagram Stories ou DM');
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          break;
        case 'youtube':
          url = `https://youtube.com/`;
          navigator.clipboard.writeText(shareUrl);
          toast.info('Link copiado! Compartilhe nos comentários');
          break;
        case 'tiktok':
          url = `https://tiktok.com/`;
          navigator.clipboard.writeText(shareUrl);
          toast.info('Link copiado! Compartilhe no TikTok');
          break;
        case 'twitter':
          url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
          break;
      }

      if (url && !['instagram', 'youtube', 'tiktok'].includes(platform)) {
        window.open(url, '_blank');
      }

      setSharedPlatform(platform);
      toast.success(`+${res.data.pointsEarned} pontos! 🎉`);
      if (onPointsEarned) onPointsEarned();

      setTimeout(() => {
        setShowShareMenu(false);
        setSharedPlatform(null);
      }, 2000);
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

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden bg-card border border-border group cursor-pointer transition-all duration-300 hover:border-gold/40"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagem do Anúncio */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <Share2 className="w-12 h-12 text-muted-foreground opacity-40" />
          </div>
        )}
        <div className="absolute inset-0 bg-background/40 group-hover:bg-background/20 transition-all" />

        {/* Badge de Categoria */}
        <div className="absolute top-3 left-3 bg-gold/90 rounded-full px-3 py-1.5 text-xs font-bold text-background">
          {categoryLabels[ad.category]}
        </div>

        {/* Shares Count */}
        <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-gold flex items-center gap-1">
          <Share2 className="w-3 h-3" />
          {ad.shares_count} compartilhamentos
        </div>

        {/* Botão Principal de Compartilhamento */}
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
                className="w-16 h-16 rounded-full bg-gold/95 flex items-center justify-center glow-gold hover:bg-gold transition-all"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                disabled={isSharing}
              >
                {isSharing ? (
                  <Loader2 className="w-7 h-7 text-background animate-spin" />
                ) : (
                  <Share2 className="w-7 h-7 text-background" />
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Menu de Compartilhamento */}
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
                <p.Icon className="w-6 h-6 text-foreground" />
                <span className="text-xs font-semibold text-foreground">{p.name}</span>
                {sharedPlatform === p.id && (
                  <CheckCircle className="w-4 h-4 text-green-500 absolute -top-1 -right-1" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{ad.title}</h3>
        {ad.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>
        )}

        {/* Info de Pontos */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="text-xs font-semibold text-gold">
            +{ad.reward_per_share} pts/share
          </div>
          <button
            onClick={() => window.open(ad.link, '_blank')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Visitar
          </button>
        </div>
      </div>
    </motion.div>
  );
}