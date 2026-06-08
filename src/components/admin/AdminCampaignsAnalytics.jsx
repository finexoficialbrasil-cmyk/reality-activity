import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Zap, Eye } from 'lucide-react';

export default function AdminCampaignsAnalytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAdvertiser, setFilterAdvertiser] = useState('all');
  const [advertisers, setAdvertisers] = useState([]);

  useEffect(() => {
    loadCampaignsData();
  }, []);

  const loadCampaignsData = async () => {
    try {
      const allAds = await base44.asServiceRole.entities.Advertisement.list('-created_date', 1000);
      const allShares = await base44.asServiceRole.entities.AdvertisementShare.list('-created_date', 10000);

      // Agrupar shares por anúncio
      const sharesByAd = {};
      allShares.forEach(share => {
        if (!sharesByAd[share.advertisement_id]) {
          sharesByAd[share.advertisement_id] = [];
        }
        sharesByAd[share.advertisement_id].push(share);
      });

      // Mapear anúncios com seus compartilhamentos
      const campaignData = allAds.map(ad => {
        const shares = sharesByAd[ad.id] || [];
        const totalPointsDistributed = shares.reduce((sum, s) => sum + (s.points_earned || 0), 0);
        const spent = ad.budget_total - ad.budget_remaining;

        return {
          id: ad.id,
          title: ad.title,
          advertiser_name: ad.user_name,
          advertiser_email: ad.user_email,
          category: ad.category,
          type: ad.type,
          status: ad.status,
          budget_total: ad.budget_total,
          budget_spent: spent,
          budget_remaining: ad.budget_remaining,
          total_points_distributed: totalPointsDistributed,
          shares_count: shares.length,
          created_date: ad.created_date,
          is_active: ad.is_active
        };
      }).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setCampaigns(campaignData);

      // Extrair lista única de anunciantes
      const uniqueAdvertisers = [...new Set(campaignData.map(c => c.advertiser_email))].map(email => {
        const advertiser = campaignData.find(c => c.advertiser_email === email);
        return { email, name: advertiser.advertiser_name };
      });
      setAdvertisers(uniqueAdvertisers);
    } catch (e) {
      console.error('Erro ao carregar dados de campanhas:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = filterAdvertiser === 'all'
    ? campaigns
    : campaigns.filter(c => c.advertiser_email === filterAdvertiser);

  const totalSpent = filteredCampaigns.reduce((sum, c) => sum + c.budget_spent, 0);
  const totalDistributed = filteredCampaigns.reduce((sum, c) => sum + c.total_points_distributed, 0);
  const totalShares = filteredCampaigns.reduce((sum, c) => sum + c.shares_count, 0);

  const getCategoryColor = (category) => {
    const colors = {
      mercado_livre: 'text-orange-500 bg-orange-500/10',
      shopee: 'text-red-500 bg-red-500/10',
      tiktok_shop: 'text-pink-500 bg-pink-500/10',
      amazon: 'text-blue-500 bg-blue-500/10',
      produtos_digitais: 'text-purple-500 bg-purple-500/10',
      servicos: 'text-cyan-500 bg-cyan-500/10',
      outros: 'text-gray-500 bg-gray-500/10'
    };
    return colors[category] || 'text-gray-500 bg-gray-500/10';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      mercado_livre: '💰 Mercado Livre',
      shopee: '🛒 Shopee',
      tiktok_shop: '🎵 TikTok Shop',
      amazon: '📦 Amazon',
      produtos_digitais: '💻 Digital',
      servicos: '🔧 Serviços',
      outros: '⭐ Outros'
    };
    return labels[category] || category;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-card to-card/80 border border-gold/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Gasto</p>
            <Zap className="w-5 h-5 text-gold" />
          </div>
          <p className="text-3xl font-bold text-gold">{totalSpent.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">pts em campanhas</p>
        </div>

        <div className="bg-gradient-to-br from-card to-card/80 border border-purple/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Distribuído</p>
            <TrendingUp className="w-5 h-5 text-purple" />
          </div>
          <p className="text-3xl font-bold text-purple">{totalDistributed.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">pts aos usuários</p>
        </div>

        <div className="bg-gradient-to-br from-card to-card/80 border border-blue-500/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Compartilhamentos</p>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-500">{totalShares.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">em total</p>
        </div>

        <div className="bg-gradient-to-br from-card to-card/80 border border-green-500/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Campanhas</p>
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-500">{filteredCampaigns.length}</p>
          <p className="text-xs text-muted-foreground">ativas</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground font-medium">Filtrar por anunciante:</span>
        <select
          value={filterAdvertiser}
          onChange={(e) => setFilterAdvertiser(e.target.value)}
          className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-gold"
        >
          <option value="all">Todos</option>
          {advertisers.map(adv => (
            <option key={adv.email} value={adv.email}>{adv.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma campanha encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Campanha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Anunciante</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Categoria</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Orçamento</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Gasto</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Distribuído</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Compartilhamentos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign, idx) => (
                  <motion.tr
                    key={campaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="border-b border-border hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground line-clamp-1">{campaign.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">{campaign.advertiser_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(campaign.category)}`}>
                        {getCategoryLabel(campaign.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-foreground">{campaign.budget_total.toLocaleString('pt-BR')} pts</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-gold">{campaign.budget_spent.toLocaleString('pt-BR')} pts</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-purple">{campaign.total_points_distributed.toLocaleString('pt-BR')} pts</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
                        {campaign.shares_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        campaign.is_active
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {campaign.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}