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

  // Raio ampliado para equilibrar com o vídeo
  const baseRadius = 220;

  const handleCompanyClick = async (comp) => {
    playClickSound();
    if (comp.website) {
      window.open(comp.website, '_blank');
    } else if (comp.phone) {
      const message = `Olá! Tenho interesse em conhecer mais sobre os seus produtos e serviços.`;
      const phone = comp.phone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const partnerCount = allCompanies.filter(c => c.is_partner).length;

  return (
    <div className="relative w-full mx-auto px-4">
      {/* Cabeçalho espelhando o lado do vídeo */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-purple animate-pulse" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Ecossistema Holding</span>
      </div>

      {/* Orbit container - card estruturado como o do vídeo */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-purple/20 bg-card/40 shadow-2xl" style={{ aspectRatio: '1 / 1', maxWidth: '680px', margin: '0 auto' }}>
        <div className="cyber-grid absolute inset-0 opacity-40" />
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Orbit ring visual */}
          <div className="absolute inset-6 rounded-full border border-purple/15" />
          <div className="absolute inset-14 rounded-full border border-purple/8" />

          {/* Center logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute z-20 cursor-pointer"
            onMouseEnter={playMoneySound}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-secondary via-card to-muted border-2 border-purple/30 flex items-center justify-center overflow-hidden shadow-2xl glow-purple">
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
                    borderColor: isHovered ? 'hsl(270 80% 65%)' : 'hsl(220 15% 15%)',
                    boxShadow: isHovered 
                      ? '0 0 30px hsl(270 80% 65% / 0.7), inset 0 0 12px hsl(270 80% 65% / 0.15)' 
                      : '0 0 15px hsl(270 80% 65% / 0.4), 0 0 25px hsl(270 80% 65% / 0.2)',
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
                      <ExternalLink className="w-4 h-4 text-purple" />
                    </div>
                  )}
                </motion.button>

                {/* Label on hover */}
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-purple text-center w-24 truncate"
                  >
                    {comp.name}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Rodapé espelhando a legenda do vídeo */}
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed text-center">
        {allCompanies.length} empresas no ecossistema{partnerCount > 0 ? ` · ${partnerCount} parceiras` : ''}
      </p>
    </div>
  );
}