import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, DollarSign, FileText, Bitcoin, Wallet, Clock, CheckCircle, XCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { newRequestId } from '@/lib/requestId';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rejectModal, setRejectModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const loadWithdrawals = async () => {
    try {
      const data = await base44.entities.WithdrawalRequest.list('-created_date', 500);
      setWithdrawals(data);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (w) => {
    try {
      const res = await base44.functions.invoke('processWithdrawalDecision', {
        withdrawal_id: w.id,
        action: 'approve',
        request_id: newRequestId()
      });
      if (res.data?.success) {
        toast.success('Saque aprovado - em processamento');
        loadWithdrawals();
      } else {
        toast.error(res.data?.error || 'Erro ao aprovar');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.data?.error || 'Erro ao aprovar');
    }
  };

  const handleReject = async () => {
    if (!rejectReason) { toast.error('Informe o motivo da recusa'); return; }
    try {
      const res = await base44.functions.invoke('processWithdrawalDecision', {
        withdrawal_id: rejectModal.id,
        action: 'reject',
        reason: rejectReason,
        request_id: newRequestId()
      });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Saque recusado e pontos retornados');
        setRejectModal(null);
        setRejectReason('');
        loadWithdrawals();
      } else {
        toast.error(res.data?.error || 'Erro ao recusar');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.data?.error || 'Erro ao recusar');
    }
  };

  const handlePay = async () => {
    setUploading(true);
    try {
      let file_url = null;
      if (receiptFile) {
        const uploaded = await base44.integrations.Core.UploadFile({ file: receiptFile });
        file_url = uploaded.file_url;
      }
      await base44.entities.WithdrawalRequest.update(payModal.id, {
        status: 'paid',
        receipt_url: file_url || undefined,
        processed_date: new Date().toISOString()
      });
      toast.success('Saque marcado como pago!');
      setPayModal(null);
      setReceiptFile(null);
      loadWithdrawals();
    } catch (e) {
      toast.error('Erro ao processar pagamento');
    } finally {
      setUploading(false);
    }
  };

  const filtered = filter === 'all' ? withdrawals : withdrawals.filter(w => w.status === filter);

  const pixKeyTypeLabels = { cpf: 'CPF', telefone: 'Telefone', email: 'E-mail', aleatoria: 'Chave Aleatória' };

  const statusConfig = {
    pending: { label: 'Aguardando', color: 'text-yellow-400 bg-yellow-500/10', icon: Clock },
    processing: { label: 'Processando', color: 'text-blue-400 bg-blue-500/10', icon: Clock },
    paid: { label: 'Pago', color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
    rejected: { label: 'Recusado', color: 'text-red-400 bg-red-500/10', icon: XCircle }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'processing', 'paid', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-gold text-background' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'Todos' : statusConfig[f]?.label || f}
            {f !== 'all' && ` (${withdrawals.filter(w => w.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma solicitação encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Pontos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Método</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Dados Pagamento</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Valor Recompra</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const sc = statusConfig[w.status] || statusConfig.pending;
                  const SIcon = sc.icon;
                  return (
                    <tr key={w.id} className="border-b border-border hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm">{w.user_name}</p>
                        <p className="text-xs text-muted-foreground">{w.user_email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(w.created_date).toLocaleDateString('pt-BR')}
                        <br />
                        {new Date(w.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-sm">{w.points_amount.toLocaleString('pt-BR')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs">
                          {w.method === 'bitcoin_cash' ? <Bitcoin className="w-3.5 h-3.5 text-orange-400" /> : <Wallet className="w-3.5 h-3.5 text-blue-400" />}
                          {w.method === 'bitcoin_cash' ? 'BCH' : 'PIX'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {w.method === 'pix' && w.pix_key_type && (
                          <span className="text-xs text-muted-foreground block mb-0.5">{pixKeyTypeLabels[w.pix_key_type]}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-mono max-w-[130px] truncate" title={w.payment_data}>{w.payment_data}</p>
                          <button
                            onClick={() => { navigator.clipboard.writeText(w.payment_data); toast.success('Copiado!'); }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-gold flex-shrink-0"
                            title="Copiar"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-sm text-green-400">R$ {w.final_value.toFixed(2).replace('.', ',')}</p>
                        <p className="text-xs text-muted-foreground">@ R$ {w.buyback_rate?.toFixed(2).replace('.', ',')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 w-fit ${sc.color}`}>
                          <SIcon className="w-3 h-3" /> {sc.label}
                        </span>
                        {w.rejection_reason && <p className="text-xs text-red-400 mt-1 max-w-[120px]">{w.rejection_reason}</p>}
                        {w.receipt_url && (
                          <a href={w.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline flex items-center gap-1 mt-1">
                            <FileText className="w-3 h-3" /> Comprovante
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          {w.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(w)} title="Aprovar" className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setRejectModal(w); setRejectReason(''); }} title="Recusar" className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {w.status === 'processing' && (
                            <button onClick={() => { setPayModal(w); setReceiptFile(null); }} title="Marcar como Pago" className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20">
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!rejectModal} onOpenChange={(o) => !o && setRejectModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Saque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectModal && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                <p><strong>{rejectModal.user_name}</strong> ({rejectModal.user_email})</p>
                <p>{rejectModal.points_amount} pts → R$ {rejectModal.final_value.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground mt-1">Os pontos serão retornados ao saldo do usuário.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Motivo da recusa *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Dados de pagamento inválidos..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject}>Recusar e Devolver Pontos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payModal} onOpenChange={(o) => !o && setPayModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {payModal && (
              <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                <p><strong>{payModal.user_name}</strong></p>
                <p>{payModal.points_amount} pts → R$ {payModal.final_value.toFixed(2).replace('.', ',')} via {payModal.method === 'bitcoin_cash' ? 'BCH' : 'PIX'}</p>
                <p className="text-xs text-muted-foreground mt-1 break-all">Pagamento para: {payModal.payment_data}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Anexar Comprovante <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setReceiptFile(e.target.files[0])}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gold file:text-background file:font-medium file:cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal(null)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={uploading} className="bg-gold text-background hover:bg-gold-dark">
              {uploading ? '⏳ Enviando...' : '💰 Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}