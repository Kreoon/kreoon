import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TalentActivityMetrics } from '@/types/talentActivity.types';

export function useTalentActivityMetrics(orgId: string | undefined) {
  const query = useQuery({
    queryKey: ['talent-activity-metrics', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_talent_activity_metrics' as any, {
        p_org_id: orgId!,
      });
      if (error) throw error;
      return (data || []) as TalentActivityMetrics[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: query.data ?? [],
  };
}

export function getTalentMetrics(
  metrics: TalentActivityMetrics[],
  talentId: string,
): TalentActivityMetrics | undefined {
  return metrics.find(m => m.talent_id === talentId);
}
