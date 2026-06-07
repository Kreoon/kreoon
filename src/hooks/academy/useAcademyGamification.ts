import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LevelTier {
  level: number;
  title: string;
  emoji: string;
  min_xp: number;
  max_xp: number | null;
  perk_description: string | null;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  xp_reward: number;
}

export interface MemberBadge {
  id: string;
  space_id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface WeeklyMission {
  id: string;
  space_id: string;
  user_id: string;
  week_start: string;
  mission_type: string;
  goal: number;
  progress: number;
  completed: boolean;
  xp_reward: number;
  energy_reward: number;
  emoji: string;
  title: string;
  completed_at: string | null;
}

export interface MemberGamificationState {
  total_points: number;
  current_week_points: number;
  current_month_points: number;
  level: number;
  title: string;
  energy: number;
  streak_days: number;
  last_active_date: string | null;
}

export function useLevelTiers() {
  return useQuery({
    queryKey: ['academy', 'level-tiers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_level_tiers')
        .select('*')
        .order('level', { ascending: true });
      if (error) throw error;
      return (data ?? []) as LevelTier[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useAllBadges() {
  return useQuery({
    queryKey: ['academy', 'badges-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('academy_badges')
        .select('*');
      if (error) throw error;
      return (data ?? []) as Badge[];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useMyBadges(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'my-badges', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_member_badges')
        .select('*, badge:academy_badges(*)')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MemberBadge[];
    },
    enabled: !!spaceId && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyWeeklyMissions(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'my-missions', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return [];
      // Inicio de la semana actual (lunes)
      const now = new Date();
      const monday = new Date(now);
      const day = monday.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      monday.setDate(monday.getDate() + diff);
      monday.setHours(0, 0, 0, 0);

      const { data, error } = await (supabase as any)
        .from('academy_weekly_missions')
        .select('*')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .eq('week_start', monday.toISOString().split('T')[0])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WeeklyMission[];
    },
    enabled: !!spaceId && !!user,
  });
}

export function useMyGamificationState(spaceId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['academy', 'my-gamification', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return null;
      const { data, error } = await (supabase as any)
        .from('academy_space_points')
        .select('total_points, current_week_points, current_month_points, level, title, energy, streak_days, last_active_date')
        .eq('space_id', spaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as MemberGamificationState | null;
    },
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
  });
}
