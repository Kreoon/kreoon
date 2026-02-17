import { useCallback } from 'react';
import { useAnalyticsContext } from '../context';
import { DISCOVERY_EVENTS } from '../constants';
import type {
  SearchProps,
  SearchResultClickedProps,
  FeedProps,
  CreatorDiscoveryProps,
} from '../types';

export function useDiscoveryAnalytics() {
  const { track } = useAnalyticsContext();

  // ===== SEARCH =====

  const trackSearchPerformed = useCallback((props: SearchProps) => {
    track({
      event_name: DISCOVERY_EVENTS.SEARCH_PERFORMED,
      event_category: 'discovery',
      properties: props,
    });
  }, [track]);

  const trackSearchResultClicked = useCallback((props: SearchResultClickedProps) => {
    track({
      event_name: DISCOVERY_EVENTS.SEARCH_RESULT_CLICKED,
      event_category: 'discovery',
      properties: props,
    });
  }, [track]);

  const trackSearchNoResults = useCallback((query: string, searchType: string, filtersApplied: string[]) => {
    track({
      event_name: DISCOVERY_EVENTS.SEARCH_NO_RESULTS,
      event_category: 'discovery',
      properties: { query, search_type: searchType, filters_applied: filtersApplied },
    });
  }, [track]);

  const trackSearchFilterApplied = useCallback((filterName: string, filterValue: string, searchType: string) => {
    track({
      event_name: DISCOVERY_EVENTS.SEARCH_FILTER_APPLIED,
      event_category: 'discovery',
      properties: { filter_name: filterName, filter_value: filterValue, search_type: searchType },
    });
  }, [track]);

  const trackSearchFilterCleared = useCallback((filterName: string, searchType: string) => {
    track({
      event_name: DISCOVERY_EVENTS.SEARCH_FILTER_CLEARED,
      event_category: 'discovery',
      properties: { filter_name: filterName, search_type: searchType },
    });
  }, [track]);

  const trackSearchSortChanged = useCallback((sortBy: string, sortOrder: 'asc' | 'desc', searchType: string) => {
    track({
      event_name: DISCOVERY_EVENTS.SEARCH_SORT_CHANGED,
      event_category: 'discovery',
      properties: { sort_by: sortBy, sort_order: sortOrder, search_type: searchType },
    });
  }, [track]);

  // ===== FEED =====

  const trackFeedViewed = useCallback((props: FeedProps) => {
    track({
      event_name: DISCOVERY_EVENTS.FEED_VIEWED,
      event_category: 'discovery',
      properties: props,
    });
  }, [track]);

  const trackFeedRefreshed = useCallback((feedType: string) => {
    track({
      event_name: DISCOVERY_EVENTS.FEED_REFRESHED,
      event_category: 'discovery',
      properties: { feed_type: feedType },
    });
  }, [track]);

  const trackFeedScrolled = useCallback((props: FeedProps) => {
    // Solo trackear milestones de scroll
    const depth = props.scroll_depth_percent ?? 0;
    if ([25, 50, 75, 100].includes(Math.round(depth))) {
      track({
        event_name: DISCOVERY_EVENTS.FEED_SCROLLED,
        event_category: 'discovery',
        properties: props,
      });
    }
  }, [track]);

  const trackFeedEndReached = useCallback((feedType: string, itemsLoaded: number) => {
    track({
      event_name: DISCOVERY_EVENTS.FEED_END_REACHED,
      event_category: 'discovery',
      properties: { feed_type: feedType, items_loaded: itemsLoaded },
    });
  }, [track]);

  // ===== CREATOR DISCOVERY =====

  const trackCreatorProfileViewed = useCallback((props: CreatorDiscoveryProps) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_PROFILE_VIEWED,
      event_category: 'discovery',
      properties: props,
    });
  }, [track]);

  const trackCreatorContacted = useCallback((creatorId: string, contactMethod: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_CONTACTED,
      event_category: 'discovery',
      properties: { creator_id: creatorId, contact_method: contactMethod },
    });
  }, [track]);

  const trackCreatorSaved = useCallback((creatorId: string, source: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_SAVED,
      event_category: 'discovery',
      properties: { creator_id: creatorId, discovery_source: source },
    });
  }, [track]);

  const trackCreatorUnsaved = useCallback((creatorId: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_UNSAVED,
      event_category: 'discovery',
      properties: { creator_id: creatorId },
    });
  }, [track]);

  const trackCreatorFollowed = useCallback((creatorId: string, source: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_FOLLOWED,
      event_category: 'discovery',
      properties: { creator_id: creatorId, discovery_source: source },
    });
  }, [track]);

  const trackCreatorUnfollowed = useCallback((creatorId: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_UNFOLLOWED,
      event_category: 'discovery',
      properties: { creator_id: creatorId },
    });
  }, [track]);

  const trackCreatorReported = useCallback((creatorId: string, reason: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_REPORTED,
      event_category: 'discovery',
      properties: { creator_id: creatorId, report_reason: reason },
    });
  }, [track]);

  const trackCreatorBlocked = useCallback((creatorId: string) => {
    track({
      event_name: DISCOVERY_EVENTS.CREATOR_BLOCKED,
      event_category: 'discovery',
      properties: { creator_id: creatorId },
    });
  }, [track]);

  // ===== RECOMMENDATIONS =====

  const trackRecommendationShown = useCallback((recommendationId: string, recommendationType: string, position: number) => {
    track({
      event_name: DISCOVERY_EVENTS.RECOMMENDATION_SHOWN,
      event_category: 'discovery',
      properties: { recommendation_id: recommendationId, recommendation_type: recommendationType, position },
    });
  }, [track]);

  const trackRecommendationClicked = useCallback((recommendationId: string, recommendationType: string, position: number) => {
    track({
      event_name: DISCOVERY_EVENTS.RECOMMENDATION_CLICKED,
      event_category: 'discovery',
      properties: { recommendation_id: recommendationId, recommendation_type: recommendationType, position },
    });
  }, [track]);

  const trackRecommendationDismissed = useCallback((recommendationId: string, reason?: string) => {
    track({
      event_name: DISCOVERY_EVENTS.RECOMMENDATION_DISMISSED,
      event_category: 'discovery',
      properties: { recommendation_id: recommendationId, dismiss_reason: reason },
    });
  }, [track]);

  return {
    // Search
    trackSearchPerformed,
    trackSearchResultClicked,
    trackSearchNoResults,
    trackSearchFilterApplied,
    trackSearchFilterCleared,
    trackSearchSortChanged,

    // Feed
    trackFeedViewed,
    trackFeedRefreshed,
    trackFeedScrolled,
    trackFeedEndReached,

    // Creator discovery
    trackCreatorProfileViewed,
    trackCreatorContacted,
    trackCreatorSaved,
    trackCreatorUnsaved,
    trackCreatorFollowed,
    trackCreatorUnfollowed,
    trackCreatorReported,
    trackCreatorBlocked,

    // Recommendations
    trackRecommendationShown,
    trackRecommendationClicked,
    trackRecommendationDismissed,
  };
}
