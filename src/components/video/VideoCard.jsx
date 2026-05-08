import { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Star, CheckCircle, Lock, ExternalLink, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extract YouTube video ID from various URL formats
function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Load YouTube IFrame API once globally
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

export default function VideoCard({ video, company, user, onPointsEarned }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const intervalRef = useRef(null);
  const secondsRef = useRef(0);
  const pointsRef = useRef(0);
  const playerRef = useRef(null);
  const ytWrapperRef = useRef(null);
  const mountedRef = useRef(true);
  const isCounting = useRef(false);

  const youtubeId = getYouTubeId(video.video_url) || getYouTubeId(video.thumbnail_url);
  const type = (video.type === 'youtube' || youtubeId) ? 'youtube' : (video.type || 'mp4');

  const pps = video.points_per_second || 1;
  const bonus = video.bonus_points || 50;
  const maxPts = ((video.duration_seconds || 30) * pps) + bonus;

  // --- Points saving logic ---
  const savePoints = useCallback(async (pts, secs) => {
    if (pts <= 0 || !user) return;
    await base44.entities.PointsTransaction.create({
      user_email: user.email,
      user_name: user.full_name,
      type: 'earned_watch',
      points: pts,
      video_id: video.id,
      company_id: video.company_id,
      description: `Assistiu "${video.title}" por ${secs}s`,
      watch_seconds: secs
    });
    const existing = await base44.entities.UserPoints.filter({ user_email: user.email });
    if (existing.length > 0) {
      await base44.entities.UserPoints.update(existing[0].id, {
        balance: (existing[0].balance || 0) + pts,
        total_earned: (existing[0].total_earned || 0) + pts,
        videos_watched: (existing[0].videos_watched || 0) + 1,
        last_activity: new Date().toISOString()
      });
    } else {
      await base44.entities.UserPoints.create({
        user_email: user.email,
        user_name: user.full_name,
        balance: pts,
        total_earned: pts,
        videos_watched: 1,
        last_activity: new Date().toISOString()
      });
    }
    if (onPointsEarned) onPointsEarned(pts);
  }, [user, video, onPointsEarned]);

  // --- Stop counting ---
  const stopCounting = useCallback(() => {
    if (!isCounting.current) return;
    isCounting.current = false;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const secs = secondsRef.current;
    const pts = pointsRef.current;
    secondsRef.current = 0;
    pointsRef.current = 0;
    if (mountedRef.current) setIsWatching(false);
    if (secs > 0) savePoints(pts, secs);
  }, [savePoints]);

  // --- Start counting ---
  const startCounting = useCallback(() => {
    if (!user) return; // no points for unauthenticated, video still plays visually
    if (isCounting.current) return;
    isCounting.current = true;
    if (mountedRef.current) setIsWatching(true);

    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
      pointsRef.current += pps;
      if (mountedRef.current) setPointsEarned(prev => prev + pps);

      const duration = video.duration_seconds || 30;
      if (secondsRef.current >= duration && !completed) {
        setCompleted(true);
        pointsRef.current += bonus;
        if (mountedRef.current) setPointsEarned(prev => prev + bonus);
        stopCounting();
      }
    }, 1000);
  }, [user, pps, bonus, video.duration_seconds, completed, stopCounting]);

  // --- MP4 mouse handlers ---
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) videoRef.current.play().catch(() => {});
    if (user) startCounting();
    else setShowLoginPrompt(true);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) videoRef.current.pause();
    stopCounting();
    setShowLoginPrompt(false);
  };

  // --- YouTube IFrame API setup ---
  useEffect(() => {
    if (type !== 'youtube' || !youtubeId || !ytWrapperRef.current) return;
    mountedRef.current = true;

    const ytDiv = document.createElement('div');
    ytWrapperRef.current.appendChild(ytDiv);
    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed || !ytDiv.isConnected) return;
      playerRef.current = new window.YT.Player(ytDiv, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { controls: 1, modestbranding: 1, rel: 0, mute: 0, playsinline: 1 },
        events: {
          onReady: () => {
            if (mountedRef.current) setPlayerReady(true);
          },
          onStateChange: (e) => {
            if (!mountedRef.current) return;
            if (e.data === window.YT.PlayerState.PLAYING) {
              startCounting();
            } else {
              stopCounting();
            }
          }
        }
      });
    });

    return () => {
      destroyed = true;
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      const secs = secondsRef.current;
      const pts = pointsRef.current;
      if (secs > 0) savePoints(pts, secs);
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [type, youtubeId]); // eslint-disable-line

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // --- YouTube mouse handlers ---
  const handleYTEnter = () => {
    setIsHovered(true);
    if (playerReady) {
      try { playerRef.current?.playVideo(); } catch {}
    }
    if (!user) setShowLoginPrompt(true);
  };
  const handleYTLeave = () => {
    setIsHovered(false);
    if (playerReady) {
      try { playerRef.current?.pauseVideo(); } catch {}
    }
    setShowLoginPrompt(false);
  };

  // Shared overlays
  const PointsBadge = () => (
    <AnimatePresence>
      {isWatching && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-gold/95 rounded-full px-3 py-1.5 glow-gold z-10">
          <Star className="w-3.5 h-3.5 text-background animate-spin" />
          <span className="text-xs font-bold text-background">+{pointsEarned} pts</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const CompletedBadge = () => completed ? (
    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/90 rounded-full px-3 py-1.5 z-10">
      <CheckCircle className="w-3.5 h-3.5 text-white" />
      <span className="text-xs font-bold text-white">+{bonus} Bônus!</span>
    </div>
  ) : null;

  const LoginPrompt = () => showLoginPrompt ? (
    <div className="absolute bottom-3 left-3 right-3 z-20">
      <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-gold/40 rounded-xl px-3 py-2">
        <Zap className="w-4 h-4 text-gold flex-shrink-0" />
        <p className="text-xs font-medium text-foreground flex-1">
          <span className="text-gold font-bold">Entre grátis</span> e ganhe esses pontos!
        </p>
        <button onClick={() => base44.auth.redirectToLogin()}
          className="bg-gold text-background text-xs font-bold px-3 py-1 rounded-full hover:bg-gold-dark transition-all whitespace-nowrap">
          Entrar
        </button>
      </div>
    </div>
  ) : null;

  const openCompanyLink = (e) => {
    e.stopPropagation();
    if (!company) return;
    if (company.website) window.open(company.website, '_blank');
    else if (company.phone) window.open(`https://wa.me/${company.phone.replace(/\D/g, '')}`, '_blank');
  };

  const PointsBar = () => (
    <div className="flex items-center gap-3 pt-2 border-t border-border mt-2">
      <Star className="w-3.5 h-3.5 text-gold" />
      <span className="text-xs font-medium text-gold">{pps} pt/s</span>
      <span className="text-xs text-muted-foreground">+{bonus} bônus</span>
      <span className="ml-auto text-xs font-semibold">até {maxPts} pts</span>
    </div>
  );

  // --- BANNER type ---
  if (type === 'banner') {
    return (
      <motion.div
        className="relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
        onClick={() => video.banner_link && window.open(video.banner_link, '_blank')}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          {video.banner_url
            ? <img src={video.banner_url} alt={video.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-sm">Banner</div>
          }
          {video.banner_link && (
            <div className="absolute top-2 right-2 bg-background/70 rounded-full p-1">
              <ExternalLink className="w-3.5 h-3.5 text-foreground" />
            </div>
          )}
          <PointsBadge /><CompletedBadge /><LoginPrompt />
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{video.title}</h3>
          {company && (
            <p onClick={openCompanyLink} className={`text-xs text-muted-foreground mt-0.5 flex items-center gap-1 ${(company.website || company.phone) ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}>
              {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
              {company.name}
            </p>
          )}
          <PointsBar />
        </div>
      </motion.div>
    );
  }

  // --- YOUTUBE type ---
  if (type === 'youtube') {
    const thumbnail = video.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);
    return (
      <motion.div
        className="relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }}
        onMouseEnter={handleYTEnter} onMouseLeave={handleYTLeave}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          {/* YouTube IFrame API container */}
          <div ref={ytWrapperRef} className="absolute inset-0 w-full h-full" style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s' }} />
          {/* Thumbnail shown before hover */}
          {!isHovered && (
            <div className="absolute inset-0">
              {thumbnail
                ? <img src={thumbnail} alt={video.title} className="w-full h-full object-cover"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling?.style && (e.target.nextSibling.style.display='flex'); }}
                  />
                : null
              }
              <div className="w-full h-full bg-gradient-to-br from-secondary to-muted items-center justify-center"
                style={{ display: thumbnail ? 'none' : 'flex' }}>
                <Play className="w-12 h-12 text-muted-foreground opacity-40" />
              </div>
              <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>
            </div>
          )}
          <PointsBadge /><CompletedBadge /><LoginPrompt />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.title}</h3>
          {company && (
            <p onClick={openCompanyLink} className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${(company.website || company.phone) ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}>
              {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
              {company.name}
            </p>
          )}
          <PointsBar />
        </div>
      </motion.div>
    );
  }

  // --- MP4 (default) ---
  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden bg-card border border-border group cursor-pointer"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.01 }}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {video.video_url
          ? <video ref={videoRef} src={video.video_url} className="w-full h-full object-cover" muted loop playsInline preload="metadata" poster={video.thumbnail_url} />
          : video.thumbnail_url
            ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                <Play className="w-12 h-12 text-muted-foreground opacity-40" />
              </div>
        }
        <div className={`absolute inset-0 transition-all duration-300 ${isHovered ? 'bg-background/20' : 'bg-background/50'}`} />
        {!isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center glow-gold">
              <Play className="w-6 h-6 text-background ml-1" />
            </div>
          </div>
        )}
        <PointsBadge /><CompletedBadge /><LoginPrompt />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.title}</h3>
        {company && (
          <p onClick={openCompanyLink} className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${(company.website || company.phone) ? 'cursor-pointer hover:text-gold transition-colors' : ''}`}>
            {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
            {company.name}
          </p>
        )}
        <PointsBar />
        {!isHovered && !user && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            🖱️ Passe o mouse para ver o vídeo
          </p>
        )}
        {!isHovered && user && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            🖱️ Passe o mouse para ganhar pontos
          </p>
        )}
      </div>
    </motion.div>
  );
}