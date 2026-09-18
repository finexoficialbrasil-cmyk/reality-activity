import { motion } from 'framer-motion';
import { TrendingUp, Flame } from 'lucide-react';

export default function HeroProductCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative mx-auto max-w-[280px]"
    >
      {/* Glow dourado atrás do card */}
      <div className="absolute -inset-4 bg-gradient-to-br from-gold/30 via-yellow-500/10 to-transparent rounded-3xl blur-2xl" />

      {/* Card principal */}
      <div className="relative rounded-2xl border border-gold/25 bg-card/70 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Badge ROI no topo direita */}
        <div className="absolute top-2.5 right-2.5 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 border border-gold/40 text-[10px] font-bold text-gold">
          <TrendingUp className="w-3 h-3" />
          ROI 4.8x
        </div>

        {/* Imagem do produto */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-secondary to-muted overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"
            alt="Tênis Performance Pro"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        </div>

        {/* Badge Em alta */}
        <div className="absolute bottom-16 left-2.5 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/80 border border-gold/40 text-[10px] font-bold text-gold">
          <Flame className="w-3 h-3" />
          Em alta
        </div>

        {/* Texto do produto */}
        <div className="relative p-3 pt-2">
          <h3 className="text-sm font-bold text-white leading-tight">Tênis Performance Pro</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">E-commerce • Esporte</p>
        </div>
      </div>
    </motion.div>
  );
}