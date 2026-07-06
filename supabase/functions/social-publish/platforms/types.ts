// ============================================================================
// Tipos compartidos de social-publish, usados por index.ts y todos los
// modulos de platforms/. Extraido tal cual de index.ts (sin cambios).
// ============================================================================

export interface TargetAccount {
  account_id: string;
  platform: string;
}

export interface PublishResult {
  account_id: string;
  platform: string;
  platform_post_id: string | null;
  status: "success" | "failed";
  error: string | null;
  published_at: string | null;
}

export interface SocialAccount {
  id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  platform_user_id: string;
  platform_page_id: string | null;
  metadata: Record<string, unknown>;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  organization_id: string | null;
  caption: string | null;
  hashtags: string[];
  post_type: string;
  visibility: string;
  first_comment: string | null;
  media_urls: string[];
  thumbnail_url: string | null;
  target_accounts: TargetAccount[];
  publish_results: PublishResult[];
  retry_count: number;
  max_retries: number;
  metadata: Record<string, unknown>;
}
