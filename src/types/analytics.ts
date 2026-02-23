// ============================================================
// KREOON ANALYTICS ENGINE (KAE) - Type Definitions
// ============================================================

// ── Core Analytics Types ────────────────────────────────────

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface ClickIds {
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
  li_fat_id?: string;
}

export interface VisitorContext {
  anonymous_id: string;
  session_id: string;
  user_id?: string;
  utms: UTMParams;
  click_ids: ClickIds;
  referrer?: string;
  landing_page?: string;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalyticsEvent {
  event_name: string;
  event_category: 'page' | 'conversion' | 'engagement' | 'system';
  properties?: EventProperties;
  value_usd?: number;
}

export type ConversionType = 'page_view' | 'signup' | 'trial_start' | 'subscription' | 'content_created' | 'lead_captured';

export interface ConversionEvent {
  type: ConversionType;
  value_usd?: number;
  properties?: EventProperties;
}

// ── Wire Format (Client → Edge Function) ────────────────────

export interface EventPayload {
  anonymous_id: string;
  session_id: string;
  user_id?: string;
  event_name: string;
  event_category: AnalyticsEvent['event_category'];
  page_url: string;
  page_path: string;
  page_title: string;
  page_referrer: string;
  properties?: EventProperties;
  screen_width?: number;
  screen_height?: number;
  client_timestamp: string;
}

export interface EventBatch {
  events: EventPayload[];
  visitor: VisitorContext;
  user_agent: string;
}

export interface IdentifyPayload {
  anonymous_id: string;
  user_id: string;
  email?: string;
  event_type: 'signup' | 'login';
}

// ── Admin / Settings Types ──────────────────────────────────

export type KaeAdPlatform = 'meta' | 'tiktok' | 'google' | 'linkedin';

export interface KaeAdPlatformConfig {
  id: string;
  platform: KaeAdPlatform;
  enabled: boolean;
  pixel_id: string | null;
  access_token: string | null;
  dataset_id: string | null;
  api_version: string | null;
  test_mode: boolean;
  test_event_code: string | null;
  event_mapping: Record<string, string>;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KaePlatformLog {
  id: string;
  platform: string;
  event_id: string | null;
  conversion_id: string | null;
  request_payload: Record<string, unknown> | null;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  success: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface KaeFunnelStep {
  step: string;
  visitor_count: number;
  conversion_rate: number;
}
