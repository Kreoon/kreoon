import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type EventType = 'view_start' | 'view_end' | 'like' | 'save' | 'comment' | 'share' | 'follow';
type ItemType = 'content' | 'post' | 'story' | 'profile';

interface TrackEventOptions {
  itemType: ItemType;
  itemId: string;
  eventType: EventType;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

// Generate a stable anonymous viewer ID
function getAnonymousViewerId(): string {
  const key = 'anon_viewer_id';
  let viewerId = localStorage.getItem(key);
  if (!viewerId) {
    viewerId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(key, viewerId);
  }
  return viewerId;
}

export function useFeedEvents() {
  const { user } = useAuth();
  const viewStartTimes = useRef<Map<string, number>>(new Map());

  const trackEvent = useCallback(async (options: TrackEventOptions) => {
    const { itemType, itemId, eventType, durationMs, metadata } = options;

    try {
      const eventData: Record<string, unknown> = {
        item_type: itemType,
        item_id: itemId,
        event_type: eventType,
        duration_ms: durationMs ?? null,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      };

      if (user?.id) {
        eventData.user_id = user.id;
      } else {
        eventData.viewer_id = getAnonymousViewerId();
      }

      // Get current organization if available
      const currentOrgId = sessionStorage.getItem('current_org_id');
      if (currentOrgId) {
        eventData.organization_id = currentOrgId;
      }

      const { error } = await supabase.from('user_feed_events').insert(eventData as any);
      if (error) {
        console.error('[useFeedEvents] Error tracking event:', error);
      }
    } catch (error) {
      console.error('[useFeedEvents] Error tracking event:', error);
    }
  }, [user?.id]);

  // Start tracking view time for an item
  const startViewTimer = useCallback((itemType: ItemType, itemId: string) => {
    const key = `${itemType}:${itemId}`;
    if (!viewStartTimes.current.has(key)) {
      viewStartTimes.current.set(key, Date.now());
      trackEvent({ itemType, itemId, eventType: 'view_start' });
    }
  }, [trackEvent]);

  // End tracking view time and record duration
  const endViewTimer = useCallback((itemType: ItemType, itemId: string) => {
    const key = `${itemType}:${itemId}`;
    const startTime = viewStartTimes.current.get(key);
    
    if (startTime) {
      const durationMs = Date.now() - startTime;
      viewStartTimes.current.delete(key);
      
      // Only track if viewed for at least 1 second
      if (durationMs >= 1000) {
        trackEvent({ itemType, itemId, eventType: 'view_end', durationMs });
      }
    }
  }, [trackEvent]);

  // Quick helpers for common events
  const trackLike = useCallback((itemType: ItemType, itemId: string) => {
    trackEvent({ itemType, itemId, eventType: 'like' });
  }, [trackEvent]);

  const trackSave = useCallback((itemType: ItemType, itemId: string) => {
    trackEvent({ itemType, itemId, eventType: 'save' });
  }, [trackEvent]);

  const trackComment = useCallback((itemType: ItemType, itemId: string) => {
    trackEvent({ itemType, itemId, eventType: 'comment' });
  }, [trackEvent]);

  const trackShare = useCallback((itemType: ItemType, itemId: string) => {
    trackEvent({ itemType, itemId, eventType: 'share' });
  }, [trackEvent]);

  const trackFollow = useCallback((profileId: string) => {
    trackEvent({ itemType: 'profile', itemId: profileId, eventType: 'follow' });
  }, [trackEvent]);

  return {
    trackEvent,
    startViewTimer,
    endViewTimer,
    trackLike,
    trackSave,
    trackComment,
    trackShare,
    trackFollow,
  };
}
