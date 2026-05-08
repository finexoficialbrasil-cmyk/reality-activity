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

  // Gera padrão único de movimento para cada empresa
  const getMovementPath = (index, total) => {
    const baseRadius = 180;
    const offset = (index / total) * Math.PI * 2;
    
    // Cria caminho circular mantendo distância entre empresas
    const points = [];
    for (let i = 0; i < 8; i++) {
      const angle = offset + (i / 8) * Math.PI * 2;
      // Mantém raio constante evita sobreposição
      const radius = baseRadius + Math.sin(angle * 1.5) * 30;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return points;
  };

  const handleCompanyClick = (comp) => {
    if (comp.website) window.open(comp.website, '_blank');
    else if (comp.phone) window.open(`https://wa.me/${comp.phone.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-16">
      {/* Orbit container */}
      <div className="relative h-96 flex items-center justify-center">


        {/* Logo no centro - Viva e brilhante */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute z-20"
        >
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-secondary via-card to-muted border-2 border-gold/20 flex items-center justify-center overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 60px hsl(45 100% 55% / 0.15), inset 0 0 40px hsl(45 100% 55% / 0.05)' }}>
            <motion.img 
              src="https://media.base44.com/images/public/69fe21208143d5c488dd2503/22326e603_5784ef057caa0bd01e47b4659fd6ccbb.webp" 
              alt="Logo" 
              className="w-full h-full object-contain p-6"
              animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          </div>
        </motion.div>

        {/* Orbiting companies */}
        {allCompanies.slice(0, 8).map((comp, idx) => {
          const pathPoints = getMovementPath(idx, Math.min(allCompanies.length, 8));
          const isHovered = hoveredCompany === comp.id;
          
          // Cria variantes de movimento para cada empresa
          const variants = {
            initial: { opacity: 0, scale: 0, x: 0, y: 0 },
            animate: {
              opacity: 1,
              scale: 1,
              x: pathPoints.map(p => p.x),
              y: pathPoints.map(p => p.y),
            }
          };

          return (
            <motion.div
              key={comp.id}
              className="absolute"
              initial="initial"
              animate={initialized ? "animate" : "initial"}
              variants={variants}
              transition={initialized ? {
                opacity: { duration: 0.5, delay: idx * 0.1 },
                scale: { duration: 0.8, delay: idx * 0.1 },
                x: { duration: 14, delay: 1.5, repeat: Infinity, ease: 'linear' },
                y: { duration: 14, delay: 1.5, repeat: Infinity, ease: 'linear' },
              } : {
                duration: 0.3,
              }}
              style={{ zIndex: isHovered ? 50 : 10 }}
              onMouseEnter={() => setHoveredCompany(comp.id)}
              onMouseLeave={() => setHoveredCompany(null)}
            >
              <motion.button
                onClick={() => handleCompanyClick(comp)}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all cursor-pointer shadow-lg"
                animate={{
                  scale: isHovered ? 1.25 : 1,
                  borderColor: isHovered ? 'hsl(45 100% 55%)' : 'hsl(220 15% 15%)',
                  boxShadow: isHovered ? '0 0 40px hsl(45 100% 55% / 0.8), inset 0 0 15px hsl(45 100% 55% / 0.2)' : '0 0 12px hsl(45 100% 55% / 0.3)',
                }}
                whileHover={{ y: -6 }}
              >
                {comp.logo_url ? (
                  <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover brightness-125 contrast-125 group-hover:saturate-150" />
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