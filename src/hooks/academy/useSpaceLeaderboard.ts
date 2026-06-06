import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { LeaderboardPeriod, SpaceMemberPoints } from '@/types/academy-community';

export function useSpaceLeaderboard(spaceId: string | undefined, period: LeaderboardPeriod = 'all_time') {
  return useQuery({
    queryKey: ['academy', 'leaderboard', spaceId, period],
    queryFn: async () => {
      if (!spaceId) return [];
      const orderCol =
        period === 'week'
          ? 'current_week_points'
          : period === 'month'
          ? 'current_month_points'
          : 'total_points';

      const { data, error } = await (supabase as any)
        .from('academy_space_points')
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .eq('space_id', spaceId)
        .order(orderCol, { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SpaceMemberPoints[];
    },
    enabled: !!spaceId,
    staleTime: 3 * 60 * 1000,
  });
}

export function useMySpacePoints(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'my-points', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return null;
      const { data, error } = await (supabase as any)
        .from('academy_space_points')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as SpaceMemberPoints | null;
    },
    enabled: !!spaceId && !!user,
  });
}
