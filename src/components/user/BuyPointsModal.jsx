import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Upload, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const POINTS_RATES = [
  { points: 100, price: 10, label: '100 pts' },
  { points: 500, price: 50, label: '500 pts' },
  { points: 1000, price: 100, label: '1000 pts' },
  { points: 5000, price: 500, label: '5000 pts' },
];

export default function BuyPointsModal({ user, isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('select'); // select, upload, analyzing, result
  const [selectedRate, setSelectedRate] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

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
    if (!receiptFile || !selectedRate) {
      toast.error('Selecione uma taxa e envie o comprovante');
      return;
    }

    setAnalyzing(true);

    try {
      // Upload the receipt image
      const uploadRes = await base44.integrations.Core.UploadFile({
        file: receiptFile
      });

      const receiptUrl = uploadRes.data.file_url;

      // Create the purchase record
      const purchase = await base44.entities.PointsPurchase.create({
        user_email: user.email,
        user_name: user.full_name,
        points_requested: selectedRate.points,
        amount_paid: selectedRate.price,
        receipt_image_url: receiptUrl,
        status: 'pending'
      });

      // Analyze the receipt
      const analysisRes = await base44.functions.invoke('analyzePointsPurchaseReceipt', {
        purchase_id: purchase.id
      });

      setResult(analysisRes.data);
      setStep(analysisRes.data.is_valid ? 'result' : 'result');

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
          className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-6"
        >
          {/* Header */}
          <div>
            <h2 className="text-2xl font-grotesk font-bold text-gold mb-2">Comprar Pontos</h2>
            <p className="text-sm text-muted-foreground">Envie o comprovante de depósito para validar</p>
          </div>

          {/* Step: Select Rate */}
          {step === 'select' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-gold/10 border border-gold/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gold">
                  Faça um depósito no valor exato e envie o comprovante. Seu nome deve constar no comprovante e a data não pode ter mais de 24 horas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {POINTS_RATES.map((rate) => (
                  <button
                    key={rate.points}
                    onClick={() => {
                      setSelectedRate(rate);
                      setStep('upload');
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      selectedRate?.points === rate.points
                        ? 'border-gold bg-gold/10'
                        : 'border-border hover:border-gold/40'
                    }`}
                  >
                    <div className="font-bold text-gold">{rate.label}</div>
                    <div className="text-xs text-muted-foreground">R$ {rate.price}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Upload Receipt */}
          {step === 'upload' && selectedRate && (
            <div className="space-y-4">
              <div className="text-center p-6 border-2 border-dashed border-border rounded-lg hover:border-gold/40 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {receiptPreview ? (
                  <div className="space-y-2">
                    <img src={receiptPreview} alt="Preview" className="w-full h-40 object-cover rounded" />
                    <p className="text-xs text-gold">Clique para trocar</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Selecione o comprovante</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou PDF</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Resumo</p>
                <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pontos:</span>
                    <span className="font-semibold text-gold">{selectedRate.points} pts</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Valor a depositar:</span>
                    <span className="font-semibold">R$ {selectedRate.price}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('select');
                    setReceiptFile(null);
                    setReceiptPreview(null);
                  }}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmitReceipt}
                  disabled={!receiptFile || analyzing}
                  className="bg-gold text-background hover:bg-gold-dark flex-1"
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
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              {result.is_valid ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="font-bold text-lg text-foreground">Validado com sucesso!</h3>
                  <p className="text-xs text-muted-foreground">
                    Seus {selectedRate.points} pontos foram creditados na sua conta.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-center space-y-3"
                >
                  <div className="w-16 h-16 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="font-bold text-lg text-destructive">Validação falhou</h3>
                  <p className="text-xs text-muted-foreground">{result.rejection_reason}</p>
                  <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground text-left">
                    <p className="font-semibold mb-1">Verificação:</p>
                    <ul className="space-y-1">
                      <li>• Nome: {result.analysis.name_found || 'não encontrado'}</li>
                      <li>• Valor: R$ {result.analysis.amount_found || 'não encontrado'}</li>
                      <li>• Data: {result.analysis.date_found || 'não encontrada'}</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              <Button
                onClick={onClose}
                className="w-full bg-gold text-background hover:bg-gold-dark"
              >
                Fechar
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}