// ============================================================================
// Hooks de streaming/realtime para academia.
// Centraliza: presencia (heartbeat + conteo), notificaciones en vivo y
// salud financiera (MRR efectivo, dilución).
// ============================================================================

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PRESENCE_HEARTBEAT_MS = 60_000;

// ────────────────────────────────────────────────────────────────────────────
// 1. PRESENCIA: heartbeat + conteo de online en el space
// ────────────────────────────────────────────────────────────────────────────
export function useAcademyPresence(spaceId: string | null | undefined) {
  const { user } = useAuth();

  useEffect(() => {
    if (!spaceId || !user) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await (supabase as any).rpc('touch_academy_presence', {
        p_space_id: spaceId,
        p_current_page: typeof window !== 'undefined' ? window.location.pathname : null,
      });
    };
    tick();
    const interval = setInterval(tick, PRESENCE_HEARTBEAT_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [spaceId, user?.id]);

  const { data } = useQuery({
    queryKey: ['academy', 'presence-count', spaceId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_academy_presence_count', {
        p_space_id: spaceId,
      });
      if (error) throw error;
      return (data?.online ?? 0) as number;
    },
    enabled: !!spaceId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return { online: data ?? 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// 2. NOTIFICACIONES: query + suscripción realtime al INSERT
// ────────────────────────────────────────────────────────────────────────────
export interface AcademyNotification {
  id: string;
  space_id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  reference_id: string | null;
  reference_type: string | null;
  payload: any;
  created_at: string;
}

export function useAcademyNotifications(opts?: { onNew?: (n: AcademyNotification) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['academy', 'notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AcademyNotification[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel(`academy-notif-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'academy_notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload: any) => {
          const fresh = payload.new as AcademyNotification;
          qc.setQueryData<AcademyNotification[]>(
            ['academy', 'notifications', user.id],
            (prev = []) => [fresh, ...prev].slice(0, 50)
          );
          opts?.onNew?.(fresh);
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [user?.id]);

  const unreadCount = (query.data ?? []).filter((n) => !n.is_read).length;
  const markAsRead = async (id: string) => {
    await (supabase as any)
      .from('academy_notifications')
      .update({ is_read: true })
      .eq('id', id);
    qc.setQueryData<AcademyNotification[]>(
      ['academy', 'notifications', user?.id],
      (prev = []) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };
  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any)
      .from('academy_notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);
    qc.setQueryData<AcademyNotification[]>(
      ['academy', 'notifications', user.id],
      (prev = []) => prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  return {
    notifications: query.data ?? [],
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllRead,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. SALUD FINANCIERA: MRR efectivo, dilución, conversión
// ────────────────────────────────────────────────────────────────────────────
export interface FinancialHealth {
  mrr_gross: number;
  mrr_effective: number;
  mrr_lost_to_coupons: number;
  dilution_percent: number;
  active_members: number;
  new_members_30d: number;
  churned_30d: number;
  collected_30d_usd: number;
  commission_30d_usd: number;
  arr_effective_usd: number;
  platform_fee_percent: number;
  projected_commission_mrr: number;
  active_coupons: number;
  total_redemptions: number;
}

export function useAcademyFinancialHealth(spaceId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery<FinancialHealth | null>({
    queryKey: ['academy', 'financial-health', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;
      const { data, error } = await (supabase as any).rpc(
        'get_academy_financial_health',
        { p_space_id: spaceId }
      );
      if (error) throw error;
      return data as FinancialHealth;
    },
    enabled: !!spaceId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!spaceId) return;
    const channel = (supabase as any)
      .channel(`academy-finance-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_owner_payouts',
          filter: `space_id=eq.${spaceId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['academy', 'financial-health', spaceId] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academy_memberships',
          filter: `space_id=eq.${spaceId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['academy', 'financial-health', spaceId] })
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [spaceId]);

  return query;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. ACTIVITY FEED del space: últimos eventos broadcast a TODOS los miembros
//    (los nuevos miembros, posts, level-ups del space — no son notifs personales).
//    Para esto miramos las notifs cuyo space_id = X agrupadas por reference_id.
// ────────────────────────────────────────────────────────────────────────────
export function useAcademyActivityFeed(spaceId: string | null | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['academy', 'activity', spaceId, user?.id],
    queryFn: async () => {
      if (!spaceId || !user) return [];
      const { data, error } = await (supabase as any)
        .from('academy_notifications')
        .select('id, type, title, body, link, payload, created_at, sender_id, reference_id, reference_type')
        .eq('space_id', spaceId)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AcademyNotification[];
    },
    enabled: !!spaceId && !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!spaceId || !user) return;
    const channel = (supabase as any)
      .channel(`academy-activity-${spaceId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'academy_notifications',
          filter: `space_id=eq.${spaceId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['academy', 'activity', spaceId, user.id] })
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [spaceId, user?.id]);

  return query;
}

// ────────────────────────────────────────────────────────────────────────────
// 5. SUBSCRIPCIÓN AL FEED REACTIVO de posts/comments del space.
//    Invalida queries cuando hay cambios para que el feed se refresque solo.
// ────────────────────────────────────────────────────────────────────────────
export function useAcademyLiveContent(spaceId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!spaceId) return;
    const channel = (supabase as any)
      .channel(`academy-content-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academy_posts',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['academy', 'posts', spaceId] });
          qc.invalidateQueries({ queryKey: ['academy-posts', spaceId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academy_post_comments',
        },
        () => {
          qc.invalidateQueries({ queryKey: ['academy', 'posts', spaceId] });
          qc.invalidateQueries({ queryKey: ['academy', 'comments'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'academy_space_points',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['academy', 'leaderboard', spaceId] });
          qc.invalidateQueries({ queryKey: ['academy', 'points', spaceId] });
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [spaceId]);
}
