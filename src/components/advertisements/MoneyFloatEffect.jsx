import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

let _id = 0;

/**
 * Efeito de cifrões de dinheiro ($) subindo, estilo corações de live do Instagram.
 * Desktop: dispara no hover. Mobile: dispara no tap (click).
 */
export default function MoneyFloatEffect({ children, className }) {
  const [particles, setParticles] = useState([]);
  const timerRef = useRef(null);

  const spawn = useCallback(() => {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 cifrões por disparo
    const batch = Array.from({ length: count }).map(() => ({
      id: _id++,
      x: (Math.random() - 0.5) * 70, // deslocamento horizontal aleatório
      drift: (Math.random() - 0.5) * 40, // deriva durante a subida
      scale: 0.7 + Math.random() * 0.6,
      duration: 1.4 + Math.random() * 0.8,
      rotate: (Math.random() - 0.5) * 60,
      size: 16 + Math.floor(Math.random() * 12),
    }));
    setParticles(prev => [...prev, ...batch]);
    // limpa partículas após animação
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setParticles([]), 2600);
  }, []);

  const handleEnter = () => spawn();
  const handleClick = () => spawn();

  return (
    <div
      className={`relative ${className || ''}`}
      onMouseEnter={handleEnter}
      onClick={handleClick}
    >
      {children}
      {/* Camada de partículas — não captura eventos */}
      <div className="pointer-events-none absolute inset-0 overflow-visible flex items-end justify-center">
        <AnimatePresence>
          {particles.map(p => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, y: 0, x: p.x, scale: 0.4, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -90,
                x: p.x + p.drift,
                scale: p.scale,
                rotate: p.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, ease: 'easeOut' }}
              className="absolute bottom-2 font-bold select-none"
              style={{
                fontSize: `${p.size}px`,
                color: '#ffdb4d',
                textShadow: '0 0 8px rgba(255,219,77,0.6)',
              }}
            >
              $
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}