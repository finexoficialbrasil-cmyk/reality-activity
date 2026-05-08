import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Users, Building2, Play, Gift, TrendingUp, Award, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [users, companies, videos, transactions, redemptions, products] = await Promise.all([
      base44.entities.UserPoints.list(),
      base44.entities.Company.filter({ is_active: true }),
      base44.entities.Video.filter({ is_active: true }),
      base44.entities.PointsTransaction.list('-created_date', 200),
      base44.entities.Redemption.list('-created_date', 100),
      base44.entities.Product.filter({ is_active: true }),
    ]);

    const totalPointsEarned = transactions.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0);
    const totalPointsSpent = Math.abs(transactions.filter(t => t.points < 0).reduce((s, t) => s + t.points, 0));
    const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
    const pendingRedemptions = redemptions.filter(r => r.status === 'pending').length;

    // Points by day (last 7 days)
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayTxs = transactions.filter(t => {
        const td = new Date(t.created_date);
        return td.toDateString() === d.toDateString() && t.points > 0;
      });
      last7.push({ day: key, pontos: dayTxs.reduce((s, t) => s + t.points, 0) });
    }

    // Top companies by points awarded
    const companyPoints = {};
    transactions.forEach(t => {
      if (t.company_id && t.points > 0) {
        companyPoints[t.company_id] = (companyPoints[t.company_id] || 0) + t.points;
      }
    });
    const topCompanies = Object.entries(companyPoints)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, pts]) => {
        const comp = companies.find(c => c.id === id);
        return { name: comp?.name || 'Desconhecido', value: pts };
      });

    // Redemption status distribution
    const statusCount = { pending: 0, approved: 0, delivered: 0, rejected: 0 };
    redemptions.forEach(r => { if (statusCount[r.status] !== undefined) statusCount[r.status]++; });
    const redemptionStatus = Object.entries(statusCount).map(([k, v]) => ({ name: k, value: v }));

    // Products redeemed by company
    const redemptionsByCompany = {};
    let totalPointsTraded = 0;
    redemptions.forEach(r => {
      if (r.company_id) {
        redemptionsByCompany[r.company_id] = (redemptionsByCompany[r.company_id] || 0) + 1;
      }
      totalPointsTraded += r.points_spent || 0;
    });
    const companyRedemptions = Object.entries(redemptionsByCompany)
      .sort(([, a], [, b]) => b - a)
      .map(([id, count]) => {
        const comp = companies.find(c => c.id === id);
        return { name: comp?.name || 'Desconhecido', redeemed: count };
      });

    setData({
      totalUsers: users.length,
      totalCompanies: companies.length,
      totalVideos: videos.length,
      totalProducts: products.length,
      totalPointsEarned,
      totalPointsSpent,
      totalBalance,
      pendingRedemptions,
      totalRedemptions: redemptions.length,
      last7,
      topCompanies,
      redemptionStatus,
      companyRedemptions,
      totalPointsTraded,
      topUsers: [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 5),
    });
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
    </div>
  );

  const COLORS = ['hsl(45,100%,55%)', 'hsl(270,80%,65%)', 'hsl(190,80%,50%)', 'hsl(130,60%,50%)', 'hsl(0,72%,51%)'];

  const cards = [
    { icon: Users, label: 'Usuários', value: data.totalUsers, color: 'text-blue-400' },
    { icon: Building2, label: 'Empresas', value: data.totalCompanies, color: 'text-purple' },
    { icon: Play, label: 'Vídeos', value: data.totalVideos, color: 'text-green-400' },
    { icon: Star, label: 'Pts Distribuídos', value: data.totalPointsEarned.toLocaleString(), color: 'text-gold' },
    { icon: Gift, label: 'Pts Resgatados', value: data.totalPointsSpent.toLocaleString(), color: 'text-destructive' },
    { icon: Award, label: 'Saldo Total', value: data.totalBalance.toLocaleString(), color: 'text-gold' },
    { icon: Clock, label: 'Resgates Pendentes', value: data.pendingRedemptions, color: 'text-yellow-400' },
    { icon: TrendingUp, label: 'Total Resgates', value: data.totalRedemptions, color: 'text-accent' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="font-grotesk font-bold text-2xl mb-6">Visão Geral</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4">
            <c.icon className={`w-5 h-5 ${c.color} mb-2`} />
            <div className={`font-grotesk font-bold text-xl ${c.color}`}>{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
         {/* Points Chart */}
         <div className="bg-card border border-border rounded-2xl p-5">
           <h3 className="font-semibold mb-4">Pontos Distribuídos (7 dias)</h3>
           <ResponsiveContainer width="100%" height={200}>
             <BarChart data={data.last7}>
               <XAxis dataKey="day" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 11 }} />
               <YAxis tick={{ fill: 'hsl(215 20% 55%)', fontSize: 11 }} />
               <Tooltip contentStyle={{ background: 'hsl(220 18% 9%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 8 }} />
               <Bar dataKey="pontos" fill="hsl(45,100%,55%)" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </div>

         {/* Top Companies */}
         <div className="bg-card border border-border rounded-2xl p-5">
           <h3 className="font-semibold mb-4">Top Empresas por Pontos</h3>
           {data.topCompanies.length === 0 ? (
             <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado ainda</p>
           ) : (
             <div className="space-y-3">
               {data.topCompanies.map((c, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                   <div className="flex-1">
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium">{c.name}</span>
                       <span className="text-gold font-semibold">{c.value.toLocaleString()} pts</span>
                     </div>
                     <div className="h-1.5 bg-secondary rounded-full">
                       <div
                         className="h-full rounded-full bg-gold"
                         style={{ width: `${(c.value / data.topCompanies[0].value) * 100}%` }}
                       />
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
       </div>

       {/* Redemptions by Company */}
       <div className="grid lg:grid-cols-2 gap-6 mb-6">
         <div className="bg-card border border-border rounded-2xl p-5">
           <h3 className="font-semibold mb-4">Produtos Resgatados por Empresa</h3>
           {data.companyRedemptions.length === 0 ? (
             <p className="text-muted-foreground text-sm text-center py-8">Nenhum resgate ainda</p>
           ) : (
             <div className="space-y-3">
               {data.companyRedemptions.map((c, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                   <div className="flex-1">
                     <div className="flex justify-between text-sm mb-1">
                       <span className="font-medium">{c.name}</span>
                       <span className="text-accent font-semibold">{c.redeemed} produtos</span>
                     </div>
                     <div className="h-1.5 bg-secondary rounded-full">
                       <div
                         className="h-full rounded-full bg-accent"
                         style={{ width: `${(c.redeemed / data.companyRedemptions[0].redeemed) * 100}%` }}
                       />
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>

         <div className="bg-card border border-border rounded-2xl p-5">
           <h3 className="font-semibold mb-4">Resumo de Resgates</h3>
           <div className="space-y-4">
             <div className="flex justify-between items-center pb-3 border-b border-border">
               <span className="text-muted-foreground">Total de Resgates</span>
               <span className="font-bold text-lg text-gold">{data.totalRedemptions}</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-border">
               <span className="text-muted-foreground">Pontos Trocados</span>
               <span className="font-bold text-lg text-accent">{data.totalPointsTraded.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center pb-3 border-b border-border">
               <span className="text-muted-foreground">Resgates Pendentes</span>
               <span className="font-bold text-lg text-yellow-400">{data.pendingRedemptions}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-muted-foreground">Empresas com Resgates</span>
               <span className="font-bold text-lg text-purple">{data.companyRedemptions.length}</span>
             </div>
           </div>
         </div>
       </div>

      {/* Top Users */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Top Usuários por Saldo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Usuário</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Saldo</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Total Ganho</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Total Gasto</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Vídeos</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((u, i) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5">
                    <div className="font-medium">{u.user_name || u.user_email}</div>
                    <div className="text-xs text-muted-foreground">{u.user_email}</div>
                  </td>
                  <td className="py-2.5 text-right font-bold text-gold">{(u.balance || 0).toLocaleString()}</td>
                  <td className="py-2.5 text-right text-green-400">{(u.total_earned || 0).toLocaleString()}</td>
                  <td className="py-2.5 text-right text-destructive">{(u.total_spent || 0).toLocaleString()}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{u.videos_watched || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}