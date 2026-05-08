import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export default function BannerCarousel({ banners, autoPlay = true, interval = 5000 }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!autoPlay || banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
      setDirection(1);
    }, interval);
    return () => clearInterval(timer);
  }, [banners.length, autoPlay, interval]);

  if (!banners || banners.length === 0) return null;

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir > 0 ? -1000 : 1000,
      opacity: 0,
    }),
  };

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrent(prev => (prev + newDirection + banners.length) % banners.length);
  };

  const banner = banners[current];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-card border border-border shadow-2xl">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-0"
        >
          <div
            className="relative w-full h-full cursor-pointer group"
            onClick={() => banner.banner_link && window.open(banner.banner_link, '_blank')}
          >
            {banner.banner_url ? (
              <img
                src={banner.banner_url}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                <span className="text-muted-foreground text-lg">Banner</span>
              </div>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 group-hover:from-black/50 group-hover:to-black/50 transition-all duration-300" />

            {/* Title + Link */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h3 className="font-grotesk font-bold text-xl md:text-2xl text-white mb-2 line-clamp-2">
                {banner.title}
              </h3>
              {banner.banner_link && (
                <div className="flex items-center gap-2 text-gold hover:text-gold-dark transition-colors">
                  <span className="text-sm font-semibold">Visitar</span>
                  <ExternalLink className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <button
        onClick={() => paginate(-1)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-gold text-white p-2 rounded-full transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={() => paginate(1)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-gold text-white p-2 rounded-full transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {banners.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => {
              setDirection(i > current ? 1 : -1);
              setCurrent(i);
            }}
            className={`h-2 rounded-full transition-all ${
              i === current ? 'bg-gold w-8' : 'bg-white/50 w-2 hover:bg-white'
            }`}
            whileHover={{ scale: 1.2 }}
          />
        ))}
      </div>

      {/* Aspect ratio container */}
      <div className="w-full pt-[56.25%]" />
    </div>
  );
}