import { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, CheckCircle, Play, Gift, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Ícones customizados das marcas (lucide não tem ícones oficiais de redes sociais)
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
  { id: 'twitter', name: 'X', Icon: Twitter, color: 'text-[#000000] hover:bg-black/10' },
  { id: 'pinterest', name: 'Pinterest', Icon: PinterestIcon, color: 'text-[#E60023] hover:bg-[#E60023]/10' },
  { id: 'copy', name: 'Copiar Link', Icon: LinkIcon, color: 'text-muted-foreground hover:bg-secondary' },
];

// Extract YouTube video ID
function getYouTubeId(url) {
  if (!url) return null;
  let id = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) id = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) id = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) id = url.match(/^([a-zA-Z0-9_-]{11})$/)?.[0];
  return id || null;
}

// Load YouTube IFrame API
function loadYTApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(); return; }
    if (window._ytApiLoading) { window._ytApiCallbacks = window._ytApiCallbacks || []; window._ytApiCallbacks.push(resolve); return; }
    window._ytApiLoading = true;
    window._ytApiCallbacks = [resolve];
    window.onYouTubeIframeAPIReady = () => {
      (window._ytApiCallbacks || []).forEach(cb => cb());
      window._ytApiCallbacks = [];
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

export default function VideoAdvertisementCard({ ad, user, onPointsEarned }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedPlatform, setSharedPlatform] = useState(null);
  const [copied, setCopied] = useState(false); // NOVO: Estado do botão copiar
  const [playerReady, setPlayerReady] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const ytWrapperRef = useRef(null);
  const playerRef = useRef(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);
  const secondsRef = useRef(0);
  const pointsRef = useRef(0);
  const isCounting = useRef(false);
  const savedRef = useRef(false);

  const youtubeId = getYouTubeId(ad.video_url);
  const pps = ad.reward_per_share || 1;
  const maxPts = pps * 30; // Assume 30 segundos máximo

  // YouTube IFrame API setup
  useEffect(() => {
    if (!youtubeId || !ytWrapperRef.current) return;
    mountedRef.current = true;

    const ytDiv = document.createElement('div');
    ytWrapperRef.current.appendChild(ytDiv);
    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed || !ytDiv.isConnected) return;
      try {
        playerRef.current = new window.YT.Player(ytDiv, {
          videoId: youtubeId,
          width: '100%',
          height: '100%',
          playerVars: { controls: 1, modestbranding: 1, rel: 0, playsinline: 1, fs: 1 },
          events: {
            onReady: () => {
              if (mountedRef.current) setPlayerReady(true);
            },
            onStateChange: (e) => {
              if (!mountedRef.current) return;
              if (e.data === 1 && user) {
                // Playing
              } else if (e.data === 2) {
                // Paused
              }
            }
          }
        });
      } catch (err) {
        console.error('Erro ao criar YouTube Player:', err);
      }
    }).catch(err => {
      console.error('Erro ao carregar API YouTube:', err);
    });

    return () => {
      destroyed = true;
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      isCounting.current = false;
      
      const secs = Math.floor(secondsRef.current);
      const pts = Math.floor(pointsRef.current);
      
      if (secs > 0 && pts > 0 && !savedRef.current) {
        savePoints(pts, secs);
      }
      
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [youtubeId]);

  // Save points to database
  const savePoints = useCallback(async (pts, secs) => {
    if (pts <= 0 || !user || savedRef.current) return;
    savedRef.current = true;
    
    try {
      // Trava de 24h: verifica se já ganhou pontos neste anúncio nas últimas 24h
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentWatches = await base44.entities.PointsTransaction.filter({
        user_email: user.email,
        type: 'earned_watch'
      });
      const watchedRecently = recentWatches
        .filter(t => t.description?.includes(ad.title))
        .some(t => t.created_date > since24h);
      if (watchedRecently) {
        toast.info('Você já ganhou pontos com este anúncio nas últimas 24h. Volte amanhã! ⏳');
        savedRef.current = false;
        return;
      }

      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'earned_watch',
        points: pts,
        description: `Compartilhou anúncio "${ad.title}" por ${secs}s`,
        watch_seconds: secs
      });
      
      const existing = await base44.entities.UserPoints.filter({ user_email: user.email });
      if (existing.length > 0) {
        await base44.entities.UserPoints.update(existing[0].id, {
          balance: (existing[0].balance || 0) + pts,
          total_earned: (existing[0].total_earned || 0) + pts,
          last_activity: new Date().toISOString()
        });
      } else {
        await base44.entities.UserPoints.create({
          user_email: user.email,
          user_name: user.full_name,
          balance: pts,
          total_earned: pts,
          last_activity: new Date().toISOString()
        });
      }
      if (onPointsEarned) onPointsEarned();
    } catch (err) {
      console.error('Erro ao salvar pontos:', err);
      savedRef.current = false;
    }
  }, [user, ad, onPointsEarned]);

  // Start counting points
  const startCounting = useCallback(() => {
    if (!user) return;
    if (isCounting.current) return;
    isCounting.current = true;
    if (mountedRef.current) setIsWatching(true);

    intervalRef.current = setInterval(() => {
      const budgetRemaining = ad.budget_remaining || 0;
      const pointsToAdd = Math.min(pps, budgetRemaining);
      
      if (pointsToAdd <= 0) {
        stopCounting();
        return;
      }
      
      secondsRef.current += 1;
      pointsRef.current += pointsToAdd;
      if (mountedRef.current) setPointsEarned(prev => prev + pointsToAdd);
    }, 1000);
  }, [user, pps, ad.budget_remaining]);

  // Stop counting points
  const stopCounting = useCallback(() => {
    if (!isCounting.current) return;
    isCounting.current = false;
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    const secs = Math.floor(secondsRef.current);
    const pts = Math.floor(pointsRef.current);

    if (mountedRef.current) setIsWatching(false);

    if (secs > 0 && pts > 0 && !savedRef.current) {
      savePoints(pts, secs);
    }

    secondsRef.current = 0;
    pointsRef.current = 0;
  }, [savePoints]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      isCounting.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      const secs = Math.floor(secondsRef.current);
      const pts = Math.floor(pointsRef.current);
      
      if (secs > 0 && pts > 0 && !savedRef.current) {
        savePoints(pts, secs);
      }
    };
  }, [savePoints]);

  const handleYTEnter = () => {
    setIsHovered(true);
    if (playerReady) {
      try { 
        playerRef.current?.playVideo();
        if (user && !isCounting.current) startCounting();
      } catch {}
    }
  };

  const handleYTLeave = async () => {
    setIsHovered(false);
    if (playerReady) {
      try { playerRef.current?.pauseVideo(); } catch {}
    }
    stopCounting();
  };

  const handleShare = async (platform) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    const productLink = ad.link;
    const isMobile = /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let url = '';

    switch (platform) {
      case 'whatsapp': {
        // Mensagem limpa (sem link do seu site para não gerar 2 previews feios no WhatsApp)
        const msg = `vi isso e achei muito bom 👇\n\n${productLink}`;
        url = isMobile 
          ? `whatsapp://send?text=${encodeURIComponent(msg)}`
          : `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        break;
      }

      case 'telegram': {
        const msg = `vi isso e achei muito bom 👇\n\n${productLink}`;
        url = `https://t.me/share/url?url=${encodeURIComponent(productLink)}&text=${encodeURIComponent(msg)}`;
        break;
      }

      case 'facebook': {
        // Facebook puxa o preview automaticamente
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productLink)}`;
        break;
      }

      case 'twitter': {
        const msg = `${ad.title}\n\n${productLink}`;
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
        break;
      }

      case 'pinterest': {
        // Verifica se a imagem é válida antes de enviar para não dar erro
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

      case 'copy': {
        try {
          await navigator.clipboard.writeText(productLink);
          setCopied(true);
          toast.success('Link copiado! Cole onde quiser 📋');
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          toast.error('Não foi possível copiar o link');
        }
        return; // Interrompe a função para não abrir janela nem dar pontos
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
  const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
  
  // Verificar se está em cooldown
  const cooldownUntil = ad.cooldown_until ? new Date(ad.cooldown_until) : null;
  const isInCooldown = cooldownUntil && new Date() < cooldownUntil;

  return (
    <motion.div
      className="relative rounded-lg overflow-hidden bg-card border border-border group transition-all duration-300 hover:border-gold/40 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={handleYTEnter}
      onMouseLeave={handleYTLeave}
    >
      {/* Video Container */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {/* YouTube IFrame API container */}
        <div ref={ytWrapperRef} className="absolute inset-0 w-full h-full" style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s' }} />

        {/* Thumbnail shown before hover */}
        {!isHovered && (
          <div className="absolute inset-0">
            {thumbnail
              ? <img src={thumbnail} alt={ad.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                  <Play className="w-12 h-12 text-muted-foreground opacity-40" />
                </div>
            }
            <div className="absolute inset-0 bg-background/30 group-hover:bg-background/10 transition-all flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-2 left-2 bg-gold/90 rounded-full px-2 py-1 text-xs font-bold text-background z-10">
          {categoryLabels[ad.category]}
        </div>

        {/* Share Buttons - Sobre o vídeo */}
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
              {sharedPlatform === p.id && p.id !== 'copy' && (
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
                <span className="text-xs font-semibold text-gold">+{ad.reward_per_share} pts/s</span>
                <span className="text-xs text-muted-foreground">por segundo assistido</span>
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

          {/* Progress Bar - Ganhos em tempo real */}
          {isWatching && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gold">Ganho agora</span>
                <span className="text-xs font-bold text-gold">{Math.floor(pointsEarned)} / {ad.budget_remaining} pts</span>
              </div>
              <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden border border-gold/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((pointsEarned / ad.budget_remaining) * 100, 100)}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}

          {/* Advertiser Info */}
          <div className="text-xs text-muted-foreground/70 pt-1 border-t border-border/40">
            Anunciado por: <span className="font-medium text-foreground">{ad.user_name}</span>
          </div>

          {isInCooldown && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-500 text-center">
              ⏱️ Em cooldown por {Math.ceil((cooldownUntil - new Date()) / 1000 / 60)} min
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}