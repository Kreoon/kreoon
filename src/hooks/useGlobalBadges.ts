import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Tipos de rareza con colores y etiquetas
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type BadgeCategory = 'profile' | 'portfolio' | 'experience' | 'quality' | 'speed' | 'community' | 'veteran' | 'special';

export interface GlobalBadge {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  subcategory: string | null;
  condition_type: string;
  condition_config: Record<string, unknown>;
  rarity: BadgeRarity;
  ranking_points: number;
  tier: number;
  parent_badge_id: string | null;
  display_order: number;
  is_secret: boolean;
  is_seasonal: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UserGlobalBadge {
  id: string;
  user_id: string;
  badge_id: string;
  current_progress: number;
  progress_max: number;
  is_completed: boolean;
  unlocked_at: string | null;
  progress_updated_at: string;
  unlock_context: Record<string, unknown>;
  badge?: GlobalBadge;
}

export interface UserGlobalStats {
  user_id: string;
  profile_completeness: number;
  portfolio_posts_count: number;
  total_projects_completed: number;
  average_rating: number;
  early_deliveries_count: number;
  followers_count: number;
  days_since_signup: number;
  total_badge_points: number;
  badges_completed_count: number;
  global_rank: number | null;
  percentile: number;
  updated_at: string;
}

// Configuracion de colores por rareza
export const BADGE_RARITY_COLORS = {
  common: 'from-stone-400 to-stone-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 via-yellow-500 to-orange-500',
  mythic: 'from-pink-400 via-rose-500 to-red-500'
};

export const BADGE_RARITY_LABELS = {
  common: 'Comun',
  uncommon: 'Poco Comun',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Legendario',
  mythic: 'Mitico'
};

export const BADGE_RARITY_BORDERS = {
  common: 'border-stone-500/50',
  uncommon: 'border-emerald-500/50',
  rare: 'border-blue-500/50',
  epic: 'border-purple-500/50 animate-pulse',
  legendary: 'border-amber-500/50 animate-pulse',
  mythic: 'border-rose-500/50 animate-pulse'
};

export const BADGE_CATEGORY_LABELS: Record<BadgeCategory, string> = {
  profile: 'Perfil',
  portfolio: 'Portafolio',
  experience: 'Experiencia',
  quality: 'Calidad',
  speed: 'Velocidad',
  community: 'Comunidad',
  veteran: 'Veterano',
  special: 'Especiales'
};

export const BADGE_CATEGORY_ICONS: Record<BadgeCategory, string> = {
  profile: 'user',
  portfolio: 'briefcase',
  experience: 'target',
  quality: 'star',
  speed: 'zap',
  community: 'users',
  veteran: 'award',
  special: 'gift'
};

const RARITY_ORDER: Record<BadgeRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6
};

export function useGlobalBadges(userId?: string) {
  const [badges, setBadges] = useState<GlobalBadge[]>([]);
  const [userBadges, setUserBadges] = useState<UserGlobalBadge[]>([]);
  const [userStats, setUserStats] = useState<UserGlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const badgesRef = useRef<GlobalBadge[]>([]);

  // Fetch all global badges
  const fetchBadges = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('global_badges')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('display_order');

      if (fetchError) throw fetchError;

      const typedData = (data || []) as GlobalBadge[];
      badgesRef.current = typedData;
      setBadges(typedData);

      return typedData;
    } catch (err) {
      console.error('Error fetching global badges:', err);
      setError('Error al cargar insignias');
      return [];
    }
  }, []);

  // Fetch user's badges and progress
  const fetchUserBadges = useCallback(async (badgeCatalog?: GlobalBadge[]) => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_global_badges')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      const catalog = badgeCatalog ?? badgesRef.current;
      const badgeMap = new Map(catalog.map(b => [b.id, b]));

      const merged = (data || []).map(ub => ({
        ...ub,
        badge: badgeMap.get(ub.badge_id)
      })) as UserGlobalBadge[];

      setUserBadges(merged);
    } catch (err) {
      console.error('Error fetching user badges:', err);
    }
  }, [userId]);

  // Fetch user global stats
  const fetchUserStats = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_global_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      setUserStats(data as UserGlobalStats | null);
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  }, [userId]);

  // Check and award new badges
  const checkAndAwardBadges = useCallback(async () => {
    if (!userId) return null;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('check_and_award_global_badges', { p_user_id: userId });

      if (rpcError) throw rpcError;

      // Refresh data after awarding
      await Promise.all([fetchUserBadges(), fetchUserStats()]);

      return data;
    } catch (err) {
      console.error('Error checking badges:', err);
      return null;
    }
  }, [userId, fetchUserBadges, fetchUserStats]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const badgeCatalog = await fetchBadges();

      if (userId) {
        await Promise.all([
          fetchUserBadges(badgeCatalog),
          fetchUserStats()
        ]);
      }

      setLoading(false);
    };

    loadData();
  }, [userId, fetchBadges, fetchUserBadges, fetchUserStats]);

  // Realtime subscription for badge unlocks
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('global-badges-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_global_badges',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchUserBadges();
          fetchUserStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchUserBadges, fetchUserStats]);

  // Helper: Check if badge is unlocked
  const isUnlocked = useCallback((badgeId: string): boolean => {
    return userBadges.some(ub => ub.badge_id === badgeId && ub.is_completed);
  }, [userBadges]);

  // Helper: Get badge progress
  const getBadgeProgress = useCallback((badgeId: string): { current: number; max: number; percentage: number } => {
    const userBadge = userBadges.find(ub => ub.badge_id === badgeId);
    if (!userBadge) {
      return { current: 0, max: 1, percentage: 0 };
    }
    const percentage = userBadge.progress_max > 0
      ? Math.round((userBadge.current_progress / userBadge.progress_max) * 100)
      : 0;
    return {
      current: userBadge.current_progress,
      max: userBadge.progress_max,
      percentage
    };
  }, [userBadges]);

  // Helper: Get badges by category
  const getBadgesByCategory = useCallback((): Record<BadgeCategory, GlobalBadge[]> => {
    const grouped = {} as Record<BadgeCategory, GlobalBadge[]>;

    badges.forEach(badge => {
      // Solo mostrar badges no secretos o secretos desbloqueados
      if (badge.is_secret && !isUnlocked(badge.id)) return;

      if (!grouped[badge.category]) {
        grouped[badge.category] = [];
      }
      grouped[badge.category].push(badge);
    });

    // Ordenar por rareza dentro de cada categoria
    Object.keys(grouped).forEach(category => {
      grouped[category as BadgeCategory].sort((a, b) =>
        RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]
      );
    });

    return grouped;
  }, [badges, isUnlocked]);

  // Helper: Get overall progress
  const getOverallProgress = useCallback(() => {
    const completedCount = userBadges.filter(ub => ub.is_completed).length;
    const visibleBadges = badges.filter(b => !b.is_secret || isUnlocked(b.id));
    const totalCount = visibleBadges.length;

    return {
      completed: completedCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      points: userStats?.total_badge_points || 0,
      rank: userStats?.global_rank
    };
  }, [badges, userBadges, userStats, isUnlocked]);

  // Helper: Get recently unlocked badges
  const getRecentlyUnlocked = useCallback((limit: number = 5): UserGlobalBadge[] => {
    return userBadges
      .filter(ub => ub.is_completed && ub.unlocked_at)
      .slice(0, limit);
  }, [userBadges]);

  // Helper: Get next badges to unlock (closest to completion)
  const getNextBadgesToUnlock = useCallback((limit: number = 3): UserGlobalBadge[] => {
    return userBadges
      .filter(ub => !ub.is_completed && ub.current_progress > 0)
      .sort((a, b) => {
        const aPerc = a.current_progress / a.progress_max;
        const bPerc = b.current_progress / b.progress_max;
        return bPerc - aPerc;
      })
      .slice(0, limit);
  }, [userBadges]);

  return {
    badges,
    userBadges,
    userStats,
    loading,
    error,
    isUnlocked,
    getBadgeProgress,
    getBadgesByCategory,
    getOverallProgress,
    getRecentlyUnlocked,
    getNextBadgesToUnlock,
    checkAndAwardBadges,
    refetch: () => Promise.all([fetchBadges(), fetchUserBadges(), fetchUserStats()]),
    // Constants
    BADGE_RARITY_COLORS,
    BADGE_RARITY_LABELS,
    BADGE_RARITY_BORDERS,
    BADGE_CATEGORY_LABELS,
    BADGE_CATEGORY_ICONS
  };
}

// Hook para obtener stats de cualquier usuario (perfil publico)
export function usePublicGlobalBadges(userId: string) {
  const [badges, setBadges] = useState<UserGlobalBadge[]>([]);
  const [stats, setStats] = useState<UserGlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicData = async () => {
      if (!userId) return;

      try {
        // Fetch completed badges
        const { data: badgeData } = await supabase
          .from('user_global_badges')
          .select(`
            *,
            badge:global_badges(*)
          `)
          .eq('user_id', userId)
          .eq('is_completed', true)
          .order('unlocked_at', { ascending: false })
          .limit(20);

        setBadges((badgeData || []) as UserGlobalBadge[]);

        // Fetch public stats
        const { data: statsData } = await supabase
          .from('user_global_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        setStats(statsData as UserGlobalStats | null);
      } catch (err) {
        console.error('Error fetching public badges:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [userId]);

  return { badges, stats, loading };
}
