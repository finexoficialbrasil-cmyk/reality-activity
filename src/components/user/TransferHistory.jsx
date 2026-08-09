import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, XCircle } from 'lucide-react';

const statusConfig = {
  completed: { label: 'Concluída', color: 'text-green-400 bg-green-500/10', icon: ShieldCheck },
  under_review: { label: 'Em análise', color: 'text-yellow-400 bg-yellow-500/10', icon: Clock },
  blocked: { label: 'Bloqueada', color: 'text-red-400 bg-red-500/10', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'text-gray-400 bg-gray-500/10', icon: XCircle },
};

export default function TransferHistory({ user }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    try {
      const data = await base44.entities.PointsTransfer.list('-created_date', 100);
      setTransfers(data);
    } catch (e) {
      console.error('Erro:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transfers.filter(t => {
    if (filter === 'sent') return t.sender_email === user.email;
    if (filter === 'received') return t.receiver_email === user.email;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-border border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'sent', label: 'Enviadas' },
          { id: 'received', label: 'Recebidas' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id ? 'bg-gold text-background' : 'bg-card border border-border text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhuma transferência encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t, idx) => {
            const isSent = t.sender_email === user.email;
            const sc = statusConfig[t.status] || statusConfig.completed;
            const SIcon = sc.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isSent ? 'bg-red-500/10' : 'bg-green-500/10'
                  }`}>
                    {isSent ? <ArrowUpRight className="w-5 h-5 text-red-400" /> : <ArrowDownRight className="w-5 h-5 text-green-400" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{isSent ? t.receiver_name : t.sender_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isSent ? 'Enviado para' : 'Recebido de'} • {new Date(t.created_date).toLocaleDateString('pt-BR')} {new Date(t.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">{t.transfer_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${isSent ? 'text-red-400' : 'text-green-400'}`}>
                    {isSent ? '-' : '+'}{t.points_amount.toLocaleString('pt-BR')} pts
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${sc.color}`}>
                    <SIcon className="w-3 h-3" /> {sc.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}