import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Megaphone } from 'lucide-react';
import HeroFloatingBadges from '@/components/home/HeroFloatingBadges';

const VIDEO_URL = 'https://media.base44.com/videos/public/69fe21208143d5c488dd2503/ccc7bd5e1_Hero_Video_Clean.mp4';

export default function HeroSection({ user, authLoading }) {
  return (
    <section className="relative pt-20 pb-10 px-4 overflow-hidden">
      {/* ===== MOBILE: Card compacto ===== */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-purple/30 bg-card/60 backdrop-blur p-5 overflow-hidden"
        >
          <div className="cyber-grid absolute inset-0 opacity-30" />
          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-secondary/60 border border-gold/30 text-xs font-bold tracking-wide text-foreground">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              Plataforma de Recompensas
            </div>

            {/* Headline */}
            <h1 className="font-grotesk font-extrabold text-3xl leading-[1.15] tracking-tight mb-3 text-white">
              Cada clique vira{' '}
              <span className="bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent">
                Pontos
              </span>{' '}
              de verdade.
            </h1>

            {/* Body */}
            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Descubra produtos incríveis, compartilhe com seus amigos e transforme cada compartilhamento em recompensas.
            </p>

            {/* CTA */}
            {authLoading ? (
              <div className="h-12 w-full rounded-2xl bg-secondary/40 border border-border animate-pulse" />
            ) : !user ? (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple to-purple/80 text-white font-bold px-6 py-3.5 rounded-2xl hover:opacity-90 transition-all animate-pulse-gold"
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/dashboard?tab=anuncios"
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple to-purple/80 text-white font-bold px-6 py-3.5 rounded-2xl hover:opacity-90 transition-all"
              >
                <Megaphone className="w-4 h-4" />
                Publicar Anúncio
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
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
            <span className="bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent drop-shadow-[0_0_25px_hsl(45_100%_55%/0.55)]">
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
                className="inline-flex items-center gap-2 bg-gold text-background font-bold px-7 py-3 rounded-2xl hover:bg-gold-dark transition-all animate-pulse-gold hover:scale-105"
              >
                <Zap className="w-4 h-4" />
                Começar Grátis
              </button>
            ) : (
              <Link
                to="/dashboard?tab=anuncios"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-purple/30 to-purple/10 backdrop-blur border border-purple/50 text-foreground font-semibold px-7 py-3 rounded-2xl hover:border-purple transition-all hover:scale-105 neon-glow-purple"
              >
                <Megaphone className="w-4 h-4 text-purple group-hover:scale-110 transition-transform" />
                Publicar Anúncio
                <ArrowRight className="w-4 h-4 text-purple group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </motion.div>
        </div>

        {/* Coluna direita — vídeo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative h-[340px] rounded-3xl border border-gold/20 shadow-[0_0_40px_hsl(45_100%_55%/0.15)] overflow-hidden"
        >
          <video
            src={VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          <HeroFloatingBadges />
        </motion.div>
      </div>
    </section>
  );
}