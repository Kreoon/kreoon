import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { calculateDaysInColombia } from './useUPCreadores';

// Types for UP Editores system
export interface UPEditorRecord {
  id: string;
  user_id: string;
  content_id: string;
  organization_id: string;
  event_type: string;
  points: number;
  description: string | null;
  editing_started_at: string | null;
  delivered_at: string | null;
  issue_at: string | null;
  approved_at: string | null;
  days_to_deliver: number | null;
  created_at: string;
  created_by: string | null;
  related_issue_id: string | null;
  is_recovered: boolean;
}

export interface UPEditorTotals {
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

// Event types for editors
export type EditorEventType = 
  | 'delivery_on_time'      // +70 UP (Día 1)
  | 'delivery_day2'         // +50 UP (Día 2)
  | 'late_day3'             // -30 UP (Día 3)
  | 'late_day4'             // -30 UP (Día 4)
  | 'issue_penalty'         // -10 UP (Novedad)
  | 'issue_recovery'        // +10 UP (Recuperación)
  | 'clean_approval_bonus'  // +10 UP (Aprobación limpia)
  | 'reassignment';         // Sin puntos (Reasignación día 5)

// Points configuration for editors (different from creators)
export const EDITOR_POINTS_CONFIG = {
  delivery_on_time: 70,    // Día 1
  delivery_day2: 50,       // Día 2
  late_day3: -30,          // Día 3
  late_day4: -30,          // Día 4
  issue_penalty: -10,      // Novedad
  issue_recovery: 10,      // Recuperación de novedad
  clean_approval_bonus: 10,// Aprobación limpia
  reassignment: 0          // Reasignación
};

/**
 * Determine points for editor based on delivery day
 */
export function calculateEditorPoints(daysToDeliver: number): { eventType: EditorEventType; points: number } {
  if (daysToDeliver === 1) {
    return { eventType: 'delivery_on_time', points: EDITOR_POINTS_CONFIG.delivery_on_time };
  } else if (daysToDeliver === 2) {
    return { eventType: 'delivery_day2', points: EDITOR_POINTS_CONFIG.delivery_day2 };
  } else if (daysToDeliver === 3) {
    return { eventType: 'late_day3', points: EDITOR_POINTS_CONFIG.late_day3 };
  } else if (daysToDeliver === 4) {
    return { eventType: 'late_day4', points: EDITOR_POINTS_CONFIG.late_day4 };
  } else {
    // Día 5+ - reasignación automática
    return { eventType: 'reassignment', points: EDITOR_POINTS_CONFIG.reassignment };
  }
}

/**
 * Hook for managing editor UP points
 */
export function useUPEditores(userId?: string) {
  const { currentOrgId } = useOrgOwner();
  const [records, setRecords] = useState<UPEditorRecord[]>([]);
  const [totals, setTotals] = useState<UPEditorTotals | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('up_editores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRecords((data || []) as UPEditorRecord[]);
    } catch (error) {
      console.error('Error fetching UP editores records:', error);
    }
  }, [userId]);

  const fetchTotals = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('up_editores_totals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setTotals(data as UPEditorTotals | null);
    } catch (error) {
      console.error('Error fetching UP editores totals:', error);
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
      .channel('up-editores-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'up_editores',
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
          table: 'up_editores_totals',
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
   * Register delivery points for editor
   */
  const registerDelivery = async (
    contentId: string,
    editingStartedAt: Date,
    deliveredAt: Date
  ) => {
    if (!userId || !currentOrgId) return null;

    const daysToDeliver = calculateDaysInColombia(editingStartedAt, deliveredAt);
    const { eventType, points } = calculateEditorPoints(daysToDeliver);

    const { data, error } = await supabase
      .from('up_editores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: eventType,
        points,
        description: `Entrega en ${daysToDeliver} día(s)`,
        editing_started_at: editingStartedAt.toISOString(),
        delivered_at: deliveredAt.toISOString(),
        days_to_deliver: daysToDeliver
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering delivery:', error);
      return null;
    }

    return data as UPEditorRecord;
  };

  /**
   * Register issue penalty for editor
   */
  const registerIssuePenalty = async (contentId: string, issueAt: Date) => {
    if (!userId || !currentOrgId) return null;

    const { data, error } = await supabase
      .from('up_editores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: 'issue_penalty',
        points: EDITOR_POINTS_CONFIG.issue_penalty,
        description: 'Penalización por novedad',
        issue_at: issueAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering issue penalty:', error);
      return null;
    }

    return data as UPEditorRecord;
  };

  /**
   * Register issue recovery for editor (approved within 2 days of issue)
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
      .from('up_editores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: 'issue_recovery',
        points: EDITOR_POINTS_CONFIG.issue_recovery,
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
      .from('up_editores')
      .update({ is_recovered: true })
      .eq('id', relatedIssueId);

    return data as UPEditorRecord;
  };

  /**
   * Register clean approval bonus for editor
   */
  const registerCleanApprovalBonus = async (contentId: string, approvedAt: Date) => {
    if (!userId || !currentOrgId) return null;

    const { data, error } = await supabase
      .from('up_editores')
      .insert({
        user_id: userId,
        content_id: contentId,
        organization_id: currentOrgId,
        event_type: 'clean_approval_bonus',
        points: EDITOR_POINTS_CONFIG.clean_approval_bonus,
        description: 'Bonus por aprobación limpia',
        approved_at: approvedAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering clean approval bonus:', error);
      return null;
    }

    return data as UPEditorRecord;
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
    EDITOR_POINTS_CONFIG
  };
}

/**
 * Hook for editor leaderboard
 */
export function useEditorLeaderboard() {
  const { currentOrgId } = useOrgOwner();
  const [leaderboard, setLeaderboard] = useState<(UPEditorTotals & { profile?: { full_name: string; avatar_url: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    if (!currentOrgId) return;

    try {
      const { data, error } = await supabase
        .from('up_editores_totals')
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

        setLeaderboard((data || []).map(d => ({
          ...d as UPEditorTotals,
          profile: profilesMap.get(d.user_id)
        })));
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error fetching editor leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('editor-leaderboard')
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
  }, [fetchLeaderboard]);

  return { leaderboard, loading, refetch: fetchLeaderboard };
}
