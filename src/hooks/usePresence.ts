import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/board': 'Tablero',
  '/content': 'Contenido',
  '/creators': 'Creadores',
  '/scripts': 'Guiones IA',
  '/clients': 'Clientes',
  '/team': 'Equipo',
  '/settings': 'Configuración',
  '/portfolio': 'Portafolio',
  '/social': 'Red Social',
  '/creator-dashboard': 'Dashboard Creador',
  '/editor-dashboard': 'Dashboard Editor',
  '/strategist-dashboard': 'Dashboard Estratega',
  '/client-dashboard': 'Dashboard Cliente',
};

export function usePresence() {
  const { user } = useAuth();
  const location = useLocation();
  const lastActivityRef = useRef<number>(Date.now());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  const getPageName = useCallback((pathname: string) => {
    return PAGE_NAMES[pathname] || pathname;
  }, []);

  const updatePresence = useCallback(async (isOnline: boolean, currentPage?: string) => {
    if (!user?.id || isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    try {
      // Use upsert to avoid race conditions
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          current_page: currentPage || getPageName(location.pathname),
          last_activity: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });
    } catch (error) {
      // Silently ignore presence errors to not affect UX
      console.debug('Presence update skipped:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [user?.id, location.pathname, getPageName]);

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Set online when component mounts (debounced)
    const initTimeout = setTimeout(() => updatePresence(true), 1000);

    // Listen to user activity (throttled)
    let activityThrottle: NodeJS.Timeout | null = null;
    const throttledActivity = () => {
      if (activityThrottle) return;
      handleActivity();
      activityThrottle = setTimeout(() => {
        activityThrottle = null;
      }, 5000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, throttledActivity, { passive: true }));

    // Update presence less frequently (every 60 seconds instead of 30)
    updateIntervalRef.current = setInterval(() => {
      const isActive = Date.now() - lastActivityRef.current < 120000; // 2 minutes
      updatePresence(isActive, getPageName(location.pathname));
    }, 60000);

    return () => {
      clearTimeout(initTimeout);
      if (activityThrottle) clearTimeout(activityThrottle);
      events.forEach(event => window.removeEventListener(event, throttledActivity));
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [user?.id, updatePresence, handleActivity, getPageName, location.pathname]);

  // Update when page changes (debounced)
  useEffect(() => {
    if (!user?.id) return;
    const timeout = setTimeout(() => {
      updatePresence(true, getPageName(location.pathname));
    }, 500);
    return () => clearTimeout(timeout);
  }, [location.pathname, user?.id, updatePresence, getPageName]);

  return { updatePresence };
}
