import { motion } from 'framer-motion';
import { MousePointerClick, Share2, Star } from 'lucide-react';

const BADGES = [
  { Icon: MousePointerClick, text: '+10 pts', cls: 'left-[6%] top-[22%]', delay: 0 },
  { Icon: Share2, text: 'Compartilhado', cls: 'right-[8%] top-[28%]', delay: 1.2 },
  { Icon: Star, text: '+25 pts', cls: 'left-[12%] bottom-[18%]', delay: 2.1 },
  { Icon: MousePointerClick, text: 'Novo clique', cls: 'right-[14%] bottom-[22%]', delay: 0.6 },
];

export default function HeroFloatingBadges() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {BADGES.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute ${b.cls} inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-gold/25 text-xs font-semibold text-gold shadow-[0_0_20px_hsl(45_100%_55%/0.25)]`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 1, 1, 0], y: [10, -6, -14, -28] }}
          transition={{ duration: 4.5, delay: b.delay, repeat: Infinity, repeatDelay: 1.5, ease: 'easeOut' }}
        >
          <b.Icon className="w-3.5 h-3.5" />
          {b.text}
        </motion.div>
      ))}
    </div>
  );
}