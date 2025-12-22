import { useCallback, useEffect, useState } from 'react';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
    }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
      }
      
      console.log('Notification permission denied');
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [state.isSupported]);

  const showNotification = useCallback(async (
    title: string,
    options?: NotificationOptions & { onClick?: () => void }
  ) => {
    if (state.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      // Try to use service worker notification for better mobile support
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready;
        // Use type assertion for extended notification options
        const notificationOptions = {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          requireInteraction: true,
          tag: options?.tag || 'default-' + Date.now(),
          ...options,
        };
        await registration.showNotification(title, notificationOptions);
        // Vibrate separately for mobile support
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        return null;
      }

      // Fallback to regular notification
      const notification = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        requireInteraction: true,
        ...options,
      });

      if (options?.onClick) {
        notification.onclick = () => {
          window.focus();
          notification.close();
          options.onClick?.();
        };
      }

      // Auto-close after 20 seconds
      setTimeout(() => notification.close(), 20000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [state.permission]);

  const showChatNotification = useCallback(async (
    senderName: string,
    message: string,
    conversationId?: string
  ) => {
    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    return showNotification(`💬 ${senderName}`, {
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      tag: `chat-${conversationId || Date.now()}`,
      data: { conversationId },
      onClick: () => {
        // Focus on chat when notification is clicked
        window.focus();
      },
    });
  }, [showNotification]);

  const showGeneralNotification = useCallback(async (
    title: string,
    message: string,
    link?: string
  ) => {
    // Vibrate device if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([150, 50, 150]);
    }

    return showNotification(title, {
      body: message,
      tag: `notification-${Date.now()}`,
      data: { link },
      onClick: () => {
        window.focus();
        if (link) {
          window.location.href = link;
        }
      },
    });
  }, [showNotification]);

  return {
    ...state,
    requestPermission,
    showNotification,
    showChatNotification,
    showGeneralNotification,
  };
}
