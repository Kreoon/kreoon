import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  current_level: 'bronze' | 'silver' | 'gold' | 'diamond';
  consecutive_on_time: number;
  total_completions: number;
  total_on_time: number;
  total_late: number;
  total_corrections: number;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  content_id: string | null;
  transaction_type: string;
  points: number;
  description: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  current_level: 'bronze' | 'silver' | 'gold' | 'diamond';
  rank: number;
}

const LEVEL_THRESHOLDS = {
  bronze: { min: 0, max: 99 },
  silver: { min: 100, max: 249 },
  gold: { min: 250, max: 499 },
  diamond: { min: 500, max: Infinity }
};

const LEVEL_LABELS = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante'
};

const LEVEL_COLORS = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  diamond: 'text-cyan-400'
};

const LEVEL_BG_COLORS = {
  bronze: 'bg-amber-600/20 border-amber-600/30',
  silver: 'bg-slate-400/20 border-slate-400/30',
  gold: 'bg-yellow-500/20 border-yellow-500/30',
  diamond: 'bg-cyan-400/20 border-cyan-400/30'
};

export function useUserPoints(userId?: string) {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchPoints();
    
    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('user-points-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${userId}`
        },
        () => fetchPoints()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_transactions',
          filter: `user_id=eq.${userId}`
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchPoints = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      // Si no existe, crear un registro inicial
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('user_points')
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (!insertError && newData) {
          setPoints(newData as UserPoints);
        }
      } else {
        setPoints(data as UserPoints);
      }
      
      await fetchTransactions();
    } catch (error) {
      console.error('Error fetching user points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions((data || []) as PointTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getProgressToNextLevel = () => {
    if (!points) return { progress: 0, nextLevel: 'silver' as const, pointsNeeded: 100 };
    
    const currentPoints = points.total_points;
    const level = points.current_level;
    
    if (level === 'diamond') {
      return { progress: 100, nextLevel: 'diamond' as const, pointsNeeded: 0 };
    }
    
    const nextLevel = level === 'bronze' ? 'silver' : level === 'silver' ? 'gold' : 'diamond';
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel].min;
    const currentThreshold = LEVEL_THRESHOLDS[level].min;
    const range = nextThreshold - currentThreshold;
    const progress = ((currentPoints - currentThreshold) / range) * 100;
    
    return {
      progress: Math.min(100, Math.max(0, progress)),
      nextLevel,
      pointsNeeded: nextThreshold - currentPoints
    };
  };

  return {
    points,
    transactions,
    loading,
    refetch: fetchPoints,
    getProgressToNextLevel,
    LEVEL_LABELS,
    LEVEL_COLORS,
    LEVEL_BG_COLORS,
    LEVEL_THRESHOLDS
  };
}

export function useLeaderboard() {
  const { currentOrgId } = useOrgOwner();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points'
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrgId]);

  const fetchLeaderboard = async () => {
    try {
      if (!currentOrgId) {
        setLeaderboard([]);
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', currentOrgId);

      if (membersError) throw membersError;

      const memberIds = (membersData || []).map(m => m.user_id);
      if (!memberIds.length) {
        setLeaderboard([]);
        return;
      }

      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, total_points, current_level')
        .in('user_id', memberIds)
        .order('total_points', { ascending: false });

      if (pointsError) throw pointsError;

      if (!pointsData || pointsData.length === 0) {
        setLeaderboard([]);
        return;
      }

      const userIds = pointsData.map(p => p.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const entries: LeaderboardEntry[] = pointsData.map((p, index) => {
        const profile = profilesMap.get(p.user_id);
        return {
          user_id: p.user_id,
          full_name: profile?.full_name || 'Usuario',
          avatar_url: profile?.avatar_url || null,
          total_points: p.total_points,
          current_level: p.current_level as 'bronze' | 'silver' | 'gold' | 'diamond',
          rank: index + 1
        };
      });

      setLeaderboard(entries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return { leaderboard, loading, refetch: fetchLeaderboard };
}
