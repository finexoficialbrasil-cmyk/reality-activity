import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Wallet, Users } from 'lucide-react';

export default function AdminAdvertisersSpending() {
  const [advertisers, setAdvertisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('invested'); // invested, balance, spent, name

  useEffect(() => {
    loadAdvertisersData();
  }, []);

  const loadAdvertisersData = async () => {
    try {
      // Busca TODOS os anúncios (paginação completa) + saldos reais dos usuários
      const [allAds, allUserPoints] = await Promise.all([
        base44.entities.Advertisement.list('-created_date', 5000),
        base44.entities.UserPoints.list('-created_date', 5000)
      ]);

      // Mapa de saldo real por email
      const balanceMap = {};
      allUserPoints.forEach(up => {
        balanceMap[up.user_email] = up.balance || 0;
      });

      // Agrupar por anunciante
      const grouped = {};
      allAds.forEach(ad => {
        const key = ad.user_email;
        if (!key) return;
        if (!grouped[key]) {
          grouped[key] = {
            user_email: ad.user_email,
            user_name: ad.user_name || ad.user_email,
            total_budget: 0,        // Total alocado nos anúncios (investimento real)
            total_spent: 0,         // Total já pago a quem compartilhou
            total_remaining: 0,     // Saldo ainda disponível dentro dos anúncios
            real_balance: balanceMap[key] || 0,  // Saldo real do usuário (UserPoints)
            ad_count: 0
          };
        }
        grouped[key].total_budget += ad.budget_total || 0;
        grouped[key].total_spent += (ad.budget_total - ad.budget_remaining) || 0;
        grouped[key].total_remaining += ad.budget_remaining || 0;
        grouped[key].ad_count += 1;
      });

      let data = Object.values(grouped);

      // Ordenar
      if (sortBy === 'invested') {
        data.sort((a, b) => b.total_budget - a.total_budget);
      } else if (sortBy === 'balance') {
        data.sort((a, b) => b.real_balance - a.real_balance);
      } else if (sortBy === 'spent') {
        data.sort((a, b) => b.total_spent - a.total_spent);
      } else {
        data.sort((a, b) => a.user_name.localeCompare(b.user_name));
      }

      setAdvertisers(data);
    } catch (e) {
      console.error('Erro ao carregar dados de anunciantes:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalInvested = advertisers.reduce((sum, a) => sum + a.total_budget, 0);
  const totalBalance = advertisers.reduce((sum, a) => sum + a.real_balance, 0);
  const totalSpent = advertisers.reduce((sum, a) => sum + a.total_spent, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-card to-card/80 border border-gold/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Investido</p>
            <TrendingUp className="w-5 h-5 text-gold" />
          </div>
          <p className="text-3xl font-bold text-gold">{totalInvested.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">pts alocados em anúncios</p>
        </div>

        <div className="bg-gradient-to-br from-card to-card/80 border border-purple/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Saldo Real dos Anunciantes</p>
            <Wallet className="w-5 h-5 text-purple" />
          </div>
          <p className="text-3xl font-bold text-purple">{totalBalance.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">pts disponíveis nas contas</p>
        </div>

        <div className="bg-gradient-to-br from-card to-card/80 border border-blue-500/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Anunciantes Ativos</p>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-500">{advertisers.length}</p>
          <p className="text-xs text-muted-foreground">empresas investindo</p>
        </div>

        <div className="bg-gradient-to-br from-card to-card/80 border border-green-500/20 rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pago em Compartilhamentos</p>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-500">{totalSpent.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-muted-foreground">pts distribuídos</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Sorting Controls */}
        <div className="flex gap-2 p-4 border-b border-border flex-wrap">
          <button
            onClick={() => setSortBy('invested')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'invested'
                ? 'bg-gold text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Investimento
          </button>
          <button
            onClick={() => setSortBy('balance')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'balance'
                ? 'bg-gold text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Saldo Real
          </button>
          <button
            onClick={() => setSortBy('spent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'spent'
                ? 'bg-gold text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Pago em Shares
          </button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'name'
                ? 'bg-gold text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            Nome
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : advertisers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum anunciante encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Anunciante</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Anúncios</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Total Investido</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Pago em Shares</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Saldo Real</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground">Utilização</th>
                </tr>
              </thead>
              <tbody>
                {advertisers.map((advertiser, idx) => {
                  const utilization = advertiser.total_budget > 0 
                    ? ((advertiser.total_spent / advertiser.total_budget) * 100).toFixed(1)
                    : 0;
                  
                  return (
                    <motion.tr
                      key={advertiser.user_email}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{advertiser.user_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground">{advertiser.user_email}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium">
                          {advertiser.ad_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-gold">{advertiser.total_budget.toLocaleString('pt-BR')} pts</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-green-500">{advertiser.total_spent.toLocaleString('pt-BR')} pts</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-purple">{advertiser.real_balance.toLocaleString('pt-BR')} pts</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-gold to-yellow-400 transition-all"
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground w-10 text-right">
                            {utilization}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}