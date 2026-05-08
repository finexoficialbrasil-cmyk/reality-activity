import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ExternalLink } from 'lucide-react';

export default function CompanyOrbitView({ company, otherCompanies }) {
  const [hoveredCompany, setHoveredCompany] = useState(null);

  // Todas as empresas orbitam (incluindo a primeira)
  const allCompanies = company ? [company, ...otherCompanies] : otherCompanies;

  // Calcula posição orbital em círculo completo
  const getOrbitPosition = (index, total) => {
    const angle = (index / total) * Math.PI * 2;
    const radius = 200;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const handleCompanyClick = (comp) => {
    if (comp.website) window.open(comp.website, '_blank');
    else if (comp.phone) window.open(`https://wa.me/${comp.phone.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-16">
      {/* Orbit container */}
      <div className="relative h-96 flex items-center justify-center">
        {/* Orbital circles */}
        <motion.svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 500 500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          <circle cx="250" cy="250" r="200" fill="none" stroke="hsl(45 100% 55%)" strokeWidth="1" opacity="0.2" />
          <circle cx="250" cy="250" r="220" fill="none" stroke="hsl(270 80% 65%)" strokeWidth="1" opacity="0.15" />
        </motion.svg>

        {/* Logo no centro - Viva e brilhante */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute z-20"
        >
          {/* Glow background animated */}
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 40px hsl(45 100% 55% / 0.4), 0 0 80px hsl(270 80% 65% / 0.3)',
                '0 0 60px hsl(45 100% 55% / 0.6), 0 0 120px hsl(270 80% 65% / 0.4)',
                '0 0 40px hsl(45 100% 55% / 0.4), 0 0 80px hsl(270 80% 65% / 0.3)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 w-56 h-56 rounded-full -z-10"
          />
          
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-gold/40 via-purple/30 to-gold/40 border-3 border-gold flex items-center justify-center overflow-hidden shadow-2xl"
            style={{
              boxShadow: '0 0 60px hsl(45 100% 55% / 0.8), 0 0 100px hsl(270 80% 65% / 0.5), inset 0 0 40px hsl(45 100% 55% / 0.3)'
            }}>
            <motion.img 
              src="https://media.base44.com/images/public/69fe21208143d5c488dd2503/22326e603_5784ef057caa0bd01e47b4659fd6ccbb.webp" 
              alt="Logo" 
              className="w-full h-full object-contain p-6 brightness-125"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Orbiting companies */}
        {allCompanies.slice(0, 8).map((comp, idx) => {
          const position = getOrbitPosition(idx, Math.min(allCompanies.length, 8));
          const isHovered = hoveredCompany === comp.id;

          return (
            <motion.div
              key={comp.id}
              className="absolute"
              animate={{
                x: position.x,
                y: position.y,
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              onMouseEnter={() => setHoveredCompany(comp.id)}
              onMouseLeave={() => setHoveredCompany(null)}
            >
              <motion.button
                onClick={() => handleCompanyClick(comp)}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all cursor-pointer"
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  borderColor: isHovered ? 'hsl(45 100% 55%)' : 'hsl(220 15% 15%)',
                  boxShadow: isHovered ? '0 0 30px hsl(45 100% 55% / 0.6)' : '0 0 10px hsl(45 100% 55% / 0.2)',
                }}
                whileHover={{ y: -4 }}
              >
                {comp.logo_url ? (
                  <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                {isHovered && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-gold" />
                  </div>
                )}
              </motion.button>

              {/* Label on hover */}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-gold text-center w-24"
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