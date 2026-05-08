import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  delivered: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const STATUS_LABELS = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', delivered: 'Entregue' };

export default function AdminRedemptions() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await base44.entities.Redemption.list('-created_date');
    setRedemptions(data);
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    await base44.entities.Redemption.update(id, { status });
    setRedemptions(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const filtered = filter === 'all' ? redemptions : redemptions.filter(r => r.status === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-grotesk font-bold text-2xl">Resgates</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {redemptions.filter(r => r.status === 'pending').length} pendentes
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'pending', 'approved', 'delivered', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === s ? 'bg-gold text-background' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            <span className="ml-1.5 text-xs opacity-70">
              ({s === 'all' ? redemptions.length : redemptions.filter(r => r.status === s).length})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/30">
            <tr>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Usuário</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Produto</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Empresa</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Pontos</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-4 py-3" colSpan={6}><div className="h-4 bg-secondary rounded animate-pulse" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>Nenhum resgate encontrado</td>
              </tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{r.user_name || r.user_email}</div>
                  <div className="text-xs text-muted-foreground">{r.user_email}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_date).toLocaleDateString('pt-BR')}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="font-medium">{r.product_name}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{r.company_name}</td>
                <td className="px-4 py-3 text-center font-bold text-destructive">-{r.points_spent}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {r.status === 'pending' && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, 'approved')} className="h-7 w-7 text-green-400 hover:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, 'rejected')} className="h-7 w-7 text-destructive hover:text-destructive">
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, 'delivered')} className="h-7 w-7 text-blue-400">
                        <Package className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}