import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Zap, Eye, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useCategories } from '@/hooks/useCategories';

const CHART_COLORS = ['#hsl(45 100% 55%)', '#hsl(270 80% 65%)', '#hsl(190 80% 50%)', '#hsl(340 75% 60%)', '#hsl(130 60% 50%)', '#hsl(20 80% 55%)', '#hsl(160 60% 45%)'];

export default function AdminCampaignsAnalytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [allShares, setAllShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAdvertiser, setFilterAdvertiser] = useState('all');
  const [advertisers, setAdvertisers] = useState([]);
  const { getCategoryLabel } = useCategories();

  useEffect(() => {
    loadCampaignsData();
  }, []);

  const loadCampaignsData = async () => {
    try {
      const allAds = await base44.entities.Advertisement.list('-created_date', 1000);
      const allShares = await base44.entities.AdvertisementShare.list('-created_date', 10000);

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
      setAllShares(allShares);

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

  // Dados para gráfico de consumo diário (últimos 14 dias)
  const dailyData = (() => {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key.slice(5).split('-').reverse().join('/'), points: 0, shares: 0 });
    }
    const filteredAdIds = new Set(filteredCampaigns.map(c => c.id));
    allShares.forEach(share => {
      if (!filteredAdIds.has(share.advertisement_id)) return;
      const d = new Date(share.created_date);
      const key = d.toISOString().split('T')[0];
      const day = days.find(dd => dd.date === key.slice(5).split('-').reverse().join('/'));
      if (day) {
        day.points += share.points_earned || 0;
        day.shares += 1;
      }
    });
    return days;
  })();

  // Dados para gráfico de desempenho por empresa/anunciante
  const advertiserData = (() => {
    const map = {};
    filteredCampaigns.forEach(c => {
      const name = c.advertiser_name || c.advertiser_email || 'Desconhecido';
      if (!map[name]) map[name] = { name: name.length > 15 ? name.slice(0, 15) + '…' : name, gasto: 0, distribuido: 0, shares: 0 };
      map[name].gasto += c.budget_spent;
      map[name].distribuido += c.total_points_distributed;
      map[name].shares += c.shares_count;
    });
    return Object.values(map).sort((a, b) => b.distribuido - a.distribuido).slice(0, 10);
  })();

  // Dados para gráfico de taxa de aceitação (status dos anúncios)
  const statusData = (() => {
    const allAdsForStatus = filterAdvertiser === 'all' ? campaigns : campaigns.filter(c => c.advertiser_email === filterAdvertiser);
    const counts = { Aprovado: 0, Pendente: 0, Rejeitado: 0, Inativo: 0 };
    allAdsForStatus.forEach(c => {
      if (c.status === 'approved' && c.is_active) counts.Aprovado++;
      else if (c.status === 'pending') counts.Pendente++;
      else if (c.status === 'rejected') counts.Rejeitado++;
      else counts.Inativo++;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  })();

  // Dados para gráfico de desempenho por campanha (top 8)
  const campaignPerfData = filteredCampaigns
    .slice()
    .sort((a, b) => b.budget_spent - a.budget_spent)
    .slice(0, 8)
    .map(c => ({
      name: c.title.length > 12 ? c.title.slice(0, 12) + '…' : c.title,
      Gasto: c.budget_spent,
      Distribuído: c.total_points_distributed,
      Restante: c.budget_remaining
    }));

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Consumo diário */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            <h3 className="font-semibold text-sm">Consumo de Créditos por Dia</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#hsl(45 100% 55%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#hsl(45 100% 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(220 18% 9%)', border: '1px solid hsl(220 15% 15%)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: 'hsl(210 40% 98%)' }}
              />
              <Area type="monotone" dataKey="points" stroke="#hsl(45 100% 55%)" fillOpacity={1} fill="url(#colorPoints)" strokeWidth={2} name="Pontos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Desempenho por empresa */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple" />
            <h3 className="font-semibold text-sm">Desempenho por Empresa</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={advertiserData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }} />
              <YAxis type="string" dataKey="name" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }} width={80} />
              <Tooltip
                contentStyle={{ background: 'hsl(220 18% 9%)', border: '1px solid hsl(220 15% 15%)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: 'hsl(210 40% 98%)' }}
                cursor={{ fill: 'hsl(220 15% 15% / 0.3)' }}
              />
              <Bar dataKey="distribuido" fill="#hsl(270 80% 65%)" radius={[0, 4, 4, 0]} name="Distribuído" />
              <Bar dataKey="gasto" fill="#hsl(45 100% 55%)" radius={[0, 4, 4, 0]} name="Gasto" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taxa de aceitação */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm">Taxa de Aceitação dos Anúncios</h3>
          </div>
          {statusData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fill: 'hsl(210 40% 98%)', fontSize: 11 }}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(220 18% 9%)', border: '1px solid hsl(220 15% 15%)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Desempenho por campanha */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-sm">Top Campanhas por Gasto</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={campaignPerfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(220 18% 9%)', border: '1px solid hsl(220 15% 15%)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: 'hsl(210 40% 98%)' }}
                cursor={{ fill: 'hsl(220 15% 15% / 0.3)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="Gasto" fill="#hsl(45 100% 55%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Distribuído" fill="#hsl(270 80% 65%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Restante" fill="#hsl(190 80% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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