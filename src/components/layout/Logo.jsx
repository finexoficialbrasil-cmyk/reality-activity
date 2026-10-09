import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/69fe21208143d5c488dd2503/29b16e41f_43f7d28f-d651-4831-9b37-2e2fb62bfa9c.png';
const WORDMARK_URL = 'https://media.base44.com/images/public/69fe21208143d5c488dd2503/b517edfd8_5784ef057caa0bd01e47b4659fd6ccbb.webp';

export default function Logo({ size = 44, withWordmark = true, className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      <motion.div
        whileHover={{ scale: 1.06 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Halo de destaque magenta-violeta (trás da imagem) */}
        <div
          className="absolute inset-0 rounded-full blur-lg opacity-60 group-hover:opacity-90 transition-opacity"
          style={{ background: 'radial-gradient(circle, rgba(232,35,232,0.5) 0%, rgba(138,43,226,0.3) 60%, transparent 80%)' }}
        />
        {/* Logo em alta resolução, nítida */}
        <img
          src={LOGO_URL}
          alt="Reality Activity"
          className="relative z-10 w-full h-full object-contain"
          style={{ imageRendering: 'auto', filter: 'drop-shadow(0 0 6px rgba(232,35,232,0.35))' }}
        />
      </motion.div>

      {withWordmark && (
        <img
          src={WORDMARK_URL}
          alt="Reality Activity"
          className="h-8"
        />
      )}
    </Link>
  );
}