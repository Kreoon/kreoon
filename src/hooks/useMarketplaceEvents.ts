import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Tracks marketplace interactions into `user_feed_events`
 * for the recommendation engine (item_type = 'profile').
 */
export function useMarketplaceEvents() {
  const { user } = useAuth();
  const viewStartRef = useRef<Map<string, number>>(new Map());

  const trackCreatorView = useCallback(
    (creatorUserId: string) => {
      if (!user) return;
      viewStartRef.current.set(creatorUserId, Date.now());

      supabase
        .from('user_feed_events')
        .insert({
          user_id: user.id,
          item_type: 'profile',
          item_id: creatorUserId,
          event_type: 'view_start',
          metadata: {},
        })
        .then(() => {});
    },
    [user],
  );

  const endCreatorView = useCallback(
    (creatorUserId: string) => {
      if (!user) return;
      const start = viewStartRef.current.get(creatorUserId);
      const durationMs = start ? Date.now() - start : null;
      viewStartRef.current.delete(creatorUserId);

      supabase
        .from('user_feed_events')
        .insert({
          user_id: user.id,
          item_type: 'profile',
          item_id: creatorUserId,
          event_type: 'view_end',
          duration_ms: durationMs,
          metadata: {},
        })
        .then(() => {});
    },
    [user],
  );

  const trackCreatorClick = useCallback(
    (creatorUserId: string, source: 'grid' | 'carousel' | 'search' | 'similar') => {
      if (!user) return;

      supabase
        .from('user_feed_events')
        .insert({
          user_id: user.id,
          item_type: 'profile',
          item_id: creatorUserId,
          event_type: 'view_start',
          metadata: { source },
        })
        .then(() => {});
    },
    [user],
  );

  const trackCreatorSave = useCallback(
    (creatorUserId: string) => {
      if (!user) return;

      supabase
        .from('user_feed_events')
        .insert({
          user_id: user.id,
          item_type: 'profile',
          item_id: creatorUserId,
          event_type: 'save',
          metadata: {},
        })
        .then(() => {});
    },
    [user],
  );

  return {
    trackCreatorView,
    endCreatorView,
    trackCreatorClick,
    trackCreatorSave,
  };
}
