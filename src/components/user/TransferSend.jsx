import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Search, AlertTriangle, ShieldCheck, ArrowLeft, Wallet, KeyRound, QrCode } from 'lucide-react';
import QrScanner from './QrScanner';
import { toast } from 'sonner';
import { newRequestId } from '@/lib/requestId';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

export default function TransferSend({ user, userPoints, onTransferComplete }) {
  const [step, setStep] = useState('input');
  const [receiverKey, setReceiverKey] = useState('');
  const [receiverInfo, setReceiverInfo] = useState(null);
  const [amount, setAmount] = useState('');
  const [resolving, setResolving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [result, setResult] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // request_id estável para a intenção de transferência: reaproveitado entre o
  // gatilho do 2FA e a confirmação, e em retries após queda de conexão. Limpo
  // no sucesso/reset para que a próxima transferência gere um novo id.
  const transferReqId = useRef(null);

  const balance = userPoints?.balance || 0;
  const amt = Number(amount) || 0;

  const handleResolve = async () => {
    if (!receiverKey.trim()) { toast.error('Digite a chave do destinatário'); return; }
    setResolving(true);
    setReceiverInfo(null);
    try {
      const response = await base44.functions.invoke('resolveTransferKey', { transfer_key: receiverKey.trim() });
      const data = response.data;
      if (data.error) { toast.error(data.error); return; }
      setReceiverInfo({ receiver_name: data.receiver_name, receiver_key: data.receiver_key });
    } catch (e) {
      toast.error('Erro ao buscar chave');
    } finally {
      setResolving(false);
    }
  };

  const handleScan = async (data) => {
    setShowScanner(false);
    const key = data.trim().toUpperCase();
    setReceiverKey(key);
    setResolving(true);
    setReceiverInfo(null);
    try {
      const response = await base44.functions.invoke('resolveTransferKey', { transfer_key: key });
      const result = response.data;
      if (result.error) { toast.error(result.error); return; }
      setReceiverInfo({ receiver_name: result.receiver_name, receiver_key: result.receiver_key });
    } catch (e) {
      toast.error('Erro ao buscar chave');
    } finally {
      setResolving(false);
    }
  };

  const handleConfirmClick = () => {
    if (!receiverInfo) { toast.error('Busque o destinatário primeiro'); return; }
    if (!amt || amt <= 0) { toast.error('Informe a quantidade de pontos'); return; }
    if (amt > balance) { toast.error('Saldo insuficiente'); return; }
    setConfirmOpen(true);
  };

  const handleTransfer = async () => {
    setConfirmOpen(false);
    setTransferring(true);
    if (!transferReqId.current) transferReqId.current = newRequestId();
    try {
      const response = await base44.functions.invoke('processTransfer', {
        receiver_key: receiverInfo.receiver_key,
        points_amount: amt,
        sender_user_agent: navigator.userAgent,
        request_id: transferReqId.current
      });
      const data = response.data;

      if (data.needs_verification) {
        setStep('2fa');
        toast.info(data.message);
        return;
      }

      if (data.error) { toast.error(data.error); return; }

      setResult(data);
      setStep('result');
      transferReqId.current = null;
      if (onTransferComplete) onTransferComplete();
    } catch (e) {
      toast.error('Erro ao processar transferência');
    } finally {
      setTransferring(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) { toast.error('Digite o código de segurança'); return; }
    setTransferring(true);
    try {
      const response = await base44.functions.invoke('processTransfer', {
        receiver_key: receiverInfo.receiver_key,
        points_amount: amt,
        verification_code: verificationCode.trim(),
        sender_user_agent: navigator.userAgent,
        request_id: transferReqId.current || newRequestId()
      });
      const data = response.data;

      if (data.needs_verification) {
        toast.error('Código inválido ou expirado');
        return;
      }

      if (data.error) { toast.error(data.error); return; }

      setResult(data);
      setStep('result');
      setVerificationCode('');
      transferReqId.current = null;
      if (onTransferComplete) onTransferComplete();
    } catch (e) {
      toast.error('Erro ao verificar código');
    } finally {
      setTransferring(false);
    }
  };

  const reset = () => {
    setStep('input');
    setReceiverKey('');
    setReceiverInfo(null);
    setAmount('');
    setResult(null);
    setVerificationCode('');
    transferReqId.current = null;
  };

  if (step === 'result' && result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto text-center space-y-4">
        <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
          result.status === 'under_review' ? 'bg-yellow-500/10' : 'bg-green-500/10'
        }`}>
          {result.status === 'under_review'
            ? <AlertTriangle className="w-8 h-8 text-yellow-400" />
            : <ShieldCheck className="w-8 h-8 text-green-400" />}
        </div>
        <h3 className="font-grotesk font-bold text-xl">
          {result.status === 'under_review' ? 'Transferência em Análise' : 'Transferência Concluída!'}
        </h3>
        <p className="text-muted-foreground text-sm">{result.message}</p>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-left">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">ID:</span><span className="font-mono font-semibold">{result.transfer_id}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Para:</span><span className="font-semibold">{receiverInfo?.receiver_name}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Quantidade:</span><span className="font-semibold text-gold">{amt.toLocaleString('pt-BR')} pts</span></div>
        </div>
        <Button onClick={reset} className="font-bold">Nova Transferência</Button>
      </motion.div>
    );
  }

  if (step === '2fa') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-4">
        <button onClick={() => setStep('input')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="bg-card border border-yellow-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold">Confirmação de Segurança</h3>
              <p className="text-xs text-muted-foreground">Enviamos um código para o seu e-mail</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Código de Verificação</label>
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Digite o código de 6 dígitos"
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button onClick={handleVerifyCode} disabled={transferring} className="w-full font-bold">
            {transferring ? 'Verificando...' : 'Confirmar Transferência'}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-5">
      <div className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Saldo Disponível</p>
          <p className="font-grotesk font-bold text-2xl text-gold">{balance.toLocaleString('pt-BR')} pts</p>
        </div>
        <Wallet className="w-8 h-8 text-gold/40" />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Chave do Destinatário</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={receiverKey}
              onChange={(e) => { setReceiverKey(e.target.value.toUpperCase()); setReceiverInfo(null); }}
              placeholder="FCP-XXXX-XXXX-XXXX"
              className="pl-9 font-mono"
            />
          </div>
          <Button onClick={() => setShowScanner(true)} variant="outline" title="Escanear QR Code">
            <QrCode className="w-4 h-4" />
          </Button>
          <Button onClick={handleResolve} disabled={resolving} variant="outline">
            {resolving ? <span className="w-4 h-4 border-2 border-border border-t-gold rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {receiverInfo && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-green-500/20 rounded-xl p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Você está enviando pontos para:</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-sm font-bold text-green-400">
              {receiverInfo.receiver_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm">{receiverInfo.receiver_name}</p>
              <p className="text-xs text-muted-foreground font-mono">{receiverInfo.receiver_key}</p>
            </div>
          </div>
        </motion.div>
      )}

      {receiverInfo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <label className="text-sm font-medium mb-2 block">Quantidade de Pontos</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="text-lg font-semibold"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Saldo após: {(balance - amt).toLocaleString('pt-BR')} pts</span>
            <button onClick={() => setAmount(String(balance))} className="text-gold hover:underline">Máximo</button>
          </div>
        </motion.div>
      )}

      {receiverInfo && (
        <Button onClick={handleConfirmClick} disabled={transferring || !amt || amt > balance} className="w-full font-bold">
          <Send className="w-4 h-4 mr-2" /> Confirmar Transferência
        </Button>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirme sua transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Destinatário:</span><span className="font-semibold">{receiverInfo?.receiver_name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chave:</span><span className="font-mono text-xs">{receiverInfo?.receiver_key}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Saldo disponível:</span><span className="font-semibold">{balance.toLocaleString('pt-BR')} pts</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quantidade:</span><span className="font-semibold text-gold">{amt.toLocaleString('pt-BR')} pts</span></div>
              <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Saldo após:</span><span className="font-semibold">{(balance - amt).toLocaleString('pt-BR')} pts</span></div>
            </div>
            <p className="text-xs text-muted-foreground text-center">Após a confirmação, a transferência será registrada no histórico.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleTransfer} className="font-bold">Confirmar Transferência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}
    </motion.div>
  );
}