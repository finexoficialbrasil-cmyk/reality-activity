import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function UserAdvertisementsManager({ user }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAds();
  }, [user]);

  const loadAds = async () => {
    try {
      const userAds = await base44.entities.Advertisement.filter({ user_email: user.email }, '-created_date', 50);
      setAds(userAds);
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deletar este anúncio?')) return;
    try {
      await base44.entities.Advertisement.delete(id);
      toast.success('Anúncio deletado');
      loadAds();
    } catch (err) {
      console.error('Erro ao deletar:', err);
      toast.error('Erro ao deletar');
    }
  };

  const statusConfig = {
    pending: { icon: Clock, label: 'Pendente', color: 'text-yellow-400' },
    approved: { icon: CheckCircle, label: 'Aprovado', color: 'text-green-400' },
    rejected: { icon: XCircle, label: 'Rejeitado', color: 'text-destructive' },
    inactive: { icon: XCircle, label: 'Inativo', color: 'text-muted-foreground' }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (ads.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
        <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
        <p className="text-muted-foreground">Você não tem anúncios ainda</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {ads.map((ad) => {
        const status = statusConfig[ad.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        return (
          <div key={ad.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
            {ad.image_url && (
              <img src={ad.image_url} alt={ad.title} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground truncate">{ad.title}</h3>
                <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  <span>{status.label}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ad.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <span>{ad.shares_count || 0} compartilhamentos</span>
                <span className="text-gold">Custo: {ad.cost_to_publish}pts / Recompensa: +{ad.reward_per_share}pts</span>
              </div>
              <div className="flex gap-2">
                <a
                  href={ad.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold hover:underline"
                >
                  Ver link →
                </a>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleDelete(ad.id)}
              className="text-destructive hover:bg-destructive/10 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </motion.div>
  );
}