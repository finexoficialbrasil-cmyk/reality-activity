import { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Star, CheckCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

      // Update UserPoints balance
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

  // Mobile touch support
  const handleTouchStart = () => handleMouseEnter();
  const handleTouchEnd = () => handleMouseLeave();

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pps = video.points_per_second || 1;
  const bonus = video.bonus_points || 50;
  const maxPts = ((video.duration_seconds || 30) * pps) + bonus;

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden bg-card border border-border group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video / Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {video.video_url ? (
          <video
            ref={videoRef}
            src={video.video_url}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
            poster={video.thumbnail_url}
          />
        ) : video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Overlay */}
        <div className={`absolute inset-0 transition-all duration-300 ${isHovered ? 'bg-background/20' : 'bg-background/50'}`} />

        {/* Play hint */}
        {!isHovered && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center glow-gold">
              <Play className="w-6 h-6 text-background ml-1" />
            </div>
          </div>
        )}

        {/* Live points counter */}
        <AnimatePresence>
          {isWatching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-gold/95 rounded-full px-3 py-1.5 glow-gold"
            >
              <Star className="w-3.5 h-3.5 text-background animate-spin" />
              <span className="text-xs font-bold text-background">+{pointsEarned} pts</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed badge */}
        {completed && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-green-500/90 rounded-full px-3 py-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-bold text-white">+{bonus} Bônus!</span>
          </div>
        )}

        {/* Login prompt overlay */}
        {showLoginPrompt && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center p-4">
              <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
              <p className="text-sm font-medium mb-3">Entre para ganhar pontos!</p>
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-gold text-background text-sm font-bold px-4 py-2 rounded-full hover:bg-gold-dark transition-all"
              >
                Fazer Login
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
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
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-gold" />
            <span className="text-xs font-medium text-gold">{pps} pt/s</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">+{bonus} bônus</span>
          </div>
          <div className="ml-auto">
            <span className="text-xs font-semibold text-foreground">até {maxPts} pts</span>
          </div>
        </div>

        {/* Hover hint */}
        {!isHovered && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {user ? '🖱️ Passe o mouse para ganhar pontos' : '🔒 Entre para ganhar pontos'}
          </p>
        )}
      </div>
    </motion.div>
  );
}