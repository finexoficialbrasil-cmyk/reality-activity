import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook compartilhado para dados públicos (anúncios, empresas, vídeos, saldo queimado).
 * Usa React Query para deduplicar e cachear — Home e Navbar compartilham uma única chamada.
 */
export function usePublicData() {
  return useQuery({
    queryKey: ['publicData'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPublicData', {});
      return res.data;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });
}