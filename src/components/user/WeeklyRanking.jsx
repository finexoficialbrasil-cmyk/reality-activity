import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Flame, Loader2 } from 'lucide-react';

const PODIUM_STYLES = [
  { bg: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: Crown, glow: 'shadow-[0_0_20px_rgba(234,179,8,0.2)]' },
  { bg: 'from-gray-400/20 to-gray-400/5', border: 'border-gray-400/40', text: 'text-gray-300', icon: Medal, glow: '' },
  { bg: 'from-orange-700/20 to-orange-700/5', border: 'border-orange-700/40', text: 'text-orange-400', icon: Medal, glow: '' },
];

export default function WeeklyRanking({ user }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    base44.functions.invoke('getWeeklyVitrineRanking', {})
      .then(res => {
        if (cancelled) return;
        if (res.data?.success) setRanking(res.data.ranking || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mb-8 bg-card border border-border rounded-2xl p-5 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando ranking...</span>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="mb-8 bg-card border border-border rounded-2xl p-5 text-center">
        <Trophy className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">Nenhum dado de vitrine nesta semana ainda. Compartilhe seu Mega-Link para liderar!</p>
      </div>
    );
  }

  const myEntry = ranking.find(r => r.user_email === user?.email);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 bg-card border border-border rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            Ranking Semanal da Vitrine
            <Flame className="w-4 h-4 text-orange-400" />
          </h2>
          <p className="text-xs text-muted-foreground">Quem mais ganhou pontos com Mega-Link nos últimos 7 dias</p>
        </div>
      </div>

      {/* Podium - Top 3 */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        {top3.map((r, i) => {
          const style = PODIUM_STYLES[i];
          const Icon = style.icon;
          const isMe = r.user_email === user?.email;
          return (
            <motion.div
              key={r.user_email}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-gradient-to-b ${style.bg} border ${style.border} rounded-xl p-3 text-center ${style.glow} ${i === 0 ? 'md:scale-105' : ''}`}
            >
              {isMe && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-gold text-background px-2 py-0.5 rounded-full whitespace-nowrap">
                  VOCÊ
                </span>
              )}
              <Icon className={`w-5 h-5 ${style.text} mx-auto mb-1.5`} />
              <p className="text-xs font-bold text-foreground truncate capitalize">{r.user_name}</p>
              <p className={`font-grotesk font-bold text-lg ${style.text}`}>{r.total_points.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">pts • {r.shares_count} cliques</p>
            </motion.div>
          );
        })}
      </div>

      {/* Rest of ranking */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((r, i) => {
            const isMe = r.user_email === user?.email;
            return (
              <div
                key={r.user_email}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isMe ? 'bg-gold/10 border border-gold/30' : 'hover:bg-secondary/40'
                }`}
              >
                <span className="font-cyber-mono text-sm text-muted-foreground w-6 text-center">{r.position}</span>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground uppercase">
                  {r.user_name.charAt(0)}
                </div>
                <p className="text-sm font-medium text-foreground flex-1 truncate capitalize">
                  {r.user_name}
                  {isMe && <span className="ml-2 text-[10px] text-gold font-bold">(você)</span>}
                </p>
                <span className="text-xs text-muted-foreground hidden sm:inline">{r.shares_count} cliques</span>
                <span className="font-grotesk font-bold text-sm text-gold">{r.total_points.toLocaleString()} pts</span>
              </div>
            );
          })}
        </div>
      )}

      {/* My position if not in top 10 */}
      {!myEntry && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 px-3 py-2 rounded-lg bg-gold/5 border border-gold/20">
          <span className="font-cyber-mono text-sm text-muted-foreground w-6 text-center">—</span>
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold uppercase">
            {user?.full_name?.charAt(0) || '?'}
          </div>
          <p className="text-sm font-medium text-foreground flex-1">Você ainda não está no ranking</p>
          <span className="text-xs text-muted-foreground">Compartilhe seu link!</span>
        </div>
      )}
    </motion.div>
  );
}