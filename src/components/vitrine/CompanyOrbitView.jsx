import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

export default function CompanyOrbitView({ company, otherCompanies }) {
  if (!company) return null;

  // Create orbit items - show other companies in a circular pattern
  const orbitItems = otherCompanies.slice(0, 6); // Limit to 6 for better layout
  const angleSlice = 360 / Math.max(orbitItems.length, 1);
  const radius = 180; // pixels from center

  return (
    <div className="flex flex-col items-center justify-center py-16 relative h-[500px]">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Orbit circles */}
        <svg className="absolute inset-0 w-full h-full" style={{ maxWidth: '600px', maxHeight: '600px', margin: '0 auto' }}>
          <circle cx="50%" cy="50%" r="100" fill="none" stroke="hsl(var(--gold))" strokeWidth="1" opacity="0.2" strokeDasharray="5,5" />
          <circle cx="50%" cy="50%" r="150" fill="none" stroke="hsl(var(--gold))" strokeWidth="1" opacity="0.2" strokeDasharray="5,5" />
        </svg>

        {/* Central company - larger */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute flex flex-col items-center z-20"
        >
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-4 border-gold overflow-hidden shadow-lg glow-gold">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <p className="mt-4 text-sm font-semibold text-center max-w-xs">{company.name}</p>
          {company.category && (
            <span className="mt-2 px-3 py-1 rounded-full bg-gold/20 text-gold text-xs font-bold border border-gold/30">
              {company.category}
            </span>
          )}
        </motion.div>

        {/* Orbiting companies */}
        {orbitItems.map((item, idx) => {
          const angle = (idx * angleSlice) * (Math.PI / 180);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <motion.div
              key={item.id}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: 1, x, y }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="absolute flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center border-2 border-border hover:border-gold transition-colors overflow-hidden shadow-md">
                {item.logo_url ? (
                  <img src={item.logo_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-center text-muted-foreground max-w-16 line-clamp-2">{item.name}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}