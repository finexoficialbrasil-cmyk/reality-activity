import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Building2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CompaniesCarousel({ companies }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoSlideRef = useRef(null);

  const itemsPerPage = Math.min(companies.length, 4);

  useEffect(() => {
    autoSlideRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % (companies.length - itemsPerPage + 1));
    }, 5000);
    return () => clearInterval(autoSlideRef.current);
  }, [companies.length, itemsPerPage]);

  const handlePrev = () => {
    setDirection(-1);
    setCurrent((prev) => (prev === 0 ? companies.length - itemsPerPage : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrent((prev) => (prev === companies.length - itemsPerPage ? 0 : prev + 1));
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 1000 : -1000, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -1000 : 1000, opacity: 0 }),
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-grotesk font-bold text-xl md:text-2xl">Nossas Empresas & Parceiros</h2>
        <div className="flex gap-2">
          <button onClick={handlePrev} className="p-2 rounded-full bg-card border border-border hover:border-gold/50 transition-all">
            <ChevronLeft className="w-4 h-4 text-gold" />
          </button>
          <button onClick={handleNext} className="p-2 rounded-full bg-card border border-border hover:border-gold/50 transition-all">
            <ChevronRight className="w-4 h-4 text-gold" />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="flex gap-4"
          >
            {companies.slice(current, current + itemsPerPage).map((c) => (
              <Link key={c.id} to="/vitrine"
                className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl bg-card border border-border hover:border-gold/50 hover:bg-secondary transition-all group">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="w-8 h-8 rounded-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-gold transition-colors">{c.name}</p>
                  {c.is_partner && <span className="text-xs text-purple">Parceiro Official</span>}
                </div>
                {c.website && <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}