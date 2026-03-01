/**
 * useStreamingSession - Hook principal para gestión de sesiones de streaming v2
 * CRUD de sesiones + suscripción Realtime + métricas en tiempo real
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  StreamingSession,
  CreateSessionInput,
  UseStreamingSessionReturn,
  StreamingSessionStatus,
} from '@/types/streaming.types';

const QUERY_KEY = 'streaming-sessions-v2';

export function useStreamingSession(): UseStreamingSessionReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const organizationId = profile?.current_organization_id;

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Fetch all sessions for org
  const {
    data: sessions = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase.rpc('get_org_streaming_sessions', {
        p_organization_id: organizationId,
      });

      if (error) {
        console.error('[useStreamingSession] Error fetching sessions:', error);
        throw error;
      }

      return (data || []) as StreamingSession[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });

  // Current session (with full details)
  const currentSession = useMemo(() => {
    if (!currentSessionId) return null;
    return sessions.find((s) => s.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`streaming-sessions-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streaming_sessions_v2',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('[useStreamingSession] Realtime update:', payload.eventType);
          // Invalidate query to refetch
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateSessionInput): Promise<StreamingSession> => {
      if (!organizationId || !profile?.id) {
        throw new Error('No organization or user');
      }

      const { data, error } = await supabase
        .from('streaming_sessions_v2')
        .insert({
          organization_id: organizationId,
          host_user_id: profile.id,
          title: input.title,
          description: input.description,
          session_type: input.session_type,
          scheduled_at: input.scheduled_at,
          is_shopping_enabled: input.is_shopping_enabled,
          client_id: input.client_id,
          product_id: input.product_id,
          campaign_id: input.campaign_id,
          stream_settings: input.stream_settings || {
            resolution: '1080p',
            fps: 30,
            bitrate: 6000,
            encoder: 'browser',
            audio_bitrate: 128,
            latency_mode: 'normal',
          },
          status: input.scheduled_at ? 'scheduled' : 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Add channels to session
      if (input.channel_ids.length > 0) {
        const channelInserts = input.channel_ids.map((channel_id) => ({
          session_id: data.id,
          channel_id,
        }));

        await supabase.from('streaming_session_channels_v2').insert(channelInserts);
      }

      return data as StreamingSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Sesión creada', description: 'La sesión de streaming fue creada exitosamente' });
    },
    onError: (error) => {
      console.error('[useStreamingSession] Create error:', error);
      toast({ title: 'Error', description: 'No se pudo crear la sesión', variant: 'destructive' });
    },
  });

  // Update session mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StreamingSession> }) => {
      const { error } = await supabase
        .from('streaming_sessions_v2')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
    onError: (error) => {
      console.error('[useStreamingSession] Update error:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar la sesión', variant: 'destructive' });
    },
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('streaming_sessions_v2').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({ title: 'Eliminada', description: 'La sesión fue eliminada' });
    },
    onError: (error) => {
      console.error('[useStreamingSession] Delete error:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar la sesión', variant: 'destructive' });
    },
  });

  // Status change helpers
  const changeStatus = useCallback(
    async (id: string, status: StreamingSessionStatus, extraUpdates: Partial<StreamingSession> = {}) => {
      await updateMutation.mutateAsync({
        id,
        updates: { status, ...extraUpdates },
      });
    },
    [updateMutation]
  );

  const startSession = useCallback(
    async (id: string) => {
      await changeStatus(id, 'live', { started_at: new Date().toISOString() });
      toast({ title: '¡En Vivo!', description: 'La transmisión ha comenzado' });
    },
    [changeStatus, toast]
  );

  const pauseSession = useCallback(
    async (id: string) => {
      await changeStatus(id, 'paused');
      toast({ title: 'Pausado', description: 'La transmisión está en pausa' });
    },
    [changeStatus, toast]
  );

  const endSession = useCallback(
    async (id: string) => {
      await changeStatus(id, 'ended', { ended_at: new Date().toISOString() });
      toast({ title: 'Finalizado', description: 'La transmisión ha terminado' });
    },
    [changeStatus, toast]
  );

  const setCurrentSession = useCallback((id: string | null) => {
    setCurrentSessionId(id);
  }, []);

  return {
    sessions,
    currentSession,
    loading,
    error: error as Error | null,
    createSession: createMutation.mutateAsync,
    updateSession: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteSession: deleteMutation.mutateAsync,
    startSession,
    pauseSession,
    endSession,
    setCurrentSession,
  };
}

export default useStreamingSession;
