import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GlobalRankingEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_badge_points: number;
  badges_completed_count: number;
  global_rank: number;
  percentile: number;
  profile_completeness: number;
  total_projects_completed: number;
  average_rating: number;
  days_since_signup: number;
  last_active_at: string;
}

export interface RankingFilters {
  minBadges?: number;
  minPoints?: number;
  activeWithinDays?: number;
}

export function useGlobalRanking(filters?: RankingFilters) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GlobalRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch global ranking
  const fetchRanking = useCallback(async () => {
    try {
      setLoading(true);

      // Obtener stats globales ordenados por puntos de badges
      let query = supabase
        .from('user_global_stats')
        .select(`
          user_id,
          total_badge_points,
          badges_completed_count,
          global_rank,
          percentile,
          profile_completeness,
          total_projects_completed,
          average_rating,
          days_since_signup,
          last_active_at
        `)
        .gt('total_badge_points', 0)
        .order('total_badge_points', { ascending: false })
        .limit(100);

      // Aplicar filtros
      if (filters?.minBadges) {
        query = query.gte('badges_completed_count', filters.minBadges);
      }
      if (filters?.minPoints) {
        query = query.gte('total_badge_points', filters.minPoints);
      }
      if (filters?.activeWithinDays) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - filters.activeWithinDays);
        query = query.gte('last_active_at', cutoff.toISOString());
      }

      const { data: statsData, error: statsError } = await query;

      if (statsError) throw statsError;

      // Obtener perfiles
      const userIds = (statsData || []).map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Combinar datos y calcular ranks si no existen
      const ranked = (statsData || []).map((stat, index) => ({
        ...stat,
        full_name: profileMap.get(stat.user_id)?.full_name || 'Usuario',
        avatar_url: profileMap.get(stat.user_id)?.avatar_url,
        global_rank: stat.global_rank || index + 1,
        percentile: stat.percentile || ((index + 1) / (statsData?.length || 1)) * 100
      })) as GlobalRankingEntry[];

      setEntries(ranked);
      setError(null);
    } catch (err) {
      console.error('Error fetching global ranking:', err);
      setError('Error al cargar el ranking global');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Get user's global position
  const getUserPosition = useCallback(async (): Promise<GlobalRankingEntry | null> => {
    if (!user?.id) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_global_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) return null;

      // Obtener perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      return {
        ...data,
        full_name: profile?.full_name || 'Usuario',
        avatar_url: profile?.avatar_url
      } as GlobalRankingEntry;
    } catch (err) {
      console.error('Error fetching user position:', err);
      return null;
    }
  }, [user?.id]);

  // Cached user position
  const [userPosition, setUserPosition] = useState<GlobalRankingEntry | null>(null);

  useEffect(() => {
    if (user?.id) {
      getUserPosition().then(setUserPosition);
    }
  }, [user?.id, getUserPosition]);

  // Stats calculados
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        totalUsers: 0,
        averagePoints: 0,
        averageBadges: 0,
        topPoints: 0
      };
    }

    return {
      totalUsers: entries.length,
      averagePoints: Math.round(entries.reduce((s, e) => s + e.total_badge_points, 0) / entries.length),
      averageBadges: Math.round(entries.reduce((s, e) => s + e.badges_completed_count, 0) / entries.length),
      topPoints: entries[0]?.total_badge_points || 0
    };
  }, [entries]);

  // Get top N
  const getTopN = useCallback((n: number): GlobalRankingEntry[] => {
    return entries.slice(0, n);
  }, [entries]);

  // Get entries around user
  const getEntriesAroundUser = useCallback((range: number = 2): GlobalRankingEntry[] => {
    if (!userPosition) return [];

    const userIndex = entries.findIndex(e => e.user_id === user?.id);
    if (userIndex === -1) {
      // Usuario no está en top 100, solo mostrar su posición
      return [userPosition];
    }

    const start = Math.max(0, userIndex - range);
    const end = Math.min(entries.length, userIndex + range + 1);

    return entries.slice(start, end);
  }, [entries, user?.id, userPosition]);

  // Get tier based on percentile
  const getUserTier = useCallback((): { name: string; color: string; icon: string } => {
    if (!userPosition) {
      return { name: 'Sin ranking', color: 'gray', icon: 'minus' };
    }

    const percentile = userPosition.percentile || 100;

    if (percentile <= 1) {
      return { name: 'Top 1%', color: 'rose', icon: 'crown' };
    } else if (percentile <= 5) {
      return { name: 'Top 5%', color: 'amber', icon: 'trophy' };
    } else if (percentile <= 10) {
      return { name: 'Top 10%', color: 'purple', icon: 'medal' };
    } else if (percentile <= 25) {
      return { name: 'Top 25%', color: 'blue', icon: 'star' };
    } else if (percentile <= 50) {
      return { name: 'Top 50%', color: 'green', icon: 'trending-up' };
    } else {
      return { name: 'En progreso', color: 'slate', icon: 'target' };
    }
  }, [userPosition]);

  // Initial load
  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('global-ranking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_global_stats'
        },
        () => {
          // Debounce
          setTimeout(() => fetchRanking(), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRanking]);

  return {
    entries,
    loading,
    error,
    stats,
    userPosition,
    getTopN,
    getEntriesAroundUser,
    getUserTier,
    refetch: fetchRanking
  };
}

// Hook para actualizar stats globales del usuario actual
export function useUpdateGlobalStats() {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);

  // Sincronizar stats desde todas las organizaciones
  const syncStats = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      setUpdating(true);

      // Calcular totales agregados de todas las organizaciones
      const { data: reputationData } = await supabase
        .from('user_reputation_totals')
        .select('lifetime_points, season_tasks, on_time_rate, early_deliveries_count, late_deliveries_count')
        .eq('user_id', user.id);

      const aggregated = (reputationData || []).reduce((acc, curr) => ({
        total_projects: acc.total_projects + (curr.season_tasks || 0),
        early_deliveries: acc.early_deliveries + (curr.early_deliveries_count || 0),
        late_deliveries: acc.late_deliveries + (curr.late_deliveries_count || 0),
        on_time_sum: acc.on_time_sum + (curr.on_time_rate || 0),
        count: acc.count + 1
      }), { total_projects: 0, early_deliveries: 0, late_deliveries: 0, on_time_sum: 0, count: 0 });

      // Obtener datos de perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, bio, instagram, tiktok, facebook, youtube, linkedin, twitter, created_at')
        .eq('id', user.id)
        .single();

      // Calcular completitud del perfil
      const profileFields = [
        !!profile?.avatar_url,
        !!profile?.bio && profile.bio.length > 10,
        !!profile?.instagram || !!profile?.tiktok || !!profile?.facebook
      ];
      const completeness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

      // Contar redes sociales
      const socialNetworks = [
        profile?.instagram, profile?.tiktok, profile?.facebook,
        profile?.youtube, profile?.linkedin, profile?.twitter
      ].filter(Boolean).length;

      // Calcular dias desde registro
      const daysSinceSignup = profile?.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Obtener conteo de badges
      const { count: badgeCount } = await supabase
        .from('user_global_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_completed', true);

      // Calcular puntos de badges
      const { data: badgePoints } = await supabase
        .from('user_global_badges')
        .select('badge:global_badges(ranking_points)')
        .eq('user_id', user.id)
        .eq('is_completed', true);

      const totalBadgePoints = (badgePoints || []).reduce((sum, b) => {
        const points = (b.badge as unknown as { ranking_points: number })?.ranking_points || 0;
        return sum + points;
      }, 0);

      // Upsert stats
      const { error: upsertError } = await supabase
        .from('user_global_stats')
        .upsert({
          user_id: user.id,
          profile_completeness: completeness,
          has_avatar: !!profile?.avatar_url,
          has_bio: !!profile?.bio,
          bio_length: profile?.bio?.length || 0,
          social_networks_count: socialNetworks,
          total_projects_completed: aggregated.total_projects,
          early_deliveries_count: aggregated.early_deliveries,
          late_deliveries_count: aggregated.late_deliveries,
          on_time_deliveries_count: aggregated.total_projects - aggregated.late_deliveries,
          days_since_signup: daysSinceSignup,
          badges_completed_count: badgeCount || 0,
          total_badge_points: totalBadgePoints,
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) throw upsertError;

      // Verificar nuevos badges
      await supabase.rpc('check_and_award_global_badges', { p_user_id: user.id });

      return true;
    } catch (err) {
      console.error('Error syncing global stats:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.id]);

  return { syncStats, updating };
}
