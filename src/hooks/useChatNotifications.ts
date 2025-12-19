import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const permissionRef = useRef<NotificationPermission>('default');

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

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if (permissionRef.current !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'chat-message',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }, []);

  // Show in-app toast notification
  const showToastNotification = useCallback((senderName: string, message: string) => {
    toast({
      title: `💬 ${senderName}`,
      description: message.length > 50 ? `${message.substring(0, 50)}...` : message,
      duration: 4000,
    });
  }, [toast]);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

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

            // Skip if chat is open and viewing this conversation
            if (isChatOpen && activeConversationId === newMessage.conversation_id) return;

            // Fetch sender profile
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = sender?.full_name || 'Nuevo mensaje';

            // Show browser notification if tab is not focused
            if (document.hidden) {
              showBrowserNotification(
                senderName,
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
  }, [user?.id, isChatOpen, activeConversationId, showBrowserNotification, showToastNotification]);

  return { requestPermission };
}
