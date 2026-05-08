import { motion } from 'framer-motion';
import { Sparkles, Building2, ArrowRight } from 'lucide-react';

export default function VitrineHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-14">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-purple/10 to-card pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/30 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple/20 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="relative px-6 md:px-12 py-12 md:py-16 border border-gold/30 rounded-3xl bg-card/40 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/40 mb-6"
          >
            <Building2 className="w-4 h-4 text-gold" />
            <span className="text-sm font-semibold text-gold">Ecossistema de Empresas</span>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-grotesk font-bold text-3xl md:text-5xl leading-tight mb-4"
          >
            Conheça nossos <span className="text-gold">Parceiros</span> Incríveis
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8"
          >
            Explore um ecossistema diverso de empresas e serviços. Ganhe pontos assistindo vídeos e resgate prêmios exclusivos em nossos parceiros.
          </motion.p>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gold text-background font-bold text-lg hover:bg-gold-dark transition-all glow-gold shadow-lg"
          >
            <Sparkles className="w-5 h-5" />
            Explorar Empresas
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-12 pt-8 border-t border-border"
          >
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gold">+50</p>
              <p className="text-xs md:text-sm text-muted-foreground">Empresas Parceiras</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-purple">∞</p>
              <p className="text-xs md:text-sm text-muted-foreground">Prêmios para Resgatar</p>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <p className="text-2xl md:text-3xl font-bold text-accent">24/7</p>
              <p className="text-xs md:text-sm text-muted-foreground">Disponível Sempre</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}