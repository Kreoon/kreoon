/**
 * Campaign Constants
 *
 * Constantes de colores y etiquetas para campañas del marketplace.
 * Extraídas de useMarketplaceCampaigns.ts para mejor organización.
 */
import type {
  CampaignStatus,
  ApplicationStatus,
  CampaignPricingMode,
} from '@/components/marketplace/types/marketplace';

// ── Status Colors ─────────────────────────────────────────────────

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  completed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

// ── Application Status ────────────────────────────────────────────

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  assigned: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  delivered: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  completed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  withdrawn: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  assigned: 'Asignada',
  delivered: 'Entregada',
  completed: 'Completada',
  withdrawn: 'Retirada',
};

// ── Pricing Mode ──────────────────────────────────────────────────

export const PRICING_MODE_COLORS: Record<CampaignPricingMode, string> = {
  fixed: 'bg-blue-500/15 text-blue-400',
  auction: 'bg-purple-500/15 text-purple-400',
  range: 'bg-amber-500/15 text-amber-400',
};

export const PRICING_MODE_LABELS: Record<CampaignPricingMode, string> = {
  fixed: 'Precio fijo',
  auction: 'Subasta',
  range: 'Rango',
};

// ── Media Configuration ───────────────────────────────────────────

export const MEDIA_TYPE_IS_VIDEO: Record<string, boolean> = {
  cover_image: false,
  gallery_image: false,
  product_image: false,
  video_brief: true,
  reference_video: true,
};

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
