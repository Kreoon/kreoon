import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points_required: number | null;
  condition_type: string;
  condition_value: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

const RARITY_ORDER = { common: 1, uncommon: 2, rare: 3, legendary: 4 };

export const RARITY_COLORS = {
  common: 'from-stone-400 to-stone-600',
  uncommon: 'from-emerald-400 to-emerald-600',
  rare: 'from-blue-400 to-blue-600',
  legendary: 'from-amber-400 via-yellow-500 to-orange-500'
};

export const RARITY_LABELS = {
  common: 'Común',
  uncommon: 'Poco Común',
  rare: 'Raro',
  legendary: 'Legendario'
};

export const RARITY_BORDERS = {
  common: 'border-stone-500/50',
  uncommon: 'border-emerald-500/50',
  rare: 'border-blue-500/50',
  legendary: 'border-amber-500/50 animate-pulse'
};

export function useAchievements(userId?: string) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
    if (userId) {
      fetchUserAchievements();
      
      const channel = supabase
        .channel('user-achievements-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${userId}`
          },
          () => fetchUserAchievements()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: true });

      if (error) throw error;
      
      // Sort by rarity
      const sorted = (data || []).sort((a, b) => 
        RARITY_ORDER[a.rarity as keyof typeof RARITY_ORDER] - 
        RARITY_ORDER[b.rarity as keyof typeof RARITY_ORDER]
      );
      
      setAchievements(sorted as Achievement[]);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchUserAchievements = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setUserAchievements((data || []) as unknown as UserAchievement[]);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId: string): boolean => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getUnlockedDate = (achievementId: string): string | null => {
    const ua = userAchievements.find(ua => ua.achievement_id === achievementId);
    return ua?.unlocked_at || null;
  };

  const getAchievementsByCategory = () => {
    const grouped: Record<string, Achievement[]> = {};
    achievements.forEach(a => {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    });
    return grouped;
  };

  const getProgress = () => {
    return {
      unlocked: userAchievements.length,
      total: achievements.length,
      percentage: achievements.length > 0 
        ? Math.round((userAchievements.length / achievements.length) * 100) 
        : 0
    };
  };

  return {
    achievements,
    userAchievements,
    loading,
    isUnlocked,
    getUnlockedDate,
    getAchievementsByCategory,
    getProgress,
    refetch: fetchUserAchievements,
    RARITY_COLORS,
    RARITY_LABELS,
    RARITY_BORDERS
  };
}

export function useAllUserAchievements() {
  const [userAchievementsMap, setUserAchievementsMap] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllUserAchievements();
  }, []);

  const fetchAllUserAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('user_id, achievement_id');

      if (error) throw error;

      const map = new Map<string, string[]>();
      (data || []).forEach(ua => {
        const existing = map.get(ua.user_id) || [];
        existing.push(ua.achievement_id);
        map.set(ua.user_id, existing);
      });
      
      setUserAchievementsMap(map);
    } catch (error) {
      console.error('Error fetching all user achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserAchievementCount = (userId: string): number => {
    return userAchievementsMap.get(userId)?.length || 0;
  };

  return { userAchievementsMap, loading, getUserAchievementCount };
}
