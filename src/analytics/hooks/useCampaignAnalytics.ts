import { useCallback } from 'react';
import { useAnalyticsContext } from '../context';
import { CAMPAIGN_EVENTS } from '../constants';
import type {
  CampaignCreatedProps,
  CampaignStatusProps,
  CreatorInCampaignProps,
  CampaignSubmissionProps,
} from '../types';

export function useCampaignAnalytics() {
  const { track } = useAnalyticsContext();

  // ===== CAMPAIGN LIFECYCLE =====

  const trackCampaignCreated = useCallback((props: CampaignCreatedProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_CREATED,
      event_category: 'campaign',
      properties: props,
    });
  }, [track]);

  const trackCampaignViewed = useCallback((campaignId: string, viewSource: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_VIEWED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, view_source: viewSource },
    });
  }, [track]);

  const trackCampaignUpdated = useCallback((campaignId: string, fieldsUpdated: string[]) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_UPDATED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, fields_updated: fieldsUpdated },
    });
  }, [track]);

  const trackCampaignDeleted = useCallback((campaignId: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_DELETED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId },
    });
  }, [track]);

  const trackCampaignDuplicated = useCallback((originalId: string, newId: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_DUPLICATED,
      event_category: 'campaign',
      properties: { original_campaign_id: originalId, new_campaign_id: newId },
    });
  }, [track]);

  // ===== STATUS CHANGES =====

  const trackCampaignPublished = useCallback((props: CampaignStatusProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_PUBLISHED,
      event_category: 'campaign',
      properties: { ...props, new_status: 'published' },
    });
  }, [track]);

  const trackCampaignPaused = useCallback((campaignId: string, reason?: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_PAUSED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, new_status: 'paused', reason },
    });
  }, [track]);

  const trackCampaignResumed = useCallback((campaignId: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_RESUMED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, new_status: 'active' },
    });
  }, [track]);

  const trackCampaignCompleted = useCallback((
    campaignId: string,
    stats: { creators_count: number; submissions_count: number; total_spend_usd?: number }
  ) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_COMPLETED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, new_status: 'completed', ...stats },
    });
  }, [track]);

  const trackCampaignCancelled = useCallback((campaignId: string, reason: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_CANCELLED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, new_status: 'cancelled', reason },
    });
  }, [track]);

  // ===== CREATOR MANAGEMENT =====

  const trackCreatorInvited = useCallback((props: CreatorInCampaignProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.CREATOR_INVITED,
      event_category: 'campaign',
      properties: { ...props, action: 'invited' },
    });
  }, [track]);

  const trackCreatorApplied = useCallback((props: CreatorInCampaignProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.CREATOR_APPLIED,
      event_category: 'campaign',
      properties: { ...props, action: 'applied' },
    });
  }, [track]);

  const trackCreatorAccepted = useCallback((props: CreatorInCampaignProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.CREATOR_ACCEPTED,
      event_category: 'campaign',
      properties: { ...props, action: 'accepted' },
    });
  }, [track]);

  const trackCreatorRejected = useCallback((props: CreatorInCampaignProps & { reason: string }) => {
    track({
      event_name: CAMPAIGN_EVENTS.CREATOR_REJECTED,
      event_category: 'campaign',
      properties: { ...props, action: 'rejected' },
    });
  }, [track]);

  const trackCreatorRemoved = useCallback((campaignId: string, creatorId: string, reason?: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CREATOR_REMOVED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, creator_id: creatorId, action: 'removed', reason },
    });
  }, [track]);

  const trackCreatorCompleted = useCallback((campaignId: string, creatorId: string, submissionsCount: number) => {
    track({
      event_name: CAMPAIGN_EVENTS.CREATOR_COMPLETED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, creator_id: creatorId, action: 'completed', submissions_count: submissionsCount },
    });
  }, [track]);

  // ===== SUBMISSIONS =====

  const trackSubmissionReceived = useCallback((props: CampaignSubmissionProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.SUBMISSION_RECEIVED,
      event_category: 'campaign',
      properties: props,
    });
  }, [track]);

  const trackSubmissionReviewed = useCallback((props: CampaignSubmissionProps) => {
    track({
      event_name: CAMPAIGN_EVENTS.SUBMISSION_REVIEWED,
      event_category: 'campaign',
      properties: props,
    });
  }, [track]);

  // ===== REPORTS =====

  const trackReportViewed = useCallback((campaignId: string, reportType: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_REPORT_VIEWED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, report_type: reportType },
    });
  }, [track]);

  const trackReportExported = useCallback((campaignId: string, format: string) => {
    track({
      event_name: CAMPAIGN_EVENTS.CAMPAIGN_REPORT_EXPORTED,
      event_category: 'campaign',
      properties: { campaign_id: campaignId, export_format: format },
    });
  }, [track]);

  return {
    // Lifecycle
    trackCampaignCreated,
    trackCampaignViewed,
    trackCampaignUpdated,
    trackCampaignDeleted,
    trackCampaignDuplicated,

    // Status
    trackCampaignPublished,
    trackCampaignPaused,
    trackCampaignResumed,
    trackCampaignCompleted,
    trackCampaignCancelled,

    // Creators
    trackCreatorInvited,
    trackCreatorApplied,
    trackCreatorAccepted,
    trackCreatorRejected,
    trackCreatorRemoved,
    trackCreatorCompleted,

    // Submissions
    trackSubmissionReceived,
    trackSubmissionReviewed,

    // Reports
    trackReportViewed,
    trackReportExported,
  };
}
