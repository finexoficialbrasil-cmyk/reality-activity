import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ShareAllButton({ user, ads, onShared }) {
  const [processing, setProcessing] = useState(false);

  const handleShareAll = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    // Filter eligible ads client-side for a quick pre-check
    const eligible = (ads || []).filter(
      ad => ad.status === 'approved' && ad.is_active !== false && ad.is_bulk_shareable !== false && (ad.budget_remaining || 0) > 0 && ad.user_email !== user.email
    );

    if (eligible.length === 0) {
      toast.info('Nenhum anúncio elegível para compartilhar agora.');
      return;
    }

    setProcessing(true);
    try {
      const res = await base44.functions.invoke('bulkShareAdvertisements', {
        platform: 'whatsapp'
      });

      const data = res.data;
      if (data?.success) {
        if (data.totalPoints > 0) {
          toast.success(`🎉 ${data.sharedCount} anúncios compartilhados! +${data.totalPoints} pontos!`);
        } else {
          toast.info('Nenhum anúncio elegível para compartilhamento em massa.');
        }
        if (onShared) onShared();
      } else {
        toast.error(data?.error || 'Erro ao compartilhar');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.data?.error || err?.message;
      toast.error(msg || 'Erro ao compartilhar todos os anúncios');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.button
      onClick={handleShareAll}
      disabled={processing}
      whileHover={{ scale: processing ? 1 : 1.02 }}
      whileTap={{ scale: processing ? 1 : 0.98 }}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gold to-yellow-300 text-background font-bold text-sm shadow-lg hover:from-gold-dark hover:to-yellow-400 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {processing ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Compartilhando...
        </>
      ) : (
        <>
          <Zap className="w-5 h-5" />
          Compartilhar Tudo
          <span className="text-xs font-medium opacity-80 ml-1">({(ads || []).filter(a => a.status === 'approved' && a.is_active !== false && a.is_bulk_shareable !== false && (a.budget_remaining || 0) > 0).length} anúncios)</span>
        </>
      )}
    </motion.button>
  );
}