import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdvertisementCard from './AdvertisementCard';
import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdvertisementsGrid({ user, onAdShared }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      const approvedAds = await base44.entities.Advertisement.filter({ status: 'approved', is_active: true }, '-shares_count', 20);
      setAds(approvedAds);
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>Nenhum anúncio disponível no momento</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {ads.map((ad, idx) => (
        <motion.div
          key={ad.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <AdvertisementCard
            ad={ad}
            user={user}
            onAdShared={onAdShared}
          />
        </motion.div>
      ))}
    </div>
  );
}