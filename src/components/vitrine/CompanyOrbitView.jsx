import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, ExternalLink } from 'lucide-react';

export default function CompanyOrbitView({ company, otherCompanies }) {
  const [hoveredCompany, setHoveredCompany] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setInitialized(true);
  }, []);

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
      <div className="relative h-96 flex items-center justify-center bg-gradient-to-br from-background via-purple/5 to-background rounded-3xl overflow-hidden">
        {/* Gradient accent layers */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />
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
          {/* Glow background animated - roxo elegante */}
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 50px hsl(270 80% 65% / 0.5), 0 0 100px hsl(270 80% 65% / 0.25)',
                '0 0 80px hsl(270 80% 65% / 0.7), 0 0 150px hsl(270 80% 65% / 0.35)',
                '0 0 50px hsl(270 80% 65% / 0.5), 0 0 100px hsl(270 80% 65% / 0.25)',
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 w-56 h-56 rounded-full -z-10"
          />
          
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple/20 via-card to-purple/20 border-2 border-purple/60 flex items-center justify-center overflow-hidden"
            style={{
              boxShadow: '0 0 40px hsl(270 80% 65% / 0.6), inset 0 0 30px hsl(270 80% 65% / 0.15)'
            }}>
            <motion.img 
              src="https://media.base44.com/images/public/69fe21208143d5c488dd2503/22326e603_5784ef057caa0bd01e47b4659fd6ccbb.webp" 
              alt="Logo" 
              className="w-full h-full object-contain p-6"
              animate={{ scale: [1, 1.08, 1] }}
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
              initial={{ opacity: 0, scale: 0 }}
              animate={initialized ? {
                opacity: 1,
                scale: 1,
                x: position.x,
                y: position.y,
              } : {
                opacity: 0,
                scale: 0,
                x: 0,
                y: 0,
              }}
              transition={initialized ? {
                opacity: { duration: 0.5, delay: idx * 0.1 },
                scale: { duration: 0.8, delay: idx * 0.1 },
                x: { duration: 20, delay: 1.5, repeat: Infinity, ease: 'linear' },
                y: { duration: 20, delay: 1.5, repeat: Infinity, ease: 'linear' },
              } : {
                duration: 0.3,
              }}
              onMouseEnter={() => setHoveredCompany(comp.id)}
              onMouseLeave={() => setHoveredCompany(null)}
            >
              <motion.button
                onClick={() => handleCompanyClick(comp)}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all cursor-pointer"
                animate={{
                  scale: isHovered ? 1.2 : 1,
                  borderColor: isHovered ? 'hsl(270 80% 65%)' : 'hsl(220 15% 15%)',
                  boxShadow: isHovered ? '0 0 40px hsl(270 80% 65% / 0.8), 0 0 20px hsl(45 100% 55% / 0.4)' : '0 0 15px hsl(270 80% 65% / 0.4), 0 0 8px hsl(45 100% 55% / 0.2)',
                }}
                whileHover={{ y: -4 }}
              >
                {comp.logo_url ? (
                  <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover brightness-110 contrast-110" />
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