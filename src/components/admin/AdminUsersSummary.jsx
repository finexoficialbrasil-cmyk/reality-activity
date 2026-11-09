import { useQuery } from '@tanstack/react-query';
import { Users, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import UsersMetricCard from '@/components/admin/UsersMetricCard';

export default function AdminUsersSummary() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-users-points-summary'],
    queryFn: () => base44.entities.UserPoints.aggregate({ sum: ['balance', 'total_earned', 'total_spent'] }),
  });
  const totals = data?.rows?.[0];
  const metrics = [
    { label: 'Usuários', value: totals?.count || 0, Icon: Users, context: 'Contas de pontos' },
    { label: 'Saldo', value: totals?.sum_balance || 0, Icon: Wallet, context: 'Pontos disponíveis' },
    { label: 'Ganhou', value: totals?.sum_total_earned || 0, Icon: TrendingUp, context: 'Total de pontos ganhos' },
    { label: 'Gastou', value: totals?.sum_total_spent || 0, Icon: TrendingDown, context: 'Total de pontos gastos' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {metrics.map(metric => <UsersMetricCard key={metric.label} {...metric} loading={isLoading} error={isError} />)}
    </div>
  );
}