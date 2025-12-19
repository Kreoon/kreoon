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

  const getPageName = useCallback((pathname: string) => {
    return PAGE_NAMES[pathname] || pathname;
  }, []);

  const updatePresence = useCallback(async (isOnline: boolean, currentPage?: string) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('user_presence')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const presenceData = {
        user_id: user.id,
        is_online: isOnline,
        current_page: currentPage || getPageName(location.pathname),
        last_activity: new Date().toISOString(),
        last_seen: isOnline ? new Date().toISOString() : undefined
      };

      if (existing) {
        await supabase
          .from('user_presence')
          .update(presenceData)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_presence')
          .insert(presenceData);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user?.id, location.pathname, getPageName]);

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Set online when component mounts
    updatePresence(true);

    // Listen to user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    // Update presence periodically
    updateIntervalRef.current = setInterval(() => {
      const isActive = Date.now() - lastActivityRef.current < 60000; // 1 minute
      updatePresence(isActive, getPageName(location.pathname));
    }, 30000); // Every 30 seconds

    // Set offline when leaving
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline update
      const data = JSON.stringify({
        user_id: user.id,
        is_online: false,
        last_seen: new Date().toISOString()
      });
      navigator.sendBeacon && navigator.sendBeacon('/api/presence-offline', data);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      updatePresence(false);
    };
  }, [user?.id, updatePresence, handleActivity, getPageName, location.pathname]);

  // Update when page changes
  useEffect(() => {
    if (user?.id) {
      updatePresence(true, getPageName(location.pathname));
    }
  }, [location.pathname, user?.id, updatePresence, getPageName]);

  return { updatePresence };
}
