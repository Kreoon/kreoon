import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// FASE5 Bloque B: sin handler de beforeunload/visibilitychange, is_online
// quedaba en true para siempre si el usuario cerraba la pestaña en vez de
// navegar dentro de la app (solo se corregia la proxima vez que volviera a
// abrirla). visibilitychange es la señal principal y confiable (se dispara
// tanto al cambiar de pestaña como justo antes de cerrarla, y no depende del
// back-forward-cache como beforeunload). No se usa sendBeacon: Supabase
// REST exige headers de auth (apikey/Authorization) que sendBeacon no
// puede adjuntar, asi que un beacon aca fallaria siempre por RLS sin que
// se notara -- peor que no tenerlo. beforeunload queda como intento
// adicional best-effort con el mismo cliente autenticado.

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/board': 'Tablero',
  '/content': 'Contenido',
  '/creators': 'Creadores',
  '/scripts': 'Guiones IA',
  '/clients': 'Clientes',
  '/team': 'Equipo',
  '/settings': 'Configuración',
  '/marketplace': 'Marketplace',
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
  const pathnameRef = useRef(location.pathname);

  // Keep pathname ref updated
  pathnameRef.current = location.pathname;

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
          current_page: currentPage || getPageName(pathnameRef.current),
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
  }, [user?.id, getPageName]);

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Main effect for event listeners and interval - stable dependencies
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
      updatePresence(isActive, getPageName(pathnameRef.current));
    }, 60000);

    // Marcar offline al salir (tab oculta o cierre real) — antes quedaba
    // is_online=true indefinidamente si el usuario cerraba la pestaña.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updatePresence(false);
      } else {
        updatePresence(true, getPageName(pathnameRef.current));
      }
    };
    const handleBeforeUnload = () => {
      updatePresence(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(initTimeout);
      if (activityThrottle) clearTimeout(activityThrottle);
      events.forEach(event => window.removeEventListener(event, throttledActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [user?.id, updatePresence, handleActivity, getPageName]);

  // Update when page changes (debounced) - separate effect for pathname changes
  useEffect(() => {
    if (!user?.id) return;
    const timeout = setTimeout(() => {
      updatePresence(true, getPageName(location.pathname));
    }, 500);
    return () => clearTimeout(timeout);
  }, [location.pathname, user?.id, updatePresence, getPageName]);

  return { updatePresence };
}
