// Únicamente los 6 scopes que TOOL_SCOPES (api/index.ts) realmente verifica.
// adn:*, wallet:*, scripts:read, profiles:read, creators:write, social:read y
// analytics:read existían en versiones previas del modelo pero ningún tool los
// usa — se eliminaron para no sugerir un control de acceso que no aplica.
export type AuthScope =
  | "scripts:write"
  | "creators:read"
  | "profiles:write"
  | "social:write"
  | "campaigns:read" | "campaigns:write";

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
  /** Grupo de permisos derivado del rol REAL en organization_members, no del que tenía al crear la key. */
  group: "admin" | "talent" | "client";
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
