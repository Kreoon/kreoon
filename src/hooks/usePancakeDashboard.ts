import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getPancakeDashboardStats,
  getPancakeSyncStats,
  getPancakeSyncLog,
  runBulkSync,
} from '@/services/pancakeCrmService';
import type { PancakeDashboardStats } from '@/types/crm.types';

const PANCAKE_DASHBOARD_KEY = ['pancake-dashboard-stats'] as const;

export function usePancakeDashboardStats() {
  return useQuery<PancakeDashboardStats>({
    queryKey: PANCAKE_DASHBOARD_KEY,
    queryFn: getPancakeDashboardStats,
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });
}

export function usePancakeSyncStatsQuery() {
  return useQuery({
    queryKey: ['pancake-sync-stats'],
    queryFn: getPancakeSyncStats,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePancakeSyncLogQuery(limit = 15) {
  return useQuery({
    queryKey: ['pancake-sync-log', limit],
    queryFn: () => getPancakeSyncLog(limit),
    staleTime: 60 * 1000,
  });
}

export function useTriggerBulkSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runBulkSync({ entity_type: 'both', batch_size: 50 }),
    onMutate: () => {
      toast.info('Sincronización iniciada...', { description: 'Esto puede tomar unos segundos.' });
    },
    onSuccess: (result) => {
      const { results } = result;
      toast.success('Sincronización completada', {
        description: `Usuarios: ${results.users.synced} | Orgs: ${results.organizations.synced}`,
      });
      queryClient.invalidateQueries({ queryKey: PANCAKE_DASHBOARD_KEY });
      queryClient.invalidateQueries({ queryKey: ['pancake-sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pancake-sync-log'] });
    },
    onError: (err: Error) => {
      toast.error('Error en sincronización', { description: err.message });
    },
  });
}
