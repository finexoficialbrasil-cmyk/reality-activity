import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Megaphone, Coins, Share2 } from 'lucide-react';

export default function UserAdsStats({ user }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAds();
  }, [user]);

  const loadAds = async () => {
    try {
      const res = await base44.functions.invoke('getUserPosts', {});
      setAds(res.data?.ads || []);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalInvested = ads.reduce((sum, ad) => sum + (ad.budget_total || 0), 0);
  const totalAds = ads.length;
  const creditUsed = ads.reduce((sum, ad) => sum + Math.max(0, (ad.budget_total || 0) - (ad.budget_remaining || 0)), 0);
  const totalShares = ads.reduce((sum, ad) => sum + (ad.shares_count || 0), 0);

  const stats = [
    { label: 'Investido em Anúncios', value: `${totalInvested.toLocaleString('pt-BR')} pts`, icon: TrendingUp, color: 'text-gold', bg: 'from-gold/15 to-yellow-500/5', border: 'border-gold/20' },
    { label: 'Anúncios Publicados', value: totalAds, icon: Megaphone, color: 'text-blue-400', bg: 'from-blue-500/15 to-blue-500/5', border: 'border-blue-500/20' },
    { label: 'Crédito Já Usado', value: `${creditUsed.toLocaleString('pt-BR')} pts`, icon: Coins, color: 'text-green-400', bg: 'from-green-500/15 to-green-500/5', border: 'border-green-500/20' },
    { label: 'Anúncios Compartilhados', value: totalShares, icon: Share2, color: 'text-purple', bg: 'from-purple/15 to-purple/5', border: 'border-purple/20' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`bg-gradient-to-br ${stat.bg} border ${stat.border} rounded-xl p-4 flex items-center gap-3`}
        >
          <div className="p-2 bg-card/50 rounded-lg flex-shrink-0">
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
            <p className={`font-grotesk font-bold text-lg ${stat.color} truncate`}>{stat.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}