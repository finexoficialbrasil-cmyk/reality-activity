import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Loader2, User, Coins, DollarSign, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { newRequestId } from '@/lib/requestId';
import { toast } from 'sonner';

export default function ConfirmSaleDialog({ listing, onClose, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [saleQty, setSaleQty] = useState(0);

  useEffect(() => {
    if (listing) {
      const rem = Number(listing.points_amount) || 0;
      const dec = Math.max(0, Math.floor(Number(listing.buyer_declared_quantity) || 0));
      setSaleQty(dec > 0 ? Math.min(dec, rem) : rem);
    }
  }, [listing?.id]);

  if (!listing) return null;

  const remaining = Number(listing.points_amount) || 0;
  const perPoint = Number(listing.price_per_point) || 0;
  const declaredQty = Math.max(0, Math.floor(Number(listing.buyer_declared_quantity) || 0));
  const maxQty = declaredQty > 0 ? Math.min(declaredQty, remaining) : remaining;

  const saleValue = (saleQty || 0) * perPoint;
  const newRemaining = remaining - (saleQty || 0);
  const formatCurrency = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleConfirm = async () => {
    if (!paymentReceived) {
      toast.error('Confirme que você recebeu o pagamento do comprador');
      return;
    }
    const qty = Math.max(0, Math.floor(Number(saleQty) || 0));
    if (qty <= 0 || qty > remaining) {
      toast.error(`Quantidade inválida. Disponível: ${remaining} pts`);
      return;
    }
    if (declaredQty > 0 && qty > declaredQty) {
      toast.error(`Não pode vender mais que o solicitado pelo comprador (${declaredQty} pts)`);
      return;
    }
    setConfirming(true);
    try {
      const res = await base44.functions.invoke('confirmMarketplaceSale', {
        listing_id: listing.id,
        points_quantity: qty,
        request_id: newRequestId()
      });
      if (!res.data?.success) throw new Error(res.data?.error || 'Erro ao confirmar venda');
      toast.success(res.data?.message || 'Venda confirmada com sucesso!');
      onConfirmed?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Erro ao confirmar venda');
    } finally {
      setConfirming(false);
    }
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
          className="bg-card border border-gold/30 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-gold/15 rounded-xl flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground">Confirmar Venda</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Transfira os pontos reservados ao comprador</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Buyer info */}
          <div className="bg-secondary/40 rounded-xl p-4 space-y-3 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-purple-500/10 flex items-center justify-center">
                <User className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comprador</p>
                <p className="text-sm font-semibold text-foreground">{listing.buyer_name}</p>
                <p className="text-xs text-muted-foreground">{listing.buyer_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3" /> Disponível no anúncio</p>
                <p className="text-lg font-bold text-coin">{remaining.toLocaleString('pt-BR')} pts</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Comprador quer</p>
                <p className="text-lg font-bold text-gold">{declaredQty > 0 ? `${declaredQty.toLocaleString('pt-BR')} pts` : 'Total'}</p>
              </div>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground">
              Quantidade a vender nesta transação
            </label>
            <div className="relative">
              <Input
                type="number"
                value={saleQty}
                onChange={(e) => setSaleQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 0)))}
                className="h-12 pr-12 bg-secondary/50 border-gold/30 focus:border-gold text-lg font-bold text-coin"
                min="1"
                max={maxQty}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-coin text-sm font-bold">pts</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Máximo: {maxQty.toLocaleString('pt-BR')} pts
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(perPoint)}/pt
              </span>
            </div>
          </div>

          {/* Sale summary */}
          <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-gold/10 to-purple-500/5 rounded-xl p-4 border border-gold/20">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Valor desta venda</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(saleValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3" /> Restante após venda</p>
              <p className="text-xl font-bold text-coin">{newRemaining.toLocaleString('pt-BR')} pts</p>
              {newRemaining === 0 && (
                <p className="text-[10px] text-green-400 font-semibold">Anúncio será totalmente vendido</p>
              )}
            </div>
          </div>

          {/* Payment confirmation */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none bg-orange-500/5 border border-orange-500/20 rounded-xl p-3.5">
            <input
              type="checkbox"
              checked={paymentReceived}
              onChange={(e) => setPaymentReceived(e.target.checked)}
              className="accent-gold mt-0.5 w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm text-foreground leading-relaxed">
              Confirmo que <strong>recebi o pagamento</strong> de {formatCurrency(saleValue)} do comprador via WhatsApp.
            </span>
          </label>

          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p>
              Ao confirmar, <strong className="text-coin">{(saleQty || 0).toLocaleString('pt-BR')} pontos</strong> serão transferidos ao comprador.
              {newRemaining > 0
                ? <> O anúncio permanece ativo com <strong className="text-coin">{newRemaining.toLocaleString('pt-BR')} pts</strong> restantes.</>
                : ' Esta operação é <strong>irreversível</strong>.'
              }
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11" disabled={confirming}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming || !paymentReceived || !saleQty}
              className="flex-1 h-11 text-white font-bold border-0 hover:opacity-90"
              style={{ background: 'linear-gradient(90deg, #E823E8 0%, #C026F7 50%, #8A2BE2 100%)', boxShadow: '0 0 18px rgba(232,35,232,0.55), inset 0 1px 0 rgba(255,255,255,0.3)' }}
            >
              {confirming ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Confirmando...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> Confirmar Venda</>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}