import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Event Categories
export type EventCategory = 
  | 'user' 
  | 'organization' 
  | 'content' 
  | 'project' 
  | 'board' 
  | 'portfolio' 
  | 'chat' 
  | 'ai' 
  | 'navigation' 
  | 'interaction' 
  | 'system';

// Entity Types
export type EntityType = 
  | 'user' 
  | 'content' 
  | 'organization' 
  | 'project' 
  | 'chat' 
  | 'portfolio' 
  | 'profile' 
  | 'story' 
  | 'card' 
  | 'message';

// Event Context
export interface EventContext {
  page?: string;
  module?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  source?: string;
  referrer?: string;
  sessionId?: string;
}

// Track Event Options
export interface TrackEventOptions {
  eventName: string;
  eventCategory?: EventCategory;
  entityType?: EntityType;
  entityId?: string;
  organizationId?: string;
  metadata?: Record<string, unknown>;
  context?: Partial<EventContext>;
  isSensitive?: boolean;
}

// Tracking Config (cached per org)
interface TrackingConfig {
  trackingEnabled: boolean;
  externalTrackingEnabled: boolean;
  anonymizeSensitiveData: boolean;
  debugMode: boolean;
  allowedEventCategories: string[];
}

// Event Queue for batching
interface QueuedEvent {
  eventName: string;
  eventCategory: string;
  organizationId: string | null;
  userId: string | null;
  viewerId: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  context: EventContext;
  isSensitive: boolean;
  createdAt: string;
}

// Generate stable anonymous viewer ID
function getAnonymousViewerId(): string {
  const key = 'kreoon_viewer_id';
  let viewerId = localStorage.getItem(key);
  if (!viewerId) {
    viewerId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(key, viewerId);
  }
  return viewerId;
}

// Generate session ID
function getSessionId(): string {
  const key = 'kreoon_session_id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// Detect device type
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

// Config cache
const configCache = new Map<string, { config: TrackingConfig; timestamp: number }>();
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useTrackingEngine() {
  const { user } = useAuth();
  const eventQueue = useRef<QueuedEvent[]>([]);
  const flushTimer = useRef<NodeJS.Timeout | null>(null);
  const viewTimers = useRef<Map<string, number>>(new Map());

  // Get current organization ID
  const getCurrentOrgId = useCallback((): string | null => {
    return sessionStorage.getItem('current_org_id');
  }, []);

  // Get tracking config for organization
  const getTrackingConfig = useCallback(async (orgId: string | null): Promise<TrackingConfig> => {
    if (!orgId) {
      return {
        trackingEnabled: true,
        externalTrackingEnabled: false,
        anonymizeSensitiveData: true,
        debugMode: false,
        allowedEventCategories: ['user', 'content', 'organization', 'project', 'chat', 'portfolio', 'board', 'ai', 'navigation', 'interaction', 'system'],
      };
    }

    // Check cache
    const cached = configCache.get(orgId);
    if (cached && Date.now() - cached.timestamp < CONFIG_CACHE_TTL) {
      return cached.config;
    }

    try {
      const { data, error } = await supabase
        .from('organization_tracking_config')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) {
        console.warn('[TrackingEngine] Error fetching config:', error);
        return getDefaultConfig();
      }

      if (!data) {
        return getDefaultConfig();
      }

      const config: TrackingConfig = {
        trackingEnabled: data.tracking_enabled ?? true,
        externalTrackingEnabled: data.external_tracking_enabled ?? false,
        anonymizeSensitiveData: data.anonymize_sensitive_data ?? true,
        debugMode: data.debug_mode ?? false,
        allowedEventCategories: data.allowed_event_categories ?? [],
      };

      configCache.set(orgId, { config, timestamp: Date.now() });
      return config;
    } catch {
      return getDefaultConfig();
    }
  }, []);

  const getDefaultConfig = (): TrackingConfig => ({
    trackingEnabled: true,
    externalTrackingEnabled: false,
    anonymizeSensitiveData: true,
    debugMode: false,
    allowedEventCategories: ['user', 'content', 'organization', 'project', 'chat', 'portfolio', 'board', 'ai', 'navigation', 'interaction', 'system'],
  });

  // Build event context
  const buildContext = useCallback((customContext?: Partial<EventContext>): EventContext => {
    return {
      page: window.location.pathname,
      module: customContext?.module,
      device: getDeviceType(),
      source: customContext?.source ?? 'web',
      referrer: document.referrer || undefined,
      sessionId: getSessionId(),
      ...customContext,
    };
  }, []);

  // Flush events to database
  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;

    const eventsToFlush = [...eventQueue.current];
    eventQueue.current = [];

    try {
      const insertData = eventsToFlush.map(event => ({
        event_name: event.eventName,
        event_category: event.eventCategory,
        organization_id: event.organizationId,
        user_id: event.userId,
        viewer_id: event.viewerId,
        entity_type: event.entityType,
        entity_id: event.entityId,
        metadata: event.metadata,
        context: event.context,
        is_sensitive: event.isSensitive,
        created_at: event.createdAt,
      }));

      const { error } = await supabase
        .from('tracking_events')
        .insert(insertData as any);

      if (error) {
        console.error('[TrackingEngine] Error flushing events:', error);
        // Re-queue failed events
        eventQueue.current = [...eventsToFlush, ...eventQueue.current];
      }
    } catch (err) {
      console.error('[TrackingEngine] Error flushing events:', err);
      // Re-queue failed events
      eventQueue.current = [...eventsToFlush, ...eventQueue.current];
    }
  }, []);

  // Schedule flush
  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return;

    flushTimer.current = setTimeout(() => {
      flushTimer.current = null;
      flushEvents();
    }, 2000); // Flush every 2 seconds
  }, [flushEvents]);

  // Main track event function
  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    const {
      eventName,
      eventCategory = 'system',
      entityType,
      entityId,
      organizationId,
      metadata = {},
      context: customContext,
      isSensitive = false,
    } = options;

    const orgId = organizationId ?? getCurrentOrgId();
    const config = await getTrackingConfig(orgId);

    // Check if tracking is enabled
    if (!config.trackingEnabled) {
      if (config.debugMode) {
        console.log('[TrackingEngine] Tracking disabled for org:', orgId);
      }
      return;
    }

    // Check if event category is allowed
    if (!config.allowedEventCategories.includes(eventCategory)) {
      if (config.debugMode) {
        console.log('[TrackingEngine] Category not allowed:', eventCategory);
      }
      return;
    }

    // Build event
    const event: QueuedEvent = {
      eventName,
      eventCategory,
      organizationId: orgId,
      userId: user?.id ?? null,
      viewerId: user?.id ? null : getAnonymousViewerId(),
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      metadata: config.anonymizeSensitiveData && isSensitive 
        ? { _anonymized: true } 
        : metadata,
      context: buildContext(customContext),
      isSensitive,
      createdAt: new Date().toISOString(),
    };

    // Debug mode logging
    if (config.debugMode) {
      console.log('[TrackingEngine] Event:', event);
    }

    // Add to queue
    eventQueue.current.push(event);

    // Schedule flush
    scheduleFlush();

    // Trigger external integrations if enabled
    if (config.externalTrackingEnabled) {
      triggerExternalTracking(event, orgId);
    }
  }, [user?.id, getCurrentOrgId, getTrackingConfig, buildContext, scheduleFlush]);

  // Trigger external tracking integrations
  const triggerExternalTracking = useCallback(async (event: QueuedEvent, orgId: string | null) => {
    if (!orgId) return;

    try {
      const { data: integrations } = await supabase
        .from('organization_tracking_integrations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('enabled', true);

      if (!integrations || integrations.length === 0) return;

      for (const integration of integrations) {
        // Check if event is allowed for this integration
        if (integration.events_allowed?.length > 0 && !integration.events_allowed.includes(event.eventName)) {
          continue;
        }

        switch (integration.provider) {
          case 'google_analytics':
            sendToGoogleAnalytics(event, integration.provider_id);
            break;
          case 'meta_pixel':
            sendToMetaPixel(event, integration.provider_id);
            break;
          case 'tiktok_pixel':
            sendToTikTokPixel(event, integration.provider_id);
            break;
          case 'custom_webhook':
            sendToWebhook(event, integration.config as { url?: string } | null);
            break;
        }
      }
    } catch (err) {
      console.error('[TrackingEngine] Error triggering external tracking:', err);
    }
  }, []);

  // External tracking functions (client-side)
  const sendToGoogleAnalytics = (event: QueuedEvent, trackingId: string | null) => {
    if (!trackingId) return;
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.eventName, {
        event_category: event.eventCategory,
        event_label: event.entityType,
        value: event.entityId,
        ...event.metadata,
      });
    }
  };

  const sendToMetaPixel = (event: QueuedEvent, pixelId: string | null) => {
    if (!pixelId) return;
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('trackCustom', event.eventName, {
        category: event.eventCategory,
        entity_type: event.entityType,
        entity_id: event.entityId,
        ...event.metadata,
      });
    }
  };

  const sendToTikTokPixel = (event: QueuedEvent, pixelId: string | null) => {
    if (!pixelId) return;
    if (typeof window !== 'undefined' && (window as any).ttq) {
      (window as any).ttq.track(event.eventName, {
        content_category: event.eventCategory,
        content_type: event.entityType,
        content_id: event.entityId,
        ...event.metadata,
      });
    }
  };

  const sendToWebhook = async (event: QueuedEvent, config: { url?: string } | null) => {
    if (!config?.url) return;
    try {
      await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch (err) {
      console.error('[TrackingEngine] Webhook error:', err);
    }
  };

  // View tracking helpers
  const startViewTimer = useCallback((entityType: EntityType, entityId: string) => {
    const key = `${entityType}:${entityId}`;
    if (!viewTimers.current.has(key)) {
      viewTimers.current.set(key, Date.now());
      trackEvent({
        eventName: `${entityType}_view_start`,
        eventCategory: 'portfolio',
        entityType,
        entityId,
      });
    }
  }, [trackEvent]);

  const endViewTimer = useCallback((entityType: EntityType, entityId: string) => {
    const key = `${entityType}:${entityId}`;
    const startTime = viewTimers.current.get(key);

    if (startTime) {
      const durationMs = Date.now() - startTime;
      viewTimers.current.delete(key);

      if (durationMs >= 1000) {
        trackEvent({
          eventName: `${entityType}_view_end`,
          eventCategory: 'portfolio',
          entityType,
          entityId,
          metadata: { duration_ms: durationMs },
        });
      }
    }
  }, [trackEvent]);

  // Quick helpers for common events
  const trackPageView = useCallback((page: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'page_view',
      eventCategory: 'navigation',
      metadata: { page, ...metadata },
      context: { page },
    });
  }, [trackEvent]);

  const trackButtonClick = useCallback((buttonId: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'button_click',
      eventCategory: 'interaction',
      metadata: { button_id: buttonId, ...metadata },
    });
  }, [trackEvent]);

  const trackFormSubmit = useCallback((formId: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'form_submit',
      eventCategory: 'interaction',
      metadata: { form_id: formId, ...metadata },
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    trackEvent({
      eventName: 'search_performed',
      eventCategory: 'interaction',
      metadata: { query, results_count: resultsCount },
    });
  }, [trackEvent]);

  const trackError = useCallback((error: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'error_occurred',
      eventCategory: 'system',
      metadata: { error, ...metadata },
    });
  }, [trackEvent]);

  // User events
  const trackUserLogin = useCallback(() => {
    trackEvent({ eventName: 'user_logged_in', eventCategory: 'user' });
  }, [trackEvent]);

  const trackUserLogout = useCallback(() => {
    trackEvent({ eventName: 'user_logged_out', eventCategory: 'user' });
  }, [trackEvent]);

  const trackProfileUpdate = useCallback((profileId: string, changes?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'profile_updated',
      eventCategory: 'user',
      entityType: 'profile',
      entityId: profileId,
      metadata: changes,
    });
  }, [trackEvent]);

  // Content events
  const trackContentUpload = useCallback((contentId: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'content_uploaded',
      eventCategory: 'content',
      entityType: 'content',
      entityId: contentId,
      metadata,
    });
  }, [trackEvent]);

  const trackContentApproval = useCallback((contentId: string, approved: boolean) => {
    trackEvent({
      eventName: approved ? 'content_approved' : 'content_rejected',
      eventCategory: 'content',
      entityType: 'content',
      entityId: contentId,
    });
  }, [trackEvent]);

  const trackStatusChange = useCallback((contentId: string, fromStatus: string, toStatus: string) => {
    trackEvent({
      eventName: 'status_changed',
      eventCategory: 'project',
      entityType: 'content',
      entityId: contentId,
      metadata: { from_status: fromStatus, to_status: toStatus },
    });
  }, [trackEvent]);

  // Board events
  const trackCardCreated = useCallback((cardId: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'card_created',
      eventCategory: 'board',
      entityType: 'card',
      entityId: cardId,
      metadata,
    });
  }, [trackEvent]);

  const trackCardMoved = useCallback((cardId: string, fromColumn: string, toColumn: string) => {
    trackEvent({
      eventName: 'card_moved',
      eventCategory: 'board',
      entityType: 'card',
      entityId: cardId,
      metadata: { from_column: fromColumn, to_column: toColumn },
    });
  }, [trackEvent]);

  // Portfolio events
  const trackVideoView = useCallback((videoId: string) => {
    trackEvent({
      eventName: 'video_view',
      eventCategory: 'portfolio',
      entityType: 'content',
      entityId: videoId,
    });
  }, [trackEvent]);

  const trackVideoLike = useCallback((videoId: string) => {
    trackEvent({
      eventName: 'video_like',
      eventCategory: 'portfolio',
      entityType: 'content',
      entityId: videoId,
    });
  }, [trackEvent]);

  const trackVideoShare = useCallback((videoId: string, platform?: string) => {
    trackEvent({
      eventName: 'video_share',
      eventCategory: 'portfolio',
      entityType: 'content',
      entityId: videoId,
      metadata: { platform },
    });
  }, [trackEvent]);

  const trackFollow = useCallback((profileId: string, entityType: 'user' | 'profile' = 'profile') => {
    trackEvent({
      eventName: entityType === 'user' ? 'follow_user' : 'follow_company',
      eventCategory: 'portfolio',
      entityType: 'profile',
      entityId: profileId,
    });
  }, [trackEvent]);

  // Chat events
  const trackMessageSent = useCallback((conversationId: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'message_sent',
      eventCategory: 'chat',
      entityType: 'message',
      entityId: conversationId,
      metadata,
    });
  }, [trackEvent]);

  // AI events
  const trackAIRequest = useCallback((module: string, action: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'ai_request',
      eventCategory: 'ai',
      metadata: { module, action, ...metadata },
    });
  }, [trackEvent]);

  const trackAIResponse = useCallback((module: string, action: string, success: boolean, metadata?: Record<string, unknown>) => {
    trackEvent({
      eventName: 'ai_response',
      eventCategory: 'ai',
      metadata: { module, action, success, ...metadata },
    });
  }, [trackEvent]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
      }
      // Sync flush on unmount
      if (eventQueue.current.length > 0) {
        flushEvents();
      }
    };
  }, [flushEvents]);

  // Flush on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushEvents]);

  return {
    // Core
    trackEvent,
    
    // View tracking
    startViewTimer,
    endViewTimer,
    
    // Navigation
    trackPageView,
    
    // Interaction
    trackButtonClick,
    trackFormSubmit,
    trackSearch,
    trackError,
    
    // User
    trackUserLogin,
    trackUserLogout,
    trackProfileUpdate,
    
    // Content
    trackContentUpload,
    trackContentApproval,
    trackStatusChange,
    
    // Board
    trackCardCreated,
    trackCardMoved,
    
    // Portfolio
    trackVideoView,
    trackVideoLike,
    trackVideoShare,
    trackFollow,
    
    // Chat
    trackMessageSent,
    
    // AI
    trackAIRequest,
    trackAIResponse,
  };
}

// Create a singleton context for tracking
export const TrackingContext = {
  track: (options: TrackEventOptions) => {
    // This will be implemented via a provider
    console.warn('[TrackingEngine] Using context outside provider');
  },
};
