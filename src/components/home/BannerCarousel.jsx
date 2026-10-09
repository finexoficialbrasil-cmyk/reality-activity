import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';

export default function BannerCarousel({ banners, companies = {}, autoPlay = true, interval = 6000 }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!autoPlay || banners.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length);
      setDirection(1);
      setProgress(0);
    }, interval);

    const progressTimer = setInterval(() => {
      setProgress(prev => (prev + 100 / (interval / 100)));
    }, 100);

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
    };
  }, [banners.length, autoPlay, interval]);

  if (!banners || banners.length === 0) return null;

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 1200 : -1200,
      opacity: 0,
      rotateY: dir > 0 ? -30 : 30,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      rotateY: 0,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir > 0 ? -1200 : 1200,
      opacity: 0,
      rotateY: dir > 0 ? 30 : -30,
    }),
  };

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrent(prev => (prev + newDirection + banners.length) % banners.length);
    setProgress(0);
  };

  const banner = banners[current];
  const company = companies[banner.company_id];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-card border border-border shadow-2xl perspective">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          style={{ perspective: 1000 }}
          className="absolute inset-0 w-full h-full"
        >
          <div
            className="relative w-full h-full cursor-pointer group overflow-hidden"
            onClick={() => banner.banner_link && window.open(banner.banner_link, '_blank')}
          >
            {/* Background Image with Zoom on Hover */}
            <motion.div
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
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
            </motion.div>
            
            {/* Futuristic Overlay with Neon Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-black/50 group-hover:from-black/60 group-hover:to-black/60 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Neon Corner Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Company Badge + Title Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="absolute bottom-0 left-0 right-0 p-6 md:p-8"
            >
              {/* Company Info */}
              {company && (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gold/30">
                  {company.logo_url && (
                    <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-xs text-gold font-semibold uppercase tracking-wider">Parceiro Premium</p>
                    <p className="text-sm font-medium text-foreground">{company.name}</p>
                  </div>
                </div>
              )}

              {/* Title */}
              <h3 className="font-grotesk font-bold text-2xl md:text-3xl text-white mb-3 line-clamp-2">
                {banner.title}
              </h3>

              {/* CTA */}
              {banner.banner_link && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(banner.banner_link, '_blank');
                  }}
                  whileHover={{ scale: 1.05, x: 5 }}
                  className="inline-flex items-center gap-2 bg-gold text-primary-foreground font-bold px-6 py-2.5 rounded-full hover:bg-gold-dark transition-all glow-gold text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Explorar
                  <ExternalLink className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      <motion.button
        onClick={() => paginate(-1)}
        whileHover={{ scale: 1.1, x: -3 }}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-gold hover:text-background text-white flex items-center justify-center transition-all border border-gold/20 hover:border-gold"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>
      <motion.button
        onClick={() => paginate(1)}
        whileHover={{ scale: 1.1, x: 3 }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-gold hover:text-background text-white flex items-center justify-center transition-all border border-gold/20 hover:border-gold"
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>

      {/* Progress Bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 bg-gold z-30"
        initial={{ width: '0%' }}
        animate={{ width: `${Math.min(progress, 100)}%` }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />

      {/* Indicators with Progress */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {banners.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => {
              setDirection(i > current ? 1 : -1);
              setCurrent(i);
              setProgress(0);
            }}
            className={`transition-all rounded-full backdrop-blur-sm border ${
              i === current 
                ? 'bg-gold border-gold w-3 h-3 shadow-lg glow-gold' 
                : 'bg-white/30 border-white/30 w-2 h-2 hover:bg-white/60 hover:border-white/60'
            }`}
            whileHover={{ scale: 1.3 }}
          />
        ))}
      </div>

      {/* Aspect ratio container */}
      <div className="w-full pt-[56.25%]" />
    </div>
  );
}