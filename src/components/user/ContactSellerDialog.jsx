import { useState } from 'react';
import { MessageCircle, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const SELLER_MESSAGE = 'Olá! Vi seu anúncio de venda de pontos na RealityActivity e gostaria de obter mais informações sobre a compra.';

const DISCLAIMER = 'A RealityActivity é apenas uma plataforma de intermediação entre usuários. A negociação, pagamento, entrega dos pontos e qualquer acordo realizado são de inteira responsabilidade do comprador e do vendedor. A RealityActivity não participa da negociação e não se responsabiliza por eventuais prejuízos, golpes ou descumprimento do acordo.';

export default function ContactSellerDialog({ listing, onClose }) {
  const [accepted, setAccepted] = useState(false);
  if (!listing) return null;

  const openWhatsApp = () => {
    const num = (listing.whatsapp_number || '').replace(/\D/g, '');
    const url = `https://wa.me/${num}?text=${encodeURIComponent(SELLER_MESSAGE)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-gold/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-500/15 rounded-lg flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Termo de Responsabilidade</h3>
              <p className="text-xs text-muted-foreground mt-1">Leia e aceite antes de contatar o vendedor.</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed bg-secondary/40 rounded-xl p-4 border border-border">
            {DISCLAIMER}
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="accent-gold mt-0.5 w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm text-foreground">Li e estou ciente dos termos acima.</span>
          </label>

          <Button
            onClick={openWhatsApp}
            disabled={!accepted}
            className="w-full h-11 bg-[#25D366] text-white hover:bg-[#1ebe5d] font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Conversar com o Vendedor
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}