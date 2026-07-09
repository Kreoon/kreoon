import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  /** true si es iOS y la app NO esta instalada como PWA — Web Push en iOS requiere instalacion previa (iOS 16.4+) */
  needsIOSInstall: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    needsIOSInstall: false,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    const needsIOSInstall = isIOSDevice() && !isStandalonePWA();
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
      needsIOSInstall,
    }));

    if (!isSupported || needsIOSInstall) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(prev => ({ ...prev, isSubscribed: !!subscription })))
      .catch(() => {});
  }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user?.id) return false;

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidPublicKey) {
      console.error('VITE_VAPID_PUBLIC_KEY not configured');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth_key: json.keys.auth,
          user_agent: navigator.userAgent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: true }));
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    }
  }, [state.isSupported, user?.id]);

  const unsubscribeFromPush = useCallback(async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState(prev => ({ ...prev, isSubscribed: false }));
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
    }
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

  const showGeneralNotification = useCallback(async (
    title: string,
    message: string,
    link?: string,
    onNavigate?: (link: string) => void
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
        if (link && onNavigate) {
          onNavigate(link);
        }
      },
    });
  }, [showNotification]);

  return {
    ...state,
    requestPermission,
    showNotification,
    showGeneralNotification,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
