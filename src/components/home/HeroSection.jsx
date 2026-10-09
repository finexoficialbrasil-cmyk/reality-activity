import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Megaphone } from 'lucide-react';
import HeroAnimation from '@/components/home/HeroAnimation';
import HeroAnimationMobile from '@/components/home/HeroAnimationMobile';

export default function HeroSection({ user, authLoading }) {
  return (
    <section className="relative pt-20 pb-10 px-4 overflow-hidden">
      {/* ===== MOBILE: Card premium ===== */}
      <div className="md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[28px] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, hsl(220 18% 9%) 0%, hsl(220 20% 6%) 100%)',
            border: '1px solid hsl(270 80% 65% / 0.25)',
            boxShadow: '0 20px 60px hsl(270 80% 65% / 0.12), 0 0 0 1px hsl(45 100% 55% / 0.05) inset',
          }}
        >
          {/* Grid de fundo */}
          <div className="cyber-grid absolute inset-0 opacity-25" />

          {/* Glow radial dourado no topo */}
          <div
            className="absolute -top-20 -right-10 w-48 h-48 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, hsl(45 100% 55%), transparent 70%)' }}
          />
          {/* Glow radial roxo embaixo */}
          <div
            className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, hsl(270 80% 65%), transparent 70%)' }}
          />

          {/* Linha de brilho superior animada */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, hsl(45 100% 55% / 0.6), transparent)' }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 p-6">
            {/* Animação compacta acima do texto */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-2 -mt-1"
            >
              <HeroAnimationMobile />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-4 rounded-full"
              style={{
                background: 'hsl(220 15% 13% / 0.8)',
                border: '1px solid hsl(270 80% 65% / 0.3)',
              }}
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-purple"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-[11px] font-bold tracking-wide text-foreground">Plataforma de Recompensas</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-grotesk font-extrabold text-[2rem] leading-[1.12] tracking-tight mb-3 text-white"
            >
              Cada clique vira{' '}
              <span className="text-white">
                Pontos
              </span>{' '}
              de verdade.
            </motion.h1>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground text-[13px] leading-relaxed mb-6"
            >
              Descubra produtos incríveis, compartilhe com seus amigos e transforme cada compartilhamento em recompensas.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {authLoading ? (
                <div className="h-14 w-full rounded-2xl bg-secondary/40 border border-border animate-pulse" />
              ) : !user ? (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="group relative w-full overflow-hidden flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-2xl text-white transition-all active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, #FF2800, #C81D00)',
                    boxShadow: '0 8px 30px #FF280040, inset 0 1px 0 #FF6B4D80',
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Zap className="w-5 h-5 relative z-10" fill="currentColor" />
                  <span className="relative z-10 tracking-wide text-[15px]">Começar Grátis</span>
                  <ArrowRight className="w-4 h-4 relative z-10" />
                </button>
              ) : (
                <Link
                  to="/dashboard?tab=anuncios"
                  className="group relative overflow-hidden w-full flex items-center justify-center gap-2.5 font-bold px-6 py-4 rounded-2xl text-white transition-all active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, #FF2800, #C81D00)',
                    boxShadow: '0 8px 30px #FF280040, inset 0 1px 0 #FF6B4D80',
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Megaphone className="w-5 h-5 relative z-10" />
                  <span className="relative z-10 tracking-wide text-[15px]">Publicar Anúncio</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </motion.div>

            {/* Mini stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-border/40"
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
                <span className="text-[11px] font-semibold text-gold">Resgate prêmios</span>
              </div>
            </motion.div>
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
            className="inline-flex items-center gap-2 px-3.5 py-1 mb-4 rounded-full glass border border-purple/30 text-xs font-bold tracking-wide text-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple" />
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
            <span className="text-white">
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
                className="group relative overflow-hidden inline-flex items-center gap-2.5 font-bold px-7 py-3.5 rounded-2xl text-white border border-red-300/40 transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #FF2800, #C81D00)',
                  boxShadow: '0 8px 30px #FF280059',
                }}
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <Megaphone className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10 tracking-wide">Publicar Anúncio</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </motion.div>
        </div>

        {/* Coluna direita — animação CSS pura */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative h-[340px] rounded-3xl border border-gold/20 shadow-[0_0_40px_hsl(45_100%_55%/0.15)] overflow-hidden bg-card/40"
        >
          <HeroAnimation />
          <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}