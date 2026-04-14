/**
 * Campaign Types
 *
 * Tipos específicos para hooks de campañas del marketplace.
 * Extraídos de useMarketplaceCampaigns.ts para mejor organización.
 */

// ── Media Types ───────────────────────────────────────────────────

export type CampaignMediaType =
  | 'cover_image'
  | 'gallery_image'
  | 'product_image'
  | 'video_brief'
  | 'reference_video';

export interface CampaignMediaItem {
  id: string;
  media_type: CampaignMediaType;
  file_url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  display_order: number;
  is_primary: boolean;
  bunny_video_id: string | null;
}

export interface MediaUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ── Access Control ────────────────────────────────────────────────

export interface CampaignAccessResult {
  can_create: boolean;
  has_paid_subscription: boolean;
  limits: {
    max_campaigns_per_month: number;
    max_active_campaigns: number;
    max_creators_per_campaign: number;
    commission_discount_pct: number;
    plan_type: string;
    plan_name: string;
  };
  usage: {
    active_campaigns: number;
    month_campaigns: number;
  };
  blocked_reason?: string | null;
}

// ── Notifications ─────────────────────────────────────────────────

export interface NotificationResult {
  success: boolean;
  notifications_sent: number;
  total_eligible?: number;
  message?: string;
}

// ── Hook Options ──────────────────────────────────────────────────

export interface UseMarketplaceCampaignsOptions {
  brandId?: string;
  status?: string;
  autoFetch?: boolean;
}
