/**
 * Content Licensing Types — KREOON Intellectual Property Rights Structure
 *
 * Two-Level Rights Flow:
 * 1. Creator → SICOMMER INT LLC: Full patrimonial rights cession (unlimited)
 * 2. SICOMMER → Clients: Differentiated by deliverable type (1-year license OR full ownership)
 */

// ═══════════════════════════════════════════════════════════════
// LICENSE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Types of licenses/rights in the system
 */
export type LicenseType =
  | 'creator_full_cession'      // Creator → Platform: full patrimonial rights cession
  | 'client_1year_license'      // Platform → Client: 1-year renewable license
  | 'client_full_ownership'     // Platform → Client: full ownership transfer (dev/design)
  | 'client_buyout';            // Platform → Client: full buyout (content, 3x price)

/**
 * Categories of deliverables — determines default license type
 */
export type DeliverableCategory =
  // Content WITH creator image/likeness → 1-year license
  | 'video_with_creator'        // Video with creator appearance
  | 'photo_with_creator'        // Photo with creator appearance
  | 'ugc_content'               // User-generated content
  | 'live_recording'            // Live stream recordings
  // Content WITHOUT creator image → 1-year license (can upgrade to buyout)
  | 'product_photo'             // Product photography
  | 'broll_video'               // B-roll footage
  // Technical/Design → Full client ownership
  | 'development'               // Code, apps, websites
  | 'graphic_design'            // Graphic design, logos
  | 'branding'                  // Full branding packages
  | 'strategy_document'         // Strategic documents
  // Written content → Platform cession, then 1-year to client
  | 'copywriting'               // Copy, texts, scripts
  | 'other';                    // Default fallback

// ═══════════════════════════════════════════════════════════════
// CONTENT LICENSE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Permissions granted under a content license
 */
export interface LicensePermissions {
  ads_usage: boolean;         // Use in paid advertising
  social_media: boolean;      // Publish on social media
  website: boolean;           // Use on website
  ecommerce: boolean;         // Use in e-commerce
  print: boolean;             // Print usage
  broadcast: boolean;         // TV/radio broadcast
  sublicense: boolean;        // Sublicense to third parties
  modify: boolean;            // Modify/adapt content
  derivative_works: boolean;  // Create derivative works
}

/**
 * Default permissions for different license types
 */
export const DEFAULT_PERMISSIONS: Record<LicenseType, LicensePermissions> = {
  creator_full_cession: {
    ads_usage: true,
    social_media: true,
    website: true,
    ecommerce: true,
    print: true,
    broadcast: true,
    sublicense: true,
    modify: true,
    derivative_works: true,
  },
  client_1year_license: {
    ads_usage: true,
    social_media: true,
    website: true,
    ecommerce: true,
    print: false,
    broadcast: false,
    sublicense: false,
    modify: true,
    derivative_works: true,
  },
  client_full_ownership: {
    ads_usage: true,
    social_media: true,
    website: true,
    ecommerce: true,
    print: true,
    broadcast: true,
    sublicense: true,
    modify: true,
    derivative_works: true,
  },
  client_buyout: {
    ads_usage: true,
    social_media: true,
    website: true,
    ecommerce: true,
    print: true,
    broadcast: true,
    sublicense: true,
    modify: true,
    derivative_works: true,
  },
};

/**
 * Full content license record
 */
export interface ContentLicense {
  id: string;
  organization_id: string;

  // Content reference
  content_id: string | null;      // FK to content table
  project_id: string | null;      // FK to marketplace project
  deliverable_category: DeliverableCategory;

  // License type
  license_type: LicenseType;

  // Parties
  creator_user_id: string;        // Who created the content
  rights_holder_id: string;       // SICOMMER INT LLC (always)
  client_id: string;              // Client receiving the license

  // Scope
  territory: string;              // 'worldwide' | specific country
  duration_months: number | null; // null = perpetual (dev/design)
  start_date: string;
  expiry_date: string | null;     // null = no expiration

  // Status
  status: 'active' | 'expired' | 'renewed' | 'revoked';
  renewal_count: number;
  last_renewed_at: string | null;

  // Permissions
  permissions: LicensePermissions;

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * License for display in UI
 */
export interface LicenseDisplayInfo {
  id: string;
  contentTitle: string;
  contentThumbnail?: string;
  creatorName: string;
  creatorAvatar?: string;
  licenseType: LicenseType;
  deliverableCategory: DeliverableCategory;
  startDate: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: ContentLicense['status'];
  renewalPrice?: number;
  canRenew: boolean;
}

/**
 * License expiration notification
 */
export interface LicenseExpirationNotice {
  license_id: string;
  client_id: string;
  content_id: string;
  content_title: string;
  creator_name: string;
  expiry_date: string;
  days_remaining: number;
  renewal_price: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Determine license type and duration based on deliverable category
 */
export function getLicenseTypeForDeliverable(
  category: DeliverableCategory
): { type: LicenseType; duration_months: number | null } {
  switch (category) {
    // Content with people → 1 year license
    case 'video_with_creator':
    case 'photo_with_creator':
    case 'ugc_content':
    case 'live_recording':
    case 'product_photo':
    case 'broll_video':
    case 'copywriting':
      return { type: 'client_1year_license', duration_months: 12 };

    // Technical/design → full client ownership
    case 'development':
    case 'graphic_design':
    case 'branding':
    case 'strategy_document':
      return { type: 'client_full_ownership', duration_months: null };

    default:
      return { type: 'client_1year_license', duration_months: 12 };
  }
}

/**
 * Check if a deliverable category results in full client ownership
 */
export function isFullOwnershipCategory(category: DeliverableCategory): boolean {
  return ['development', 'graphic_design', 'branding', 'strategy_document'].includes(category);
}

/**
 * Check if a deliverable category involves creator image/likeness
 */
export function involvesCreatorLikeness(category: DeliverableCategory): boolean {
  return ['video_with_creator', 'photo_with_creator', 'ugc_content', 'live_recording'].includes(category);
}

/**
 * Get human-readable label for deliverable category
 */
export function getDeliverableCategoryLabel(category: DeliverableCategory): string {
  const labels: Record<DeliverableCategory, string> = {
    video_with_creator: 'Video con Creador',
    photo_with_creator: 'Foto con Creador',
    ugc_content: 'Contenido UGC',
    live_recording: 'Grabación de Live',
    product_photo: 'Fotografía de Producto',
    broll_video: 'Video B-Roll',
    development: 'Desarrollo',
    graphic_design: 'Diseño Gráfico',
    branding: 'Branding',
    strategy_document: 'Documento Estratégico',
    copywriting: 'Copywriting',
    other: 'Otro',
  };
  return labels[category] || category;
}

/**
 * Get human-readable label for license type
 */
export function getLicenseTypeLabel(type: LicenseType): string {
  const labels: Record<LicenseType, string> = {
    creator_full_cession: 'Cesión Total (Creador)',
    client_1year_license: 'Licencia 1 Año',
    client_full_ownership: 'Propiedad Total',
    client_buyout: 'Buyout Perpetuo',
  };
  return labels[type] || type;
}

/**
 * Calculate days remaining until license expiration
 */
export function getDaysUntilExpiration(expiryDate: string | null): number | null {
  if (!expiryDate) return null; // Perpetual license

  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if license is expiring soon (within 30 days)
 */
export function isExpiringSoon(expiryDate: string | null, thresholdDays = 30): boolean {
  const daysRemaining = getDaysUntilExpiration(expiryDate);
  if (daysRemaining === null) return false; // Perpetual
  return daysRemaining > 0 && daysRemaining <= thresholdDays;
}

/**
 * Check if license has expired
 */
export function isExpired(expiryDate: string | null): boolean {
  const daysRemaining = getDaysUntilExpiration(expiryDate);
  if (daysRemaining === null) return false; // Perpetual
  return daysRemaining <= 0;
}
