import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const CYAN = '#00f2ff';
const PINK = '#ff007a';
const GOLD = '#ffc61a';

export default function MegaLinkSuccessNotification({ pointsEarned, ownerName, alreadyCounted, clickComputed }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Dispara imediatamente quando clickComputed (FASE 1 rápida) ou alreadyCounted
    // — não espera o credenciamento pesado de FASE 2 (que pode levar 15s+)
    if (clickComputed || alreadyCounted) {
      setVisible(true);

      // Dispara confete apenas quando pontos são creditados (não no retorno)
      if (pointsEarned > 0) {
        const fireConfetti = () => {
          const burst = (originX, originY) =>
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { x: originX, y: originY },
              colors: [CYAN, PINK, GOLD, '#ffffff'],
              scalar: 0.8,
              ticks: 150,
            });
          burst(0.2, 0.7);
          setTimeout(() => burst(0.8, 0.7), 150);
          setTimeout(() => burst(0.5, 0.5), 300);
        };
        fireConfetti();
      }

      // Auto-fecha após 8 segundos
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [clickComputed, alreadyCounted, pointsEarned]);

  const isReturn = alreadyCounted && pointsEarned === 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
        >
          {/* Backdrop sutil */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Card de confirmação */}
          <motion.div
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="relative w-full max-w-sm pointer-events-auto"
          >
            <div
              className="relative rounded-2xl overflow-hidden border-2 bg-[#0d0e11]"
              style={{
                borderColor: isReturn ? 'hsl(190 100% 50% / 0.4)' : PINK,
                boxShadow: isReturn
                  ? `0 0 40px ${CYAN}33`
                  : `0 0 50px ${PINK}44, 0 0 80px ${CYAN}22`,
              }}
            >
              {/* Glow de fundo */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: isReturn
                    ? `radial-gradient(circle at 50% 0%, ${CYAN}, transparent 70%)`
                    : `radial-gradient(circle at 50% 0%, ${PINK}, transparent 70%)`,
                }}
              />

              {/* Botão fechar */}
              <button
                onClick={() => setVisible(false)}
                className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="relative z-10 p-6 text-center">
                {/* Ícone principal */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: 'spring', damping: 12 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{
                    background: isReturn ? CYAN : PINK,
                    boxShadow: isReturn
                      ? `0 0 30px ${CYAN}66`
                      : `0 0 30px ${PINK}66`,
                  }}
                >
                  {isReturn ? (
                    <CheckCircle2 className="w-8 h-8 text-black" />
                  ) : (
                    <Gift className="w-8 h-8 text-black" />
                  )}
                </motion.div>

                {/* Título */}
                {isReturn ? (
                  <>
                    <p className="font-cyber-mono text-[10px] tracking-[0.25em] mb-1" style={{ color: CYAN }}>
                      CLIQUE COMPUTADO
                    </p>
                    <h3 className="font-grotesk font-bold text-xl text-white mb-2">
                      Bem-vindo de volta!
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Seu clique já foi contado anteriormente.<br />
                      Ainda assim, você pode explorar as ofertas abaixo.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-cyber-mono text-[10px] tracking-[0.25em] mb-1" style={{ color: PINK }}>
                      PONTOS GERADOS
                    </p>
                    <h3 className="font-grotesk font-bold text-xl text-white mb-2">
                      Clique computado! 🎉
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Você ajudou{' '}
                      <span className="font-bold capitalize" style={{ color: PINK }}>
                        {ownerName}
                      </span>{' '}
                      a ganhar pontos com este clique.
                    </p>

                    {/* Badge de pontos */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring', damping: 10 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-4"
                      style={{
                        background: `linear-gradient(135deg, ${CYAN}, ${PINK})`,
                        boxShadow: `0 0 25px ${CYAN}44`,
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                      <span className="font-grotesk font-bold text-lg text-black">
                        +{pointsEarned} pts
                      </span>
                    </motion.div>

                    <p className="text-xs text-muted-foreground">
                      Compartilhe as ofertas abaixo e ajude ainda mais!
                    </p>
                  </>
                )}
              </div>

              {/* Barra de progresso (auto-fecha) */}
              <motion.div
                className="h-1"
                style={{ background: isReturn ? CYAN : PINK }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 8, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}