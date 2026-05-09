import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ExternalLink } from 'lucide-react';

const YOUTUBE_ID = 'SmQlaIQcdHs';

function loadYTApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(); return; }
    if (window._ytApiLoading) {
      window._ytApiCallbacks = window._ytApiCallbacks || [];
      window._ytApiCallbacks.push(resolve);
      return;
    }
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

export default function CeoVideo() {
  const wrapperRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const div = document.createElement('div');
    wrapperRef.current.appendChild(div);
    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed) return;
      playerRef.current = new window.YT.Player(div, {
        videoId: YOUTUBE_ID,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => setReady(true),
          onError: () => setError(true),
        }
      });
    });

    return () => {
      destroyed = true;
      try { playerRef.current?.destroy(); } catch {}
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-xl mx-auto lg:mx-0"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span className="text-xs font-semibold text-gold uppercase tracking-wider">Mensagem do CEO</span>
      </div>

      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gold/20 shadow-2xl neon-border">
        {/* YT Player container */}
        <div ref={wrapperRef} className="absolute inset-0 w-full h-full" />

        {/* Overlay de erro */}
        {error && (
          <div className="absolute inset-0 bg-card flex flex-col items-center justify-center gap-3 z-10">
            <Play className="w-10 h-10 text-gold opacity-60" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Vídeo restrito para embed.
            </p>
            <a
              href={`https://youtu.be/${YOUTUBE_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gold text-background text-xs font-bold px-4 py-2 rounded-full hover:bg-gold-dark transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Assistir no YouTube
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}