import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

// Substitua VIDEO_URL pela URL do YouTube ou MP4 do CEO
const VIDEO_URL = ''; // ex: 'https://youtu.be/XXXXXXXXXXX'

function getYouTubeId(url) {
  if (!url) return null;
  let id = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1];
  if (!id) id = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1];
  return id || null;
}

export default function CeoVideo() {
  const youtubeId = getYouTubeId(VIDEO_URL);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-xl mx-auto lg:mx-0"
    >
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
        <span className="text-xs font-semibold text-gold uppercase tracking-wider">Mensagem do CEO</span>
      </div>

      {/* Video container — aspect ratio 16:9, responsivo */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gold/20 shadow-2xl neon-border group">
        {youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
            title="Mensagem do CEO"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        ) : VIDEO_URL ? (
          <video
            src={VIDEO_URL}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          /* Placeholder enquanto não há vídeo */
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-card to-muted flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 text-gold ml-1" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Vídeo do CEO em breve</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}