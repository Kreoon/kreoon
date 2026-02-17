import { useCallback, useRef } from 'react';
import { useAnalyticsContext } from '../context';
import { CONTENT_EVENTS } from '../constants';
import type {
  ContentUploadProps,
  ContentViewedProps,
  ContentReviewProps,
  ContentEngagementProps,
  VideoPlaybackProps,
} from '../types';

export function useContentAnalytics() {
  const { track, trackConversion } = useAnalyticsContext();
  const viewStartTime = useRef<Map<string, number>>(new Map());
  const videoStartTime = useRef<Map<string, number>>(new Map());

  // ===== UPLOAD FLOW =====

  const trackUploadStarted = useCallback((props: ContentUploadProps) => {
    track({
      event_name: CONTENT_EVENTS.UPLOAD_STARTED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackUploadProgress = useCallback((
    contentId: string,
    progress: number,
    props: Partial<ContentUploadProps>
  ) => {
    // Solo trackear en 25%, 50%, 75%
    if ([25, 50, 75].includes(Math.round(progress))) {
      track({
        event_name: CONTENT_EVENTS.UPLOAD_PROGRESS,
        event_category: 'content',
        properties: { content_id: contentId, progress_percent: progress, ...props },
      });
    }
  }, [track]);

  const trackUploadCompleted = useCallback((
    contentId: string,
    props: ContentUploadProps,
    isFirstContent: boolean = false
  ) => {
    track({
      event_name: CONTENT_EVENTS.UPLOAD_COMPLETED,
      event_category: 'content',
      properties: { content_id: contentId, ...props },
    });

    // Si es el primer contenido, es una conversión
    if (isFirstContent) {
      trackConversion({
        type: 'content_created',
        properties: { content_id: contentId, content_type: props.content_type },
      });
    }
  }, [track, trackConversion]);

  const trackUploadFailed = useCallback((error: string, props: Partial<ContentUploadProps>) => {
    track({
      event_name: CONTENT_EVENTS.UPLOAD_FAILED,
      event_category: 'content',
      properties: { error, ...props },
    });
  }, [track]);

  const trackUploadCancelled = useCallback((props: Partial<ContentUploadProps>) => {
    track({
      event_name: CONTENT_EVENTS.UPLOAD_CANCELLED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  // ===== CONTENT LIFECYCLE =====

  const trackContentCreated = useCallback((contentId: string, contentType: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_CREATED,
      event_category: 'content',
      properties: { content_id: contentId, content_type: contentType },
    });
  }, [track]);

  const trackContentViewed = useCallback((props: ContentViewedProps) => {
    viewStartTime.current.set(props.content_id, Date.now());
    track({
      event_name: CONTENT_EVENTS.CONTENT_VIEWED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackContentViewEnded = useCallback((contentId: string) => {
    const startTime = viewStartTime.current.get(contentId);
    if (startTime) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      viewStartTime.current.delete(contentId);

      // Solo trackear si vio más de 2 segundos
      if (duration >= 2) {
        track({
          event_name: CONTENT_EVENTS.CONTENT_VIEWED,
          event_category: 'content',
          properties: {
            content_id: contentId,
            view_duration_seconds: duration,
            view_ended: true,
          },
        });
      }
    }
  }, [track]);

  const trackContentEdited = useCallback((contentId: string, fieldsEdited: string[]) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_EDITED,
      event_category: 'content',
      properties: { content_id: contentId, fields_edited: fieldsEdited },
    });
  }, [track]);

  const trackContentDeleted = useCallback((contentId: string, contentType: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_DELETED,
      event_category: 'content',
      properties: { content_id: contentId, content_type: contentType },
    });
  }, [track]);

  // ===== REVIEW FLOW =====

  const trackContentSubmitted = useCallback((contentId: string, campaignId?: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_SUBMITTED,
      event_category: 'content',
      properties: { content_id: contentId, campaign_id: campaignId },
    });
  }, [track]);

  const trackContentApproved = useCallback((props: ContentReviewProps) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_APPROVED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackContentRejected = useCallback((props: ContentReviewProps & { reason: string }) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_REJECTED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackRevisionRequested = useCallback((props: ContentReviewProps & { feedback: string }) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_REVISION_REQUESTED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  // ===== ENGAGEMENT =====

  const trackContentLiked = useCallback((contentId: string, contentType: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_LIKED,
      event_category: 'content',
      properties: { content_id: contentId, content_type: contentType, engagement_type: 'like' },
    });
  }, [track]);

  const trackContentUnliked = useCallback((contentId: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_UNLIKED,
      event_category: 'content',
      properties: { content_id: contentId },
    });
  }, [track]);

  const trackContentSaved = useCallback((contentId: string, contentType: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_SAVED,
      event_category: 'content',
      properties: { content_id: contentId, content_type: contentType, engagement_type: 'save' },
    });
  }, [track]);

  const trackContentShared = useCallback((props: ContentEngagementProps) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_SHARED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackContentDownloaded = useCallback((contentId: string, contentType: string) => {
    track({
      event_name: CONTENT_EVENTS.CONTENT_DOWNLOADED,
      event_category: 'content',
      properties: { content_id: contentId, content_type: contentType },
    });
  }, [track]);

  // ===== VIDEO PLAYBACK =====

  const trackVideoPlayStarted = useCallback((props: VideoPlaybackProps) => {
    videoStartTime.current.set(props.content_id, Date.now());
    track({
      event_name: CONTENT_EVENTS.VIDEO_PLAY_STARTED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackVideoPaused = useCallback((props: VideoPlaybackProps) => {
    track({
      event_name: CONTENT_EVENTS.VIDEO_PLAY_PAUSED,
      event_category: 'content',
      properties: props,
    });
  }, [track]);

  const trackVideoProgress = useCallback((props: VideoPlaybackProps) => {
    // Trackear en 25%, 50%, 75%, 100%
    const milestones = [25, 50, 75, 100];
    if (milestones.includes(Math.round(props.percent_watched))) {
      track({
        event_name: CONTENT_EVENTS.VIDEO_PROGRESS,
        event_category: 'content',
        properties: props,
      });
    }
  }, [track]);

  const trackVideoCompleted = useCallback((props: VideoPlaybackProps) => {
    const startTime = videoStartTime.current.get(props.content_id);
    const watchDuration = startTime ? Math.round((Date.now() - startTime) / 1000) : undefined;
    videoStartTime.current.delete(props.content_id);

    track({
      event_name: CONTENT_EVENTS.VIDEO_PLAY_COMPLETED,
      event_category: 'content',
      properties: { ...props, watch_duration_seconds: watchDuration },
    });
  }, [track]);

  return {
    // Upload
    trackUploadStarted,
    trackUploadProgress,
    trackUploadCompleted,
    trackUploadFailed,
    trackUploadCancelled,

    // Lifecycle
    trackContentCreated,
    trackContentViewed,
    trackContentViewEnded,
    trackContentEdited,
    trackContentDeleted,

    // Review
    trackContentSubmitted,
    trackContentApproved,
    trackContentRejected,
    trackRevisionRequested,

    // Engagement
    trackContentLiked,
    trackContentUnliked,
    trackContentSaved,
    trackContentShared,
    trackContentDownloaded,

    // Video
    trackVideoPlayStarted,
    trackVideoPaused,
    trackVideoProgress,
    trackVideoCompleted,
  };
}
