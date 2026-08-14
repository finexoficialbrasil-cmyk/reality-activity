import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Check, X, Clock, Loader2, Eye, Coins, TrendingUp, Users,
  DollarSign, CheckCircle, XCircle, AlertTriangle, Search, Filter, Download, Sparkles, FileText
} from 'lucide-react';

export default function AdminPointsPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await base44.entities.PointsPurchase.filter({}, '-created_date', 500);
      setPurchases(data || []);
    } catch (err) {
      console.error('Erro ao carregar:', err);
      toast.error('Erro ao carregar compras');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (purchase) => {
    setProcessing(prev => ({ ...prev, [purchase.id]: 'approving' }));
    try {
      await base44.functions.invoke('reviewPointsPurchase', {
        purchase_id: purchase.id,
        action: 'approve'
      });
      toast.success('Compra aprovada e pontos creditados!');
      setReviewModal(null);
      loadPurchases();
    } catch (err) {
      toast.error('Erro: ' + (err.message || ''));
    } finally {
      setProcessing(prev => ({ ...prev, [purchase.id]: null }));
    }
  };

  const handleReject = async (purchase) => {
    if (!rejectReason.trim()) {
      toast.error('Digite o motivo da rejeição');
      return;
    }
    setProcessing(prev => ({ ...prev, [purchase.id]: 'rejecting' }));
    try {
      await base44.functions.invoke('reviewPointsPurchase', {
        purchase_id: purchase.id,
        action: 'reject',
        rejection_reason: rejectReason
      });
      toast.success('Compra rejeitada');
      setRejectModal(null);
      setRejectReason('');
      loadPurchases();
    } catch (err) {
      toast.error('Erro: ' + (err.message || ''));
    } finally {
      setProcessing(prev => ({ ...prev, [purchase.id]: null }));
    }
  };

  const exportCSV = () => {
    const headers = ['Data', 'Usuário', 'Email', 'Pontos', 'Bônus', 'Valor', 'Status', 'Aprovação', 'Transação'];
    const rows = filteredPurchases.map(p => [
      new Date(p.created_date).toLocaleDateString('pt-BR'),
      p.user_name,
      p.user_email,
      p.points_requested,
      p.bonus_points || 0,
      p.amount_paid,
      p.status,
      p.approval_type || 'none',
      p.transaction_id || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compras_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filtros aplicados
  const filteredPurchases = purchases.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.user_name?.toLowerCase().includes(q) && !p.user_email?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (dateFilter) {
      const pDate = new Date(p.created_date).toISOString().split('T')[0];
      if (pDate !== dateFilter) return false;
    }
    return true;
  });

  // Estatísticas
  const stats = {
    total: purchases.length,
    approved: purchases.filter(p => p.status === 'approved').length,
    pending: purchases.filter(p => p.status === 'pending' || p.status === 'analyzing').length,
    underReview: purchases.filter(p => p.status === 'under_review').length,
    rejected: purchases.filter(p => p.status === 'rejected').length,
    totalRevenue: purchases.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.amount_paid || 0), 0),
    totalPoints: purchases.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.points_requested || 0) + (p.bonus_points || 0), 0),
    uniqueBuyers: new Set(purchases.filter(p => p.status === 'approved').map(p => p.user_email)).size,
    autoApproved: purchases.filter(p => p.approval_type === 'auto').length,
    manualApproved: purchases.filter(p => p.approval_type === 'manual' && p.status === 'approved').length,
    duplicates: purchases.filter(p => p.duplicate_suspected).length,
  };

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const revenueToday = purchases.filter(p => p.status === 'approved' && new Date(p.created_date).toISOString().split('T')[0] === today).reduce((s, p) => s + (p.amount_paid || 0), 0);
  const revenueMonth = purchases.filter(p => p.status === 'approved' && new Date(p.created_date) >= new Date(monthStart)).reduce((s, p) => s + (p.amount_paid || 0), 0);
  const ticketMedio = stats.approved > 0 ? stats.totalRevenue / stats.approved : 0;

  const statusConfig = {
    pending: { icon: Clock, label: 'Pendente', color: 'text-yellow-400 bg-yellow-500/10' },
    analyzing: { icon: Loader2, label: 'Analisando', color: 'text-blue-400 bg-blue-500/10' },
    approved: { icon: Check, label: 'Aprovado', color: 'text-green-400 bg-green-500/10' },
    rejected: { icon: X, label: 'Rejeitado', color: 'text-destructive bg-destructive/10' },
    under_review: { icon: AlertTriangle, label: 'Em Análise', color: 'text-orange-400 bg-orange-500/10' }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-grotesk font-bold text-2xl">Compras de Saldo</h1>
          <p className="text-sm text-muted-foreground">Gerencie compras de pontos e validações</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" /> Exportar CSV
        </Button>
      </div>

      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Receita Total', value: stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: DollarSign, color: 'text-green-400' },
          { label: 'Pontos Vendidos', value: stats.totalPoints.toLocaleString('pt-BR'), icon: Coins, color: 'text-gold' },
          { label: 'Compradores', value: stats.uniqueBuyers, icon: Users, color: 'text-blue-400' },
          { label: 'Ticket Médio', value: ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUp, color: 'text-accent' },
          { label: 'Receita Hoje', value: revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: DollarSign, color: 'text-green-400' },
          { label: 'Receita no Mês', value: revenueMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: DollarSign, color: 'text-green-400' },
          { label: 'Aprovadas IA', value: stats.autoApproved, icon: Sparkles, color: 'text-accent' },
          { label: 'Aprovadas Manual', value: stats.manualApproved, icon: CheckCircle, color: 'text-green-400' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3">
            <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
            <p className="font-grotesk font-bold text-lg">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {(stats.underReview > 0 || stats.duplicates > 0) && (
        <div className="flex gap-3">
          {stats.underReview > 0 && (
            <div className="flex-1 flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <div>
                <p className="font-semibold text-orange-400 text-sm">{stats.underReview} aguardando análise</p>
                <p className="text-xs text-muted-foreground">Compras que não foram aprovadas automaticamente</p>
              </div>
            </div>
          )}
          {stats.duplicates > 0 && (
            <div className="flex-1 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <XCircle className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-semibold text-red-400 text-sm">{stats.duplicates} comprovantes suspeitos</p>
                <p className="text-xs text-muted-foreground">Possível duplicidade detectada</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="analyzing">Analisando</option>
          <option value="under_review">Em Análise</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
        </select>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
        />
        {(searchQuery || statusFilter !== 'all' || dateFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDateFilter(''); }}>
            <X className="w-4 h-4" /> Limpar
          </Button>
        )}
      </div>

      {/* Lista de Compras */}
      {filteredPurchases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma compra encontrada</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredPurchases.map((purchase) => {
            const status = statusConfig[purchase.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isProcessing = processing[purchase.id];

            return (
              <motion.div
                key={purchase.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 hover:border-gold/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Receipt Preview */}
                  <div
                    className="relative w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setPreviewImage(purchase.receipt_image_url)}
                  >
                    {purchase.receipt_image_url ? (
                      purchase.receipt_image_url.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-500/10">
                          <FileText className="w-6 h-6 text-red-400" />
                          <span className="text-[9px] text-red-400 font-semibold">PDF</span>
                        </div>
                      ) : (
                        <img src={purchase.receipt_image_url} alt="Comprovante" className="w-full h-full object-cover" />
                      )
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
                        {purchase.transaction_id && <p className="text-xs text-muted-foreground/70 font-mono">{purchase.transaction_id}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`${status.color} border-0 flex-shrink-0`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${status.icon === Loader2 ? 'animate-spin' : ''}`} />
                          {status.label}
                        </Badge>
                        {purchase.approval_type === 'auto' && <span className="text-[10px] text-accent">✨ IA</span>}
                        {purchase.duplicate_suspected && <span className="text-[10px] text-red-400">⚠️ Duplicado</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-muted-foreground">Pontos</p>
                        <p className="font-bold text-gold">{purchase.points_requested}</p>
                      </div>
                      <div className="bg-secondary/50 rounded p-2">
                        <p className="text-muted-foreground">Bônus</p>
                        <p className="font-bold text-green-400">{purchase.bonus_points || 0}</p>
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

                    {purchase.receipt_analysis?.flags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {purchase.receipt_analysis.flags.map((flag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}

                    {purchase.rejection_reason && (
                      <p className="text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                        <span className="font-semibold">Motivo:</span> {purchase.rejection_reason}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewModal(purchase)}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Detalhes
                    </Button>
                    {(purchase.status === 'pending' || purchase.status === 'analyzing' || purchase.status === 'under_review') && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                          disabled={!!isProcessing}
                          onClick={() => handleApprove(purchase)}
                        >
                          {isProcessing === 'approving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => { setRejectModal(purchase); setRejectReason(''); }}
                        >
                          <X className="w-3 h-3" /> Rejeitar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Receipt Preview Modal */}
      {previewImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          {previewImage.toLowerCase().endsWith('.pdf') ? (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" /> Comprovante PDF
                </span>
                <div className="flex gap-2">
                  <a
                    href={previewImage}
                    download="comprovante.pdf"
                    className="p-2 hover:bg-secondary rounded-lg text-xs flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Baixar
                  </a>
                  <button onClick={() => setPreviewImage(null)} className="p-2 hover:bg-secondary rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <iframe src={previewImage} className="flex-1 w-full bg-white" title="Comprovante" />
            </motion.div>
          ) : (
            <motion.img
              src={previewImage}
              alt="Comprovante"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-2xl max-h-[80vh] object-contain rounded-lg cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </motion.div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <ReviewModal
          purchase={reviewModal}
          onClose={() => setReviewModal(null)}
          onApprove={() => handleApprove(reviewModal)}
          onReject={() => { setRejectModal(reviewModal); setReviewModal(null); setRejectReason(''); }}
          processing={processing[reviewModal.id]}
        />
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRejectModal(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4"
            >
              <h3 className="font-bold text-lg">Rejeitar Compra</h3>
              <p className="text-sm text-muted-foreground">Descreva o motivo da rejeição para o usuário.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Comprovante ilegível, valor divergente..."
                className="w-full bg-secondary/50 border border-border rounded-lg p-3 text-sm h-24 resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setRejectModal(null)} className="flex-1">Cancelar</Button>
                <Button
                  onClick={() => handleReject(rejectModal)}
                  disabled={processing[rejectModal.id] === 'rejecting'}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {processing[rejectModal.id] === 'rejecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Rejeição'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

// ========================================================================
// MODAL DE REVISÃO DETALHADA
// ========================================================================
function ReviewModal({ purchase, onClose, onApprove, onReject, processing }) {
  const analysis = purchase.receipt_analysis || {};

  const CheckItem = ({ label, ok, value }) => (
    <div className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-medium">{value}</span>}
        {ok === true ? <CheckCircle className="w-4 h-4 text-green-400" /> :
         ok === false ? <XCircle className="w-4 h-4 text-red-400" /> : null}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
            <h3 className="font-bold">Análise da Compra</h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Comprovante */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Comprovante</p>
              {purchase.receipt_image_url && (
                purchase.receipt_image_url.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full rounded-lg border border-border overflow-hidden">
                    <iframe src={purchase.receipt_image_url} className="w-full h-64 bg-white" title="Comprovante" />
                    <div className="flex items-center justify-between p-2 bg-secondary/30">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3 text-red-400" /> Arquivo PDF
                      </span>
                      <a href={purchase.receipt_image_url} download="comprovante.pdf" className="text-xs text-gold flex items-center gap-1 hover:underline">
                        <Download className="w-3 h-3" /> Baixar
                      </a>
                    </div>
                  </div>
                ) : (
                  <img src={purchase.receipt_image_url} alt="Comprovante" className="w-full max-h-64 object-contain rounded-lg border border-border" />
                )
              )}
            </div>

            {/* Dados da Compra */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Dados da Compra</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Usuário</p>
                  <p className="text-sm font-semibold">{purchase.user_name}</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-semibold truncate">{purchase.user_email}</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pontos solicitados</p>
                  <p className="text-sm font-bold text-gold">{purchase.points_requested} pts</p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor esperado</p>
                  <p className="text-sm font-bold">R$ {purchase.amount_paid?.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Análise da IA */}
            {analysis.analysis_text && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-accent" /> Dados Encontrados pela IA
                </p>
                <div className="space-y-1">
                  <CheckItem label="Nome do recebedor" ok={analysis.name_match} value={analysis.name_found} />
                  <CheckItem label="CPF" ok={analysis.cpf_match} value={analysis.cpf_found} />
                  <CheckItem label="Banco" ok={analysis.bank_match} value={analysis.bank_found} />
                  <CheckItem label="Valor" ok={analysis.amount_match} value={analysis.amount_found ? `R$ ${analysis.amount_found}` : null} />
                  <CheckItem label="Data (24h)" ok={analysis.date_valid} value={analysis.date_found} />
                </div>

                {analysis.confidence != null && (
                  <div className="mt-2 p-2 bg-secondary/30 rounded-lg">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Grau de confiança</span>
                      <span className="font-bold">{analysis.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${analysis.confidence >= 80 ? 'bg-green-400' : analysis.confidence >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${analysis.confidence}%` }}
                      />
                    </div>
                  </div>
                )}

                {analysis.flags?.length > 0 && (
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <p className="text-xs font-semibold text-orange-400 mb-1">Alertas:</p>
                    {analysis.flags.map((flag, i) => (
                      <p key={i} className="text-xs text-orange-400">• {flag}</p>
                    ))}
                  </div>
                )}

                {analysis.analysis_text && (
                  <div className="mt-2 p-2 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">{analysis.analysis_text}</p>
                  </div>
                )}
              </div>
            )}

            {/* Duplicate Warning */}
            {purchase.duplicate_suspected && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-xs text-red-400">Comprovante possivelmente duplicado!</p>
              </div>
            )}

            {/* Review Info */}
            {purchase.reviewed_by && (
              <div className="p-2 bg-secondary/30 rounded-lg text-xs">
                <p className="text-muted-foreground">Revisado por: <span className="font-semibold text-foreground">{purchase.reviewed_by}</span></p>
                {purchase.reviewed_date && <p className="text-muted-foreground">Data: {new Date(purchase.reviewed_date).toLocaleString('pt-BR')}</p>}
              </div>
            )}

            {/* Actions */}
            {(purchase.status === 'pending' || purchase.status === 'analyzing' || purchase.status === 'under_review') && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
                <Button
                  variant="ghost"
                  onClick={onReject}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1" /> Rejeitar
                </Button>
                <Button
                  onClick={onApprove}
                  disabled={!!processing}
                  className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                >
                  {processing === 'approving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Aprovar e Liberar
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}