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

// Register custom service worker for push notifications
const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  const sw = getServiceWorker();
  if (!sw) {
    console.log('[Notifications] Service workers not supported');
    return null;
  }

  try {
    // Register custom SW from public folder
    const registration = await sw.register('/sw.js', {
      scope: '/'
    });
    console.log('[Notifications] Service worker registered:', registration.scope);
    
    // Wait for it to be ready
    await sw.ready;
    return registration;
  } catch (error) {
    console.error('[Notifications] SW registration failed:', error);
    return null;
  }
};

// Get service worker container safely
const getServiceWorker = (): ServiceWorkerContainer | null => {
  if (typeof window !== 'undefined' && 'serviceWorker' in window.navigator) {
    return window.navigator.serviceWorker;
  }
  return null;
};

// Set app badge count
const setAppBadge = async (count: number) => {
  try {
    // Try native Badge API first (works on supported browsers/PWAs)
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
      console.log('[Badge] Set to:', count);
      return;
    }

    // Fallback: send to service worker
    const sw = getServiceWorker();
    if (sw) {
      const registration = await sw.ready;
      registration.active?.postMessage({
        type: count > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
        count
      });
    }
  } catch (error) {
    console.warn('[Badge] Could not set badge:', error);
  }
};

// Show notification via service worker (works in background)
const showPushNotification = async (title: string, body: string, tag?: string) => {
  try {
    const sw = getServiceWorker();
    if (!sw) {
      throw new Error('Service worker not available');
    }
    
    const registration = await sw.ready;
    
    // Send message to SW to show notification
    registration.active?.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      tag: tag || 'chat-' + Date.now(),
      data: { url: '/' }
    });

    console.log('[Notifications] Sent to SW:', title);
  } catch (error) {
    console.warn('[Notifications] Could not show via SW:', error);
    
    // Fallback to regular Notification API
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: tag || 'chat-' + Date.now()
      });
    }
  }
};

export function useChatNotifications(
  isChatOpen: boolean,
  activeConversationId?: string | null
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { playChatSound } = useNotificationSound();
  const [unreadCount, setUnreadCount] = useState(0);
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const hasRequestedPermission = useRef(false);

  // Request notification permission and register SW
  const requestPermission = useCallback(async () => {
    if (hasRequestedPermission.current) return Notification.permission === 'granted';
    hasRequestedPermission.current = true;

    if (!('Notification' in window)) {
      console.log('[Notifications] Not supported in this browser');
      return false;
    }

    // Request permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      // Register our custom service worker
      swRegistration.current = await registerServiceWorker();
      console.log('[Notifications] Permission granted, SW ready');
      return true;
    }

    return false;
  }, []);

  // Show in-app toast notification
  const showToastNotification = useCallback((senderName: string, message: string) => {
    toast({
      title: `💬 Nuevo mensaje de ${senderName}`,
      description: message.length > 80 ? `${message.substring(0, 80)}...` : message,
      duration: 8000,
    });
  }, [toast]);

  // Initialize on mount
  useEffect(() => {
    requestPermission();
    
    // Listen for SW notification clicks
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        window.focus();
      }
    };

    const sw = getServiceWorker();
    if (sw) {
      sw.addEventListener('message', handleMessage);
    }

    return () => {
      const sw = getServiceWorker();
      if (sw) {
        sw.removeEventListener('message', handleMessage);
      }
    };
  }, [requestPermission]);

  // Update badge when unread count changes
  useEffect(() => {
    setAppBadge(unreadCount);
  }, [unreadCount]);

  // Fetch initial unread count
  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);

      if (!participations?.length) {
        setUnreadCount(0);
        return;
      }

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

  // Subscribe to new messages
  useEffect(() => {
    if (!user?.id) return;

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

            // Skip if from current user
            if (newMessage.sender_id === user.id) return;

            // Skip if not in our conversations
            if (!conversationIds.includes(newMessage.conversation_id)) return;

            // Increment unread count if not viewing this conversation
            if (!isChatOpen || activeConversationId !== newMessage.conversation_id) {
              setUnreadCount(prev => prev + 1);
            }

            // Skip notifications if viewing this conversation
            if (isChatOpen && activeConversationId === newMessage.conversation_id) return;

            // Play sound - works even in background with our audio implementation
            playChatSound();

            // Fetch sender name
            const { data: sender } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMessage.sender_id)
              .single();

            const senderName = sender?.full_name || 'Usuario';

            // Show push notification via service worker (works in background!)
            await showPushNotification(
              `💬 ${senderName}`,
              newMessage.content,
              `chat-${newMessage.conversation_id}`
            );

            // Also show toast if window is visible
            if (!document.hidden) {
              showToastNotification(senderName, newMessage.content);
            }
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
  }, [user?.id, isChatOpen, activeConversationId, showToastNotification, playChatSound]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (isChatOpen && activeConversationId && user?.id) {
      const markAllAsRead = async () => {
        const now = new Date().toISOString();
        
        // Update participant's last_read_at
        await supabase
          .from('chat_participants')
          .update({ last_read_at: now })
          .eq('conversation_id', activeConversationId)
          .eq('user_id', user.id);
        
        // Mark all unread messages as read (for read receipts)
        await supabase
          .from('chat_messages')
          .update({ read_at: now })
          .eq('conversation_id', activeConversationId)
          .neq('sender_id', user.id)
          .is('read_at', null);
        
        // Recalculate total unread count
        const { data: participations } = await supabase
          .from('chat_participants')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id);

        if (participations?.length) {
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
        } else {
          setUnreadCount(0);
        }
      };
      
      markAllAsRead();
    }
  }, [isChatOpen, activeConversationId, user?.id]);

  return { requestPermission, unreadCount };
}
