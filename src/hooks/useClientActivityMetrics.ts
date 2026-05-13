import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClientActivityMetrics } from '@/types/clientActivity.types';

export function useClientActivityMetrics(orgId: string | undefined) {
  return useQuery({
    queryKey: ['client-activity-metrics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_activity_metrics' as any, {
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as ClientActivityMetrics[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Busca las métricas de un cliente específico dentro del array ya cargado */
export function getClientMetrics(
  metrics: ClientActivityMetrics[] | undefined,
  clientId: string,
): ClientActivityMetrics | undefined {
  return metrics?.find(m => m.client_id === clientId);
}
