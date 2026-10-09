import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/69fe21208143d5c488dd2503/c2f301daf_31a450b6-fca8-4324-a678-9d6cf67a9025.png';

export default function Logo({ size = 40, withWordmark = true, className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <motion.div
        whileHover={{ scale: 1.06 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Halo / destaque magenta-violeta */}
        <div
          className="absolute inset-0 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity"
          style={{ background: 'radial-gradient(circle, rgba(232,35,232,0.55) 0%, rgba(138,43,226,0.35) 55%, transparent 75%)' }}
        />
        {/* Anel gradiente de destaque */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #E823E8, #8A2BE2)',
            boxShadow: '0 0 14px rgba(232,35,232,0.5), inset 0 0 8px rgba(255,255,255,0.25)',
          }}
        />
        {/* Logo sobreposta */}
        <img
          src={LOGO_URL}
          alt="Reality Activity"
          className="relative z-10 object-contain"
          style={{ width: size * 0.78, height: size * 0.78, filter: 'drop-shadow(0 0 4px rgba(232,35,232,0.4))' }}
        />
      </motion.div>

      {withWordmark && (
        <img
          src="https://media.base44.com/images/public/69fe21208143d5c488dd2503/b517edfd8_5784ef057caa0bd01e47b4659fd6ccbb.webp"
          alt="Reality Activity"
          className="h-8"
        />
      )}
    </Link>
  );
}