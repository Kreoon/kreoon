import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';

// Types for UP Creadores system
export interface UPCreadorRecord {
  id: string;
  user_id: string;
  content_id: string;
  organization_id: string;
  event_type: string;
  points: number;
  description: string | null;
  recording_started_at: string | null;
  recorded_at: string | null;
  issue_at: string | null;
  approved_at: string | null;
  days_to_deliver: number | null;
  created_at: string;
  created_by: string | null;
  related_issue_id: string | null;
  is_recovered: boolean;
}

export interface UPCreadorTotals {
  id: string;
  user_id: string;
  organization_id: string;
  total_points: number;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  total_issues: number;
  clean_approvals: number;
  reassignments: number;
  current_level: 'bronze' | 'silver' | 'gold' | 'diamond';
  updated_at: string;
}

// Event types for creators - MUST match database event_type values
export type CreatorEventType = 
  | 'early_delivery'        // +70 UP (Día 1-2: entrega temprana)
  | 'on_time_delivery'      // +50 UP (Día 3: a tiempo)
  | 'late_delivery'         // 0 UP (Día 4+: tarde, sin puntos)
  | 'issue_penalty'         // -10 UP (Novedad)
  | 'issue_recovery'        // +10 UP (Recuperación en máx 2 días)
  | 'clean_approval_bonus'  // +10 UP (Aprobación limpia)
  | 'reassignment';         // Sin puntos (Reasignación)

// Points configuration for creators - aligned with database
// Creators have 3 days: Day 1-2 = early (+70), Day 3 = on_time (+50)
export const CREATOR_POINTS_CONFIG = {
  early_delivery: 70,      // Día 1-2: Entrega temprana
  on_time_delivery: 50,    // Día 3: Entrega a tiempo
  late_delivery: 0,        // Día 4+: Sin puntos por entrega
  issue_penalty: -10,      // Novedad
  issue_recovery: 10,      // Recuperación de novedad (máx 2 días)
  clean_approval_bonus: 10, // Aprobación limpia (entregado → aprobado directo)
  reassignment: 0          // Reasignación
};

/**
 * Calculate days between two dates in Colombia timezone (UTC-5)
 */
export function calculateDaysInColombia(startDate: Date, endDate: Date): number {
  // Convert to Colombia timezone
  const colombiaOffset = -5 * 60; // UTC-5 in minutes
  
  const startColombia = new Date(startDate.getTime() + (startDate.getTimezoneOffset() + colombiaOffset) * 60000);
  const endColombia = new Date(endDate.getTime() + (endDate.getTimezoneOffset() + colombiaOffset) * 60000);
  
  // Calculate calendar days
  const startDay = new Date(startColombia.getFullYear(), startColombia.getMonth(), startColombia.getDate());
  const endDay = new Date(endColombia.getFullYear(), endColombia.getMonth(), endColombia.getDate());
  
  const diffTime = endDay.getTime() - startDay.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 porque el primer día cuenta
  
  return diffDays;
}

/**
 * Determine points for creator based on delivery day
 * Creators have 3 days to deliver (recording → recorded)
 * Day 1-2: +70 UP (early_delivery)
 * Day 3: +50 UP (on_time_delivery)
 * Day 4+: 0 UP (late_delivery - no bonus)
 */
export function calculateCreatorPoints(daysToDeliver: number): { eventType: CreatorEventType; points: number } {
  if (daysToDeliver <= 2) {
    // Día 1-2: Entrega temprana (+70 UP)
    return { eventType: 'early_delivery', points: CREATOR_POINTS_CONFIG.early_delivery };
  } else if (daysToDeliver === 3) {
    // Día 3: Entrega a tiempo (+50 UP)
    return { eventType: 'on_time_delivery', points: CREATOR_POINTS_CONFIG.on_time_delivery };
  } else {
    // Día 4+: Entrega tardía (sin puntos)
    return { eventType: 'late_delivery', points: CREATOR_POINTS_CONFIG.late_delivery };
  }
}

/**
 * Hook for managing creator UP points
 */
export function useUPCreadores(userId?: string) {
  const { currentOrgId } = useOrgOwner();
  const [records, setRecords] = useState<UPCreadorRecord[]>([]);
  const [totals, setTotals] = useState<UPCreadorTotals | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('up_creadores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRecords((data || []) as UPCreadorRecord[]);
    } catch (error) {
      console.error('Error fetching UP creadores records:', error);
    }
  }, [userId]);

  const fetchTotals = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('up_creadores_totals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setTotals(data as UPCreadorTotals | null);
    } catch (error) {
      console.error('Error fetching UP creadores totals:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchRecords();
    fetchTotals();

    // Realtime subscription
    const channel = supabase
      .channel('up-creadores-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'up_creadores',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchRecords();
          fetchTotals();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_creadores_totals',
          filter: `user_id=eq.${userId}`
        },
        () => fetchTotals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchRecords, fetchTotals]);

  /**
   * Register delivery points for creator
   */
  const registerDelivery = async (
    contentId: string,
    recordingStartedAt: Date,
    recordedAt: Date
  ) => {
    if (!userId || !currentOrgId) return null;

    const daysToDeliver = calculateDaysInColombia(recordingStartedAt, recordedAt);
    const { eventType, points } = calculateCreatorPoints(daysToDeliver);

    const { data, error } = await supabase
      .from('up_creadores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: eventType,
        points,
        description: `Entrega en ${daysToDeliver} día(s)`,
        recording_started_at: recordingStartedAt.toISOString(),
        recorded_at: recordedAt.toISOString(),
        days_to_deliver: daysToDeliver
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering delivery:', error);
      return null;
    }

    return data as UPCreadorRecord;
  };

  /**
   * Register issue penalty for creator
   */
  const registerIssuePenalty = async (contentId: string, issueAt: Date) => {
    if (!userId || !currentOrgId) return null;

    const { data, error } = await supabase
      .from('up_creadores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: 'issue_penalty',
        points: CREATOR_POINTS_CONFIG.issue_penalty,
        description: 'Penalización por novedad',
        issue_at: issueAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering issue penalty:', error);
      return null;
    }

    return data as UPCreadorRecord;
  };

  /**
   * Register issue recovery for creator (approved within 2 days of issue)
   */
  const registerIssueRecovery = async (
    contentId: string,
    issueAt: Date,
    approvedAt: Date,
    relatedIssueId: string
  ) => {
    if (!userId || !currentOrgId) return null;

    const daysSinceIssue = calculateDaysInColombia(issueAt, approvedAt);
    
    if (daysSinceIssue > 2) {
      console.log('Recovery not applicable - more than 2 days since issue');
      return null;
    }

    const { data, error } = await supabase
      .from('up_creadores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: 'issue_recovery',
        points: CREATOR_POINTS_CONFIG.issue_recovery,
        description: `Recuperación por corrección en ${daysSinceIssue} día(s)`,
        issue_at: issueAt.toISOString(),
        approved_at: approvedAt.toISOString(),
        related_issue_id: relatedIssueId,
        is_recovered: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering issue recovery:', error);
      return null;
    }

    // Mark original issue as recovered
    await supabase
      .from('up_creadores')
      .update({ is_recovered: true })
      .eq('id', relatedIssueId);

    return data as UPCreadorRecord;
  };

  /**
   * Register clean approval bonus for creator
   */
  const registerCleanApprovalBonus = async (contentId: string, approvedAt: Date) => {
    if (!userId || !currentOrgId) return null;

    const { data, error } = await supabase
      .from('up_creadores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: 'clean_approval_bonus',
        points: CREATOR_POINTS_CONFIG.clean_approval_bonus,
        description: 'Bonus por aprobación limpia',
        approved_at: approvedAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering clean approval bonus:', error);
      return null;
    }

    return data as UPCreadorRecord;
  };

  return {
    records,
    totals,
    loading,
    refetch: () => { fetchRecords(); fetchTotals(); },
    registerDelivery,
    registerIssuePenalty,
    registerIssueRecovery,
    registerCleanApprovalBonus,
    CREATOR_POINTS_CONFIG
  };
}

/**
 * Hook for creator leaderboard
 */
export function useCreatorLeaderboard() {
  const { currentOrgId } = useOrgOwner();
  const [leaderboard, setLeaderboard] = useState<(UPCreadorTotals & { profile?: { full_name: string; avatar_url: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!currentOrgId) return;

    try {
      const { data, error } = await supabase
        .from('up_creadores_totals')
        .select('*')
        .eq('organization_id', currentOrgId)
        .order('total_points', { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = (data || []).map(d => d.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

        const mergedData = (data || []).map(d => ({
          ...d as UPCreadorTotals,
          profile: profilesMap.get(d.user_id)
        }));

        setLeaderboard(mergedData as any);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error fetching creator leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('creator-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_creadores_totals'
        },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  return { leaderboard, loading, refetch: fetchLeaderboard };
}
