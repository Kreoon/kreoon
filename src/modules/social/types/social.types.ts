// ── Social Hub Types ─────────────────────────────────────────────────────

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'twitter'
  | 'linkedin'
  | 'pinterest'
  | 'threads';

export type ScheduledPostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'partially_published'
  | 'failed'
  | 'cancelled';

export type SocialPostType =
  | 'post'
  | 'reel'
  | 'story'
  | 'short'
  | 'carousel'
  | 'thread'
  | 'pin';

// ── Social Account ───────────────────────────────────────────────────────

export type SocialAccountOwnerType = 'user' | 'brand' | 'organization' | 'client';
export type SocialAccountType = 'personal' | 'business' | 'creator' | 'page';

export interface SocialAccount {
  id: string;
  user_id: string;
  organization_id: string | null;
  platform: SocialPlatform;
  platform_user_id: string;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  platform_page_id: string | null;
  platform_page_name: string | null;
  is_active: boolean;
  scopes: string[];
  token_expires_at: string | null;
  connected_at: string;
  last_synced_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // v2 fields
  owner_type: SocialAccountOwnerType;
  brand_id: string | null;
  client_id: string | null;
  account_type: SocialAccountType;
  settings: Record<string, unknown>;
  platform_metadata: Record<string, unknown>;
  // Populated by RPC
  client_name?: string;
  client_logo_url?: string;
  groups?: AccountGroupRef[];
  permissions?: AccountPermissionRef[];
}

// ── Publish Result per account ──────────────────────────────────────────

export interface PublishResult {
  account_id: string;
  platform: SocialPlatform;
  platform_post_id?: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  published_at?: string;
}

// ── Target Account ──────────────────────────────────────────────────────

export interface TargetAccount {
  account_id: string;
  platform: SocialPlatform;
}

// ── Scheduled Post ──────────────────────────────────────────────────────

export interface ScheduledPost {
  id: string;
  user_id: string;
  organization_id: string | null;
  content_id: string | null;
  caption: string | null;
  hashtags: string[];
  scheduled_at: string | null;
  published_at: string | null;
  status: ScheduledPostStatus;
  post_type: SocialPostType;
  visibility: string;
  first_comment: string | null;
  location_name: string | null;
  media_urls: string[];
  thumbnail_url: string | null;
  target_accounts: TargetAccount[];
  publish_results: PublishResult[];
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ── Social Metrics ──────────────────────────────────────────────────────

export interface SocialMetrics {
  id: string;
  social_account_id: string;
  scheduled_post_id: string | null;
  platform_post_id: string | null;
  metric_type: 'post' | 'account' | 'story';
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  video_views: number;
  watch_time_seconds: number;
  followers_count: number;
  followers_gained: number;
  profile_visits: number;
  metadata: Record<string, unknown>;
  recorded_at: string;
  created_at: string;
}

// ── Publish Log ─────────────────────────────────────────────────────────

export interface SocialPublishLog {
  id: string;
  scheduled_post_id: string;
  social_account_id: string;
  platform: SocialPlatform;
  action: string;
  status: string;
  platform_post_id: string | null;
  platform_response: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ── Platform Config (static) ────────────────────────────────────────────

export interface PlatformConfig {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  maxCaptionLength: number;
  supportsVideo: boolean;
  supportsImage: boolean;
  supportsCarousel: boolean;
  supportsStories: boolean;
  supportsReels: boolean;
  supportsScheduling: boolean;
  maxMediaCount: number;
  maxVideoSizeMB: number;
  maxImageSizeMB: number;
  supportedPostTypes: SocialPostType[];
}

// ── Composer Form Data ──────────────────────────────────────────────────

export interface ComposerFormData {
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  thumbnailUrl: string | null;
  scheduledAt: Date | null;
  postType: SocialPostType;
  visibility: string;
  firstComment: string;
  locationName: string;
  targetAccountIds: string[];
  contentId: string | null;
  campaignId?: string | null;
  projectId?: string | null;
  brandCollaboration?: BrandCollaboration | null;
}

// ── Metrics Summary ─────────────────────────────────────────────────────

export interface AccountMetricsSummary {
  account: SocialAccount;
  totalPosts: number;
  totalImpressions: number;
  totalReach: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalVideoViews: number;
  followersCount: number;
  followersGrowth: number;
  engagementRate: number;
  bestPostingHour: number | null;
  topPost: SocialMetrics | null;
}

// ── Calendar Event (for calendar view) ──────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: ScheduledPostStatus;
  platforms: SocialPlatform[];
  thumbnailUrl: string | null;
  postType: SocialPostType;
}

// ── Quick Share Data (from content board) ───────────────────────────────

export interface QuickShareData {
  contentId: string;
  title: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  caption: string;
}

// ── Brand Collaboration (for campaign activations) ──────────────────────

export type CollaborationType = 'collab_post' | 'mention' | 'tag' | 'branded_content';

export interface BrandCollaboration {
  brand_account_id: string | null;
  brand_username: string;
  brand_platform_id: string | null;
  collaboration_type: CollaborationType;
  require_approval: boolean;
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface VerificationDetails {
  brand_mentioned: boolean;
  brand_tagged: boolean;
  collab_active: boolean;
  hashtags_used: string[];
  verified_at: string | null;
  verified_by: string | null;
}

// ── Campaign Social Metrics ─────────────────────────────────────────────

export interface CampaignSocialSummary {
  campaign_id: string;
  total_posts: number;
  published_posts: number;
  verified_posts: number;
  unique_creators: number;
  total_impressions: number;
  total_reach: number;
  total_engagement: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  total_video_views: number;
  total_clicks: number;
  avg_engagement_rate: number;
}

export interface CampaignCreatorMetrics {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  posts_count: number;
  published_count: number;
  verified_count: number;
  total_impressions: number;
  total_reach: number;
  total_engagement: number;
  total_likes: number;
  total_video_views: number;
}

export interface CampaignPostMetrics {
  id: string;
  user_id: string;
  caption: string | null;
  status: ScheduledPostStatus;
  verification_status: VerificationStatus | null;
  scheduled_at: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  target_accounts: TargetAccount[];
  publish_results: PublishResult[];
  brand_collaboration: BrandCollaboration | null;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  video_views: number;
}

export interface CampaignSocialMetricsData {
  campaign_id: string;
  summary: CampaignSocialSummary | null;
  creators: CampaignCreatorMetrics[];
  posts: CampaignPostMetrics[];
}

// ── v2: Account Groups ──────────────────────────────────────────────────

export interface AccountGroup {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Populated client-side
  members?: AccountGroupMember[];
  account_count?: number;
}

export interface AccountGroupMember {
  id: string;
  group_id: string;
  account_id: string;
  sort_order: number;
  added_at: string;
  // Populated via join
  account?: SocialAccount;
}

export interface AccountGroupRef {
  group_id: string;
  group_name: string;
  group_color: string;
}

// ── v2: Account Permissions ─────────────────────────────────────────────

export type SocialHubPermissionLevel = 'viewer' | 'creator' | 'admin';

export interface AccountPermission {
  id: string;
  account_id: string;
  user_id: string;
  organization_id: string;
  can_view: boolean;
  can_post: boolean;
  can_schedule: boolean;
  can_analytics: boolean;
  can_manage: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountPermissionRef {
  user_id: string;
  can_view: boolean;
  can_post: boolean;
  can_schedule: boolean;
  can_analytics: boolean;
  can_manage: boolean;
}

// ── v2: Content Queue ───────────────────────────────────────────────────

export interface QueueSlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  times: string[]; // ['09:00', '12:00', '18:00']
}

export interface ContentQueue {
  id: string;
  organization_id: string;
  account_id: string | null;
  group_id: string | null;
  name: string;
  timezone: string;
  schedule_slots: QueueSlot[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── v2: Post Metrics (per-post per-account) ─────────────────────────────

export interface PostMetrics {
  id: string;
  scheduled_post_id: string;
  social_account_id: string;
  platform_post_id: string | null;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  video_views: number;
  watch_time_seconds: number;
  replies: number;
  retweets: number;
  quotes: number;
  profile_clicks: number;
  link_clicks: number;
  engagement_rate: number;
  platform_data: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
}

// ── v2: Social Metrics V2 (extended) ────────────────────────────────────

export interface SocialMetricsV2 extends SocialMetrics {
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
  audience_demographics: AudienceDemographics;
  best_posting_times: BestPostingTime[];
  stories_count: number;
  reels_count: number;
  avg_engagement_rate: number;
  organization_id: string | null;
}

export interface AudienceDemographics {
  age_ranges?: Record<string, number>;
  gender?: Record<string, number>;
  top_countries?: Array<{ country: string; percentage: number }>;
  top_cities?: Array<{ city: string; percentage: number }>;
}

export interface BestPostingTime {
  day: string;
  hour: number;
  engagement_score: number;
}
