import { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Star, CheckCircle, Lock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extract YouTube video ID from various URL formats
function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VideoCard({ video, company, user, onPointsEarned }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const secondsRef = useRef(0);
  const pointsRef = useRef(0);
  const iframeRef = useRef(null);

  // Auto-detect YouTube from URL even if type field is still 'mp4'
  const youtubeId = getYouTubeId(video.video_url);
  const type = youtubeId ? 'youtube' : (video.type || 'mp4');

  const stopEarning = useCallback(async () => {
    if (!intervalRef.current) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (secondsRef.current > 0 && user) {
      const pts = pointsRef.current;
      await base44.entities.PointsTransaction.create({
        user_email: user.email,
        user_name: user.full_name,
        type: 'earned_watch',
        points: pts,
        video_id: video.id,
        company_id: video.company_id,
        description: `Assistiu "${video.title}" por ${secondsRef.current}s`,
        watch_seconds: secondsRef.current
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
    }
    secondsRef.current = 0;
    pointsRef.current = 0;
    setIsWatching(false);
  }, [user, video]);

  const startEarning = useCallback(() => {
    if (!user) { setShowLoginPrompt(true); return; }
    if (intervalRef.current) return;
    setIsWatching(true);

    intervalRef.current = setInterval(() => {
      secondsRef.current += 1;
      const pps = video.points_per_second || 1;
      pointsRef.current += pps;
      setPointsEarned(prev => prev + pps);

      const duration = video.duration_seconds || 30;
      if (secondsRef.current >= duration && !completed) {
        setCompleted(true);
        pointsRef.current += (video.bonus_points || 50);
        setPointsEarned(prev => prev + (video.bonus_points || 50));
        stopEarning();
      }
    }, 1000);
  }, [user, video, completed, stopEarning]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) videoRef.current.play().catch(() => {});
    startEarning();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) videoRef.current.pause();
    stopEarning();
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pps = video.points_per_second || 1;
  const bonus = video.bonus_points || 50;
  const maxPts = ((video.duration_seconds || 30) * pps) + bonus;

  // --- BANNER type ---
  if (type === 'banner') {
    return (
      <motion.div
        className="relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => video.banner_link && window.open(video.banner_link, '_blank')}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          {video.banner_url ? (
            <img src={video.banner_url} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground text-sm">Banner</div>
          )}
          {video.banner_link && (
            <div className="absolute top-2 right-2 bg-background/70 rounded-full p-1">
              <ExternalLink className="w-3.5 h-3.5 text-foreground" />
            </div>
          )}
          <AnimatePresence>
            {isWatching && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-gold/95 rounded-full px-3 py-1.5 glow-gold">
                <Star className="w-3.5 h-3.5 text-background animate-spin" />
                <span className="text-xs font-bold text-background">+{pointsEarned} pts</span>
              </motion.div>
            )}
          </AnimatePresence>
          {completed && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/90 rounded-full px-3 py-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white">+{bonus} Bônus!</span>
            </div>
          )}
          {showLoginPrompt && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center p-4">
                <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
                <p className="text-sm font-medium mb-3">Entre para ganhar pontos!</p>
                <button onClick={() => base44.auth.redirectToLogin()}
                  className="bg-gold text-background text-sm font-bold px-4 py-2 rounded-full hover:bg-gold-dark transition-all">
                  Fazer Login
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1">{video.title}</h3>
          {company && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
              {company.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-gold" /><span className="text-gold font-medium">{pps} pt/s</span>
            <span>+{bonus} bônus</span>
            <span className="ml-auto font-semibold text-foreground">até {maxPts} pts</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- YOUTUBE type ---
  if (type === 'youtube' && youtubeId) {
    const thumbnail = video.thumbnail_url || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

    const sendYTCommand = (cmd) => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: cmd, args: [] }),
        '*'
      );
    };

    const handleYTEnter = () => {
      setIsHovered(true);
      sendYTCommand('playVideo');
      startEarning();
    };

    const handleYTLeave = () => {
      setIsHovered(false);
      sendYTCommand('pauseVideo');
      stopEarning();
    };

    return (
      <motion.div
        className="relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        onMouseEnter={handleYTEnter}
        onMouseLeave={handleYTLeave}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          {/* iframe sempre carregado, só aparece no hover */}
          <iframe
            ref={iframeRef}
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=0&mute=1&controls=0&loop=1&playlist=${youtubeId}&modestbranding=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ opacity: isHovered ? 1 : 0, position: 'absolute', inset: 0 }}
          />
          {/* Thumbnail shown when not hovered */}
          <div style={{ opacity: isHovered ? 0 : 1 }} className="absolute inset-0 transition-opacity duration-300">
            <img src={thumbnail} alt={video.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-white ml-1" />
              </div>
            </div>
          </div>
          {/* Overlay to capture mouse events over iframe */}
          <div className="absolute inset-0" style={{ pointerEvents: isHovered ? 'none' : 'auto' }} />
          <AnimatePresence>
            {isWatching && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-gold/95 rounded-full px-3 py-1.5 glow-gold z-10">
                <Star className="w-3.5 h-3.5 text-background animate-spin" />
                <span className="text-xs font-bold text-background">+{pointsEarned} pts</span>
              </motion.div>
            )}
          </AnimatePresence>
          {completed && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/90 rounded-full px-3 py-1.5 z-10">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-bold text-white">+{bonus} Bônus!</span>
            </div>
          )}
          {showLoginPrompt && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
              <div className="text-center p-4">
                <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
                <p className="text-sm font-medium mb-3">Entre para ganhar pontos!</p>
                <button onClick={() => base44.auth.redirectToLogin()}
                  className="bg-gold text-background text-sm font-bold px-4 py-2 rounded-full hover:bg-gold-dark transition-all">
                  Fazer Login
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.title}</h3>
          {company && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
              {company.name}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2 border-t border-border mt-2">
            <Star className="w-3.5 h-3.5 text-gold" /><span className="text-xs font-medium text-gold">{pps} pt/s</span>
            <span className="text-xs text-muted-foreground">+{bonus} bônus</span>
            <span className="ml-auto text-xs font-semibold">até {maxPts} pts</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // --- MP4 (default) ---
  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden bg-card border border-border group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {video.video_url ? (
          <video ref={videoRef} src={video.video_url} className="w-full h-full object-cover"
            muted loop playsInline preload="metadata" poster={video.thumbnail_url} />
        ) : video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className={`absolute inset-0 transition-all duration-300 ${isHovered ? 'bg-background/20' : 'bg-background/50'}`} />
        {!isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center glow-gold">
              <Play className="w-6 h-6 text-background ml-1" />
            </div>
          </div>
        )}
        <AnimatePresence>
          {isWatching && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-gold/95 rounded-full px-3 py-1.5 glow-gold">
              <Star className="w-3.5 h-3.5 text-background animate-spin" />
              <span className="text-xs font-bold text-background">+{pointsEarned} pts</span>
            </motion.div>
          )}
        </AnimatePresence>
        {completed && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/90 rounded-full px-3 py-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white">+{bonus} Bônus!</span>
          </div>
        )}
        {showLoginPrompt && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center p-4">
              <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="text-sm font-medium mb-3">Entre para ganhar pontos!</p>
              <button onClick={() => base44.auth.redirectToLogin()}
                className="bg-gold text-background text-sm font-bold px-4 py-2 rounded-full hover:bg-gold-dark transition-all">
                Fazer Login
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.title}</h3>
            {company && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {company.logo_url && <img src={company.logo_url} alt={company.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
                {company.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Star className="w-3.5 h-3.5 text-gold" /><span className="text-xs font-medium text-gold">{pps} pt/s</span>
          <span className="text-xs text-muted-foreground">+{bonus} bônus</span>
          <span className="ml-auto text-xs font-semibold text-foreground">até {maxPts} pts</span>
        </div>
        {!isHovered && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {user ? '🖱️ Passe o mouse para ganhar pontos' : '🔒 Entre para ganhar pontos'}
          </p>
        )}
      </div>
    </motion.div>
  );
}