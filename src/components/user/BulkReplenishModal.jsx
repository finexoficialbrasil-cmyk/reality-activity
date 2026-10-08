import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Check, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function BulkReplenishModal({ selectedAds, userPoints, onClose, onReplenished }) {
  const [creditPerAd, setCreditPerAd] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const count = selectedAds.length;
  const totalCost = (Number(creditPerAd) || 0) * count;
  const balance = userPoints?.balance || 0;
  const hasEnough = balance >= totalCost && totalCost > 0;

  const handleSubmit = async () => {
    if (!hasEnough) {
      toast.error('Saldo insuficiente');
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('bulkReplenishAds', {
        ad_ids: selectedAds.map(a => a.id),
        credit_per_ad: Number(creditPerAd) || 0
      });
      const data = res.data;
      if (data?.success) {
        toast.success(`${data.replenished_count} anúncio(s) reabastecido(s) com ${data.credit_per_ad} pts cada!`);
        onReplenished();
        onClose();
      } else {
        toast.error(data?.error || 'Erro ao repor créditos');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Erro ao repor créditos');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-card border-border flex flex-col max-h-[90vh] gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 flex-shrink-0">
          <DialogTitle className="text-gold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Repor Créditos em Massa
          </DialogTitle>
          <DialogDescription>
            Adicione créditos a {count} anúncio{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''} de uma vez.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
          {/* Selected ads preview */}
          <div className="bg-secondary/40 rounded-lg p-2.5 max-h-24 overflow-y-auto space-y-1">
            {selectedAds.map(ad => (
              <div key={ad.id} className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                {ad.title}
              </div>
            ))}
          </div>

          {/* Credit input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Crédito por anúncio (pts)</label>
            <Input
              type="number"
              value={creditPerAd}
              onChange={(e) => setCreditPerAd(e.target.value)}
              min="1"
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cada anúncio selecionado receberá <span className="text-gold font-semibold">{Number(creditPerAd) || 0} pts</span>
            </p>
          </div>

          {/* Summary */}
          <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Anúncios selecionados</span>
              <span className="font-semibold text-foreground">{count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Crédito por anúncio</span>
              <span className="font-semibold text-foreground">{(Number(creditPerAd) || 0).toLocaleString()} pts</span>
            </div>
            <div className="border-t border-border pt-1.5 flex items-center justify-between">
              <span className="text-sm font-medium">Custo total</span>
              <span className="font-grotesk font-bold text-lg text-gold">{totalCost.toLocaleString()} pts</span>
            </div>
          </div>

          {/* Balance check */}
          <div className={`flex items-center gap-2 p-2.5 rounded-lg ${hasEnough ? 'bg-green-500/10 border border-green-500/20' : 'bg-destructive/10 border border-destructive/20'}`}>
            {hasEnough ? (
              <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            )}
            <p className="text-xs">
              {hasEnough ? (
                <span className="text-green-400">Saldo suficiente: {balance.toLocaleString()} pts</span>
              ) : (
                <span className="text-destructive">Saldo insuficiente. Você tem {balance.toLocaleString()} pts e precisa de {totalCost.toLocaleString()} pts</span>
              )}
            </p>
          </div>
        </div>

        {/* Actions — fixados no rodapé do modal */}
        <div className="flex gap-2 p-5 pt-3 border-t border-border flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasEnough || submitting}
            className="flex-1 bg-gold text-background hover:bg-gold-dark font-bold"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Repondo...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Repor {count} anúncio{count !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}