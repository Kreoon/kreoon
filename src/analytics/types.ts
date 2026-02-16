// src/analytics/types.ts

import type { EventCategory, AnalyticsEventName } from './constants';

/**
 * KREOON ANALYTICS ENGINE - Event Property Types
 * Tipos específicos para las propiedades de cada grupo de eventos
 */

// ============================================================
// BASE TYPES
// ============================================================

export interface BaseEventProperties {
  [key: string]: string | number | boolean | null | undefined | object;
}

export interface TimestampedEvent {
  client_timestamp: string;
  server_timestamp?: string;
}

// ============================================================
// AUTH EVENT PROPERTIES
// ============================================================

export interface SignupStartedProps extends BaseEventProperties {
  signup_method: 'email' | 'google' | 'facebook' | 'apple';
  referral_code?: string;
  landing_page?: string;
}

export interface SignupCompletedProps extends BaseEventProperties {
  signup_method: 'email' | 'google' | 'facebook' | 'apple';
  user_role: 'creator' | 'brand' | 'agency';
  referral_code?: string;
  time_to_complete_seconds?: number;
}

export interface LoginProps extends BaseEventProperties {
  login_method: 'email' | 'google' | 'facebook' | 'apple';
  remember_me?: boolean;
}

export interface OAuthProps extends BaseEventProperties {
  provider: 'google' | 'facebook' | 'apple';
  scope?: string;
}

// ============================================================
// ONBOARDING EVENT PROPERTIES
// ============================================================

export interface OnboardingStepProps extends BaseEventProperties {
  step_number: number;
  step_name: string;
  total_steps: number;
  time_on_step_seconds?: number;
}

export interface RoleSelectedProps extends BaseEventProperties {
  role: 'creator' | 'brand' | 'agency';
  previous_role?: string;
}

export interface InterestsSelectedProps extends BaseEventProperties {
  interests: string[];
  interests_count: number;
}

// ============================================================
// PROFILE EVENT PROPERTIES
// ============================================================

export interface ProfileViewedProps extends BaseEventProperties {
  profile_id: string;
  profile_owner: 'self' | 'other';
  view_source: 'search' | 'campaign' | 'direct' | 'feed' | 'recommendation';
}

export interface ProfileUpdatedProps extends BaseEventProperties {
  fields_updated: string[];
  completion_percentage?: number;
}

export interface SocialLinkProps extends BaseEventProperties {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin' | 'website' | 'other';
  url?: string;
}

// ============================================================
// ORGANIZATION EVENT PROPERTIES
// ============================================================

export interface OrgCreatedProps extends BaseEventProperties {
  org_type: 'brand' | 'agency' | 'personal';
  org_size?: 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
}

export interface MemberInvitedProps extends BaseEventProperties {
  invite_method: 'email' | 'link';
  role_assigned: string;
  invitee_email_domain?: string;
}

export interface MemberRoleChangedProps extends BaseEventProperties {
  member_id: string;
  old_role: string;
  new_role: string;
}

// ============================================================
// CONTENT EVENT PROPERTIES
// ============================================================

export interface ContentUploadProps extends BaseEventProperties {
  content_type: 'video' | 'image' | 'document' | 'audio';
  file_size_bytes: number;
  file_format: string;
  duration_seconds?: number;
  resolution?: string;
  source: 'upload' | 'camera' | 'screen_record' | 'import';
}

export interface ContentViewedProps extends BaseEventProperties {
  content_id: string;
  content_type: 'video' | 'image' | 'document';
  view_source: 'feed' | 'portfolio' | 'campaign' | 'project' | 'search' | 'direct';
  view_duration_seconds?: number;
}

export interface ContentReviewProps extends BaseEventProperties {
  content_id: string;
  review_action: 'approve' | 'reject' | 'request_revision';
  feedback_provided: boolean;
  revision_count?: number;
  time_to_review_hours?: number;
}

export interface ContentEngagementProps extends BaseEventProperties {
  content_id: string;
  content_type: 'video' | 'image';
  engagement_type: 'like' | 'save' | 'share' | 'comment' | 'download';
  share_destination?: 'whatsapp' | 'email' | 'link' | 'twitter' | 'facebook';
}

export interface VideoPlaybackProps extends BaseEventProperties {
  content_id: string;
  video_duration_seconds: number;
  current_time_seconds: number;
  percent_watched: number;
  playback_quality?: string;
  is_muted: boolean;
  is_fullscreen: boolean;
}

// ============================================================
// PROJECT EVENT PROPERTIES
// ============================================================

export interface ProjectCreatedProps extends BaseEventProperties {
  project_type?: string;
  template_used?: string;
  budget_range?: string;
  deadline_days?: number;
}

export interface ProjectViewedProps extends BaseEventProperties {
  project_id: string;
  view_source: 'list' | 'notification' | 'search' | 'direct';
  user_role_in_project: 'owner' | 'collaborator' | 'viewer';
}

export interface DeliverableProps extends BaseEventProperties {
  project_id: string;
  deliverable_type: string;
  deliverable_count: number;
}

export interface MilestoneProps extends BaseEventProperties {
  project_id: string;
  milestone_name: string;
  milestone_number: number;
  days_until_deadline?: number;
}

// ============================================================
// CAMPAIGN EVENT PROPERTIES
// ============================================================

export interface CampaignCreatedProps extends BaseEventProperties {
  campaign_type: 'ugc' | 'influencer' | 'ambassador' | 'contest';
  budget_usd?: number;
  target_creators_count?: number;
  duration_days?: number;
  content_types_required: string[];
  platforms_targeted: string[];
}

export interface CampaignStatusProps extends BaseEventProperties {
  campaign_id: string;
  old_status?: string;
  new_status: string;
  reason?: string;
}

export interface CreatorInCampaignProps extends BaseEventProperties {
  campaign_id: string;
  creator_id: string;
  action: 'invited' | 'applied' | 'accepted' | 'rejected' | 'removed' | 'completed';
  rejection_reason?: string;
  creator_followers_count?: number;
}

export interface CampaignSubmissionProps extends BaseEventProperties {
  campaign_id: string;
  submission_id: string;
  content_type: 'video' | 'image' | 'carousel';
  submission_number: number;
  review_status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
}

// ============================================================
// PORTFOLIO EVENT PROPERTIES
// ============================================================

export interface StoryProps extends BaseEventProperties {
  story_id: string;
  story_type?: string;
  cards_count?: number;
  is_public: boolean;
}

export interface CardProps extends BaseEventProperties {
  story_id: string;
  card_id: string;
  card_type: 'video' | 'image' | 'text' | 'embed' | 'gallery';
  card_position: number;
}

export interface PortfolioVisitProps extends BaseEventProperties {
  portfolio_owner_id: string;
  visit_source: 'direct' | 'search' | 'campaign' | 'referral' | 'social';
  referrer_url?: string;
  is_owner: boolean;
}

export interface BoardProps extends BaseEventProperties {
  board_id: string;
  column_count: number;
  card_count: number;
  filter_applied?: string;
}

// ============================================================
// CHAT EVENT PROPERTIES
// ============================================================

export interface ConversationProps extends BaseEventProperties {
  conversation_id: string;
  conversation_type: 'direct' | 'group' | 'campaign' | 'project';
  participants_count: number;
}

export interface MessageProps extends BaseEventProperties {
  conversation_id: string;
  message_type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';
  message_length?: number;
  has_attachment: boolean;
  attachment_type?: string;
  is_reply: boolean;
}

// ============================================================
// AI EVENT PROPERTIES
// ============================================================

export interface DNAWizardProps extends BaseEventProperties {
  product_id?: string;
  step_number?: number;
  total_steps: number;
  input_method: 'url' | 'upload' | 'manual';
  analysis_type?: string;
}

export interface AIAnalysisProps extends BaseEventProperties {
  analysis_type: 'product_dna' | 'competitor' | 'market' | 'content' | 'script';
  model_used: string;
  input_tokens?: number;
  output_tokens?: number;
  response_time_ms?: number;
  success: boolean;
  error_code?: string;
}

export interface ScriptGenerationProps extends BaseEventProperties {
  script_type: 'hook' | 'product' | 'testimonial' | 'educational' | 'custom';
  duration_target_seconds?: number;
  tone?: string;
  platform_target?: 'tiktok' | 'instagram' | 'youtube' | 'general';
  word_count?: number;
}

export interface AISuggestionProps extends BaseEventProperties {
  suggestion_type: string;
  suggestion_context: string;
  action: 'shown' | 'accepted' | 'rejected' | 'modified';
  modification_percentage?: number;
}

export interface AITokenUsageProps extends BaseEventProperties {
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number;
  feature_used: string;
}

// ============================================================
// BILLING EVENT PROPERTIES
// ============================================================

export interface PlanViewedProps extends BaseEventProperties {
  plan_id: string;
  plan_name: string;
  plan_price_usd: number;
  billing_cycle: 'monthly' | 'yearly';
  is_current_plan: boolean;
}

export interface CheckoutProps extends BaseEventProperties {
  plan_id: string;
  plan_name: string;
  billing_cycle: 'monthly' | 'yearly';
  price_usd: number;
  discount_code?: string;
  discount_amount_usd?: number;
  step_name?: string;
  step_number?: number;
}

export interface PaymentProps extends BaseEventProperties {
  payment_method: 'card' | 'paypal' | 'bank_transfer' | 'crypto';
  amount_usd: number;
  currency: string;
  plan_id?: string;
  is_recurring: boolean;
  failure_reason?: string;
}

export interface SubscriptionProps extends BaseEventProperties {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  amount_usd: number;
  billing_cycle: 'monthly' | 'yearly';
  action: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'renewed' | 'reactivated';
  previous_plan?: string;
  cancellation_reason?: string;
}

export interface TrialProps extends BaseEventProperties {
  trial_days: number;
  plan_id: string;
  plan_name: string;
  days_remaining?: number;
  converted: boolean;
}

// ============================================================
// DISCOVERY EVENT PROPERTIES
// ============================================================

export interface SearchProps extends BaseEventProperties {
  query: string;
  query_length: number;
  search_type: 'creators' | 'content' | 'campaigns' | 'projects' | 'global';
  results_count: number;
  filters_applied: string[];
  page_number: number;
}

export interface SearchResultClickedProps extends BaseEventProperties {
  query: string;
  result_type: 'creator' | 'content' | 'campaign' | 'project';
  result_id: string;
  result_position: number;
  total_results: number;
}

export interface FeedProps extends BaseEventProperties {
  feed_type: 'home' | 'discover' | 'following' | 'trending';
  items_loaded: number;
  scroll_depth_percent?: number;
}

export interface CreatorDiscoveryProps extends BaseEventProperties {
  creator_id: string;
  discovery_source: 'search' | 'feed' | 'recommendation' | 'campaign' | 'similar';
  creator_category?: string;
  creator_followers_count?: number;
}

// ============================================================
// SETTINGS EVENT PROPERTIES
// ============================================================

export interface NotificationSettingsProps extends BaseEventProperties {
  notification_type: string;
  channel: 'email' | 'push' | 'in_app' | 'sms';
  enabled: boolean;
}

export interface IntegrationProps extends BaseEventProperties {
  integration_name: string;
  integration_type: 'social' | 'analytics' | 'storage' | 'payment' | 'crm';
  action: 'connected' | 'disconnected' | 'configured';
}

export interface APIKeyProps extends BaseEventProperties {
  key_name: string;
  permissions: string[];
  action: 'created' | 'revoked';
}

// ============================================================
// NAVIGATION EVENT PROPERTIES
// ============================================================

export interface PageViewProps extends BaseEventProperties {
  page_path: string;
  page_title: string;
  page_type: 'landing' | 'dashboard' | 'detail' | 'list' | 'form' | 'settings' | 'auth';
  referrer?: string;
  time_on_previous_page_seconds?: number;
}

export interface NavigationClickProps extends BaseEventProperties {
  element_type: 'link' | 'button' | 'menu_item' | 'tab' | 'breadcrumb';
  element_text?: string;
  element_id?: string;
  destination?: string;
  navigation_area: 'header' | 'sidebar' | 'footer' | 'content' | 'modal';
}

export interface ModalProps extends BaseEventProperties {
  modal_name: string;
  modal_type: 'dialog' | 'drawer' | 'popup' | 'overlay';
  trigger_source?: string;
  time_open_seconds?: number;
}

// ============================================================
// ERROR EVENT PROPERTIES
// ============================================================

export interface ErrorProps extends BaseEventProperties {
  error_code?: string;
  error_message: string;
  error_type: 'client' | 'server' | 'network' | 'validation' | 'permission';
  error_source: string;
  stack_trace?: string;
  user_action_before_error?: string;
  is_fatal: boolean;
}

export interface APIErrorProps extends BaseEventProperties {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  status_code: number;
  error_message: string;
  request_duration_ms?: number;
}

// ============================================================
// INTERACTION EVENT PROPERTIES
// ============================================================

export interface ButtonClickProps extends BaseEventProperties {
  button_id?: string;
  button_text?: string;
  button_type: 'primary' | 'secondary' | 'tertiary' | 'icon' | 'link';
  button_location: string;
}

export interface FormProps extends BaseEventProperties {
  form_id?: string;
  form_name: string;
  form_type: string;
  fields_count: number;
  time_to_complete_seconds?: number;
  validation_errors?: string[];
  abandoned_at_field?: string;
}

export interface ShareProps extends BaseEventProperties {
  content_type: string;
  content_id: string;
  share_method: 'copy_link' | 'whatsapp' | 'email' | 'twitter' | 'facebook' | 'linkedin' | 'native';
  share_url?: string;
}

export interface ScrollDepthProps extends BaseEventProperties {
  page_path: string;
  max_scroll_depth_percent: number;
  scroll_direction: 'down' | 'up';
  time_to_depth_seconds?: number;
}

// ============================================================
// CONVERSION EVENT PROPERTIES (High-value events for ads)
// ============================================================

export interface ConversionEventProps extends BaseEventProperties {
  conversion_type: 'signup' | 'trial_start' | 'subscription' | 'content_created';
  value_usd?: number;
  currency?: string;

  // Attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;

  // Click IDs
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
}

// ============================================================
// MAIN EVENT INTERFACE
// ============================================================

export interface AnalyticsEvent<T extends BaseEventProperties = BaseEventProperties> {
  event_name: AnalyticsEventName;
  event_category: EventCategory;
  properties: T;
  timestamp?: string;
}

// ============================================================
// EVENT PROPERTY MAP - Maps event names to their property types
// ============================================================

export interface EventPropertyMap {
  // Auth
  signup_started: SignupStartedProps;
  signup_completed: SignupCompletedProps;
  login: LoginProps;
  oauth_started: OAuthProps;
  oauth_completed: OAuthProps;

  // Onboarding
  onboarding_step_completed: OnboardingStepProps;
  role_selected: RoleSelectedProps;
  interests_selected: InterestsSelectedProps;

  // Profile
  profile_viewed: ProfileViewedProps;
  profile_updated: ProfileUpdatedProps;
  social_link_added: SocialLinkProps;

  // Organization
  org_created: OrgCreatedProps;
  member_invited: MemberInvitedProps;
  member_role_changed: MemberRoleChangedProps;

  // Content
  content_upload_started: ContentUploadProps;
  content_upload_completed: ContentUploadProps;
  content_viewed: ContentViewedProps;
  content_approved: ContentReviewProps;
  content_rejected: ContentReviewProps;
  content_liked: ContentEngagementProps;
  content_shared: ContentEngagementProps;
  video_play_started: VideoPlaybackProps;
  video_progress: VideoPlaybackProps;

  // Projects
  project_created: ProjectCreatedProps;
  project_viewed: ProjectViewedProps;
  deliverable_added: DeliverableProps;
  milestone_completed: MilestoneProps;

  // Campaigns
  campaign_created: CampaignCreatedProps;
  campaign_published: CampaignStatusProps;
  creator_invited: CreatorInCampaignProps;
  creator_accepted: CreatorInCampaignProps;
  campaign_submission_received: CampaignSubmissionProps;

  // Portfolio
  story_created: StoryProps;
  story_published: StoryProps;
  card_added: CardProps;
  portfolio_visited: PortfolioVisitProps;
  board_viewed: BoardProps;

  // Chat
  conversation_started: ConversationProps;
  message_sent: MessageProps;

  // AI
  dna_wizard_started: DNAWizardProps;
  dna_wizard_completed: DNAWizardProps;
  ai_analysis_requested: AIAnalysisProps;
  script_generated: ScriptGenerationProps;
  ai_suggestion_accepted: AISuggestionProps;
  ai_tokens_used: AITokenUsageProps;

  // Billing
  plan_viewed: PlanViewedProps;
  checkout_started: CheckoutProps;
  payment_completed: PaymentProps;
  subscription_created: SubscriptionProps;
  trial_started: TrialProps;

  // Discovery
  search_performed: SearchProps;
  search_result_clicked: SearchResultClickedProps;
  feed_viewed: FeedProps;
  creator_profile_viewed: CreatorDiscoveryProps;

  // Settings
  notification_settings_updated: NotificationSettingsProps;
  integration_connected: IntegrationProps;
  api_key_created: APIKeyProps;

  // Navigation
  page_view: PageViewProps;
  navigation_click: NavigationClickProps;
  modal_opened: ModalProps;

  // Errors
  error_occurred: ErrorProps;
  api_error: APIErrorProps;

  // Interactions
  button_clicked: ButtonClickProps;
  form_submitted: FormProps;
  share_completed: ShareProps;
  scroll_depth: ScrollDepthProps;

  // Conversions
  signup: ConversionEventProps;
  trial_start: ConversionEventProps;
  subscription: ConversionEventProps;
  content_created: ConversionEventProps;

  // Generic fallback
  [key: string]: BaseEventProperties;
}
