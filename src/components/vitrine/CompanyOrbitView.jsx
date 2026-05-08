import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ExternalLink } from 'lucide-react';

export default function CompanyOrbitView({ company, otherCompanies }) {
  const [hoveredCompany, setHoveredCompany] = useState(null);

  // Calcula posição orbital para cada empresa (lado direito e superior/inferior)
  const getOrbitPosition = (index, total) => {
    const itemsPerSide = Math.ceil(total / 2);
    const isTop = index < itemsPerSide;
    const posInSide = isTop ? index : index - itemsPerSide;
    const maxPos = Math.max(itemsPerSide - 1, 1);
    
    // Distribui em semicírculo no lado direito
    const angle = isTop 
      ? (Math.PI / 2) - (posInSide / maxPos) * (Math.PI / 2)
      : -(Math.PI / 2) + (posInSide / maxPos) * (Math.PI / 2);
    
    const radius = 220;
    return {
      x: Math.cos(angle) * radius + 150,
      y: Math.sin(angle) * radius,
    };
  };

  const handleCompanyClick = (comp) => {
    if (comp.website) window.open(comp.website, '_blank');
    else if (comp.phone) window.open(`https://wa.me/${comp.phone.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto mb-16">
      {/* Orbit container */}
      <div className="relative h-80 flex items-center justify-start pl-20">
        {/* Orbital curves */}
        <motion.svg
          className="absolute -left-8 inset-y-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 400"
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ duration: 0.8 }}
        >
          <path d="M 150 200 Q 300 100 450 200" fill="none" stroke="hsl(45 100% 55%)" strokeWidth="1" opacity="0.4" />
          <path d="M 150 200 Q 300 300 450 200" fill="none" stroke="hsl(270 80% 65%)" strokeWidth="1" opacity="0.3" />
        </motion.svg>

        {/* Center company - Left side */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute left-0 z-10"
        >
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gold/30 to-purple/30 border-2 border-gold/50 flex items-center justify-center overflow-hidden shadow-2xl glow-gold">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-20 h-20 text-gold" />
            )}
          </div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
            <h3 className="font-grotesk font-bold text-foreground text-lg">{company.name}</h3>
            {company.category && (
              <p className="text-xs text-gold font-semibold">{company.category}</p>
            )}
          </div>
        </motion.div>

        {/* Orbiting companies */}
        {otherCompanies.slice(0, 6).map((comp, idx) => {
          const position = getOrbitPosition(idx, Math.min(otherCompanies.length, 6));
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
                duration: 15 + idx,
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