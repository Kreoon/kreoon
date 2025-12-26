import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Content } from '@/types/database';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}

/**
 * Hook that subscribes to real-time updates for client content.
 * Automatically refreshes content when changes occur without requiring manual refresh.
 */
export function useClientRealtimeContent(
  clientId: string | null,
  onContentChange: (updatedContent?: Content) => void,
  onCommentChange?: () => void
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const setupChannel = useCallback(() => {
    if (!clientId) return;

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`client-content-realtime-${clientId}`)
      // Listen to content changes (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
          filter: `client_id=eq.${clientId}`
        },
        (payload: RealtimePayload) => {
          console.log('[Realtime] Content change:', payload.eventType);
          // Trigger refresh - the parent component will refetch
          onContentChange(payload.new as Content | undefined);
        }
      )
      // Listen to comment changes for this client's content
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_comments'
        },
        async (payload: RealtimePayload) => {
          // Verify this comment is for content belonging to our client
          const contentId = payload.new?.content_id;
          if (!contentId) return;

          const { data: content } = await supabase
            .from('content')
            .select('client_id')
            .eq('id', contentId)
            .single();

          if (content?.client_id === clientId) {
            console.log('[Realtime] Comment added to client content');
            onCommentChange?.();
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Client content subscription:', status);
      });

    channelRef.current = channel;
  }, [clientId, onContentChange, onCommentChange]);

  useEffect(() => {
    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [setupChannel]);

  return null;
}

/**
 * Hook for real-time notifications updates
 */
export function useRealtimeNotifications(
  userId: string | null,
  onNotificationChange: () => void
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[Realtime] New notification');
          onNotificationChange();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          onNotificationChange();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, onNotificationChange]);

  return null;
}
