export type AuthScope =
  | "scripts:read" | "scripts:write"
  | "adn:read" | "adn:write"
  | "profiles:read" | "profiles:write"
  | "creators:read" | "creators:write"
  | "campaigns:read" | "campaigns:write"
  | "social:read" | "social:write"
  | "wallet:read" | "wallet:write"
  | "analytics:read";

export interface MCPAPIKey {
  id: string;
  key_hash: string;
  creator_id: string;
  organization_id: string;
  scopes: AuthScope[];
  created_at: string;
  expires_at: string;
  is_revoked: boolean;
  rate_limit_per_hour: number;
  last_used_at: string | null;
}

export interface AuthContext {
  key_id: string;
  org_id: string;
  user_id: string;
  scopes: AuthScope[];
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  tokens_used?: number;
}

// ─── Scripts ────────────────────────────────────────────────────────────────

export interface GenerateScriptInput {
  product_id: string;
  platform: "instagram_reels" | "tiktok" | "youtube_shorts";
  style?: "viral" | "professional" | "funny" | "educational";
  hooks_count?: number;
}

export interface ScriptVariant {
  hook: string;
  body: string;
  cta: string;
  estimated_duration_seconds: number;
}

export interface GenerateScriptOutput {
  script_id: string;
  platform: string;
  variants: ScriptVariant[];
  tokens_used: number;
}

export interface ImproveScriptInput {
  script_id: string;
  feedback: string;
  focus?: "hook" | "cta" | "body" | "all";
}

// ─── ADN ────────────────────────────────────────────────────────────────────

export interface StartADNResearchInput {
  product_id: string;
  config?: {
    include_client_dna?: boolean;
    include_social_intelligence?: boolean;
    include_ad_intelligence?: boolean;
    locations?: string[];
  };
}

export interface ADNStatusOutput {
  research_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress_percent: number;
  current_step: string;
  result?: Record<string, unknown>;
  error?: string;
  estimated_completion_at?: string;
}

// ─── Creators ───────────────────────────────────────────────────────────────

export interface SearchCreatorsInput {
  query: string;
  specializations?: string[];
  min_score?: number;
  available_only?: boolean;
  country?: string;
  limit?: number;
}

export interface CreatorPublicProfile {
  id: string;
  display_name: string;
  bio: string | null;
  country: string | null;
  specializations: string[];
  marketplace_score: number;
  ranking_tier: "top" | "rising" | "new" | "standard";
  portfolio_count: number;
  projects_completed: number;
  response_rate: number;
  avatar_url: string | null;
}

export interface ScoreCreatorInput {
  creator_id: string;
  campaign_requirements: {
    platform: string;
    content_type: string;
    budget?: number;
    timeline_days?: number;
    specialization?: string;
  };
}

export interface CreatorScoreOutput {
  creator_id: string;
  overall_score: number;
  breakdown: {
    profile_completeness: number;
    portfolio_quality: number;
    response_rate: number;
    projects_completed: number;
    platform_match: number;
    availability: number;
  };
  recommendation: "highly_recommended" | "recommended" | "consider" | "not_recommended";
  reasoning: string;
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export interface OptimizeProfileInput {
  creator_id: string;
  focus?: "visibility" | "conversions" | "leads";
}

export interface ProfileImprovement {
  field: string;
  current_value: string | null;
  suggested_value: string;
  impact: "high" | "medium" | "low";
  reason: string;
}

export interface OptimizeProfileOutput {
  creator_id: string;
  current_score: number;
  projected_score: number;
  improvements: ProfileImprovement[];
}

// ─── Wallet ─────────────────────────────────────────────────────────────────

export interface WalletOverviewOutput {
  user_id: string;
  currency: string;
  balance_available: number;
  balance_pending: number;
  balance_reserved: number;
  recent_transactions: {
    id: string;
    type: string;
    amount: number;
    description: string;
    created_at: string;
  }[];
}

export interface RequestWithdrawalInput {
  amount: number;
  method: "stripe_connect" | "mercury" | "paypal" | "manual";
  notes?: string;
}

export interface WithdrawalOutput {
  withdrawal_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  amount: number;
  method: string;
  estimated_arrival?: string;
}

// ─── Social ──────────────────────────────────────────────────────────────────

export interface PublishToSocialInput {
  content: string;
  platforms: ("instagram" | "tiktok" | "youtube" | "twitter" | "linkedin")[];
  media_url?: string;
  scheduled_at?: string;
  hashtags?: string[];
}

export interface SocialPostResult {
  platform: string;
  status: "published" | "scheduled" | "failed";
  post_url?: string;
  post_id?: string;
  scheduled_at?: string;
  error?: string;
}
