/**
 * KREOON ANALYTICS ENGINE - Event Constants
 * Todos los nombres de eventos como constantes para evitar typos
 */

// ============================================================
// AUTH EVENTS
// ============================================================
export const AUTH_EVENTS = {
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  SIGNUP_FAILED: 'signup_failed',
  LOGIN: 'login',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  EMAIL_VERIFIED: 'email_verified',
  OAUTH_STARTED: 'oauth_started',
  OAUTH_COMPLETED: 'oauth_completed',
  SESSION_EXPIRED: 'session_expired',
} as const;

// ============================================================
// ONBOARDING EVENTS
// ============================================================
export const ONBOARDING_EVENTS = {
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_STEP_SKIPPED: 'onboarding_step_skipped',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
  ROLE_SELECTED: 'role_selected',
  INTERESTS_SELECTED: 'interests_selected',
} as const;

// ============================================================
// PROFILE EVENTS
// ============================================================
export const PROFILE_EVENTS = {
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_UPDATED: 'profile_updated',
  AVATAR_CHANGED: 'avatar_changed',
  COVER_CHANGED: 'cover_changed',
  BIO_UPDATED: 'bio_updated',
  PORTFOLIO_URL_SET: 'portfolio_url_set',
  SOCIAL_LINK_ADDED: 'social_link_added',
  SOCIAL_LINK_REMOVED: 'social_link_removed',
  SKILLS_UPDATED: 'skills_updated',
  AVAILABILITY_UPDATED: 'availability_updated',
  RATE_UPDATED: 'rate_updated',
} as const;

// ============================================================
// ORGANIZATION EVENTS
// ============================================================
export const ORGANIZATION_EVENTS = {
  ORG_CREATED: 'org_created',
  ORG_UPDATED: 'org_updated',
  ORG_DELETED: 'org_deleted',
  ORG_SWITCHED: 'org_switched',
  MEMBER_INVITED: 'member_invited',
  MEMBER_INVITE_ACCEPTED: 'member_invite_accepted',
  MEMBER_INVITE_DECLINED: 'member_invite_declined',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  TEAM_CREATED: 'team_created',
  TEAM_UPDATED: 'team_updated',
  TEAM_DELETED: 'team_deleted',
  BRANDING_UPDATED: 'branding_updated',
  SETTINGS_UPDATED: 'org_settings_updated',
} as const;

// ============================================================
// CONTENT EVENTS
// ============================================================
export const CONTENT_EVENTS = {
  // Upload flow
  UPLOAD_STARTED: 'content_upload_started',
  UPLOAD_PROGRESS: 'content_upload_progress',
  UPLOAD_COMPLETED: 'content_upload_completed',
  UPLOAD_FAILED: 'content_upload_failed',
  UPLOAD_CANCELLED: 'content_upload_cancelled',

  // Content lifecycle
  CONTENT_CREATED: 'content_created',
  CONTENT_VIEWED: 'content_viewed',
  CONTENT_EDITED: 'content_edited',
  CONTENT_DELETED: 'content_deleted',
  CONTENT_DUPLICATED: 'content_duplicated',

  // Review flow
  CONTENT_SUBMITTED: 'content_submitted',
  CONTENT_APPROVED: 'content_approved',
  CONTENT_REJECTED: 'content_rejected',
  CONTENT_REVISION_REQUESTED: 'content_revision_requested',
  CONTENT_RESUBMITTED: 'content_resubmitted',

  // Engagement
  CONTENT_LIKED: 'content_liked',
  CONTENT_UNLIKED: 'content_unliked',
  CONTENT_SAVED: 'content_saved',
  CONTENT_UNSAVED: 'content_unsaved',
  CONTENT_SHARED: 'content_shared',
  CONTENT_COMMENTED: 'content_commented',
  CONTENT_DOWNLOADED: 'content_downloaded',

  // Video specific
  VIDEO_PLAY_STARTED: 'video_play_started',
  VIDEO_PLAY_PAUSED: 'video_play_paused',
  VIDEO_PLAY_RESUMED: 'video_play_resumed',
  VIDEO_PLAY_COMPLETED: 'video_play_completed',
  VIDEO_PROGRESS: 'video_progress',
  VIDEO_SEEK: 'video_seek',
  VIDEO_FULLSCREEN: 'video_fullscreen',
  VIDEO_MUTED: 'video_muted',
  VIDEO_UNMUTED: 'video_unmuted',
} as const;

// ============================================================
// PROJECT EVENTS
// ============================================================
export const PROJECT_EVENTS = {
  PROJECT_CREATED: 'project_created',
  PROJECT_VIEWED: 'project_viewed',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  PROJECT_ARCHIVED: 'project_archived',
  PROJECT_RESTORED: 'project_restored',
  PROJECT_DUPLICATED: 'project_duplicated',

  // Brief
  BRIEF_UPLOADED: 'brief_uploaded',
  BRIEF_UPDATED: 'brief_updated',
  BRIEF_DOWNLOADED: 'brief_downloaded',

  // Deliverables
  DELIVERABLE_ADDED: 'deliverable_added',
  DELIVERABLE_UPDATED: 'deliverable_updated',
  DELIVERABLE_REMOVED: 'deliverable_removed',
  DELIVERABLE_COMPLETED: 'deliverable_completed',

  // Timeline
  DEADLINE_SET: 'deadline_set',
  DEADLINE_UPDATED: 'deadline_updated',
  MILESTONE_CREATED: 'milestone_created',
  MILESTONE_COMPLETED: 'milestone_completed',

  // Collaboration
  COLLABORATOR_ADDED: 'collaborator_added',
  COLLABORATOR_REMOVED: 'collaborator_removed',
  COMMENT_ADDED: 'project_comment_added',
  FILE_ATTACHED: 'project_file_attached',
} as const;

// ============================================================
// CAMPAIGN EVENTS
// ============================================================
export const CAMPAIGN_EVENTS = {
  // Lifecycle
  CAMPAIGN_CREATED: 'campaign_created',
  CAMPAIGN_VIEWED: 'campaign_viewed',
  CAMPAIGN_UPDATED: 'campaign_updated',
  CAMPAIGN_DELETED: 'campaign_deleted',
  CAMPAIGN_DUPLICATED: 'campaign_duplicated',

  // Status changes
  CAMPAIGN_PUBLISHED: 'campaign_published',
  CAMPAIGN_PAUSED: 'campaign_paused',
  CAMPAIGN_RESUMED: 'campaign_resumed',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  CAMPAIGN_CANCELLED: 'campaign_cancelled',
  CAMPAIGN_EXTENDED: 'campaign_extended',

  // Creator management
  CREATOR_INVITED: 'creator_invited',
  CREATOR_APPLIED: 'creator_applied',
  CREATOR_ACCEPTED: 'creator_accepted',
  CREATOR_REJECTED: 'creator_rejected',
  CREATOR_REMOVED: 'creator_removed',
  CREATOR_COMPLETED: 'creator_completed',

  // Content in campaign
  SUBMISSION_RECEIVED: 'campaign_submission_received',
  SUBMISSION_REVIEWED: 'campaign_submission_reviewed',
  SUBMISSION_APPROVED: 'campaign_submission_approved',
  SUBMISSION_REJECTED: 'campaign_submission_rejected',

  // Analytics
  CAMPAIGN_REPORT_VIEWED: 'campaign_report_viewed',
  CAMPAIGN_REPORT_EXPORTED: 'campaign_report_exported',
} as const;

// ============================================================
// PORTFOLIO / STORIES EVENTS
// ============================================================
export const PORTFOLIO_EVENTS = {
  // Story lifecycle
  STORY_CREATED: 'story_created',
  STORY_VIEWED: 'story_viewed',
  STORY_UPDATED: 'story_updated',
  STORY_DELETED: 'story_deleted',
  STORY_PUBLISHED: 'story_published',
  STORY_UNPUBLISHED: 'story_unpublished',
  STORY_DUPLICATED: 'story_duplicated',

  // Cards
  CARD_ADDED: 'card_added',
  CARD_UPDATED: 'card_updated',
  CARD_DELETED: 'card_deleted',
  CARD_REORDERED: 'card_reordered',
  CARD_DUPLICATED: 'card_duplicated',

  // Engagement
  STORY_SHARED: 'story_shared',
  STORY_LIKED: 'story_liked',
  STORY_COMMENTED: 'story_commented',

  // Portfolio page
  PORTFOLIO_VISITED: 'portfolio_visited',
  PORTFOLIO_SHARED: 'portfolio_shared',
  PORTFOLIO_CONTACT_CLICKED: 'portfolio_contact_clicked',
  PORTFOLIO_CTA_CLICKED: 'portfolio_cta_clicked',

  // Board (Kanban)
  BOARD_VIEWED: 'board_viewed',
  BOARD_CARD_MOVED: 'board_card_moved',
  BOARD_COLUMN_CREATED: 'board_column_created',
  BOARD_FILTERED: 'board_filtered',
} as const;

// ============================================================
// CHAT / MESSAGING EVENTS
// ============================================================
export const CHAT_EVENTS = {
  CONVERSATION_STARTED: 'conversation_started',
  CONVERSATION_OPENED: 'conversation_opened',
  CONVERSATION_CLOSED: 'conversation_closed',
  CONVERSATION_ARCHIVED: 'conversation_archived',
  CONVERSATION_UNARCHIVED: 'conversation_unarchived',
  CONVERSATION_MUTED: 'conversation_muted',
  CONVERSATION_UNMUTED: 'conversation_unmuted',

  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_READ: 'message_read',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_EDITED: 'message_edited',

  ATTACHMENT_SENT: 'attachment_sent',
  ATTACHMENT_DOWNLOADED: 'attachment_downloaded',

  TYPING_STARTED: 'typing_started',
  REACTION_ADDED: 'reaction_added',
} as const;

// ============================================================
// AI TOOLS EVENTS
// ============================================================
export const AI_EVENTS = {
  // DNA Wizard
  DNA_WIZARD_STARTED: 'dna_wizard_started',
  DNA_WIZARD_STEP_COMPLETED: 'dna_wizard_step_completed',
  DNA_WIZARD_COMPLETED: 'dna_wizard_completed',
  DNA_WIZARD_ABANDONED: 'dna_wizard_abandoned',
  DNA_ANALYSIS_GENERATED: 'dna_analysis_generated',
  DNA_ANALYSIS_REGENERATED: 'dna_analysis_regenerated',
  DNA_ANALYSIS_EXPORTED: 'dna_analysis_exported',

  // Script generation
  SCRIPT_GENERATION_STARTED: 'script_generation_started',
  SCRIPT_GENERATED: 'script_generated',
  SCRIPT_REGENERATED: 'script_regenerated',
  SCRIPT_COPIED: 'script_copied',
  SCRIPT_EXPORTED: 'script_exported',

  // AI Analysis
  AI_ANALYSIS_REQUESTED: 'ai_analysis_requested',
  AI_ANALYSIS_COMPLETED: 'ai_analysis_completed',
  AI_ANALYSIS_FAILED: 'ai_analysis_failed',

  // AI Suggestions
  AI_SUGGESTION_SHOWN: 'ai_suggestion_shown',
  AI_SUGGESTION_ACCEPTED: 'ai_suggestion_accepted',
  AI_SUGGESTION_REJECTED: 'ai_suggestion_rejected',
  AI_SUGGESTION_MODIFIED: 'ai_suggestion_modified',

  // AI Chat (KIRO)
  AI_CHAT_STARTED: 'ai_chat_started',
  AI_CHAT_MESSAGE_SENT: 'ai_chat_message_sent',
  AI_CHAT_RESPONSE_RECEIVED: 'ai_chat_response_received',

  // Token usage
  AI_TOKENS_USED: 'ai_tokens_used',
  AI_QUOTA_WARNING: 'ai_quota_warning',
  AI_QUOTA_EXCEEDED: 'ai_quota_exceeded',
} as const;

// ============================================================
// BILLING EVENTS
// ============================================================
export const BILLING_EVENTS = {
  // Plans
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  PLAN_VIEWED: 'plan_viewed',
  PLAN_COMPARED: 'plan_compared',
  PLAN_SELECTED: 'plan_selected',

  // Checkout
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_STEP_COMPLETED: 'checkout_step_completed',
  CHECKOUT_ABANDONED: 'checkout_abandoned',

  // Payment
  PAYMENT_METHOD_ADDED: 'payment_method_added',
  PAYMENT_METHOD_UPDATED: 'payment_method_updated',
  PAYMENT_METHOD_REMOVED: 'payment_method_removed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Subscription
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',

  // Trial
  TRIAL_STARTED: 'trial_started',
  TRIAL_EXTENDED: 'trial_extended',
  TRIAL_CONVERTED: 'trial_converted',
  TRIAL_EXPIRED: 'trial_expired',

  // Invoices
  INVOICE_VIEWED: 'invoice_viewed',
  INVOICE_DOWNLOADED: 'invoice_downloaded',
  INVOICE_PAID: 'invoice_paid',

  // Usage
  USAGE_LIMIT_WARNING: 'usage_limit_warning',
  USAGE_LIMIT_REACHED: 'usage_limit_reached',
} as const;

// ============================================================
// SEARCH & DISCOVERY EVENTS
// ============================================================
export const DISCOVERY_EVENTS = {
  // Search
  SEARCH_PERFORMED: 'search_performed',
  SEARCH_RESULT_CLICKED: 'search_result_clicked',
  SEARCH_NO_RESULTS: 'search_no_results',
  SEARCH_FILTER_APPLIED: 'search_filter_applied',
  SEARCH_FILTER_CLEARED: 'search_filter_cleared',
  SEARCH_SORT_CHANGED: 'search_sort_changed',

  // Discovery
  FEED_VIEWED: 'feed_viewed',
  FEED_REFRESHED: 'feed_refreshed',
  FEED_SCROLLED: 'feed_scrolled',
  FEED_END_REACHED: 'feed_end_reached',

  // Creator discovery
  CREATOR_PROFILE_VIEWED: 'creator_profile_viewed',
  CREATOR_CONTACTED: 'creator_contacted',
  CREATOR_SAVED: 'creator_saved',
  CREATOR_UNSAVED: 'creator_unsaved',
  CREATOR_FOLLOWED: 'creator_followed',
  CREATOR_UNFOLLOWED: 'creator_unfollowed',
  CREATOR_REPORTED: 'creator_reported',
  CREATOR_BLOCKED: 'creator_blocked',

  // Recommendations
  RECOMMENDATION_SHOWN: 'recommendation_shown',
  RECOMMENDATION_CLICKED: 'recommendation_clicked',
  RECOMMENDATION_DISMISSED: 'recommendation_dismissed',
} as const;

// ============================================================
// SETTINGS EVENTS
// ============================================================
export const SETTINGS_EVENTS = {
  SETTINGS_PAGE_VIEWED: 'settings_page_viewed',
  SETTINGS_TAB_CHANGED: 'settings_tab_changed',

  // Notifications
  NOTIFICATION_SETTINGS_UPDATED: 'notification_settings_updated',
  EMAIL_PREFERENCES_UPDATED: 'email_preferences_updated',
  PUSH_ENABLED: 'push_enabled',
  PUSH_DISABLED: 'push_disabled',

  // Privacy
  PRIVACY_SETTINGS_UPDATED: 'privacy_settings_updated',
  DATA_EXPORT_REQUESTED: 'data_export_requested',
  DATA_DELETION_REQUESTED: 'data_deletion_requested',

  // Integrations
  INTEGRATION_CONNECTED: 'integration_connected',
  INTEGRATION_DISCONNECTED: 'integration_disconnected',
  INTEGRATION_CONFIGURED: 'integration_configured',

  // API
  API_KEY_CREATED: 'api_key_created',
  API_KEY_REVOKED: 'api_key_revoked',
  WEBHOOK_CREATED: 'webhook_created',
  WEBHOOK_UPDATED: 'webhook_updated',
  WEBHOOK_DELETED: 'webhook_deleted',
} as const;

// ============================================================
// NAVIGATION EVENTS
// ============================================================
export const NAVIGATION_EVENTS = {
  PAGE_VIEW: 'page_view',
  NAVIGATION_CLICK: 'navigation_click',
  BREADCRUMB_CLICK: 'breadcrumb_click',
  TAB_CHANGED: 'tab_changed',
  MODAL_OPENED: 'modal_opened',
  MODAL_CLOSED: 'modal_closed',
  DRAWER_OPENED: 'drawer_opened',
  DRAWER_CLOSED: 'drawer_closed',
  TOOLTIP_SHOWN: 'tooltip_shown',
  HELP_CLICKED: 'help_clicked',
  EXTERNAL_LINK_CLICKED: 'external_link_clicked',
} as const;

// ============================================================
// ERROR EVENTS
// ============================================================
export const ERROR_EVENTS = {
  ERROR_OCCURRED: 'error_occurred',
  ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
  PERMISSION_DENIED: 'permission_denied',
  NOT_FOUND: 'not_found',
  TIMEOUT: 'timeout',
  NETWORK_ERROR: 'network_error',
} as const;

// ============================================================
// ENGAGEMENT / INTERACTION EVENTS
// ============================================================
export const INTERACTION_EVENTS = {
  BUTTON_CLICKED: 'button_clicked',
  LINK_CLICKED: 'link_clicked',
  FORM_STARTED: 'form_started',
  FORM_FIELD_FOCUSED: 'form_field_focused',
  FORM_FIELD_COMPLETED: 'form_field_completed',
  FORM_SUBMITTED: 'form_submitted',
  FORM_ABANDONED: 'form_abandoned',
  FORM_ERROR: 'form_error',

  COPY_TO_CLIPBOARD: 'copy_to_clipboard',
  DOWNLOAD_STARTED: 'download_started',
  DOWNLOAD_COMPLETED: 'download_completed',
  SHARE_INITIATED: 'share_initiated',
  SHARE_COMPLETED: 'share_completed',

  DRAG_STARTED: 'drag_started',
  DRAG_COMPLETED: 'drag_completed',

  SCROLL_DEPTH: 'scroll_depth',
  TIME_ON_PAGE: 'time_on_page',
} as const;

// ============================================================
// ALL EVENTS - Combined export
// ============================================================
export const ANALYTICS_EVENTS = {
  ...AUTH_EVENTS,
  ...ONBOARDING_EVENTS,
  ...PROFILE_EVENTS,
  ...ORGANIZATION_EVENTS,
  ...CONTENT_EVENTS,
  ...PROJECT_EVENTS,
  ...CAMPAIGN_EVENTS,
  ...PORTFOLIO_EVENTS,
  ...CHAT_EVENTS,
  ...AI_EVENTS,
  ...BILLING_EVENTS,
  ...DISCOVERY_EVENTS,
  ...SETTINGS_EVENTS,
  ...NAVIGATION_EVENTS,
  ...ERROR_EVENTS,
  ...INTERACTION_EVENTS,
} as const;

// Type for all event names
export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Event categories
export type EventCategory =
  | 'auth'
  | 'onboarding'
  | 'profile'
  | 'organization'
  | 'content'
  | 'project'
  | 'campaign'
  | 'portfolio'
  | 'chat'
  | 'ai'
  | 'billing'
  | 'discovery'
  | 'settings'
  | 'navigation'
  | 'error'
  | 'interaction'
  | 'conversion';
