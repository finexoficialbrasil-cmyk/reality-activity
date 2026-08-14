import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  X, Coins, TrendingUp, Upload, CheckCircle, Loader2, Copy,
  Building2, User, CreditCard, FileText, ShieldCheck, AlertCircle, Sparkles
} from 'lucide-react';

export default function PurchasePointsModal({ user, isOpen, onClose, onSuccess }) {
  const [settings, setSettings] = useState(null);
  const [step, setStep] = useState('choose'); // choose, payment, upload, analyzing, result
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [customPoints, setCustomPoints] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadHistory();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const data = await base44.entities.PurchaseSettings.list();
      setSettings(data[0] || null);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await base44.entities.PointsPurchase.filter({ user_email: user.email }, '-created_date', 20);
      setHistory(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const pricePerPoint = settings?.price_per_point || 0.1;
  const packages = settings?.packages || [
    { points: 100, label: 'Iniciante', bonus: 0 },
    { points: 500, label: 'Popular', bonus: 25 },
    { points: 1000, label: 'Profissional', bonus: 100 },
    { points: 5000, label: 'Empresarial', bonus: 750 }
  ];

  const currentPoints = selectedPackage ? selectedPackage.points : (parseInt(customPoints) || 0);
  const currentBonus = selectedPackage ? selectedPackage.bonus : 0;
  const currentAmount = currentPoints * pricePerPoint;

  const formatCurrency = (val) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleContinueToPayment = () => {
    if (!currentPoints || currentPoints < (settings?.min_purchase_points || 100)) {
      toast.error(`Mínimo de ${settings?.min_purchase_points || 100} pontos`);
      return;
    }
    if (currentPoints > (settings?.max_purchase_points || 100000)) {
      toast.error(`Máximo de ${settings?.max_purchase_points || 100000} pontos`);
      return;
    }
    setStep('payment');
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use PDF, JPG, JPEG ou PNG.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await base44.integrations.Core.UploadFile({ file });
      setReceiptFile({ url: res.file_url, name: file.name });
      toast.success('Comprovante carregado!');
    } catch (err) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!receiptFile) {
      toast.error('Envie o comprovante primeiro');
      return;
    }

    setStep('analyzing');
    try {
      // Cria a compra
      const transactionId = `CMP-${Date.now().toString(36).toUpperCase()}`;
      const purchase = await base44.entities.PointsPurchase.create({
        transaction_id: transactionId,
        user_email: user.email,
        user_name: user.full_name,
        points_requested: currentPoints,
        bonus_points: currentBonus,
        amount_paid: currentAmount,
        price_per_point: pricePerPoint,
        receipt_image_url: receiptFile.url,
        status: 'pending'
      });

      // Dispara análise por IA
      const res = await base44.functions.invoke('analyzePointsPurchaseReceipt', {
        purchase_id: purchase.id
      });

      setAnalysisResult(res.data);
      setStep('result');

      if (res.data.status === 'approved') {
        toast.success('Pagamento confirmado! Saldo liberado! 🎉');
        if (onSuccess) onSuccess();
      } else if (res.data.status === 'under_review') {
        toast.info('Comprovante em análise administrativa');
      }

      loadHistory();
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao processar comprovante');
      setStep('upload');
    }
  };

  const resetFlow = () => {
    setStep('choose');
    setSelectedPackage(null);
    setCustomPoints('');
    setReceiptFile(null);
    setAnalysisResult(null);
  };

  if (!isOpen) return null;

  const statusConfig = {
    pending: { label: 'Pendente', color: 'text-yellow-400 bg-yellow-500/10' },
    analyzing: { label: 'Analisando', color: 'text-blue-400 bg-blue-500/10' },
    approved: { label: 'Aprovado', color: 'text-green-400 bg-green-500/10' },
    rejected: { label: 'Rejeitado', color: 'text-red-400 bg-red-500/10' },
    under_review: { label: 'Em Análise', color: 'text-orange-400 bg-orange-500/10' }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-b from-card to-card/80 border border-gold/20 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 pb-0 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gold/10 rounded-xl">
                  <Coins className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-grotesk font-bold bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">
                    Comprar Saldo
                  </h2>
                  <p className="text-xs text-muted-foreground">Adicione pontos ao seu saldo</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* STEP: CHOOSE */}
            {step === 'choose' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Preço por ponto</p>
                  <p className="text-3xl font-grotesk font-bold text-gold">{formatCurrency(pricePerPoint)}</p>
                  <p className="text-xs text-muted-foreground mt-1">100 pts = {formatCurrency(100 * pricePerPoint)}</p>
                </div>

                {/* Packages */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Escolha um pacote</p>
                  {packages.map((pkg, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedPackage(pkg); setCustomPoints(''); }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedPackage?.points === pkg.points
                          ? 'border-gold bg-gold/10'
                          : 'border-border bg-secondary/30 hover:border-gold/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          selectedPackage?.points === pkg.points ? 'bg-gold/20' : 'bg-secondary'
                        }`}>
                          <Coins className="w-5 h-5 text-gold" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-sm">{pkg.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {pkg.points.toLocaleString('pt-BR')} pts
                            {pkg.bonus > 0 && <span className="text-green-400"> +{pkg.bonus} bônus</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gold">{formatCurrency(pkg.points * pricePerPoint)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Ou digite a quantidade</p>
                  <div className="relative">
                    <Input
                      type="number"
                      value={customPoints}
                      onChange={(e) => { setCustomPoints(e.target.value); setSelectedPackage(null); }}
                      placeholder="Ex: 250"
                      min={settings?.min_purchase_points || 100}
                      max={settings?.max_purchase_points || 100000}
                      className="h-12 text-lg pr-16 bg-secondary/50 border-gold/20 focus:border-gold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gold font-bold text-sm">pts</span>
                  </div>
                </div>

                {/* Summary + CTA */}
                {currentPoints > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-gold/15 to-yellow-500/10 border border-gold/30 rounded-2xl p-5 space-y-3"
                  >
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pontos:</span>
                        <span className="font-bold text-gold">{currentPoints.toLocaleString('pt-BR')} pts</span>
                      </div>
                      {currentBonus > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bônus:</span>
                          <span className="font-bold text-green-400">+{currentBonus} pts</span>
                        </div>
                      )}
                      <div className="h-px bg-gold/20" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total a pagar:</span>
                        <span className="font-bold text-lg text-foreground">{formatCurrency(currentAmount)}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleContinueToPayment}
                      className="w-full h-12 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold rounded-xl"
                    >
                      Continuar para pagamento
                    </Button>
                  </motion.div>
                )}

                {/* History */}
                {history.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-semibold mb-2">Minhas compras</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {history.map((h) => {
                        const st = statusConfig[h.status] || statusConfig.pending;
                        return (
                          <div key={h.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg text-xs">
                            <div>
                              <p className="font-semibold">{h.points_requested} pts</p>
                              <p className="text-muted-foreground">{new Date(h.created_date).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(h.amount_paid)}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${st.color}`}>{st.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP: PAYMENT */}
            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gold/10 to-yellow-500/10 border border-gold/30 rounded-2xl">
                  <ShieldCheck className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gold font-medium leading-relaxed">
                    {settings?.instructions || 'Faça o pagamento usando os dados abaixo e depois envie o comprovante.'}
                  </p>
                </div>

                {/* Payment Data */}
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="text-center pb-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">Total a pagar</p>
                    <p className="text-3xl font-grotesk font-bold text-gold">{formatCurrency(currentAmount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{currentPoints.toLocaleString('pt-BR')} pts{currentBonus > 0 ? ` + ${currentBonus} bônus` : ''}</p>
                  </div>

                  {[
                    { icon: User, label: 'Titular', value: settings?.bank_holder_name || 'MARCIO JOSE GOMES DE SOUZA' },
                    { icon: FileText, label: 'CPF', value: settings?.bank_cpf || '00568194128' },
                    { icon: Building2, label: 'Banco', value: settings?.bank_name || 'XP INVESTIMENTOS' },
                    ...(settings?.pix_key ? [{ icon: CreditCard, label: 'PIX', value: settings.pix_key }] : [])
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3 bg-secondary/30 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-gold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-semibold truncate">{item.value}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.value, item.label)}
                        className="p-2 hover:bg-gold/10 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Copy className="w-4 h-4 text-gold" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('choose')} className="flex-1 h-12 rounded-xl">
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep('upload')}
                    className="flex-1 h-12 bg-gradient-to-r from-gold to-yellow-300 text-background font-bold rounded-xl"
                  >
                    Já paguei
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP: UPLOAD */}
            {step === 'upload' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <div>
                  <h3 className="text-lg font-bold mb-1">Envie seu comprovante</h3>
                  <p className="text-sm text-muted-foreground">Formatos aceitos: PDF, JPG, JPEG, PNG (máx 10MB)</p>
                </div>

                {!receiptFile ? (
                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gold/30 rounded-2xl cursor-pointer hover:bg-gold/5 transition-all">
                    {uploading ? (
                      <Loader2 className="w-10 h-10 text-gold animate-spin" />
                    ) : (
                      <Upload className="w-10 h-10 text-gold" />
                    )}
                    <p className="text-sm font-medium">{uploading ? 'Enviando...' : 'Clique para selecionar'}</p>
                    <p className="text-xs text-muted-foreground">ou arraste o arquivo aqui</p>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" disabled={uploading} />
                  </label>
                ) : (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-green-400">Comprovante recebido</p>
                        <p className="text-xs text-muted-foreground truncate">{receiptFile.name}</p>
                      </div>
                      <button onClick={() => setReceiptFile(null)} className="p-1.5 hover:bg-secondary rounded-lg">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Estamos realizando a validação automática.</p>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-accent/10 border border-accent/20 rounded-xl">
                  <Sparkles className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-accent">Nossa IA vai analisar o comprovante automaticamente. Se tudo estiver correto, seu saldo é liberado na hora!</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('payment')} className="flex-1 h-12 rounded-xl">
                    Voltar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!receiptFile}
                    className="flex-1 h-12 bg-gradient-to-r from-gold to-yellow-300 text-background font-bold rounded-xl disabled:opacity-50"
                  >
                    Enviar para validação
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP: ANALYZING */}
            {step === 'analyzing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-20 h-20 rounded-full border-4 border-gold/30 border-t-gold mx-auto"
                />
                <div>
                  <h3 className="text-xl font-bold text-foreground">IA analisando comprovante...</h3>
                  <p className="text-sm text-muted-foreground mt-2">Validando dados do pagamento</p>
                </div>
                <div className="space-y-2 max-w-xs mx-auto">
                  {['Verificando autenticidade', 'Conferindo valor e destinatário', 'Comparando com dados oficiais'].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.5 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <CheckCircle className="w-3 h-3 text-gold" />
                      {item}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP: RESULT */}
            {step === 'result' && analysisResult && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center space-y-5">
                {analysisResult.status === 'approved' ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto"
                    >
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Pagamento Confirmado!</h3>
                      <p className="text-sm text-muted-foreground mt-2">Seu saldo foi adicionado com sucesso.</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pontos creditados:</span>
                        <span className="font-bold text-green-400">{(currentPoints + currentBonus).toLocaleString('pt-BR')} pts</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Aprovação:</span>
                        <span className="font-bold text-green-400">Automática por IA ✨</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center mx-auto"
                    >
                      <AlertCircle className="w-10 h-10 text-orange-400" />
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Em Análise</h3>
                      <p className="text-sm text-muted-foreground mt-2">Seu comprovante está sendo revisado pela equipe administrativa.</p>
                    </div>
                    {analysisResult.duplicate_suspected && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                        <p className="text-xs text-red-400">⚠️ Comprovante possivelmente duplicado detectado</p>
                      </div>
                    )}
                    {analysisResult.analysis?.flags?.length > 0 && (
                      <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Alertas detectados:</p>
                        {analysisResult.analysis.flags.map((flag, i) => (
                          <p key={i} className="text-xs text-orange-400">• {flag}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <Button
                  onClick={() => { resetFlow(); onClose(); }}
                  className="w-full h-12 bg-gradient-to-r from-gold to-yellow-300 text-background font-bold rounded-xl"
                >
                  Concluir
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}