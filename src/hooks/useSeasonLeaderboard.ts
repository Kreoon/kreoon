import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeaderboardEntry {
  organization_id: string;
  user_id: string;
  role_key: string;
  season_points: number;
  lifetime_points: number;
  current_level: string;
  on_time_rate: number;
  current_streak_days: number;
  avg_rating: number | null;
  avg_engagement_rate: number | null;
  full_name: string;
  avatar_url: string | null;
  season_id: string | null;
  season_name: string | null;
  start_date: string | null;
  end_date: string | null;
  season_rank: number;
  percentile: number;
}

export interface LeaderboardStats {
  totalParticipants: number;
  topScore: number;
  averageScore: number;
  userPosition: number | null;
  userPercentile: number | null;
}

export type RoleFilter = 'all' | 'creator' | 'editor' | string;

export function useSeasonLeaderboard(organizationId?: string, roleFilter: RoleFilter = 'all') {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!organizationId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Intentar usar la vista materializada primero
      let { data, error: fetchError } = await supabase
        .from('season_leaderboard_live')
        .select('*')
        .eq('organization_id', organizationId)
        .order('season_rank');

      // Si la vista no existe o hay error, usar query directa
      if (fetchError) {
        console.warn('Materialized view not available, using direct query');

        const { data: directData, error: directError } = await supabase
          .from('user_reputation_totals')
          .select(`
            organization_id,
            user_id,
            role_key,
            season_points,
            lifetime_points,
            current_level,
            on_time_rate,
            current_streak_days,
            avg_rating,
            avg_engagement_rate
          `)
          .eq('organization_id', organizationId)
          .gt('season_points', 0)
          .order('season_points', { ascending: false });

        if (directError) throw directError;

        // Enriquecer con datos de perfil
        const userIds = (directData || []).map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        // Calcular ranks manualmente
        data = (directData || []).map((entry, index) => ({
          ...entry,
          full_name: profileMap.get(entry.user_id)?.full_name || 'Usuario',
          avatar_url: profileMap.get(entry.user_id)?.avatar_url,
          season_id: null,
          season_name: null,
          start_date: null,
          end_date: null,
          season_rank: index + 1,
          percentile: ((index + 1) / (directData?.length || 1)) * 100
        })) as LeaderboardEntry[];
      }

      setEntries((data || []) as LeaderboardEntry[]);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Error al cargar el ranking');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // Refresh materialized view (admin only)
  const refreshView = useCallback(async (): Promise<boolean> => {
    try {
      const { error: rpcError } = await supabase
        .rpc('refresh_season_leaderboard');

      if (rpcError) throw rpcError;

      await fetchLeaderboard();
      return true;
    } catch (err) {
      console.error('Error refreshing leaderboard view:', err);
      return false;
    }
  }, [fetchLeaderboard]);

  // Filtered entries based on role
  const filteredEntries = useMemo(() => {
    if (roleFilter === 'all') return entries;
    return entries.filter(e => e.role_key === roleFilter);
  }, [entries, roleFilter]);

  // Calculate stats
  const stats = useMemo((): LeaderboardStats => {
    const data = filteredEntries;

    if (data.length === 0) {
      return {
        totalParticipants: 0,
        topScore: 0,
        averageScore: 0,
        userPosition: null,
        userPercentile: null
      };
    }

    const topScore = data[0]?.season_points || 0;
    const totalScore = data.reduce((sum, e) => sum + e.season_points, 0);
    const averageScore = Math.round(totalScore / data.length);

    let userPosition: number | null = null;
    let userPercentile: number | null = null;

    if (user?.id) {
      const userEntry = data.find(e => e.user_id === user.id);
      if (userEntry) {
        userPosition = userEntry.season_rank;
        userPercentile = userEntry.percentile;
      }
    }

    return {
      totalParticipants: data.length,
      topScore,
      averageScore,
      userPosition,
      userPercentile
    };
  }, [filteredEntries, user?.id]);

  // Get top N entries
  const getTopN = useCallback((n: number): LeaderboardEntry[] => {
    return filteredEntries.slice(0, n);
  }, [filteredEntries]);

  // Get user's entry
  const getUserEntry = useCallback((): LeaderboardEntry | null => {
    if (!user?.id) return null;
    return filteredEntries.find(e => e.user_id === user.id) || null;
  }, [filteredEntries, user?.id]);

  // Get entries around user's position
  const getEntriesAroundUser = useCallback((range: number = 2): LeaderboardEntry[] => {
    if (!user?.id) return [];

    const userIndex = filteredEntries.findIndex(e => e.user_id === user.id);
    if (userIndex === -1) return [];

    const start = Math.max(0, userIndex - range);
    const end = Math.min(filteredEntries.length, userIndex + range + 1);

    return filteredEntries.slice(start, end);
  }, [filteredEntries, user?.id]);

  // Get movement since last check (mock - would need historical data)
  const getUserMovement = useCallback((): { direction: 'up' | 'down' | 'same'; positions: number } => {
    // En una implementación real, compararíamos con datos históricos
    // Por ahora, retornamos un valor neutral
    return { direction: 'same', positions: 0 };
  }, []);

  // Check if user is in podium (top 3)
  const isUserInPodium = useCallback((): boolean => {
    const userEntry = getUserEntry();
    return userEntry !== null && userEntry.season_rank <= 3;
  }, [getUserEntry]);

  // Initial load
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Realtime subscription for reputation changes
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_reputation_totals',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          // Debounce refresh to avoid too many updates
          setTimeout(() => fetchLeaderboard(), 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, fetchLeaderboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return {
    entries: filteredEntries,
    allEntries: entries,
    loading,
    error,
    stats,
    lastRefresh,
    getTopN,
    getUserEntry,
    getEntriesAroundUser,
    getUserMovement,
    isUserInPodium,
    refreshView,
    refetch: fetchLeaderboard
  };
}

// Hook para obtener el leaderboard historico de una temporada cerrada
export function useSeasonHistory(seasonId: string) {
  const [snapshots, setSnapshots] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!seasonId) return;

      try {
        const { data, error } = await supabase
          .from('up_season_snapshots')
          .select(`
            *,
            profile:profiles(full_name, avatar_url)
          `)
          .eq('season_id', seasonId)
          .order('final_rank');

        if (error) throw error;

        const mapped = (data || []).map(s => ({
          organization_id: s.organization_id,
          user_id: s.user_id,
          role_key: s.user_type,
          season_points: s.final_points,
          lifetime_points: s.final_points,
          current_level: s.final_level || 'Novato',
          on_time_rate: 0,
          current_streak_days: 0,
          avg_rating: null,
          avg_engagement_rate: null,
          full_name: s.profile?.full_name || 'Usuario',
          avatar_url: s.profile?.avatar_url,
          season_id: seasonId,
          season_name: null,
          start_date: null,
          end_date: null,
          season_rank: s.final_rank,
          percentile: 0
        })) as LeaderboardEntry[];

        setSnapshots(mapped);
      } catch (err) {
        console.error('Error fetching season history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [seasonId]);

  return { snapshots, loading };
}
