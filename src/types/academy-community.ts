// ============================================================
// KREOON Academia v2 - Community types
// ============================================================

// ── POSTS ──
export type PostType = 'post' | 'question' | 'announcement' | 'event' | 'poll';
export type PostStatus = 'draft' | 'published' | 'pending_approval' | 'archived';
export type PostReaction = 'like' | 'love' | 'fire' | 'clap' | 'insightful';

export interface AcademyPostCategory {
  id: string;
  space_id: string;
  name: string;
  slug: string;
  emoji: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_default: boolean;
  who_can_post: 'all' | 'instructor' | 'moderator';
  requires_approval: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
}

export interface AcademyPost {
  id: string;
  space_id: string;
  author_id: string;
  category_id: string | null;
  title: string | null;
  body: string;
  body_html: string | null;
  media_urls: string[];
  link_preview: LinkPreview | null;
  type: PostType;
  poll_options: PollOption[];
  poll_ends_at: string | null;
  poll_allows_multiple: boolean;
  status: PostStatus;
  is_pinned: boolean;
  is_announcement: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  featured_until: string | null;
  created_at: string;
  updated_at: string;
  // joins
  author?: { full_name: string | null; avatar_url?: string | null };
  category?: Partial<AcademyPostCategory>;
  my_reaction?: { reaction: PostReaction }[] | PostReaction | null;
  my_poll_vote?: string[] | null;
}

export interface AcademyPostComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  body_html: string | null;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
  author?: { full_name: string | null; avatar_url?: string | null };
  replies?: AcademyPostComment[];
  my_reaction?: string | null;
}

// ── ANALYTICS ──
export interface SpaceDailyAnalytics {
  date: string;
  about_page_views: number;
  unique_visitors: number;
  signups: number;
  traffic_sources: Record<string, number>;
  new_members: number;
  churned_members: number;
  active_members: number;
  new_mrr_usd: number;
  churned_mrr_usd: number;
  posts_created: number;
  comments_created: number;
  reactions_given: number;
  lessons_completed: number;
}

export interface TrafficSource {
  source: string;
  count: number;
  pct: number;
}

export interface SpaceAnalyticsSummary {
  total_members: number;
  active_members_pct: number;
  mrr_usd: number;
  engagement_rate: number;
  retention_rate: number;
  visitors_30d: number;
  signups_30d: number;
  conversion_rate: number;
  new_mrr_30d: number;
  top_sources: TrafficSource[];
  daily_data: SpaceDailyAnalytics[];
  // Fase 8 — métricas avanzadas
  funnel: { stage: string; count: number; pct: number }[];
  cohort_retention: { cohort_month: string; week_0: number; week_1: number; week_2: number; week_3: number; week_4: number }[];
  activity_heatmap: { day: number; hour: number; count: number }[]; // day 0-6, hour 0-23
}

// ── PLUGINS ──
export interface MembershipQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required: boolean;
}

export interface SidebarLink {
  label: string;
  url: string;
  icon: string;
}

export interface SpacePlugins {
  id: string;
  space_id: string;
  meta_pixel_enabled: boolean;
  meta_pixel_id: string | null;
  google_ads_enabled: boolean;
  google_ads_tag: string | null;
  google_ads_conversion_label: string | null;
  auto_dm_enabled: boolean;
  auto_dm_message: string | null;
  membership_questions_enabled: boolean;
  membership_questions: MembershipQuestion[];
  zapier_enabled: boolean;
  zapier_webhook_url: string | null;
  onboarding_video_enabled: boolean;
  onboarding_video_url: string | null;
  cancellation_video_enabled: boolean;
  cancellation_video_url: string | null;
  instant_approval_enabled: boolean;
  unlock_chat_level: number;
  unlock_posting_level: number;
  sidebar_links: SidebarLink[];
  hyros_enabled: boolean;
  hyros_api_key: string | null;
  kreoon_webhook_enabled: boolean;
  kreoon_webhook_url: string | null;
  kreoon_webhook_secret: string | null;
  created_at?: string;
  updated_at?: string;
}

// ── LEADERBOARD ──
export interface SpaceMemberPoints {
  id: string;
  user_id: string;
  space_id: string;
  total_points: number;
  points_from_posts: number;
  points_from_comments: number;
  points_from_lessons: number;
  points_from_courses: number;
  points_from_reactions_received: number;
  current_week_points: number;
  current_month_points: number;
  level: number;
  updated_at?: string;
  user?: {
    full_name: string | null;
    avatar_url?: string | null;
    username?: string;
  };
}

export type LeaderboardPeriod = 'all_time' | 'month' | 'week';

// ── DISCOVERY ──
export interface SpaceDiscovery {
  id: string;
  space_id: string;
  is_discoverable: boolean;
  category: string;
  subcategory: string | null;
  language: string;
  keywords: string[];
  discovery_rank: number | null;
  discovery_views: number;
  meta_title: string | null;
  meta_description: string | null;
  updated_at?: string;
}

// ── MEMBER LOCATION ──
export interface MemberLocation {
  id: string;
  space_id: string;
  user_id: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  created_at?: string;
  user?: { full_name: string | null; avatar_url?: string | null };
}

// ── EVENTS ──
export type EventType = 'live_call' | 'workshop' | 'webinar' | 'challenge' | 'other';
export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export interface AcademySpaceEvent {
  id: string;
  space_id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  type: EventType;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meeting_url: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  rsvp_count: number;
  max_attendees: number | null;
  is_published: boolean;
  created_at?: string;
  organizer?: { full_name: string | null; avatar_url?: string | null };
  my_rsvp?: { status: RsvpStatus }[] | RsvpStatus | null;
}

// ── NOTIFICATION SETTINGS ──
export interface SpaceNotificationSettings {
  id: string;
  space_id: string;
  user_id: string;
  notify_membership_request: boolean;
  notify_new_post: boolean;
  notify_new_customer_email: boolean;
  notify_reported_content: boolean;
  notify_new_comment_on_my_post: boolean;
  notify_reply_to_my_comment: boolean;
  notify_reaction_on_my_post: boolean;
  notify_new_post_in_category: boolean;
  notify_new_lesson: boolean;
  notify_event_reminder: boolean;
  weekly_digest: boolean;
  daily_notifications: boolean;
  admin_broadcast: boolean;
}

// ── KIRO AI ASSIST RESULT ──
export interface KiroPostSuggestion {
  title: string;
  body_variants: { tone: string; body: string }[];
  hashtags: string[];
}
