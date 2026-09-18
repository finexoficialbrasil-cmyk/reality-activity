import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Megaphone } from 'lucide-react';
import HeroFloatingBadges from '@/components/home/HeroFloatingBadges';
import HeroProductCard from '@/components/home/HeroProductCard';

const VIDEO_URL = 'https://media.base44.com/videos/public/69fe21208143d5c488dd2503/ccc7bd5e1_Hero_Video_Clean.mp4';

export default function HeroSection({ user, authLoading }) {
  return (
    <section className="relative pt-20 pb-10 px-4 md:px-4 overflow-hidden">
      {/* ===== MOBILE: Hero premium ===== */}
      <div className="md:hidden -mx-4 px-6">
        <div className="relative">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-secondary/40 border border-gold text-xs font-bold tracking-wide text-white"
          >
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            Plataforma de Recompensas
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-grotesk font-extrabold text-[2rem] leading-[1.12] tracking-tight mb-5 text-white"
          >
            Encontre campanhas que{' '}
            <span className="text-gold">performam</span>{' '}
            e transforme alcance em{' '}
            <span className="text-fuchsia-400">receita.</span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-sm leading-relaxed mb-8"
          >
            Descubra campanhas, publique suas ofertas e ganhe com compartilhamentos qualificados. Mais alcance. Mais resultados. Mais receita.
          </motion.p>

          {/* CTA */}
          {authLoading ? (
            <div className="h-13 w-full rounded-full bg-secondary/40 border border-border animate-pulse" />
          ) : !user ? (
            <motion.button
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => base44.auth.redirectToLogin()}
              className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 text-white font-bold px-6 py-3.5 rounded-full shadow-[0_0_25px_hsl(280_80%_60%/0.45)] active:scale-[0.98] transition-all duration-300"
            >
              <Zap className="w-5 h-5" />
              Começar Grátis
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                to="/dashboard?tab=anuncios"
                className="group relative overflow-hidden w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 text-white font-bold px-6 py-3.5 rounded-full shadow-[0_0_25px_hsl(280_80%_60%/0.45)] hover:shadow-[0_0_35px_hsl(280_80%_60%/0.65)] active:scale-[0.98] transition-all duration-300"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700" />
                <Megaphone className="w-5 h-5 relative z-10" />
                <span className="relative z-10 tracking-wide">Publicar Campanha</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          )}

          {/* Card de produto */}
          <div className="mt-10">
            <HeroProductCard />
          </div>

          {/* Texto cursivo com seta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 mt-4 px-2"
          >
            <p className="font-cursive text-lg text-fuchsia-400 leading-tight">
              Campanhas que geram resultados
            </p>
            <svg
              width="40"
              height="28"
              viewBox="0 0 40 28"
              fill="none"
              className="flex-shrink-0 -translate-y-1"
            >
              <path
                d="M2 22 C 10 8, 22 4, 36 10"
                stroke="hsl(280 80% 65%)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M30 6 L 36 10 L 32 16"
                stroke="hsl(280 80% 65%)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </motion.div>
        </div>
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