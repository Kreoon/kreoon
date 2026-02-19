// ── Kreoon Marketing Types ─────────────────────────────────────────────────

export type AdPlatform = 'meta' | 'tiktok' | 'google';

export type AdAccountStatus = 'active' | 'paused' | 'disabled' | 'pending_review';

export type AdCampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'archived';

export type AdObjective =
  | 'awareness'
  | 'traffic'
  | 'engagement'
  | 'leads'
  | 'sales'
  | 'app_installs'
  | 'video_views'
  | 'reach'
  | 'conversions';

export type ReportType =
  | 'campaign'
  | 'comparison'
  | 'cross_platform'
  | 'content_performance'
  | 'custom';

export type InsightType =
  | 'optimization'
  | 'anomaly'
  | 'budget'
  | 'creative'
  | 'audience'
  | 'trend';

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'opportunity';

// ── Ad Account ─────────────────────────────────────────────────────────────

export interface MarketingAdAccount {
  id: string;
  organization_id: string;
  user_id: string;
  platform: AdPlatform;
  platform_account_id: string;
  account_name: string;
  account_status: AdAccountStatus;
  currency: string;
  timezone: string;
  daily_budget_limit: number | null;
  monthly_spend: number;
  is_active: boolean;
  platform_metadata: Record<string, unknown>;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Ad Campaign ────────────────────────────────────────────────────────────

export interface AdCreative {
  headline?: string;
  body?: string;
  cta?: string;
  media_url?: string;
  thumbnail_url?: string;
  video_url?: string;
  carousel_items?: Array<{
    media_url: string;
    headline?: string;
    description?: string;
    link?: string;
  }>;
}

export interface AdTargeting {
  age_min?: number;
  age_max?: number;
  genders?: ('male' | 'female' | 'all')[];
  locations?: Array<{
    type: 'country' | 'region' | 'city';
    key: string;
    name: string;
  }>;
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  custom_audiences?: string[];
  lookalike_audiences?: string[];
  languages?: string[];
  platforms?: string[];
  device_types?: string[];
}

export interface MarketingCampaign {
  id: string;
  organization_id: string;
  ad_account_id: string;
  created_by: string;
  content_id: string | null;
  platform: AdPlatform;
  platform_campaign_id: string | null;
  name: string;
  objective: AdObjective;
  status: AdCampaignStatus;
  daily_budget: number | null;
  lifetime_budget: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  targeting: AdTargeting;
  placements: string[];
  creative: AdCreative;
  ai_suggestions: Record<string, unknown>;
  ai_generated: boolean;
  performance_goal: string | null;
  bid_strategy: string;
  bid_amount: number | null;
  platform_metadata: Record<string, unknown>;
  total_spend: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Ad Set ─────────────────────────────────────────────────────────────────

export interface MarketingAdSet {
  id: string;
  campaign_id: string;
  platform_ad_set_id: string | null;
  name: string;
  status: AdCampaignStatus;
  daily_budget: number | null;
  targeting: AdTargeting;
  placements: string[];
  bid_strategy: string | null;
  bid_amount: number | null;
  optimization_goal: string | null;
  platform_metadata: Record<string, unknown>;
  total_spend: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Ad ─────────────────────────────────────────────────────────────────────

export interface MarketingAd {
  id: string;
  ad_set_id: string;
  campaign_id: string;
  content_id: string | null;
  platform_ad_id: string | null;
  name: string;
  status: AdCampaignStatus;
  creative: AdCreative;
  destination_url: string | null;
  tracking_url: string | null;
  utm_params: Record<string, string>;
  platform_metadata: Record<string, unknown>;
  total_spend: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Metrics ────────────────────────────────────────────────────────────────

export interface MarketingMetrics {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  ad_set_id: string | null;
  ad_id: string | null;
  platform: AdPlatform;
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  roas: number;
  video_views: number;
  video_views_25: number;
  video_views_50: number;
  video_views_75: number;
  video_views_100: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  leads: number;
  cost_per_lead: number;
  cost_per_conversion: number;
  frequency: number;
}

// ── Dashboard Metrics (from RPC) ───────────────────────────────────────────

export interface DashboardMetricsSummary {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_roas: number;
  per_platform: Array<{
    platform: AdPlatform;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    roas: number;
  }>;
  daily_series: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
  top_campaigns: Array<{
    id: string;
    name: string;
    platform: AdPlatform;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    roas: number;
  }>;
}

// ── Reports ────────────────────────────────────────────────────────────────

export interface MarketingReport {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  report_type: ReportType;
  config: ReportConfig;
  data_snapshot: Record<string, unknown> | null;
  file_url: string | null;
  is_scheduled: boolean;
  schedule_cron: string | null;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportConfig {
  date_from?: string;
  date_to?: string;
  campaign_ids?: string[];
  platforms?: AdPlatform[];
  metrics?: string[];
  group_by?: ('date' | 'campaign' | 'platform' | 'ad_set' | 'ad')[];
  chart_types?: string[];
}

// ── AI Insights ────────────────────────────────────────────────────────────

export interface MarketingAIInsight {
  id: string;
  organization_id: string;
  campaign_id: string | null;
  insight_type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  suggested_action: Record<string, unknown> | null;
  is_read: boolean;
  is_applied: boolean;
  platform_data: Record<string, unknown>;
  created_at: string;
}

// ── Promote Content ────────────────────────────────────────────────────────

export interface PromoteContentData {
  contentId: string;
  title: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  description: string;
}

export interface PromoteConfig {
  platform: AdPlatform;
  adAccountId: string;
  objective: AdObjective;
  dailyBudget: number;
  durationDays: number;
  targeting: AdTargeting;
  useAI: boolean;
}

// ── Form Data ──────────────────────────────────────────────────────────────

export interface CampaignFormData {
  adAccountId: string;
  name: string;
  objective: AdObjective;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  targeting: AdTargeting;
  placements: string[];
  creative: AdCreative;
  bidStrategy: string;
  bidAmount: number | null;
  contentId: string | null;
}
