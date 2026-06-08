import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, X, Clock, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminPointsPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await base44.entities.PointsPurchase.filter({}, '-created_date', 100);
      setPurchases(data || []);
    } catch (err) {
      console.error('Erro ao carregar compras:', err);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (purchase) => {
    setProcessing(prev => ({ ...prev, [purchase.id]: 'approving' }));
    try {
      // Invoca análise de comprovante que já aprova automaticamente
      await base44.functions.invoke('analyzePointsPurchaseReceipt', {
        purchase_id: purchase.id
      });

      toast.success('Comprovante aprovado e pontos creditados!');
      loadPurchases();
    } catch (err) {
      console.error('Erro ao aprovar:', err);
      toast.error('Erro ao aprovar: ' + (err.message || 'Tente novamente'));
    } finally {
      setProcessing(prev => ({ ...prev, [purchase.id]: null }));
    }
  };

  const handleReject = async (purchase) => {
    const reason = prompt('Motivo da rejeição:');
    if (!reason) return;

    setProcessing(prev => ({ ...prev, [purchase.id]: 'rejecting' }));
    try {
      await base44.entities.PointsPurchase.update(purchase.id, {
        status: 'rejected',
        rejection_reason: reason
      });

      toast.success('Comprovante rejeitado');
      loadPurchases();
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
      toast.error('Erro ao rejeitar');
    } finally {
      setProcessing(prev => ({ ...prev, [purchase.id]: null }));
    }
  };

  const statusConfig = {
    pending: { icon: Clock, label: 'Pendente', color: 'text-yellow-400 bg-yellow-500/10' },
    analyzing: { icon: Loader2, label: 'Analisando', color: 'text-blue-400 bg-blue-500/10' },
    approved: { icon: Check, label: 'Aprovado', color: 'text-green-400 bg-green-500/10' },
    rejected: { icon: X, label: 'Rejeitado', color: 'text-destructive bg-destructive/10' }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-grotesk font-bold text-2xl">Compras de Pontos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os pedidos de compra de pontos dos usuários</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gold">{purchases.filter(p => p.status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">pendentes</p>
        </div>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum pedido de compra de pontos ainda</p>
        </div>
      ) : (
        <div className="grid gap-3 max-w-4xl">
          {purchases.map((purchase) => {
            const status = statusConfig[purchase.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isProcessing = processing[purchase.id];

            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Receipt Image Preview */}
                  <div className="relative w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewImage(purchase.receipt_image_url)}>
                    {purchase.receipt_image_url ? (
                      <img src={purchase.receipt_image_url} alt="Comprovante" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem imagem</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground truncate">{purchase.user_name}</h3>
                        <p className="text-xs text-muted-foreground">{purchase.user_email}</p>
                      </div>
                      <Badge className={`${status.color} border-0 flex-shrink-0`}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-muted-foreground">Pontos</p>
                        <p className="font-bold text-gold">{purchase.points_requested}</p>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-muted-foreground">Valor</p>
                        <p className="font-bold">R$ {purchase.amount_paid?.toFixed(2)}</p>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-muted-foreground">Data</p>
                        <p className="font-bold text-xs">{new Date(purchase.created_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    {purchase.receipt_analysis && purchase.receipt_analysis.analysis_text && (
                      <p className="text-xs text-muted-foreground mb-3 p-2 bg-secondary/30 rounded border border-border/50">
                        {purchase.receipt_analysis.analysis_text}
                      </p>
                    )}

                    {purchase.rejection_reason && (
                      <p className="text-xs text-destructive mb-3 p-2 bg-destructive/10 rounded border border-destructive/20">
                        <span className="font-semibold">Motivo:</span> {purchase.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {purchase.status === 'pending' || purchase.status === 'analyzing' ? (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                        disabled={!!isProcessing}
                        onClick={() => handleApprove(purchase)}
                      >
                        {isProcessing === 'approving' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={!!isProcessing}
                        onClick={() => handleReject(purchase)}
                      >
                        {isProcessing === 'rejecting' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        Rejeitar
                      </Button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <motion.img
            src={previewImage}
            alt="Comprovante"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="max-w-2xl max-h-[80vh] object-contain rounded-lg cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </motion.div>
  );
}