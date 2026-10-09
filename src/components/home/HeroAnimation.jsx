import { motion } from 'framer-motion';
import { Share2, Gift, Zap, Coins, TrendingUp, Heart } from 'lucide-react';

const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const FacebookIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.336 3.608 1.311.975.975 1.249 2.242 1.311 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.336 2.633-1.311 3.608-.975.975-2.242 1.249-3.608 1.311-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.336-3.608-1.311-.975-.975-1.249-2.242-1.311-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.336-2.633 1.311-3.608.975-.975 2.242-1.249 3.608-1.311C8.416 2.175 8.796 2.163 12 2.163zm0 1.838c-3.141 0-3.51.012-4.749.068-1.29.059-1.99.273-2.456.454-.617.24-1.057.525-1.518.986-.461.461-.746.901-.986 1.518-.181.466-.395 1.166-.454 2.456C1.799 9.49 1.788 9.859 1.788 13s.012 3.51.068 4.749c.059 1.29.273 1.99.454 2.456.24.617.525 1.057.986 1.518.461.461.901.746 1.518.986.466.181 1.166.395 2.456.454 1.239.056 1.608.068 4.749.068s3.51-.012 4.749-.068c1.29-.059 1.99-.273 2.456-.454.617-.24 1.057-.525 1.518-.986.461-.461.746-.901.986-1.518.181-.466.395-1.166.454-2.456.056-1.239.068-1.608.068-4.749s-.012-3.51-.068-4.749c-.059-1.29-.273-1.99-.454-2.456-.24-.617-.525-1.057-.986-1.518-.461-.461-.901-.746-1.518-.986-.466-.181-1.166-.395-2.456-.454C15.51 4.013 15.141 4.001 12 4.001zm0 3.064A4.935 4.935 0 1 1 7.065 12 4.935 4.935 0 0 1 12 7.065zm0 8.137A3.202 3.202 0 1 0 8.798 12 3.202 3.202 0 0 0 12 15.202zm6.406-8.345a1.152 1.152 0 1 1-1.152-1.152 1.152 1.152 0 0 1 1.152 1.152z"/></svg>
);
const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const SOCIAL_ICONS = [
  { Icon: WhatsAppIcon, color: '#25D366', angle: 0, delay: 0 },
  { Icon: FacebookIcon, color: '#1877F2', angle: 90, delay: 0.3 },
  { Icon: InstagramIcon, color: '#E1306C', angle: 180, delay: 0.6 },
  { Icon: XIcon, color: '#ffffff', angle: 270, delay: 0.9 },
];

const FLOATING_COINS = [
  { x: '8%', y: '15%', delay: 0, size: 28 },
  { x: '82%', y: '10%', delay: 0.5, size: 22 },
  { x: '15%', y: '75%', delay: 1, size: 24 },
  { x: '88%', y: '68%', delay: 1.5, size: 26 },
  { x: '50%', y: '8%', delay: 0.8, size: 18 },
  { x: '72%', y: '85%', delay: 1.2, size: 20 },
];

export default function HeroAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Fundo cyber-grid animado */}
      <div className="absolute inset-0 cyber-grid opacity-40" />

      {/* Glow radial central */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(285 85% 60% / 0.12) 0%, transparent 60%)',
        }}
      />

      {/* Anéis pulsantes concêntricos */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: 120 + i * 80,
            height: 120 + i * 80,
            marginLeft: -(60 + i * 40),
            marginTop: -(60 + i * 40),
            borderColor: i === 0 ? 'hsl(285 85% 60% / 0.3)' : i === 1 ? 'hsl(270 80% 65% / 0.2)' : 'hsl(190 100% 50% / 0.15)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
        />
      ))}

      {/* Núcleo central — Zap pulsante */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, hsl(285 85% 60%), hsl(290 85% 45%))',
              boxShadow: '0 0 40px hsl(285 85% 60% / 0.5), inset 0 0 20px hsl(285 85% 60% / 0.2)',
            }}
          >
            <Zap className="w-10 h-10 text-background" fill="currentColor" />
            {/* Brilho rotativo */}
            <motion.div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="absolute -inset-1/2"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, hsl(45 100% 70% / 0.4) 25%, transparent 50%)',
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Ícones sociais orbitando */}
      {SOCIAL_ICONS.map(({ Icon, color, angle, delay }, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{ width: 0, height: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear', delay }}
        >
          <motion.div
            className="absolute"
            style={{
              width: 44,
              height: 44,
              marginLeft: -22,
              marginTop: -22,
              transform: `rotate(${angle}deg) translateX(130px) rotate(${-angle}deg)`,
            }}
          >
            <motion.div
              className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm border"
              style={{
                background: 'hsl(220 18% 9% / 0.8)',
                borderColor: `${color}40`,
                boxShadow: `0 0 16px ${color}30`,
              }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5, ease: 'easeInOut' }}
            >
              <Icon className="w-5 h-5" />
              <div style={{ color }} className="absolute">
                <Icon className="w-5 h-5" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ))}

      {/* Moedas flutuantes */}
      {FLOATING_COINS.map((coin, i) => (
        <motion.div
          key={i}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            left: coin.x,
            top: coin.y,
            width: coin.size,
            height: coin.size,
            background: 'linear-gradient(135deg, hsl(45 100% 60%), hsl(38 90% 45%))',
            boxShadow: '0 0 12px hsl(45 100% 55% / 0.4)',
          }}
          animate={{ y: [0, -12, 0], rotate: [0, 10, 0], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: coin.delay, ease: 'easeInOut' }}
        >
          <Coins className="text-background" style={{ width: coin.size * 0.55, height: coin.size * 0.55 }} fill="currentColor" />
        </motion.div>
      ))}

      {/* Badges flutuantes — "Novo clique" */}
      <motion.div
        className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card/80 backdrop-blur-sm"
        style={{ borderColor: 'hsl(285 85% 60% / 0.4)' }}
        animate={{ y: [0, -6, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.span
          className="w-2 h-2 rounded-full bg-gold"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-xs font-bold text-gold font-grotesk">Novo clique</span>
      </motion.div>

      {/* Badge "+25 pts" */}
      <motion.div
        className="absolute bottom-16 left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card/80 backdrop-blur-sm"
        style={{ borderColor: 'hsl(45 100% 55% / 0.5)', boxShadow: '0 0 14px hsl(45 100% 55% / 0.35)' }}
        animate={{ y: [0, 8, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
      >
        <Gift className="w-3.5 h-3.5 text-coin" />
        <span className="text-xs font-bold text-coin font-grotesk">+25 pts</span>
      </motion.div>

      {/* Badge "Compartilhado" */}
      <motion.div
        className="absolute bottom-5 right-8 flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card/80 backdrop-blur-sm"
        style={{ borderColor: 'hsl(130 60% 50% / 0.4)' }}
        animate={{ y: [0, -6, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 1, ease: 'easeInOut' }}
      >
        <Share2 className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs font-bold text-green-500 font-grotesk">Compartilhado</span>
      </motion.div>

      {/* Partículas de brilho */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            left: `${15 + (i * 11) % 70}%`,
            top: `${20 + (i * 17) % 60}%`,
            background: i % 2 === 0 ? 'hsl(45 100% 65%)' : 'hsl(270 80% 70%)',
          }}
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
        />
      ))}

      {/* Linha de tendência no canto inferior esquerdo */}
      <motion.div
        className="absolute bottom-5 left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card/80 backdrop-blur-sm"
        style={{ borderColor: 'hsl(130 60% 50% / 0.4)' }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs font-bold text-green-500 font-grotesk">Crescendo</span>
      </motion.div>

      {/* Coração pulsante no canto superior esquerdo */}
      <motion.div
        className="absolute top-6 left-6"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Heart className="w-5 h-5 text-pink-500" fill="currentColor" />
      </motion.div>
    </div>
  );
}