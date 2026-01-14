import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export type UPLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  current_level: UPLevel;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  clean_approvals: number;
  total_issues: number;
  creator_points: number;
  editor_points: number;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  content_id: string | null;
  event_type: string;
  points: number;
  description: string | null;
  created_at: string;
  source: 'creator' | 'editor';
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_points: number;
  current_level: UPLevel;
  rank: number;
}

export const LEVEL_THRESHOLDS = {
  bronze: { min: 0, max: 99 },
  silver: { min: 100, max: 299 },
  gold: { min: 300, max: 599 },
  diamond: { min: 600, max: Infinity }
};

export const LEVEL_LABELS: Record<UPLevel, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante'
};

export const LEVEL_COLORS: Record<UPLevel, string> = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  diamond: 'text-cyan-400'
};

export const LEVEL_BG_COLORS: Record<UPLevel, string> = {
  bronze: 'bg-amber-600/20 border-amber-600/30',
  silver: 'bg-slate-400/20 border-slate-400/30',
  gold: 'bg-yellow-500/20 border-yellow-500/30',
  diamond: 'bg-cyan-400/20 border-cyan-400/30'
};

function calculateLevel(points: number): UPLevel {
  if (points >= LEVEL_THRESHOLDS.diamond.min) return 'diamond';
  if (points >= LEVEL_THRESHOLDS.gold.min) return 'gold';
  if (points >= LEVEL_THRESHOLDS.silver.min) return 'silver';
  return 'bronze';
}

export function useUserPoints(userId?: string) {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch from UP V2 tables
      const [creatorResult, editorResult] = await Promise.all([
        supabase
          .from('up_creadores_totals')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('up_editores_totals')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      const creatorData = creatorResult.data;
      const editorData = editorResult.data;

      const creatorPoints = creatorData?.total_points || 0;
      const editorPoints = editorData?.total_points || 0;
      const totalPoints = creatorPoints + editorPoints;

      const combinedPoints: UserPoints = {
        id: creatorData?.id || editorData?.id || '',
        user_id: userId,
        total_points: totalPoints,
        current_level: calculateLevel(totalPoints),
        total_deliveries: (creatorData?.total_deliveries || 0) + (editorData?.total_deliveries || 0),
        on_time_deliveries: (creatorData?.on_time_deliveries || 0) + (editorData?.on_time_deliveries || 0),
        late_deliveries: (creatorData?.late_deliveries || 0) + (editorData?.late_deliveries || 0),
        clean_approvals: (creatorData?.clean_approvals || 0) + (editorData?.clean_approvals || 0),
        total_issues: (creatorData?.total_issues || 0) + (editorData?.total_issues || 0),
        creator_points: creatorPoints,
        editor_points: editorPoints
      };

      setPoints(combinedPoints);
      await fetchTransactions();
    } catch (error) {
      console.error('Error fetching user points:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Fetch from both UP V2 tables
      const [creatorRecords, editorRecords] = await Promise.all([
        supabase
          .from('up_creadores')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(25),
        supabase
          .from('up_editores')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(25)
      ]);

      const creatorTx: PointTransaction[] = (creatorRecords.data || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        content_id: r.content_id,
        event_type: r.event_type,
        points: r.points,
        description: r.description,
        created_at: r.created_at,
        source: 'creator' as const
      }));

      const editorTx: PointTransaction[] = (editorRecords.data || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        content_id: r.content_id,
        event_type: r.event_type,
        points: r.points,
        description: r.description,
        created_at: r.created_at,
        source: 'editor' as const
      }));

      // Combine and sort by date
      const allTx = [...creatorTx, ...editorTx].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTx.slice(0, 50));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchPoints();
    
    if (!userId) return;

    // Subscribe to UP V2 changes
    const channel = supabase
      .channel(`user-points-v2-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_creadores_totals',
          filter: `user_id=eq.${userId}`
        },
        () => fetchPoints()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_editores_totals',
          filter: `user_id=eq.${userId}`
        },
        () => fetchPoints()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'up_creadores',
          filter: `user_id=eq.${userId}`
        },
        () => fetchTransactions()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'up_editores',
          filter: `user_id=eq.${userId}`
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchPoints, fetchTransactions]);

  const getProgressToNextLevel = useCallback(() => {
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
  }, [points]);

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

export function usePointsHistory(userId?: string) {
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    if (!userId) return;
    
    try {
      // Fetch from UP V2 tables
      const [creatorRecords, editorRecords] = await Promise.all([
        supabase
          .from('up_creadores')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('up_editores')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const creatorTx: PointTransaction[] = (creatorRecords.data || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        content_id: r.content_id,
        event_type: r.event_type,
        points: r.points,
        description: r.description,
        created_at: r.created_at,
        source: 'creator' as const
      }));

      const editorTx: PointTransaction[] = (editorRecords.data || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        content_id: r.content_id,
        event_type: r.event_type,
        points: r.points,
        description: r.description,
        created_at: r.created_at,
        source: 'editor' as const
      }));

      // Combine and sort by date
      const allTx = [...creatorTx, ...editorTx].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setHistory(allTx.slice(0, 100));
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  return { history, loading, refetch: fetchHistory };
}

export function useLeaderboard() {
  const { currentOrgId } = useOrgOwner();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!currentOrgId) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    try {
      // Get all users with points from UP V2 tables
      const [creatorTotals, editorTotals] = await Promise.all([
        supabase
          .from('up_creadores_totals')
          .select('user_id, total_points')
          .eq('organization_id', currentOrgId),
        supabase
          .from('up_editores_totals')
          .select('user_id, total_points')
          .eq('organization_id', currentOrgId)
      ]);

      // Combine points by user
      const pointsByUser = new Map<string, number>();

      (creatorTotals.data || []).forEach(r => {
        const current = pointsByUser.get(r.user_id) || 0;
        pointsByUser.set(r.user_id, current + (r.total_points || 0));
      });

      (editorTotals.data || []).forEach(r => {
        const current = pointsByUser.get(r.user_id) || 0;
        pointsByUser.set(r.user_id, current + (r.total_points || 0));
      });

      if (pointsByUser.size === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Get profiles
      const userIds = Array.from(pointsByUser.keys());
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Create leaderboard entries
      const entries: LeaderboardEntry[] = userIds
        .map(userId => {
          const profile = profilesMap.get(userId);
          const totalPoints = pointsByUser.get(userId) || 0;
          return {
            user_id: userId,
            full_name: profile?.full_name || 'Usuario',
            avatar_url: profile?.avatar_url || null,
            total_points: totalPoints,
            current_level: calculateLevel(totalPoints),
            rank: 0
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(entries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchLeaderboard();

    if (!currentOrgId) return;

    const channel = supabase
      .channel('leaderboard-v2-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_creadores_totals'
        },
        () => fetchLeaderboard()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_editores_totals'
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard, currentOrgId]);

  return { leaderboard, loading, refetch: fetchLeaderboard };
}
