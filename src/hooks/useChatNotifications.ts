import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from './useNotificationSound';

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export function useChatNotifications(
  isChatOpen: boolean,
  activeConversationId?: string | null
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playChatSound } = useNotificationSound();
  const permissionRef = useRef<NotificationPermission>('default');
  const [unreadCount, setUnreadCount] = useState(0);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  // Show browser notification with enhanced options
  const showBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if (permissionRef.current !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'chat-message-' + Date.now(),
        requireInteraction: true,
        silent: false, // Allow system sound
        vibrate: [200, 100, 200], // Vibration pattern for mobile
      } as NotificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
        onClick?.();
      };

      // Auto-close after 15 seconds
      setTimeout(() => notification.close(), 15000);
    } catch (error) {
      console.warn('Could not show notification:', error);
    }
  }, []);

  // Show in-app toast notification
  const showToastNotification = useCallback((senderName: string, message: string) => {
    toast({
      title: `💬 Nuevo mensaje de ${senderName}`,
      description: message.length > 80 ? `${message.substring(0, 80)}...` : message,
      duration: 6000,
    });
  }, [toast]);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Fetch initial unread count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      // Get conversations where user is participant
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participations?.length) return;

      let totalUnread = 0;

      for (const p of participations) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .neq('sender_id', user.id)
          .gt('created_at', p.last_read_at || '1970-01-01');

        totalUnread += count || 0;
      }

      setUnreadCount(totalUnread);
    };

    fetchUnreadCount();
  }, [user?.id]);

  // Subscribe to ALL new messages for this user
  useEffect(() => {
    if (!user?.id) return;

    // Get all conversations this user participates in
    const setupSubscription = async () => {
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participations?.length) return;

      const conversationIds = participations.map(p => p.conversation_id);

      const channel = supabase
        .channel('global-chat-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          async (payload) => {
            const newMessage = payload.new as ChatMessage;

            // Skip if it's from the current user
            if (newMessage.sender_id === user.id) return;

            // Skip if it's not in our conversations
            if (!conversationIds.includes(newMessage.conversation_id)) return;

            // Increment unread count
            if (!isChatOpen || activeConversationId !== newMessage.conversation_id) {
              setUnreadCount(prev => prev + 1);
            }

            // Skip toast if chat is open and viewing this conversation
            if (isChatOpen && activeConversationId === newMessage.conversation_id) return;

            // Play sound
            playChatSound();

            // Fetch sender profile
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = sender?.full_name || 'Usuario';

            // Show browser notification if tab is not focused
            if (document.hidden) {
              showBrowserNotification(
                `💬 ${senderName}`,
                newMessage.content
              );
            }

            // Always show toast notification if chat is not focused on this conversation
            showToastNotification(senderName, newMessage.content);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();
    
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [user?.id, isChatOpen, activeConversationId, showBrowserNotification, showToastNotification, playChatSound]);

  // Reset unread count when viewing a conversation
  useEffect(() => {
    if (isChatOpen && activeConversationId) {
      // Mark messages as read
      const markAsRead = async () => {
        await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', activeConversationId)
          .eq('user_id', user?.id);
      };
      
      markAsRead();
      // Refetch unread count after a short delay
      setTimeout(() => {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }, 500);
    }
  }, [isChatOpen, activeConversationId, user?.id]);

  return { requestPermission, unreadCount };
}