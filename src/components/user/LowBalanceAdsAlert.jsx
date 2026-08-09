import { AlertTriangle, Zap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

/**
 * Mostra um aviso automático quando anúncios estão com saldo baixo.
 * "Saldo baixo" = ainda ativo (budget_remaining > 0) mas consegue pagar
 * poucos compartilhamentos (<= 5x a recompensa por share).
 */
export default function LowBalanceAdsAlert({ ads, onReplenish }) {
  const lowAds = ads.filter((ad) => {
    const remaining = ad.budget_remaining || 0;
    const reward = ad.reward_per_share || 1;
    return remaining > 0 && remaining <= reward * 5;
  });

  if (lowAds.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/40 rounded-xl p-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-400 text-sm">
              {lowAds.length === 1
                ? '1 anúncio está quase sem créditos'
                : `${lowAds.length} anúncios estão quase sem créditos`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Repo os pontos antes que eles saiam do ar automaticamente.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {lowAds.map((ad) => {
            const remaining = ad.budget_remaining || 0;
            const reward = ad.reward_per_share || 1;
            const sharesLeft = Math.floor(remaining / reward);
            return (
              <div
                key={ad.id}
                className="flex items-center justify-between gap-3 bg-background/40 rounded-lg p-3 border border-amber-500/15"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm truncate">{ad.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {remaining} pts restantes · ~{sharesLeft} compartilhamento{sharesLeft !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onReplenish(ad)}
                  className="bg-amber-500 text-background hover:bg-amber-600 flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Repor
                </Button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}