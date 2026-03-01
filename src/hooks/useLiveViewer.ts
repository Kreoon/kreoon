/**
 * useLiveViewer - Hook para viewers de streams en vivo
 * Gestiona reproducción, chat, reacciones y métricas
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  LiveStreamWithCreator,
  LiveStreamComment,
  ReactionType,
} from '@/types/live-streaming.types';

// Generar session ID único para tracking
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

interface UseLiveViewerReturn {
  // Stream info
  stream: LiveStreamWithCreator | null;
  isLoading: boolean;
  error: Error | null;

  // Playback
  playbackUrl: string | null;
  playbackUrlWebrtc: string | null;

  // Chat
  comments: LiveStreamComment[];
  sendComment: (message: string) => Promise<void>;
  isSendingComment: boolean;

  // Reactions
  sendReaction: (type: ReactionType) => Promise<void>;
  recentReactions: { id: string; type: ReactionType; x: number }[];

  // Métricas
  viewerCount: number;
  likeCount: number;

  // Session
  joinStream: () => Promise<void>;
  leaveStream: () => Promise<void>;
  isJoined: boolean;
}

export function useLiveViewer(
  streamId?: string,
  creatorSlug?: string
): UseLiveViewerReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [comments, setComments] = useState<LiveStreamComment[]>([]);
  const [recentReactions, setRecentReactions] = useState<
    { id: string; type: ReactionType; x: number }[]
  >([]);
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sessionIdRef = useRef<string>(generateSessionId());
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query para obtener info del stream
  const { data: stream, isLoading } = useQuery({
    queryKey: ['live-stream', streamId, creatorSlug],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('cloudflare-live-service', {
        body: {
          action: 'get-public-stream',
          streamId,
          creatorSlug,
        },
      });

      if (error) throw error;
      return data.stream as LiveStreamWithCreator | null;
    },
    enabled: !!(streamId || creatorSlug),
    refetchInterval: 30000, // Refrescar cada 30s para métricas
  });

  // Cargar comentarios iniciales
  useEffect(() => {
    if (!stream?.id) return;

    const loadComments = async () => {
      const { data, error } = await supabase
        .from('live_stream_comments')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq('stream_id', stream.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        const formatted = data.map((c) => ({
          ...c,
          user_name: (c.profiles as { full_name?: string })?.full_name || 'Anónimo',
          user_avatar: (c.profiles as { avatar_url?: string })?.avatar_url,
        }));
        setComments(formatted.reverse());
      }
    };

    loadComments();
  }, [stream?.id]);

  // Suscribirse a comentarios en tiempo real
  useEffect(() => {
    if (!stream?.id) return;

    const channel = supabase
      .channel(`live-comments-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_comments',
          filter: `stream_id=eq.${stream.id}`,
        },
        async (payload) => {
          const newComment = payload.new as LiveStreamComment;

          // Obtener info del usuario
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newComment.user_id)
            .single();

          setComments((prev) => [
            ...prev,
            {
              ...newComment,
              user_name: profile?.full_name || 'Anónimo',
              user_avatar: profile?.avatar_url,
            },
          ].slice(-100)); // Mantener últimos 100
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id]);

  // Suscribirse a reacciones en tiempo real
  useEffect(() => {
    if (!stream?.id) return;

    const channel = supabase
      .channel(`live-reactions-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_stream_reactions',
          filter: `stream_id=eq.${stream.id}`,
        },
        (payload) => {
          const reaction = payload.new as { id: string; reaction_type: ReactionType };

          // Agregar reacción flotante con posición aleatoria
          const newReaction = {
            id: reaction.id,
            type: reaction.reaction_type,
            x: Math.random() * 80 + 10, // 10-90%
          };

          setRecentReactions((prev) => [...prev, newReaction]);

          // Remover después de la animación
          setTimeout(() => {
            setRecentReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id]);

  // Suscribirse a actualizaciones del stream (viewers, likes)
  useEffect(() => {
    if (!stream?.id) return;

    const channel = supabase
      .channel(`live-stream-updates-${stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'creator_live_streams',
          filter: `id=eq.${stream.id}`,
        },
        () => {
          // Refrescar query para obtener métricas actualizadas
          queryClient.invalidateQueries({ queryKey: ['live-stream', streamId, creatorSlug] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stream?.id, streamId, creatorSlug, queryClient]);

  // Join stream
  const joinStream = useCallback(async () => {
    if (!stream?.id || isJoined) return;

    try {
      const { error } = await supabase.from('live_stream_viewers').insert({
        stream_id: stream.id,
        user_id: user?.id || null,
        session_id: sessionIdRef.current,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent)
          ? 'mobile'
          : 'desktop',
      });

      if (error && error.code !== '23505') {
        // Ignorar duplicados
        throw error;
      }

      setIsJoined(true);

      // Iniciar ping cada 30 segundos
      pingIntervalRef.current = setInterval(async () => {
        await supabase.rpc('ping_live_viewer', {
          p_stream_id: stream.id,
          p_session_id: sessionIdRef.current,
        });
      }, 30000);
    } catch (err) {
      console.error('Error joining stream:', err);
    }
  }, [stream?.id, user?.id, isJoined]);

  // Leave stream
  const leaveStream = useCallback(async () => {
    if (!stream?.id || !isJoined) return;

    try {
      // Detener ping
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Marcar como salido
      await supabase
        .from('live_stream_viewers')
        .update({ left_at: new Date().toISOString() })
        .eq('stream_id', stream.id)
        .eq('session_id', sessionIdRef.current);

      setIsJoined(false);
    } catch (err) {
      console.error('Error leaving stream:', err);
    }
  }, [stream?.id, isJoined]);

  // Auto-join al montar y leave al desmontar
  useEffect(() => {
    if (stream?.id && stream.status === 'live') {
      joinStream();
    }

    return () => {
      leaveStream();
    };
  }, [stream?.id, stream?.status]);

  // Send comment mutation
  const sendCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!stream?.id || !user?.id) {
        throw new Error('Debes iniciar sesión para comentar');
      }

      const { error } = await supabase.from('live_stream_comments').insert({
        stream_id: stream.id,
        user_id: user.id,
        message,
      });

      if (error) throw error;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Error al enviar comentario');
    },
  });

  const sendComment = useCallback(
    async (message: string) => {
      await sendCommentMutation.mutateAsync(message);
    },
    [sendCommentMutation]
  );

  // Send reaction
  const sendReaction = useCallback(
    async (type: ReactionType) => {
      if (!stream?.id) return;

      try {
        await supabase.from('live_stream_reactions').insert({
          stream_id: stream.id,
          user_id: user?.id || null,
          session_id: sessionIdRef.current,
          reaction_type: type,
        });
      } catch (err) {
        console.error('Error sending reaction:', err);
      }
    },
    [stream?.id, user?.id]
  );

  return {
    stream: stream || null,
    isLoading,
    error,
    playbackUrl: stream?.cf_playback_url || null,
    playbackUrlWebrtc: stream?.cf_playback_url_webrtc || null,
    comments,
    sendComment,
    isSendingComment: sendCommentMutation.isPending,
    sendReaction,
    recentReactions,
    viewerCount: stream?.current_viewers || 0,
    likeCount: stream?.total_likes || 0,
    joinStream,
    leaveStream,
    isJoined,
  };
}

// ============================================================================
// HOOK PARA VERIFICAR SI CREADOR ESTÁ EN VIVO
// ============================================================================

export function useIsCreatorLive(userId?: string) {
  return useQuery({
    queryKey: ['is-creator-live', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('is_creator_live', {
        p_user_id: userId,
      });

      if (error) return false;
      return data as boolean;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
