import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useGameSound from '@/hooks/useGameSound';

export default function CompanyOrbitView({ company, otherCompanies }) {
  const [hoveredCompany, setHoveredCompany] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const { playHoverSound, playClickSound, playMoneySound } = useGameSound();

  useEffect(() => {
    setInitialized(true);
  }, []);

  const allCompanies = company ? [company, ...otherCompanies] : otherCompanies;
  const numCompanies = Math.min(allCompanies.length, 8);

  // Calcula órbita circular perfeita e equilibrada
  const getOrbitPosition = (index, total) => {
    const angle = (index / total) * Math.PI * 2;
    const baseRadius = 160; // raio base consistente
    const x = Math.cos(angle) * baseRadius;
    const y = Math.sin(angle) * baseRadius;
    return { x, y, angle };
  };

  const handleCompanyClick = async (comp) => {
    playClickSound();
    if (comp.website) {
      window.open(comp.website, '_blank');
    } else if (comp.phone) {
      const res = await base44.functions.invoke('formatWhatsAppLink', { phone: comp.phone });
      window.open(res.data.url, '_blank');
    }
  };

  return (
    <div className="relative w-full mx-auto mb-8 md:mb-16 px-4">
      {/* Orbit container - responsivo */}
      <div className="relative mx-auto flex items-center justify-center" style={{ aspectRatio: '1 / 1', maxWidth: '600px' }}>
        {/* Orbit ring visual (optional) */}
        <div className="absolute inset-0 rounded-full border border-gold/10" />
        <div className="absolute inset-8 rounded-full border border-gold/5" />

        {/* Center logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute z-20 cursor-pointer"
          onMouseEnter={playMoneySound}
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-secondary via-card to-muted border-2 border-gold/30 flex items-center justify-center overflow-hidden shadow-2xl glow-gold">
            <motion.img 
              src="https://media.base44.com/images/public/69fe21208143d5c488dd2503/b517edfd8_5784ef057caa0bd01e47b4659fd6ccbb.webp" 
              alt="Logo" 
              className="w-4/5 h-4/5 object-contain"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Orbiting companies - circular layout com animação */}
        {allCompanies.slice(0, 8).map((comp, idx) => {
          const angle = (idx / numCompanies) * Math.PI * 2;
          const baseRadius = 160;
          const isHovered = hoveredCompany === comp.id;
          
          return (
            <motion.div
              key={comp.id}
              className="absolute"
              animate={{
                x: [Math.cos(angle) * baseRadius, Math.cos(angle + 0.3) * baseRadius, Math.cos(angle) * baseRadius],
                y: [Math.sin(angle) * baseRadius, Math.sin(angle + 0.3) * baseRadius + 8, Math.sin(angle) * baseRadius],
              }}
              transition={{
                duration: 4 + idx * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                left: '50%',
                top: '50%',
                marginLeft: '-24px',
                marginTop: '-24px',
                zIndex: isHovered ? 50 : 10,
              }}
              onMouseEnter={() => {
                setHoveredCompany(comp.id);
                playHoverSound();
              }}
              onMouseLeave={() => setHoveredCompany(null)}
            >
              <motion.button
                onClick={() => handleCompanyClick(comp)}
                className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-border cursor-pointer shadow-md"
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  y: isHovered ? 0 : [-4, 4, -4],
                  borderColor: isHovered ? 'hsl(45 100% 55%)' : 'hsl(220 15% 15%)',
                  boxShadow: isHovered 
                    ? '0 0 30px hsl(45 100% 55% / 0.7), inset 0 0 12px hsl(45 100% 55% / 0.15)' 
                    : '0 0 15px hsl(45 100% 55% / 0.4), 0 0 25px hsl(45 100% 55% / 0.2)',
                }}
                transition={{
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  scale: { duration: 0.3 },
                }}
                whileHover={{ scale: 1.2, y: 0 }}
              >
                {comp.logo_url ? (
                  <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                  </div>
                )}
                {isHovered && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-gold" />
                  </div>
                )}
              </motion.button>

              {/* Label on hover */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-gold text-center w-24 truncate"
                >
                  {comp.name}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}