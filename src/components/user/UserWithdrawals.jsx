import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, Bitcoin, AlertCircle, CheckCircle, Clock, XCircle, FileText, History } from 'lucide-react';
import { toast } from 'sonner';
import { newRequestId } from '@/lib/requestId';

export default function UserWithdrawals({ user, userPoints, onWithdrawal }) {
  const [settings, setSettings] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    points_amount: '',
    method: '',
    payment_data: '',
    pix_key_type: ''
  });
  // request_id estável para a solicitação de saque (reaproveitado em retries, limpo no sucesso)
  const withdrawalReqId = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, withdrawalsRes] = await Promise.all([
        base44.entities.WithdrawalSettings.list(),
        base44.entities.WithdrawalRequest.filter({ user_email: user.email }, '-created_date', 50)
      ]);
      setSettings(settingsRes[0] || null);
      setWithdrawals(withdrawalsRes);
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    } finally {
      setLoading(false);
    }
  };

  const availableMethods = [];
  if (settings?.bch_enabled) availableMethods.push({ value: 'bitcoin_cash', label: 'Bitcoin Cash (BCH)', icon: Bitcoin });
  if (settings?.pix_enabled) availableMethods.push({ value: 'pix', label: 'PIX', icon: Wallet });

  const pixKeyTypeLabel = {
    cpf: 'CPF',
    telefone: 'Telefone',
    email: 'E-mail',
    aleatoria: 'Chave Aleatória'
  }[formData.pix_key_type] || '';

  const pixKeyPlaceholder = {
    cpf: 'Apenas números, ex: 12345678901',
    telefone: 'DDD + número, ex: 11987654321',
    email: 'seu@email.com',
    aleatoria: 'Cole sua chave aleatória aqui'
  }[formData.pix_key_type] || '';

  const currentRate = formData.method === 'bitcoin_cash'
    ? settings?.bch_buyback_rate || 0
    : formData.method === 'pix'
    ? settings?.pix_buyback_rate || 0
    : 0;

  const pointsAmount = parseInt(formData.points_amount) || 0;
  const finalValue = pointsAmount * currentRate;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.method) { toast.error('Selecione um método de saque'); return; }
    if (formData.method === 'pix' && !formData.pix_key_type) { toast.error('Selecione o tipo de chave PIX'); return; }
    if (!formData.payment_data) { toast.error('Informe os dados para pagamento'); return; }
    if (pointsAmount < 100) { toast.error('Valor mínimo para saque: 100 pontos'); return; }
    if (pointsAmount > (userPoints?.balance || 0)) { toast.error('Saldo insuficiente'); return; }

    setSubmitting(true);
    if (!withdrawalReqId.current) withdrawalReqId.current = newRequestId();
    try {
      // Processa saque no servidor (valida saldo, taxa e deduz pontos de forma segura)
      const response = await base44.functions.invoke('processWithdrawal', {
        points_amount: pointsAmount,
        method: formData.method,
        payment_data: formData.payment_data,
        pix_key_type: formData.method === 'pix' ? formData.pix_key_type : undefined,
        request_id: withdrawalReqId.current
      });

      toast.success('Solicitação de saque enviada! Aguarde aprovação.');
      setFormData({ points_amount: '', method: '', payment_data: '', pix_key_type: '' });
      withdrawalReqId.current = null;
      if (onWithdrawal) onWithdrawal();
      loadData();
    } catch (err) {
      console.error('Erro ao solicitar saque:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'Tente novamente';
      toast.error('Erro ao solicitar saque: ' + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Aguardando aprovação', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
    processing: { label: 'Em processamento', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Clock },
    paid: { label: 'Pago', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle },
    rejected: { label: 'Recusado', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  if (availableMethods.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground">Nenhum método de saque disponível no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-grotesk font-bold text-xl mb-1">Solicitar Saque</h2>
        <p className="text-sm text-muted-foreground mb-6">Converta seus pontos em dinheiro via PIX ou Bitcoin Cash</p>

        <div className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <p className="font-grotesk font-bold text-3xl text-gold">{(userPoints?.balance || 0).toLocaleString('pt-BR')} pts</p>
            </div>
            <Wallet className="w-10 h-10 text-gold/40" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Quantos pontos deseja resgatar? *</label>
            <Input
              type="number"
              placeholder="Ex: 500"
              value={formData.points_amount}
              onChange={(e) => setFormData({ ...formData, points_amount: e.target.value })}
              min="100"
              max={userPoints?.balance || 0}
            />
            <p className="text-xs text-muted-foreground mt-1">Mínimo: 100 pontos</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Método de Saque *</label>
            <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
              <SelectTrigger><SelectValue placeholder="Escolha o método" /></SelectTrigger>
              <SelectContent>
                {availableMethods.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    <span className="flex items-center gap-2">
                      <m.icon className="w-4 h-4" /> {m.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.method === 'bitcoin_cash' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-400">⚠️ Aviso</p>
                  <p className="text-xs text-orange-300 mt-1">{settings?.bch_warning || 'Seu saldo será recomprado pela empresa pelo valor definido pelo administrador.'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {formData.method === 'pix' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Chave PIX *</label>
                <Select value={formData.pix_key_type} onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o tipo de chave" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">📋 CPF</SelectItem>
                    <SelectItem value="telefone">📱 Telefone</SelectItem>
                    <SelectItem value="email">✉️ E-mail</SelectItem>
                    <SelectItem value="aleatoria">🔑 Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.pix_key_type && (
                <div>
                  <label className="text-sm font-medium mb-2 block">{pixKeyTypeLabel} *</label>
                  <Input
                    placeholder={pixKeyPlaceholder}
                    value={formData.payment_data}
                    onChange={(e) => setFormData({ ...formData, payment_data: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {formData.method === 'bitcoin_cash' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Endereço da Carteira BCH *</label>
              <Input
                placeholder="Endereço da sua carteira Bitcoin Cash"
                value={formData.payment_data}
                onChange={(e) => setFormData({ ...formData, payment_data: e.target.value })}
              />
            </div>
          )}

          {formData.method && pointsAmount > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-secondary/50 rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pontos a resgatar</span>
                <span className="font-semibold">{pointsAmount.toLocaleString('pt-BR')} pts</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de recompra</span>
                <span className="font-semibold">R$ {currentRate.toFixed(2).replace('.', ',')} / ponto</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-medium">Valor final a receber</span>
                <span className="font-grotesk font-bold text-xl text-green-400">R$ {finalValue.toFixed(2).replace('.', ',')}</span>
              </div>
            </motion.div>
          )}

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              • O processamento pode levar até 3 dias úteis.<br/>
              • O comprovante será disponibilizado após o pagamento.<br/>
              • Em caso de recusa, os pontos retornam ao seu saldo.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full font-bold"
            disabled={submitting || !formData.method || !formData.payment_data || (formData.method === 'pix' && !formData.pix_key_type) || pointsAmount < 100 || pointsAmount > (userPoints?.balance || 0)}
          >
            {submitting ? '⏳ Enviando...' : '💰 Solicitar Resgate'}
          </Button>
        </form>
      </motion.div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-gold" /> Histórico de Saques
        </h2>
        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhum saque solicitado ainda</p>
          ) : withdrawals.map((w) => {
            const sc = statusConfig[w.status] || statusConfig.pending;
            const SIcon = sc.icon;
            return (
              <div key={w.id} className="flex items-start justify-between py-3 border-b border-border last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{w.points_amount.toLocaleString('pt-BR')} pts</span>
                    <span className="text-xs text-muted-foreground">→ R$ {w.final_value.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {w.method === 'bitcoin_cash' ? 'Bitcoin Cash' : 'PIX'} • {new Date(w.created_date).toLocaleDateString('pt-BR')}
                  </p>
                  {w.rejection_reason && (
                    <p className="text-xs text-red-400">Motivo: {w.rejection_reason}</p>
                  )}
                  {w.receipt_url && (
                    <a href={w.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Ver comprovante
                    </a>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 ${sc.color}`}>
                  <SIcon className="w-3 h-3" /> {sc.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}