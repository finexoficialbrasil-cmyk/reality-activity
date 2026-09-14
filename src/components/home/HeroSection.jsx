import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Megaphone } from 'lucide-react';
import HeroFloatingBadges from '@/components/home/HeroFloatingBadges';

const VIDEO_URL = 'https://media.base44.com/videos/public/69fe21208143d5c488dd2503/646e18446_Hero_Background.mp4';

export default function HeroSection({ user, authLoading }) {
  return (
    <section className="relative pt-32 pb-24 px-4 overflow-hidden">
      {/* Background video */}
      <video
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />
      {/* Overlays: escurece, foca o centro e funde com o fundo da página */}
      <div className="absolute inset-0 bg-background/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(220_20%_6%/0.85)_75%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      <div className="absolute inset-0 cyber-grid opacity-40 mix-blend-screen" />

      <HeroFloatingBadges />

      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full glass border border-gold/30 text-xs font-semibold tracking-wide text-gold"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
          </span>
          Plataforma de Recompensas
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-grotesk font-bold text-5xl md:text-7xl leading-[1.05] tracking-tight mb-5"
        >
          Cada clique vira
          <br />
          <span className="bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent drop-shadow-[0_0_30px_hsl(45_100%_55%/0.45)]">
            Pontos
          </span>{' '}
          <span className="text-foreground/90">de verdade.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Descubra produtos incríveis, compartilhe com seus amigos e transforme cada compartilhamento em recompensas.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {authLoading ? (
            <div className="h-14 w-52 rounded-2xl bg-card/60 border border-border animate-pulse" />
          ) : !user ? (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="inline-flex items-center gap-2 bg-gold text-background font-bold px-8 py-4 rounded-2xl hover:bg-gold-dark transition-all animate-pulse-gold hover:scale-105"
            >
              <Zap className="w-5 h-5" />
              Começar Grátis
            </button>
          ) : (
            <Link
              to="/dashboard?tab=anuncios"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-purple/30 to-purple/10 backdrop-blur border border-purple/50 text-foreground font-semibold px-8 py-4 rounded-2xl hover:border-purple transition-all hover:scale-105 neon-glow-purple"
            >
              <Megaphone className="w-5 h-5 text-purple group-hover:scale-110 transition-transform" />
              Publicar Anúncio
              <ArrowRight className="w-5 h-5 text-purple group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}