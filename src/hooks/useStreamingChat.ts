/**
 * useStreamingChat - Chat unificado multi-plataforma para streaming v2
 * Suscripción Realtime + envío + moderación
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  StreamingChatMessage,
  StreamingChatMessageType,
  UseStreamingChatReturn,
} from '@/types/streaming.types';

const QUERY_KEY = 'streaming-chat-v2';
const MESSAGES_LIMIT = 200;

interface UseStreamingChatOptions {
  sessionId: string | null;
}

export function useStreamingChat({ sessionId }: UseStreamingChatOptions): UseStreamingChatReturn {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  // Fetch recent messages
  const {
    data: allMessages = [],
    isLoading: loading,
  } = useQuery({
    queryKey: [QUERY_KEY, sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('streaming_chat_messages_v2')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_LIMIT);

      if (error) throw error;
      return (data || []).reverse() as StreamingChatMessage[];
    },
    enabled: !!sessionId,
    staleTime: 0, // Always fresh for chat
    refetchInterval: false, // Use realtime instead
  });

  // Filter messages by platform
  const messages = useMemo(() => {
    if (!platformFilter) return allMessages;
    return allMessages.filter((m) => m.source_platform === platformFilter);
  }, [allMessages, platformFilter]);

  // Pinned messages
  const pinnedMessages = useMemo(() => {
    return allMessages.filter((m) => m.is_pinned);
  }, [allMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`streaming-chat-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'streaming_chat_messages_v2',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as StreamingChatMessage;
          queryClient.setQueryData<StreamingChatMessage[]>(
            [QUERY_KEY, sessionId],
            (old = []) => {
              // Avoid duplicates
              if (old.some((m) => m.id === newMessage.id)) return old;
              // Keep only last N messages
              const updated = [...old, newMessage];
              if (updated.length > MESSAGES_LIMIT) {
                return updated.slice(-MESSAGES_LIMIT);
              }
              return updated;
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'streaming_chat_messages_v2',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as StreamingChatMessage;
          queryClient.setQueryData<StreamingChatMessage[]>(
            [QUERY_KEY, sessionId],
            (old = []) => old.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      type = 'text',
    }: {
      content: string;
      type?: StreamingChatMessageType;
    }) => {
      if (!sessionId || !profile?.id) throw new Error('No session or user');

      const { error } = await supabase.from('streaming_chat_messages_v2').insert({
        session_id: sessionId,
        user_id: profile.id,
        author_name: profile.full_name || 'Usuario',
        author_avatar_url: profile.avatar_url,
        source_platform: 'kreoon',
        message_type: type,
        content,
        is_host: true, // TODO: Check if user is host
      });

      if (error) throw error;
    },
    onError: (error) => {
      console.error('[useStreamingChat] Send error:', error);
      toast({ title: 'Error', description: 'No se pudo enviar el mensaje', variant: 'destructive' });
    },
  });

  // Pin message
  const pinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('streaming_chat_messages_v2')
        .update({ is_pinned: true, pinned_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    },
  });

  // Unpin message
  const unpinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('streaming_chat_messages_v2')
        .update({ is_pinned: false, pinned_at: null })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    },
  });

  // Hide message (moderation)
  const hideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('streaming_chat_messages_v2')
        .update({ is_hidden: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    },
  });

  // Unhide message
  const unhideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('streaming_chat_messages_v2')
        .update({ is_hidden: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    },
  });

  // Clear chat (hide all)
  const clearChat = useCallback(async () => {
    if (!sessionId) return;

    const { error } = await supabase
      .from('streaming_chat_messages_v2')
      .update({ is_hidden: true })
      .eq('session_id', sessionId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo limpiar el chat', variant: 'destructive' });
      return;
    }

    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, sessionId] });
    toast({ title: 'Chat limpiado', description: 'Todos los mensajes fueron ocultados' });
  }, [sessionId, queryClient, toast]);

  const filterByPlatform = useCallback((platform: string | null) => {
    setPlatformFilter(platform);
  }, []);

  return {
    messages,
    pinnedMessages,
    loading,
    sendMessage: (content, type) => sendMutation.mutateAsync({ content, type }),
    pinMessage: pinMutation.mutateAsync,
    unpinMessage: unpinMutation.mutateAsync,
    hideMessage: hideMutation.mutateAsync,
    unhideMessage: unhideMutation.mutateAsync,
    clearChat,
    filterByPlatform,
  };
}

export default useStreamingChat;
