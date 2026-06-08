import { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, ExternalLink, Copy, CheckCircle, Loader2, MessageCircle, Twitter, Facebook, Play, Star, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const SHARE_PLATFORMS = [
  { id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle, color: 'text-[#25D366] hover:bg-[#25D366]/10' },
  { id: 'facebook', name: 'Facebook', Icon: Facebook, color: 'text-[#1877F2] hover:bg-[#1877F2]/10' },
  { id: 'twitter', name: 'X', Icon: Twitter, color: 'text-[#000000] hover:bg-black/10' },
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedPlatform, setSharedPlatform] = useState(null);
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
  }, [youtubeId, savePoints]);

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

  // Save points to database
  const savePoints = useCallback(async (pts, secs) => {
    if (pts <= 0 || !user || savedRef.current) return;
    savedRef.current = true;
    
    try {
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

  // Start counting points
  const startCounting = useCallback(() => {
    if (!user) return;
    if (isCounting.current) return;
    isCounting.current = true;
    if (mountedRef.current) setIsWatching(true);

    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
      pointsRef.current += pps;
      if (mountedRef.current) setPointsEarned(prev => prev + pps);
    }, 1000);
  }, [user, pps]);

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
  const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;

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
            <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
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

        {/* Share Buttons - Always visible */}
        <div className="absolute bottom-2 left-0 right-0 z-20 flex items-center gap-1 justify-center">
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
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold" />
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

          {/* Progress Bar - Ganhos em tempo real */}
          {isWatching && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gold">Ganho agora</span>
                <span className="text-xs font-bold text-gold">{Math.floor(pointsEarned)} / {maxPts} pts</span>
              </div>
              <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden border border-gold/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pointsEarned / maxPts) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}