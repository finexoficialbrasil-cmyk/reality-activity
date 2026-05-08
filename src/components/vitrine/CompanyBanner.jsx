import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ExternalLink, Building2, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CompanyBanner({ company, isSelected, onClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExternalLink = async (e) => {
    e.stopPropagation();
    if (company.website) {
      window.open(company.website, '_blank');
    } else if (company.phone) {
      try {
        const res = await base44.functions.invoke('formatWhatsAppLink', { phone: company.phone });
        if (res.data.success) {
          window.open(res.data.url, '_blank');
        }
      } catch (error) {
        console.error('Erro:', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl cursor-pointer group"
    >
      {/* Background gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-purple/10 to-background opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Main card - expandable */}
      <motion.div
        layout
        className={`relative bg-card border transition-all duration-300 ${
          isSelected ? 'border-gold glow-gold' : 'border-border hover:border-gold/40'
        }`}
        style={{ borderRadius: 16 }}
      >
        {/* Cover image */}
        <div className="relative h-32 md:h-40 overflow-hidden bg-secondary">
          {company.cover_image_url ? (
            <motion.img
              src={company.cover_image_url}
              alt={company.name}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.4 }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gold/30 to-purple/30 flex items-center justify-center">
              <Building2 className="w-20 h-20 text-muted-foreground/30" />
            </div>
          )}

          {/* Overlay effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />

          {/* Category badge */}
          {company.category && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-3 left-3 px-3 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-gold/30 text-xs font-semibold text-gold"
            >
              {company.category}
            </motion.div>
          )}

          {/* Status badges */}
          <div className="absolute top-3 right-3 flex gap-2">
            {company.is_partner && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-2.5 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 text-xs font-bold backdrop-blur-sm"
              >
                Parceiro
              </motion.span>
            )}
            {company.points_accepted && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="px-2.5 py-1 rounded-full bg-gold/20 text-gold border border-gold/30 text-xs font-bold backdrop-blur-sm flex items-center gap-1"
              >
                <Star className="w-3 h-3" /> Pontos
              </motion.span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-5">
          {/* Header with logo */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-grotesk font-bold text-base md:text-lg line-clamp-2 text-foreground">
                {company.name}
              </h3>
              {company.email && (
                <p className="text-xs text-muted-foreground truncate">{company.email}</p>
              )}
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <motion.p
              className={`text-sm text-muted-foreground leading-relaxed transition-all duration-300 ${
                isExpanded ? 'line-clamp-none' : 'line-clamp-2'
              }`}
            >
              {company.description}
            </motion.p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            {company.website && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExternalLink}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 text-xs font-semibold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Visitar Site
              </motion.button>
            )}
            {company.phone && !company.website && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExternalLink}
                className="flex-1 px-3 py-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 text-xs font-semibold transition-all"
              >
                Enviar WhatsApp
              </motion.button>
            )}
            {company.description && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={e => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-2 rounded-lg bg-secondary hover:bg-border border border-border transition-all"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
              </motion.button>
            )}
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
      </motion.div>
    </motion.div>
  );
}