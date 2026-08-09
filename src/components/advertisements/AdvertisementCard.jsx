import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, ExternalLink, CheckCircle, Gift, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const PinterestIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/>
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
  { id: 'pinterest', name: 'Pinterest', Icon: PinterestIcon, color: 'text-[#E60023] hover:bg-[#E60023]/10' },
  { id: 'copy', name: 'Copiar Link', Icon: LinkIcon, color: 'text-muted-foreground hover:bg-secondary' }, // NOVO BOTÃO AQUI
];

export default function AdvertisementCard({ ad, user, onPointsEarned }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedPlatform, setSharedPlatform] = useState(null);
  const [copied, setCopied] = useState(false); // Estado novo para o botão copiar

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

      case 'pinterest': {
        const hasValidImage = ad.image_url && 
          /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(ad.image_url);
        
        const msg = `${ad.title} - ${productLink}`;
        
        if (hasValidImage) {
          url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productLink)}&description=${encodeURIComponent(msg)}&media=${encodeURIComponent(ad.image_url)}`;
        } else {
          url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productLink)}&description=${encodeURIComponent(msg)}`;
        }
        break;
      }

      // NOVO: Lógica do botão Copiar Link
      case 'copy': {
        try {
          await navigator.clipboard.writeText(productLink);
          setCopied(true);
          toast.success('Link copiado! Cole onde quiser 📋');
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          toast.error('Não foi possível copiar o link');
        }
        // Não continua para o resto da função (abrir janela / dar pontos)
        return; 
      }
    }

    if (url) window.open(url, '_blank');

    setSharedPlatform(platform);
    setIsSharing(true);

    base44.functions.invoke('processAdvertisementShare', {
      advertisement_id: ad.id,
      platform
    }).then(res => {
      toast.success(`+${res.data.pointsCost} pontos! 🎉`);
      if (onPointsEarned) onPointsEarned();
    }).catch(err => {
      toast.error(err.message || 'Erro ao processar compartilhamento');
    }).finally(() => {
      setTimeout(() => {
        setSharedPlatform(null);
        setIsSharing(false);
      }, 1000);
    });
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

        {/* Share Buttons - Sobre a imagem */}
        <div className="absolute bottom-2 left-0 right-0 z-20 flex items-center gap-1.5 justify-center">
          {SHARE_PLATFORMS.map((p) => (
            <motion.button
              key={p.id}
              onClick={() => handleShare(p.id)}
              disabled={isSharing}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg hover:bg-gold/20 transition-all cursor-pointer text-muted-foreground hover:text-gold relative"
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

          {/* Share Buttons - Rodapé com cores das marcas */}
          <div className="flex items-center gap-1.5 justify-center">
            {SHARE_PLATFORMS.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => handleShare(p.id)}
                disabled={isSharing}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                className={`p-1.5 rounded-lg transition-all cursor-pointer relative ${p.color}`}
                title={p.name}
              >
                {/* Se for o botão de copiar e já tiver copiado, muda o ícone para check */}
                {p.id === 'copy' && copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <p.Icon className="w-4 h-4" />
                )}
                
                {sharedPlatform === p.id && p.id !== 'copy' && (
                  <CheckCircle className="w-3 h-3 text-green-500 absolute -top-1 -right-1" />
                )}
              </motion.button>
            ))}
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