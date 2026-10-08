import { motion } from 'framer-motion';
import { Zap, Share2, Gift, TrendingUp, Heart } from 'lucide-react';

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

// Posições fixas dos ícones sociais ao redor do núcleo (estilo orbital, flutuando suavemente)
const SOCIAL_ICONS = [
  { Icon: FacebookIcon, color: '#3B82F6', x: '18%', y: '22%', delay: 0 },
  { Icon: InstagramIcon, color: '#EC4899', x: '78%', y: '20%', delay: 0.4 },
  { Icon: WhatsAppIcon, color: '#22C55E', x: '20%', y: '74%', delay: 0.8 },
  { Icon: XIcon, color: '#E5E7EB', x: '80%', y: '72%', delay: 1.2 },
];

// Pequenos orbs amarelos espalhados
const ORBS = [
  { x: '12%', y: '50%', size: 6, delay: 0 },
  { x: '88%', y: '48%', size: 5, delay: 0.6 },
  { x: '42%', y: '12%', size: 4, delay: 1 },
  { x: '58%', y: '88%', size: 5, delay: 1.4 },
  { x: '32%', y: '88%', size: 4, delay: 0.3 },
  { x: '68%', y: '10%', size: 4, delay: 0.9 },
];

const GOLD = '#FFD700';

export default function HeroAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#121212' }}>
      {/* Grid sutil de fundo */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(0 0% 30%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 30%) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow radial dourado central */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${GOLD}1A 0%, transparent 55%)`,
        }}
      />

      {/* Dois anéis orbitais finos */}
      {[150, 220].map((size, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderColor: 'hsl(0 0% 100% / 0.06)',
          }}
        />
      ))}

      {/* Núcleo central — quadrado dourado brilhante com raio */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, hsl(45 100% 48%))`,
            boxShadow: `0 0 30px ${GOLD}66, 0 0 60px ${GOLD}33, inset 0 0 20px hsl(45 100% 70% / 0.3)`,
          }}
        >
          <Zap className="w-8 h-8 text-black" fill="currentColor" />
        </div>
      </motion.div>

      {/* Ícones de raio girando suavemente ao redor do núcleo (sutil) */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ width: 0, height: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: GOLD,
            boxShadow: `0 0 8px ${GOLD}`,
            marginLeft: -0.75,
            marginTop: -110,
          }}
        />
      </motion.div>

      {/* Ícones sociais flutuando suavemente em posições fixas */}
      {SOCIAL_ICONS.map(({ Icon, color, x, y, delay }, i) => (
        <motion.div
          key={i}
          className="absolute z-20"
          style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay, ease: 'easeInOut' }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm border"
            style={{
              background: 'hsl(0 0% 10% / 0.85)',
              borderColor: `${color}40`,
              boxShadow: `0 0 14px ${color}30, 0 0 28px ${color}15`,
            }}
          >
            <Icon className="w-5 h-5" />
            <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </motion.div>
      ))}

      {/* Pequenos orbs amarelos brilhantes */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${GOLD}, hsl(45 100% 45%))`,
            boxShadow: `0 0 8px ${GOLD}88`,
          }}
          animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5 + i * 0.2, repeat: Infinity, delay: orb.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Coração roxo no canto superior esquerdo */}
      <motion.div
        className="absolute top-5 left-5 z-20"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Heart className="w-5 h-5" fill="currentColor" style={{ color: '#A855F7' }} />
      </motion.div>

      {/* Badge "Novo clique" — topo direita, contorno amarelo */}
      <motion.div
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-sm"
        style={{ borderColor: `${GOLD}55`, background: 'hsl(0 0% 8% / 0.7)' }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{ background: GOLD, boxShadow: `0 0 6px ${GOLD}` }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[11px] font-semibold font-grotesk" style={{ color: GOLD }}>Novo clique</span>
      </motion.div>

      {/* Badges empilhados — canto inferior esquerdo */}
      <div className="absolute bottom-5 left-5 z-20 flex flex-col gap-2">
        {/* "+25 pts" — contorno roxo */}
        <motion.div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-sm"
          style={{ borderColor: '#A855F755', background: 'hsl(0 0% 8% / 0.7)' }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: 0.3, ease: 'easeInOut' }}
        >
          <Gift className="w-3.5 h-3.5" style={{ color: '#A855F7' }} />
          <span className="text-[11px] font-semibold font-grotesk" style={{ color: '#A855F7' }}>+25 pts</span>
        </motion.div>

        {/* "Crescendo" — contorno verde */}
        <motion.div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-sm"
          style={{ borderColor: '#22C55E55', background: 'hsl(0 0% 8% / 0.7)' }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: 0.6, ease: 'easeInOut' }}
        >
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
          <span className="text-[11px] font-semibold font-grotesk" style={{ color: '#22C55E' }}>Crescendo</span>
        </motion.div>
      </div>

      {/* Badge "Compartilhado" — canto inferior direito, contorno verde */}
      <motion.div
        className="absolute bottom-6 right-5 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-sm"
        style={{ borderColor: '#22C55E55', background: 'hsl(0 0% 8% / 0.7)' }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.9, ease: 'easeInOut' }}
      >
        <Share2 className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
        <span className="text-[11px] font-semibold font-grotesk" style={{ color: '#22C55E' }}>Compartilhado</span>
      </motion.div>
    </div>
  );
}