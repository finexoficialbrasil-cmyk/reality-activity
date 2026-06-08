import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Upload, Loader2, CheckCircle, XCircle, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const PRICE_PER_POINT = 0.01; // 1 centavo por ponto

export default function BuyPointsModal({ user, isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('select'); // select, upload, analyzing, result
  const [customPoints, setCustomPoints] = useState('1000');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const points = parseInt(customPoints) || 0;
  const price = (points * PRICE_PER_POINT).toFixed(2);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async () => {
    if (!receiptFile || !points) {
      toast.error('Selecione a quantidade de pontos e envie o comprovante');
      return;
    }

    setAnalyzing(true);

    try {
      const uploadRes = await base44.integrations.Core.UploadFile({
        file: receiptFile
      });

      const receiptUrl = uploadRes.data.file_url;

      const purchase = await base44.entities.PointsPurchase.create({
        user_email: user.email,
        user_name: user.full_name,
        points_requested: points,
        amount_paid: parseFloat(price),
        receipt_image_url: receiptUrl,
        status: 'pending'
      });

      const analysisRes = await base44.functions.invoke('analyzePointsPurchaseReceipt', {
        purchase_id: purchase.id
      });

      setResult(analysisRes.data);
      setStep('result');

      if (analysisRes.data.is_valid) {
        toast.success('✅ Comprovante validado! Pontos creditados!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2000);
      } else {
        toast.error(`❌ ${analysisRes.data.rejection_reason}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao processar comprovante');
    } finally {
      setAnalyzing(false);
    }
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
          className="bg-gradient-to-b from-card to-card/80 border border-gold/20 rounded-3xl max-w-md w-full p-8 space-y-6 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div className="inline-block p-3 bg-gold/10 rounded-2xl">
              <Star className="w-6 h-6 text-gold" />
            </motion.div>
            <h2 className="text-3xl font-grotesk font-bold bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">
              Comprar Pontos
            </h2>
            <p className="text-sm text-muted-foreground">Escolha a quantidade e envie o comprovante</p>
          </div>

          {/* Step: Select Points */}
          {step === 'select' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Info Alert */}
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gold/10 to-yellow-500/10 border border-gold/30 rounded-2xl">
                <Zap className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gold font-medium">
                  Cada ponto custa <span className="font-bold">R$ 0,01</span>. Faça um depósito no valor exato e envie o comprovante. Seu nome deve constar no comprovante com data de até 24h.
                </p>
              </div>

              {/* Points Input */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">Quantidade de Pontos</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={customPoints}
                    onChange={(e) => setCustomPoints(e.target.value)}
                    placeholder="1000"
                    className="h-14 text-lg pr-16 bg-secondary/50 border-gold/20 focus:border-gold"
                    min="1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gold font-bold">pts</span>
                </div>
              </div>

              {/* Price Summary */}
              <motion.div 
                layout
                className="bg-gradient-to-br from-gold/20 to-yellow-500/10 border border-gold/30 rounded-2xl p-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Pontos</p>
                    <p className="text-2xl font-bold text-gold">{points.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Valor a pagar</p>
                    <p className="text-2xl font-bold text-gold">R$ {parseFloat(price).toFixed(2)}</p>
                  </div>
                </div>
                <div className="border-t border-gold/20 pt-3">
                  <p className="text-xs text-muted-foreground text-center">1 ponto = R$ 0,01</p>
                </div>
              </motion.div>

              {/* Suggested Amounts */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Sugestões rápidas:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[100, 500, 1000, 5000].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => setCustomPoints(pts.toString())}
                      className="p-3 rounded-xl bg-secondary/50 hover:bg-gold/10 border border-border hover:border-gold/30 transition-all text-sm font-medium text-foreground"
                    >
                      {pts.toLocaleString('pt-BR')} pts
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <Button
                onClick={() => {
                  if (!points || points < 1) {
                    toast.error('Digite uma quantidade válida de pontos');
                    return;
                  }
                  setStep('upload');
                }}
                className="w-full h-12 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold rounded-xl text-base"
              >
                Continuar
              </Button>
            </motion.div>
          )}

          {/* Step: Upload Receipt */}
          {step === 'upload' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Upload Area */}
              <div className="relative">
                <div className="text-center p-8 border-2 border-dashed border-gold/40 rounded-2xl hover:border-gold/60 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {receiptPreview ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                      <img src={receiptPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border border-gold/20" />
                      <p className="text-xs text-gold font-medium">Clique para trocar</p>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Upload className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
                      </motion.div>
                      <p className="text-base font-bold text-foreground">Envie o comprovante</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou PDF</p>
                    </>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-2xl p-5 space-y-3 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo do Pedido</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pontos:</span>
                    <span className="text-lg font-bold text-gold">{points.toLocaleString('pt-BR')} pts</span>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor a depositar:</span>
                    <span className="text-lg font-bold">R$ {parseFloat(price).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('select');
                    setReceiptFile(null);
                    setReceiptPreview(null);
                  }}
                  className="flex-1 h-12 rounded-xl border-gold/20 hover:border-gold/40"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmitReceipt}
                  disabled={!receiptFile || analyzing}
                  className="flex-1 h-12 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold rounded-xl disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Validando...
                    </>
                  ) : (
                    'Validar Comprovante'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {result.is_valid ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-center space-y-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-400 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl text-foreground mb-2">Validado com sucesso! 🎉</h3>
                      <p className="text-sm text-muted-foreground">
                        Seus <span className="text-gold font-bold">{points.toLocaleString('pt-BR')} pontos</span> foram creditados na sua conta.
                      </p>
                    </div>
                  </motion.div>
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5">
                    <p className="text-center text-sm font-medium text-green-400">
                      ✓ Você pode usar seus pontos agora!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-center space-y-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto">
                      <XCircle className="w-10 h-10 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-destructive">Validação falhou</h3>
                      <p className="text-sm text-muted-foreground mt-1">{result.rejection_reason}</p>
                    </div>
                  </motion.div>
                  {result.analysis && (
                    <div className="bg-secondary/50 border border-border/50 rounded-2xl p-5 text-sm space-y-2">
                      <p className="font-semibold text-foreground mb-3">Detalhes da análise:</p>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-destructive">✗</span>
                          <span>Nome: {result.analysis.name_match ? '✓ Encontrado' : '✗ Não encontrado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={result.analysis.amount_match ? 'text-green-400' : 'text-destructive'}>
                            {result.analysis.amount_match ? '✓' : '✗'}
                          </span>
                          <span>Valor: {result.analysis.amount_match ? '✓ Confere' : '✗ Não confere'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={result.analysis.date_valid ? 'text-green-400' : 'text-destructive'}>
                            {result.analysis.date_valid ? '✓' : '✗'}
                          </span>
                          <span>Data: {result.analysis.date_valid ? '✓ Válida' : '✗ Inválida'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                onClick={onClose}
                className="w-full h-12 bg-gradient-to-r from-gold to-yellow-300 text-background hover:from-gold-dark hover:to-yellow-400 font-bold rounded-xl"
              >
                {result.is_valid ? 'Ir ao Dashboard' : 'Fechar'}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}