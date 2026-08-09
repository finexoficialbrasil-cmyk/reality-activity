import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, ShieldAlert, Clock, CheckCircle, XCircle, Search, Ban } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

const statusConfig = {
  completed: { label: 'Concluída', color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
  under_review: { label: 'Em análise', color: 'text-yellow-400 bg-yellow-500/10', icon: Clock },
  blocked: { label: 'Bloqueada', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'text-gray-400 bg-gray-500/10', icon: XCircle },
};

const riskConfig = {
  low: { label: 'Baixo', color: 'text-green-400' },
  medium: { label: 'Médio', color: 'text-yellow-400' },
  high: { label: 'Alto', color: 'text-red-400' },
};

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30d');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('transfers');
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewAction, setReviewAction] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, k] = await Promise.all([
        base44.entities.PointsTransfer.list('-created_date', 500),
        base44.entities.UserTransferKey.list('-created_date', 500)
      ]);
      setTransfers(t);
      setKeys(k);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setLoading(false);
    }
  };

  const getDateCutoff = () => {
    const now = new Date();
    if (dateFilter === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (dateFilter === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (dateFilter === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return '';
  };

  const filtered = transfers.filter(t => {
    if (filter === 'suspicious' && t.risk_level !== 'high' && t.risk_level !== 'medium') return false;
    if (filter !== 'all' && filter !== 'suspicious' && t.status !== filter) return false;
    if (dateFilter !== 'all') {
      const cutoff = getDateCutoff();
      if (new Date(t.created_date) < new Date(cutoff)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!t.sender_name?.toLowerCase().includes(s) &&
          !t.receiver_name?.toLowerCase().includes(s) &&
          !t.transfer_id?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const handleReview = async () => {
    if (!reviewModal) return;
    try {
      if (reviewAction === 'approve') {
        await base44.entities.PointsTransfer.update(reviewModal.id, { status: 'completed' });
        toast.success('Transferência aprovada!');
      } else {
        const senderPoints = await base44.entities.UserPoints.filter({ user_email: reviewModal.sender_email });
        if (senderPoints[0]) {
          await base44.entities.UserPoints.update(senderPoints[0].id, {
            balance: senderPoints[0].balance + reviewModal.points_amount,
            total_spent: (senderPoints[0].total_spent || 0) - reviewModal.points_amount
          });
        }
        await base44.entities.PointsTransfer.update(reviewModal.id, { status: 'blocked' });
        await base44.entities.PointsTransaction.create({
          user_email: reviewModal.sender_email,
          user_name: reviewModal.sender_name,
          type: 'manual_adjust',
          points: reviewModal.points_amount,
          description: `Transferência ${reviewModal.transfer_id} rejeitada - pontos retornados`
        });
        toast.success('Transferência rejeitada e pontos devolvidos');
      }
      setReviewModal(null);
      loadData();
    } catch (e) {
      toast.error('Erro ao processar');
    }
  };

  const handleBlockKey = async (key) => {
    try {
      await base44.entities.UserTransferKey.update(key.id, { is_blocked: !key.is_blocked });
      toast.success(key.is_blocked ? 'Chave desbloqueada' : 'Chave bloqueada');
      loadData();
    } catch (e) {
      toast.error('Erro ao bloquear chave');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setView('transfers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'transfers' ? 'bg-gold text-background' : 'bg-card border border-border'}`}>
          Transferências
        </button>
        <button onClick={() => setView('keys')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'keys' ? 'bg-gold text-background' : 'bg-card border border-border'}`}>
          Chaves de Usuários
        </button>
      </div>

      {view === 'transfers' ? (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm">
              <option value="all">Todos os status</option>
              <option value="completed">Concluídas</option>
              <option value="under_review">Em análise</option>
              <option value="blocked">Bloqueadas</option>
              <option value="suspicious">⚠️ Suspeitas</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm">
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="all">Todo o período</option>
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuário ou ID..."
                className="w-full pl-9 pr-3 py-1.5 bg-card border border-border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma transferência encontrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Remetente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Destinatário</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Pontos</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Risco</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => {
                      const sc = statusConfig[t.status] || statusConfig.completed;
                      const SIcon = sc.icon;
                      const rc = riskConfig[t.risk_level] || riskConfig.low;
                      return (
                        <tr key={t.id} className="border-b border-border hover:bg-secondary/20">
                          <td className="px-4 py-3"><p className="text-xs font-mono">{t.transfer_id}</p></td>
                          <td className="px-4 py-3"><p className="text-sm font-medium">{t.sender_name}</p><p className="text-xs text-muted-foreground">{t.sender_email}</p></td>
                          <td className="px-4 py-3"><p className="text-sm font-medium">{t.receiver_name}</p><p className="text-xs text-muted-foreground">{t.receiver_email}</p></td>
                          <td className="px-4 py-3 text-right"><p className="font-semibold text-sm text-gold">{t.points_amount.toLocaleString('pt-BR')}</p></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_date).toLocaleDateString('pt-BR')} {new Date(t.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${rc.color}`}>
                              {t.risk_level === 'high' && <ShieldAlert className="w-3 h-3 inline mr-1" />}
                              {rc.label}
                            </span>
                            {t.risk_reason && <p className="text-xs text-muted-foreground mt-0.5 max-w-[150px]">{t.risk_reason}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${sc.color}`}>
                              <SIcon className="w-3 h-3" /> {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {t.status === 'under_review' && (
                              <div className="flex items-center gap-1 justify-center">
                                <button onClick={() => { setReviewModal(t); setReviewAction('approve'); }} title="Aprovar" className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setReviewModal(t); setReviewAction('reject'); }} title="Rejeitar" className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Usuário</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Chave</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Transferências</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map(k => (
                    <tr key={k.id} className="border-b border-border hover:bg-secondary/20">
                      <td className="px-4 py-3"><p className="text-sm font-medium">{k.user_name}</p><p className="text-xs text-muted-foreground">{k.user_email}</p></td>
                      <td className="px-4 py-3"><p className="text-xs font-mono">{k.transfer_key}</p></td>
                      <td className="px-4 py-3 text-right text-sm">{(k.transfers_count || 0).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gold">{(k.total_volume || 0).toLocaleString('pt-BR')} pts</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${k.is_blocked ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                          {k.is_blocked ? 'Bloqueada' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleBlockKey(k)} className={`p-1.5 rounded-lg ${k.is_blocked ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`} title={k.is_blocked ? 'Desbloquear' : 'Bloquear'}>
                          {k.is_blocked ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!reviewModal} onOpenChange={(o) => !o && setReviewModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction === 'approve' ? 'Aprovar Transferência' : 'Rejeitar Transferência'}</DialogTitle>
          </DialogHeader>
          {reviewModal && (
            <div className="space-y-3 py-4">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">ID:</span><span className="font-mono">{reviewModal.transfer_id}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">De:</span><span className="font-semibold">{reviewModal.sender_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Para:</span><span className="font-semibold">{reviewModal.receiver_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantidade:</span><span className="font-semibold text-gold">{reviewModal.points_amount.toLocaleString('pt-BR')} pts</span></div>
                {reviewModal.risk_reason && <div className="text-xs text-yellow-400 pt-2 border-t border-border">⚠️ {reviewModal.risk_reason}</div>}
              </div>
              <p className="text-sm text-muted-foreground">
                {reviewAction === 'approve'
                  ? 'A transferência será marcada como concluída.'
                  : 'A transferência será bloqueada e os pontos devolvidos ao remetente.'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewModal(null)}>Cancelar</Button>
            <Button
              onClick={handleReview}
              className={reviewAction === 'approve' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}
            >
              {reviewAction === 'approve' ? 'Aprovar' : 'Rejeitar e Devolver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}