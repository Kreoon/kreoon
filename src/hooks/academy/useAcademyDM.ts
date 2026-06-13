// ============================================================================
// DMs en academia con role gating (creator↔talent libre, student/client
// solo con admin). Lectura por RLS, escritura por RPC SECURITY DEFINER.
// Realtime sobre academy_dm_messages para refresh.
// ============================================================================

import { useEffect, useId } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DmThreadSummary {
  thread_id: string;
  space_id: string;
  space_name: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface DmMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export function useMyDmThreads(spaceId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const instanceId = useId();

  const query = useQuery<DmThreadSummary[]>({
    queryKey: ['academy', 'dm-threads', user?.id, spaceId ?? 'all'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any).rpc('list_my_dm_threads', {
        p_space_id: spaceId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as DmThreadSummary[];
    },
    enabled: !!user,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = (supabase as any)
      .channel(`academy-dm-threads-${user.id}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'academy_dm_threads' },
        () => qc.invalidateQueries({ queryKey: ['academy', 'dm-threads', user.id] })
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [user?.id]);

  return query;
}

export function useDmMessages(threadId: string | null | undefined) {
  const qc = useQueryClient();
  const instanceId = useId();

  const query = useQuery<DmMessage[]>({
    queryKey: ['academy', 'dm-messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await (supabase as any)
        .from('academy_dm_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DmMessage[];
    },
    enabled: !!threadId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!threadId) return;
    const channel = (supabase as any)
      .channel(`academy-dm-msgs-${threadId}-${instanceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'academy_dm_messages', filter: `thread_id=eq.${threadId}` },
        () => qc.invalidateQueries({ queryKey: ['academy', 'dm-messages', threadId] })
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [threadId]);

  return query;
}

export function useSendDm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { spaceId: string; toUserId: string; body: string }) => {
      const { data, error } = await (supabase as any).rpc('send_academy_dm', {
        p_space_id: vars.spaceId,
        p_to_user: vars.toUserId,
        p_body: vars.body,
      });
      if (error) throw error;
      return data as { thread_id: string; message_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'dm-threads'] });
    },
  });
}

export function useMarkDmRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await (supabase as any).rpc('mark_dm_thread_read', {
        p_thread_id: threadId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academy', 'dm-threads'] });
    },
  });
}
