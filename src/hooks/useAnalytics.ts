// ============================================================
// KREOON ANALYTICS ENGINE (KAE) - Client SDK
// ============================================================
//
// Self-contained analytics hook:
// - UTM & click ID capture from URL
// - Anonymous ID + Session ID (30min timeout) persistence
// - Event queue with 2s batched flush to kae-track Edge Function
// - Immediate conversion sends to kae-conversion Edge Function
// - Identity merge via kae-identify Edge Function
// - Auto page view + popstate SPA tracking
// - Auto identify on user login
// - Flush on visibility change + beforeunload

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type {
  VisitorContext,
  AnalyticsEvent,
  ConversionEvent,
  UTMParams,
  ClickIds,
} from '@/types/analytics';

const ANONYMOUS_ID_KEY = 'kae_anonymous_id';
const SESSION_ID_KEY = 'kae_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
const VISITOR_DATA_KEY = 'kae_visitor_data';
const FLUSH_INTERVAL = 2000; // 2 segundos
const MAX_BATCH_SIZE = 10;

// ── Helpers (pure, no React) ────────────────────────────────

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const parseUTMs = (url: string): UTMParams => {
  try {
    const params = new URLSearchParams(new URL(url).search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
  } catch {
    return {};
  }
};

const parseClickIds = (url: string): ClickIds => {
  try {
    const params = new URLSearchParams(new URL(url).search);
    return {
      fbclid: params.get('fbclid') || undefined,
      ttclid: params.get('ttclid') || undefined,
      gclid: params.get('gclid') || undefined,
      li_fat_id: params.get('li_fat_id') || undefined,
    };
  } catch {
    return {};
  }
};

const getOrCreateAnonymousId = (): string => {
  try {
    let id = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(ANONYMOUS_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
};

const getOrCreateSessionId = (): string => {
  try {
    const stored = localStorage.getItem(SESSION_ID_KEY);
    if (stored) {
      const { id, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < SESSION_TIMEOUT) {
        localStorage.setItem(SESSION_ID_KEY, JSON.stringify({ id, timestamp: Date.now() }));
        return id;
      }
    }
    const newId = generateId();
    localStorage.setItem(SESSION_ID_KEY, JSON.stringify({ id: newId, timestamp: Date.now() }));
    return newId;
  } catch {
    return generateId();
  }
};

const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowserInfo = (): { browser: string; os: string } => {
  const ua = navigator.userAgent;

  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
};

// ── Return type (exported for AnalyticsContext) ─────────────

export interface AnalyticsReturnType {
  track: (event: AnalyticsEvent) => void;
  trackPageView: (additionalProps?: Record<string, unknown>) => void;
  trackConversion: (conversion: ConversionEvent) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  trackSignup: (properties?: Record<string, unknown>) => void;
  trackTrialStart: (properties?: Record<string, unknown>) => void;
  trackSubscription: (valueUsd: number, properties?: Record<string, unknown>) => void;
  trackContentCreated: (properties?: Record<string, unknown>) => void;
  trackButtonClick: (buttonId: string, buttonText?: string) => void;
  trackFormSubmit: (formId: string, formName?: string) => void;
  trackSearch: (query: string, resultsCount?: number) => void;
  trackVideoView: (videoId: string, duration?: number, percentWatched?: number) => void;
  getContext: () => VisitorContext | null;
}

// ── Hook ───────────────────────────────────────────────────

export function useAnalytics(): AnalyticsReturnType {
  const { user } = useAuth();
  const eventQueue = useRef<Record<string, unknown>[]>([]);
  const flushTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef<VisitorContext | null>(null);
  const initializedRef = useRef(false);

  // Inicializar contexto del visitante
  const initializeContext = useCallback((): VisitorContext => {
    const anonymous_id = getOrCreateAnonymousId();
    const session_id = getOrCreateSessionId();
    const url = window.location.href;

    // Obtener datos guardados del visitante
    let visitorData: {
      utms: UTMParams;
      click_ids: ClickIds;
      referrer?: string;
      landing_page?: string;
      first_seen: number;
    } | null = null;

    try {
      const stored = localStorage.getItem(VISITOR_DATA_KEY);
      visitorData = stored ? JSON.parse(stored) : null;
    } catch { /* ignore */ }

    // Si es primera visita, guardar UTMs y click IDs
    if (!visitorData) {
      visitorData = {
        utms: parseUTMs(url),
        click_ids: parseClickIds(url),
        referrer: document.referrer || undefined,
        landing_page: url,
        first_seen: Date.now(),
      };
      try {
        localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(visitorData));
      } catch { /* ignore */ }
    }

    // Actualizar click IDs si vienen nuevos (last-touch)
    const currentClickIds = parseClickIds(url);
    if (Object.values(currentClickIds).some(Boolean)) {
      visitorData.click_ids = { ...visitorData.click_ids, ...currentClickIds };
      try {
        localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(visitorData));
      } catch { /* ignore */ }
    }

    return {
      anonymous_id,
      session_id,
      user_id: user?.id,
      utms: visitorData.utms,
      click_ids: visitorData.click_ids,
      referrer: visitorData.referrer,
      landing_page: visitorData.landing_page,
    };
  }, [user?.id]);

  // Flush eventos a kae-track Edge Function
  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;

    const eventsToSend = eventQueue.current.splice(0, MAX_BATCH_SIZE);

    try {
      await supabase.functions.invoke('kae-track', {
        body: {
          events: eventsToSend,
          context: contextRef.current,
        },
      });
    } catch (error) {
      console.error('[KAE] Error sending events:', error);
      // Re-queue eventos fallidos (al principio)
      eventQueue.current.unshift(...eventsToSend);
    }
  }, []);

  // Encolar evento
  const queueEvent = useCallback((event: Record<string, unknown>) => {
    eventQueue.current.push({
      ...event,
      client_timestamp: new Date().toISOString(),
    });

    // Programar flush
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }
    flushTimeout.current = setTimeout(flushEvents, FLUSH_INTERVAL);
  }, [flushEvents]);

  // Track evento genérico
  const track = useCallback((event: AnalyticsEvent) => {
    if (!contextRef.current) {
      contextRef.current = initializeContext();
    }

    queueEvent({
      event_name: event.event_name,
      event_category: event.event_category,
      properties: event.properties || {},
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      page_referrer: document.referrer,
      device_type: getDeviceType(),
      ...getBrowserInfo(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
    });
  }, [initializeContext, queueEvent]);

  // Track page view
  const trackPageView = useCallback((additionalProps?: Record<string, unknown>) => {
    track({
      event_name: 'page_view',
      event_category: 'page',
      properties: {
        page_path: window.location.pathname,
        page_title: document.title,
        ...additionalProps,
      },
    });
  }, [track]);

  // Track conversión (eventos de alto valor, envío inmediato)
  const trackConversion = useCallback((conversion: ConversionEvent) => {
    if (!contextRef.current) {
      contextRef.current = initializeContext();
    }

    // Las conversiones se envían inmediatamente (sin batching)
    supabase.functions.invoke('kae-conversion', {
      body: {
        conversion_type: conversion.type,
        value_usd: conversion.value_usd,
        properties: conversion.properties || {},
        context: contextRef.current,
        page_url: window.location.href,
        page_path: window.location.pathname,
        device_type: getDeviceType(),
        ...getBrowserInfo(),
      },
    }).catch((error) => {
      console.error('[KAE] Error tracking conversion:', error);
    });

    // También trackear como evento regular
    track({
      event_name: conversion.type,
      event_category: 'conversion',
      properties: {
        value_usd: conversion.value_usd,
        ...conversion.properties,
      },
    });
  }, [initializeContext, track]);

  // Identificar usuario (post-signup/login)
  const identify = useCallback((userId: string, traits?: Record<string, unknown>) => {
    if (!contextRef.current) {
      contextRef.current = initializeContext();
    }

    contextRef.current.user_id = userId;

    // Notificar al servidor para merge de anonymous_id → user_id
    supabase.functions.invoke('kae-identify', {
      body: {
        user_id: userId,
        anonymous_id: contextRef.current.anonymous_id,
        traits,
      },
    }).catch((error) => {
      console.error('[KAE] Error identifying user:', error);
    });
  }, [initializeContext]);

  // === MÉTODOS ESPECÍFICOS DE CONVERSIÓN ===

  const trackSignup = useCallback((properties?: Record<string, unknown>) => {
    trackConversion({ type: 'signup', properties });
  }, [trackConversion]);

  const trackTrialStart = useCallback((properties?: Record<string, unknown>) => {
    trackConversion({ type: 'trial_start', properties });
  }, [trackConversion]);

  const trackSubscription = useCallback((valueUsd: number, properties?: Record<string, unknown>) => {
    trackConversion({ type: 'subscription', value_usd: valueUsd, properties });
  }, [trackConversion]);

  const trackContentCreated = useCallback((properties?: Record<string, unknown>) => {
    trackConversion({ type: 'content_created', properties });
  }, [trackConversion]);

  // === MÉTODOS DE ENGAGEMENT ===

  const trackButtonClick = useCallback((buttonId: string, buttonText?: string) => {
    track({
      event_name: 'button_click',
      event_category: 'engagement',
      properties: { button_id: buttonId, button_text: buttonText },
    });
  }, [track]);

  const trackFormSubmit = useCallback((formId: string, formName?: string) => {
    track({
      event_name: 'form_submit',
      event_category: 'engagement',
      properties: { form_id: formId, form_name: formName },
    });
  }, [track]);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    track({
      event_name: 'search',
      event_category: 'engagement',
      properties: { query, results_count: resultsCount },
    });
  }, [track]);

  const trackVideoView = useCallback((videoId: string, duration?: number, percentWatched?: number) => {
    track({
      event_name: 'video_view',
      event_category: 'engagement',
      properties: {
        video_id: videoId,
        duration_seconds: duration,
        percent_watched: percentWatched,
      },
    });
  }, [track]);

  // === LIFECYCLE ===

  // Inicialización (una sola vez)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    contextRef.current = initializeContext();

    // Track page view inicial
    trackPageView();

    // Escuchar cambios de ruta (SPA)
    const handlePopState = () => {
      trackPageView();
    };
    window.addEventListener('popstate', handlePopState);

    // Flush al cerrar/cambiar de tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Flush antes de cerrar
    const handleBeforeUnload = () => {
      flushEvents();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
    };
  }, [initializeContext, trackPageView, flushEvents]);

  // Actualizar user_id cuando el usuario inicia sesión
  useEffect(() => {
    if (user?.id && contextRef.current) {
      identify(user.id);
    }
  }, [user?.id, identify]);

  return {
    track,
    trackPageView,
    trackConversion,
    identify,
    trackSignup,
    trackTrialStart,
    trackSubscription,
    trackContentCreated,
    trackButtonClick,
    trackFormSubmit,
    trackSearch,
    trackVideoView,
    getContext: () => contextRef.current,
  };
}
