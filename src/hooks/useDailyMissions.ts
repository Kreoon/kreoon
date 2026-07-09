import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DailyMission {
  id: string;
  code: string;
  title: string;
  description: string | null;
  target_count: number;
  progress: number;
  up_reward: number;
  completed_at: string | null;
  reward_claimed: boolean;
}

export function useDailyMissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['daily-missions', user?.id],
    queryFn: async (): Promise<DailyMission[]> => {
      const { data, error } = await supabase.rpc('get_daily_missions');
      if (error) throw error;
      return (data || []) as DailyMission[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const missions = query.data ?? [];
  const completedCount = missions.filter((m) => m.completed_at).length;

  return {
    missions,
    completedCount,
    total: missions.length,
    isLoading: query.isLoading,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['daily-missions', user?.id] }),
  };
}
