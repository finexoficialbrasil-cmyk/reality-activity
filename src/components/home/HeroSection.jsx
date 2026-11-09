import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import HeroAnimation from '@/components/home/HeroAnimation';

export default function HeroSection({ user, authLoading }) {
  return (
    <section className="relative pt-20 pb-10 px-4 overflow-hidden">
      {/* ===== MOBILE: faixa de benefícios ===== */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-4"
        >
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-gold" fill="currentColor" />
            <span className="text-[11px] font-semibold text-muted-foreground">Compartilhe</span>
          </div>
          <div className="w-px h-3 bg-border/60" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-purple">Ganhe pontos</span>
          </div>
          <div className="w-px h-3 bg-border/60" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-coin">Resgate prêmios</span>
          </div>
        </motion.div>
      </div>

      {/* ===== DESKTOP: Split com vídeo ===== */}
      <div className="hidden md:grid relative max-w-6xl mx-auto grid-cols-2 gap-8 items-center">
        {/* Coluna esquerda — texto */}
        <div className="relative z-10 text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 mb-4 rounded-full glass border border-gold/40 text-xs font-bold tracking-wide text-gold"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
            </span>
            Plataforma de Recompensas
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-grotesk font-extrabold text-5xl leading-[1.1] tracking-tight mb-3 text-white"
          >
            Cada clique vira{' '}
            <span className="bg-gradient-to-r from-gold via-purple-200 to-gold-dark bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(285_85%_60%/0.55)]">
              Pontos
            </span>{' '}
            de verdade.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-foreground/80 text-base max-w-md leading-relaxed mb-6"
          >
            Descubra produtos incríveis, compartilhe com seus amigos e transforme cada compartilhamento em recompensas.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-3"
          >
            {authLoading ? (
              <div className="h-12 w-44 rounded-2xl bg-card/60 border border-border animate-pulse" />
            ) : !user ? (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="inline-flex items-center gap-2 text-white font-bold px-7 py-3 rounded-2xl hover:scale-105 transition-all"
                style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 24px rgba(232,35,232,0.6), 0 8px 30px rgba(138,43,226,0.5), inset 0 1px 0 rgba(255,255,255,0.35)' }}
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
              </button>
            ) : null}
          </motion.div>
        </div>

        {/* Coluna direita — animação CSS pura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative h-[340px] rounded-3xl border border-gold/20 shadow-[0_0_40px_hsl(285_85%_60%/0.15)] overflow-hidden bg-card/40"
        >
          <HeroAnimation />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}