import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export function useStreak() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-streak', user?.id],
    queryFn: async (): Promise<StreakData> => {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak, last_activity_date')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { current_streak: 0, longest_streak: 0, last_activity_date: null };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const streak = query.data;
  const today = new Date().toISOString().slice(0, 10);
  const isActiveToday = streak?.last_activity_date === today;
  const isAtRisk = !isActiveToday && (streak?.current_streak ?? 0) > 0 && new Date().getHours() >= 18;
  const isBroken = !isActiveToday && (streak?.current_streak ?? 0) === 0;

  return {
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
    isActiveToday,
    isAtRisk,
    isBroken,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
