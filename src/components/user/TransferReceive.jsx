import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Share2, QrCode, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export default function TransferReceive({ user }) {
  const [transferKey, setTransferKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadKey();
  }, []);

  const loadKey = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('generateUserTransferKey', {});
      const data = response.data;
      if (data.error) { toast.error(data.error); return; }
      setTransferKey(data.transfer_key);
    } catch (e) {
      toast.error('Erro ao gerar chave');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transferKey);
    toast.success('Chave copiada!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Chave de Recebimento',
          text: `Envie pontos para mim usando esta chave: ${transferKey}`,
        });
      } catch (e) {
        // cancelled
      }
    } else {
      handleCopy();
      toast.info('Chave copiada para a área de transferência');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(transferKey)}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto space-y-5">
      <div className="text-center">
        <h3 className="font-grotesk font-bold text-lg mb-1">Minha Chave de Recebimento</h3>
        <p className="text-sm text-muted-foreground">Compartilhe esta chave para receber pontos</p>
      </div>

      <div className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <KeyRound className="w-4 h-4" /> Sua chave pública
        </div>
        <div className="text-center">
          <p className="font-mono font-bold text-xl tracking-wider text-gold break-all">{transferKey}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1 bg-gold text-background hover:bg-gold-dark">
            <Copy className="w-4 h-4 mr-2" /> Copiar
          </Button>
          <Button onClick={() => setShowQR(!showQR)} variant="outline" className="flex-1">
            <QrCode className="w-4 h-4 mr-2" /> QR Code
          </Button>
          <Button onClick={handleShare} variant="outline" className="flex-1">
            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
          </Button>
        </div>
      </div>

      {showQR && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
          <img src={qrUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
          <p className="text-sm text-gray-600 text-center">Apresente este QR Code para receber pontos</p>
        </motion.div>
      )}

      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs text-muted-foreground">🔒 Sua chave é única e não revela informações pessoais.</p>
        <p className="text-xs text-muted-foreground">💡 A outra pessoa deve escanear o QR Code ou digitar a chave na opção "Enviar Pontos".</p>
      </div>
    </motion.div>
  );
}