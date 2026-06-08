import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Upload, Loader2, CheckCircle, XCircle, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

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

      const result = analysisRes.data;
      
      setResult({
        ...result,
        points_requested: points,
        amount_paid: parseFloat(price)
      });

      // Se validou (is_valid === true) → approved. Caso contrário → analyzing
      if (result.is_valid === true) {
        setStep('approved');
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 300);
      } else {
        setStep('analyzing');
      }
    } catch (err) {
      console.error('Erro ao processar:', err);
      toast.error('Erro ao processar comprovante: ' + err.message);
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

          {/* Step: Analyzing */}
          {step === 'analyzing' && result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="text-center space-y-4"
              >
                <motion.div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center mx-auto">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-10 h-10 text-blue-400" />
                  </motion.div>
                </motion.div>
                <div>
                  <h3 className="font-bold text-2xl text-foreground mb-2">Analisando Comprovante</h3>
                  <p className="text-sm text-muted-foreground">
                    Nosso setor financeiro está verificando seus dados
                  </p>
                </div>
              </motion.div>

              <div className="bg-gradient-to-br from-blue-500/10 to-blue-400/10 border border-blue-500/30 rounded-2xl p-6 space-y-4">
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 p-3 bg-background/40 rounded-lg"
                  >
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">Verificando comprovante</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 p-3 bg-background/40 rounded-lg"
                  >
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}>
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">Validando dados</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3 p-3 bg-background/40 rounded-lg"
                  >
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}>
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </motion.div>
                    <span className="text-sm font-medium text-foreground">Processando análise</span>
                  </motion.div>
                </div>

                <div className="border-t border-blue-500/20 pt-4 mt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    ⏳ <span className="font-semibold">Tempo estimado:</span> até 24 horas
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Você será notificado assim que a análise terminar
                  </p>
                </div>
              </div>

              <Button
                onClick={onClose}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-400 text-background hover:from-blue-600 hover:to-blue-500 font-bold rounded-xl"
              >
                Entendi
              </Button>
            </motion.div>
          )}

          {/* Step: Approved */}
          {step === 'approved' && result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                className="text-center space-y-4"
              >
                <motion.div 
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-400 flex items-center justify-center mx-auto shadow-xl shadow-green-500/20"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: ['0 0 0px rgba(34,197,94,0.2)', '0 0 30px rgba(34,197,94,0.5)', '0 0 0px rgba(34,197,94,0.2)']
                  }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    <CheckCircle className="w-12 h-12 text-green-400" />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <h3 className="font-grotesk font-bold text-3xl bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Parabéns! 🎉
                  </h3>
                  <p className="text-lg text-foreground font-semibold">
                    Comprovante Validado!
                  </p>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4"
              >
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Seus pontos foram creditados:</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-grotesk font-bold text-green-400">
                      +{result.points_requested?.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xl text-gold">pts</span>
                  </div>
                </div>

                <div className="border-t border-green-500/20 pt-4">
                  <p className="text-xs text-muted-foreground text-center">
                    ✨ Seu saldo foi atualizado e você já pode usar os pontos!
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-2"
              >
                <Button
                  onClick={() => {
                    if (onSuccess) onSuccess();
                    onClose();
                  }}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 font-bold rounded-xl shadow-lg shadow-green-500/20"
                >
                  Ir ao Dashboard
                </Button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}