import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, TrendingUp, Play, Search } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [userTxs, setUserTxs] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [pts, txs] = await Promise.all([
      base44.entities.UserPoints.list('-balance'),
      base44.entities.PointsTransaction.list('-created_date', 500)
    ]);
    setUsers(pts);
    setTransactions(txs);
    setLoading(false);
  };

  const selectUser = (u) => {
    setSelected(u);
    setUserTxs(transactions.filter(t => t.user_email === u.user_email));
  };

  const filtered = users.filter(u =>
    (u.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.user_email.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabels = {
    earned_watch: '+pts assistindo',
    earned_bonus: '+pts bônus',
    spent_redemption: '-pts resgate',
    manual_adjust: 'ajuste manual'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="font-grotesk font-bold text-2xl mb-6">Usuários & Pontos</h2>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar usuário..."
              className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuário</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Saldo</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Ganhou</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Gastou</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Vídeos</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(8).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-3" colSpan={6}><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                    </tr>
                  ))
                ) : filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                      selected?.id === u.id ? 'bg-gold/5 border-l-2 border-l-gold' : 'hover:bg-secondary/30'
                    }`}
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.user_name || u.user_email}</div>
                      <div className="text-xs text-muted-foreground">{u.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gold">{(u.balance || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-400 hidden md:table-cell">{(u.total_earned || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-destructive hidden md:table-cell">{(u.total_spent || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">{u.videos_watched || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-20">
              <h3 className="font-semibold mb-1">{selected.user_name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{selected.user_email}</p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { icon: Star, label: 'Saldo', value: (selected.balance || 0).toLocaleString(), color: 'text-gold' },
                  { icon: TrendingUp, label: 'Total Ganho', value: (selected.total_earned || 0).toLocaleString(), color: 'text-green-400' },
                  { icon: Play, label: 'Vídeos', value: selected.videos_watched || 0, color: 'text-accent' },
                ].map((s, i) => (
                  <div key={i} className="bg-secondary rounded-xl p-3 text-center">
                    <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                    <div className={`font-bold text-base ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-medium mb-3">Últimas Transações</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userTxs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem transações</p>
                ) : userTxs.slice(0, 20).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div>
                      <p className="text-xs font-medium">{typeLabels[tx.type] || tx.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs font-bold ${tx.points > 0 ? 'text-green-400' : 'text-destructive'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 text-center text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Clique em um usuário para ver detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}