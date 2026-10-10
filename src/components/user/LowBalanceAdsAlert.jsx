import { useState } from 'react';
import { AlertTriangle, AlertCircle, Zap, Plus, CheckSquare, Square, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import BulkReplenishModal from './BulkReplenishModal';

/**
 * Mostra avisos automáticos sobre o saldo dos anúncios:
 * 1. Anúncios com crédito ZERADO (vermelho) — precisam de créditos para voltar ao ar
 * 2. Anúncios com saldo baixo (âmbar) — ainda ativos mas com poucos compartilhamentos restantes
 * Agora com seleção em massa para repor créditos de vários anúncios de uma vez.
 */
export default function LowBalanceAdsAlert({ ads, onReplenish, userPoints, onReplenished }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  const zeroAds = ads.filter((ad) => (ad.budget_remaining || 0) === 0);
  const lowAds = ads.filter((ad) => {
    const remaining = ad.budget_remaining || 0;
    const reward = ad.reward_per_share || 1;
    return remaining > 0 && remaining <= reward * 5;
  });

  // Todos os anúncios elegíveis para reposição (zero + low)
  const allReplenishable = [...zeroAds, ...lowAds];

  if (allReplenishable.length === 0) return null;

  const toggleAd = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === allReplenishable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allReplenishable.map(a => a.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedAds = allReplenishable.filter(a => selectedIds.has(a.id));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="space-y-3"
      >
        {/* Barra de ações em massa — aparece quando há seleção */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-2 z-10 bg-card border-2 border-gold/40 rounded-xl p-3 flex items-center gap-3 shadow-lg glow-gold"
          >
            <div className="flex items-center gap-2 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-gold" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {selectedIds.size} anúncio{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">Pronto para repor créditos em massa</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={() => setShowBulkModal(true)}
              className="font-bold"
            >
              <Plus className="w-4 h-4" />
              Repor Selecionados
            </Button>
          </motion.div>
        )}

        {/* Alerta vermelho — anúncios sem créditos */}
        {zeroAds.length > 0 && (
          <div className="bg-gradient-to-r from-red-600/15 to-destructive/10 border border-destructive/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-destructive/20 border border-destructive/40 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive text-sm">
                  {zeroAds.length === 1
                    ? '1 anúncio está sem créditos'
                    : `${zeroAds.length} anúncios estão sem créditos`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adicione créditos para reativar seus anúncios e voltar a receber compartilhamentos.
                </p>
              </div>
              {/* Select all for zero ads */}
              <button
                onClick={() => {
                  const zeroIds = zeroAds.map(a => a.id);
                  const allSelected = zeroIds.every(id => selectedIds.has(id));
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (allSelected) zeroIds.forEach(id => next.delete(id));
                    else zeroIds.forEach(id => next.add(id));
                    return next;
                  });
                }}
                className="text-xs text-destructive hover:text-foreground flex items-center gap-1.5 flex-shrink-0"
              >
                {zeroAds.every(a => selectedIds.has(a.id)) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Todos
              </button>
            </div>

            <div className="space-y-2">
              {zeroAds.map((ad) => {
                const isSelected = selectedIds.has(ad.id);
                return (
                  <div
                    key={ad.id}
                    className={`flex items-center justify-between gap-3 bg-background/40 rounded-lg p-3 border transition-colors ${
                      isSelected ? 'border-gold/40 bg-gold/5' : 'border-destructive/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleAd(ad.id)}
                        className="flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-gold" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{ad.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Zap className="w-3 h-3 text-destructive" />
                          0 pts restantes — anúncio inativo
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onReplenish(ad)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Repor
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alerta âmbar — anúncios quase sem créditos */}
        {lowAds.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/40 rounded-xl p-4 space-y-3">
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
              {/* Select all for low ads */}
              <button
                onClick={() => {
                  const lowIds = lowAds.map(a => a.id);
                  const allSelected = lowIds.every(id => selectedIds.has(id));
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (allSelected) lowIds.forEach(id => next.delete(id));
                    else lowIds.forEach(id => next.add(id));
                    return next;
                  });
                }}
                className="text-xs text-amber-400 hover:text-foreground flex items-center gap-1.5 flex-shrink-0"
              >
                {lowAds.every(a => selectedIds.has(a.id)) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Todos
              </button>
            </div>

            <div className="space-y-2">
              {lowAds.map((ad) => {
                const remaining = ad.budget_remaining || 0;
                const reward = ad.reward_per_share || 1;
                const sharesLeft = Math.floor(remaining / reward);
                const isSelected = selectedIds.has(ad.id);
                return (
                  <div
                    key={ad.id}
                    className={`flex items-center justify-between gap-3 bg-background/40 rounded-lg p-3 border transition-colors ${
                      isSelected ? 'border-gold/40 bg-gold/5' : 'border-amber-500/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => toggleAd(ad.id)}
                        className="flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-gold" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{ad.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {remaining} pts restantes · ~{sharesLeft} compartilhamento{sharesLeft !== 1 ? 's' : ''}
                        </p>
                      </div>
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
          </div>
        )}

        {/* Modal de reposição em massa */}
        {showBulkModal && selectedAds.length > 0 && (
          <BulkReplenishModal
            selectedAds={selectedAds}
            userPoints={userPoints}
            onClose={() => setShowBulkModal(false)}
            onReplenished={() => {
              setSelectedIds(new Set());
              setShowBulkModal(false);
              if (onReplenished) onReplenished();
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}