// Custom Service Worker for Push Notifications and Badge
const CACHE_NAME = 'ugc-colombia-v1';

// Notification sounds as base64 - short beep sound
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleCoRQZnW0spvHgA+m9TQ0GYkBjqW09LMZSMFOpXS0c5oJAQ5ldLR0GojBDmV0tHQaiMEOZXS0dBqIwQ5ldLR0GojBDmV0tHQaiMEOZXS0dBqIwQ5ldLR0GojBDmU0dHQaiMEOZTS0dBqIwQ5lNHR0GojBDmU0dHQaiMEOZTR0dBqIwQ5lNHR0GojBDmU0dHQaiMEOZTR0dBqIwQ5lNHR0GojBDmU0dHQaiMEOZTR0dBqIwQ5lNHR0GojBDmU0dHQaiMEOZTR0c9qIwQ5lNHRz2ojBDmU0dHPaiMEOZTR0c9qIwQ5lNHRz2ojBDmU0dHPaiMEOZTR0c9qIwQ5lNHRz2ojBDmU0dHPaiMEOZTR0c9qIwQ5lNHRz2ojBDmU0dHPaiMEOZTR0c9qIwQ5lNHRz2ojBDmU0dHPaiMEOZTQ0c9qIwQ5lNDRz2ojBDmU0NHPaiMEOZTQ0c9qIwQ5lNDRz2ojBDmU0NHPaiMEOZTQ0c9qIwQ5lNDRz2ojBDmU0NHPaiMEOZTQ0c9qIwQ5lNDRz2ojBDmU0NHPaiMEOZTQ0c9qIwQ5lNDRz2ojBDmU0NHPaiMEOZTQ0c5qIwQ5lNDRzWojBDmU0NHMaiMEOZTQ0cxqIwQ5lNDRy2ojBDmU0NHKaiMEOZTQ0clqIwQ5lNDRyGkjBDmU0NHHaSMEOZTQ0cZpIwQ5lNDRxWkjBDmU0NHEaCMEOZTP0cNoIwQ5lM7RwWgjBDmUzdG/aCIEOZTM0b5nIgQ5k8vRvGciBDmTytG6ZyIEOZPJ0bhnIgQ5k8jRtmciBDmTx9GzZyIEOZPG0bFnIgQ5k8XRr2YiBDmTxNGtZiIEOZLC0atmIgQ5ksHRqWUiBDmSwNGnZSIEOZK+0aVlIgQ5kr3Ro2UiBDmSvNGhZCIEOZK60Z9kIgQ5krnRnWMiBDmSt9GbYyIEOZK20ZljIgQ5krTRl2MiBDmSs9GVYiIEOZKx0ZNiIgQ5kq/RkWEiBDmSrtGPYSIEOZKs0Y1hIgQ5kqrRi2AiBDmSqNGJYCIEOZKm0YdgIgQ5kqTRhV8iBDmSotGDXyIEOZKg0YBfIgQ5kp7RfV4iBDmSnNF7XiIEOZKa0XldIgQ5kpjRdl0iBDmSltF0XCIEOZKUKdFxXCIEOZKSKc9uXCIEOZKQKcxsWyIEOZKOKcppWyIEOZKLKcdnWiIEOZKJKcRlWiIEOZKGKcBjWSIEOZKEKb1hWSIEOZKBKbpfWCIEOZJ+KbddVyIEOZJ7KbRbVyIEOZJ4KbFZViIEOZJ1Ka5XViIEOZJyKapVVSIEOZJvKadTVSIEOZJsKaRRVCIEOZJpKaFPVCIEOZJmKZ1NUyIEOZJjKZpLUyIEOZJfKZdJUiIEOZJcKZRHUiIEOZJZKZBFUSIEOQ==';

// Handle push events - THIS IS THE KEY FOR BACKGROUND NOTIFICATIONS
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let data = {
    title: 'Nuevo mensaje',
    body: 'Tienes un nuevo mensaje',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'chat-' + Date.now(),
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    console.log('[SW] Could not parse push data:', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: urlToOpen });
          return client.focus();
        }
      }
      // If no window is open, open one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data?.type);
  
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag || 'chat-' + Date.now(),
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: data || { url: '/' },
      actions: [
        { action: 'open', title: 'Abrir' },
        { action: 'close', title: 'Cerrar' }
      ]
    });
  }

  if (event.data?.type === 'SET_BADGE') {
    const count = event.data.count || 0;
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(console.error);
      } else {
        navigator.clearAppBadge().catch(console.error);
      }
    }
  }

  if (event.data?.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(console.error);
    }
  }
});

// Handle install
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed');
  self.skipWaiting();
});

// Handle activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        );
      })
    ])
  );
});
