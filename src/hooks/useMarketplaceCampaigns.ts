import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  Campaign,
  CampaignApplication,
  CampaignStatus,
  ApplicationStatus,
  CampaignPricingMode,
  CampaignVisibility,
  MarketplaceCreator,
  CampaignTemplate,
  CaseStudy,
  BrandCredit,
  BrandCreditTransaction,
  SmartMatchResult,
} from '@/components/marketplace/types/marketplace';

// ── Media types (campaign_media_type enum from migration) ─────────────

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

export interface NotificationResult {
  success: boolean;
  notifications_sent: number;
  total_eligible?: number;
  message?: string;
}

const MEDIA_TYPE_IS_VIDEO: Record<string, boolean> = {
  cover_image: false,
  gallery_image: false,
  product_image: false,
  video_brief: true,
  reference_video: true,
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

// ── Status/Label maps ─────────────────────────────────────────────────

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

// ── Helper: map DB row → Campaign shape ────────────────────────────────

function mapCampaignRow(row: any, brandName?: string, brandLogo?: string | null, orgName?: string): Campaign {
  return {
    id: row.id,
    brand_user_id: row.brand_id || '',
    brand_name: row.brand_name_override || brandName || '',
    brand_logo: row.brand_logo_override || brandLogo || undefined,
    title: row.title || '',
    description: row.description || '',
    category: row.category || '',
    campaign_type: row.campaign_type || 'paid',
    budget_mode: row.budget_mode || 'per_video',
    budget_per_video: row.budget_per_video != null ? Number(row.budget_per_video) : undefined,
    total_budget: row.total_budget != null ? Number(row.total_budget) : undefined,
    currency: row.currency || 'USD',
    platform_fee_pct: Number(row.platform_fee_pct) || 10,
    content_requirements: row.content_requirements || [],
    creator_requirements: row.creator_requirements || {},
    max_creators: Number(row.max_creators) || 5,
    applications_count: Number(row.applications_count) || 0,
    approved_count: Number(row.approved_count) || 0,
    status: row.status as CampaignStatus,
    deadline: row.deadline || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    exchange_product_name: row.exchange_product_name || undefined,
    exchange_product_value: row.exchange_product_value != null ? Number(row.exchange_product_value) : undefined,
    exchange_product_description: row.exchange_product_description || undefined,
    tags: row.tags || [],
    pricing_mode: row.pricing_mode || 'fixed',
    min_bid: row.min_bid != null ? Number(row.min_bid) : undefined,
    max_bid: row.max_bid != null ? Number(row.max_bid) : undefined,
    bid_deadline: row.bid_deadline || undefined,
    bid_visibility: row.bid_visibility || undefined,
    desired_roles: row.desired_roles || [],
    // Visibility system
    visibility: (row.visibility as CampaignVisibility) || 'public',
    organization_id: row.organization_id || undefined,
    organization_name: orgName || undefined,
    brief: row.brief || undefined,
    cover_image_url: row.cover_image_url || undefined,
    brand_name_override: row.brand_name_override || undefined,
    brand_logo_override: row.brand_logo_override || undefined,
    // Compensation
    compensation_type: row.compensation_type || undefined,
    compensation_description: row.compensation_description || undefined,
    product_value: row.product_value != null ? Number(row.product_value) : undefined,
    // Deadlines
    application_deadline: row.application_deadline || undefined,
    content_deadline: row.content_deadline || undefined,
    campaign_start_date: row.campaign_start_date || undefined,
    campaign_end_date: row.campaign_end_date || undefined,
    // Capacity
    max_applications: row.max_applications != null ? Number(row.max_applications) : undefined,
    current_applications: Number(row.current_applications) || 0,
    // Config
    auto_approve_applications: row.auto_approve_applications || false,
    requires_portfolio: row.requires_portfolio !== false,
    allow_counter_offers: row.allow_counter_offers || false,
    nda_required: row.nda_required || false,
    usage_rights: row.usage_rights || 'platform_only',
    usage_rights_description: row.usage_rights_description || undefined,
    // Flags
    is_urgent: row.is_urgent || false,
    is_featured: row.is_featured || false,
    campaign_purpose: row.campaign_purpose || 'content',
    is_brand_activation: row.is_brand_activation || false,
    activation_requirements: row.activation_config || undefined,
    published_at: row.published_at || undefined,
    // Content
    content_guidelines: row.content_guidelines || undefined,
    reference_urls: row.reference_urls || [],
    // Payment & Commission
    requires_agency_support: row.requires_agency_support || false,
    commission_rate: row.commission_rate != null ? Number(row.commission_rate) : 30,
    payment_status: row.payment_status || 'unpaid',
    escrow_hold_id: row.escrow_hold_id || undefined,
    total_paid: row.total_paid != null ? Number(row.total_paid) : 0,
    activated_at: row.activated_at || undefined,
    completed_at: row.completed_at || undefined,
  };
}

// ── Helper: map DB application row → CampaignApplication ──────────────

function mapApplicationRow(
  row: any,
  creator: MarketplaceCreator,
): CampaignApplication {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    creator_id: row.creator_id,
    creator,
    status: row.status as ApplicationStatus,
    cover_letter: row.cover_letter || '',
    proposed_price: row.proposed_price != null ? Number(row.proposed_price) : undefined,
    portfolio_links: row.portfolio_links || [],
    availability_date: row.availability_date || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    brand_notes: row.brand_notes || undefined,
    bid_amount: row.bid_amount != null ? Number(row.bid_amount) : undefined,
    bid_message: row.bid_message || undefined,
    counter_offer: row.counter_offer_amount != null
      ? {
          id: row.id,
          application_id: row.id,
          brand_amount: Number(row.counter_offer_amount),
          brand_message: row.counter_offer_message || undefined,
          creator_response: row.counter_offer_response || undefined,
          creator_response_at: row.counter_offer_response_at || undefined,
          created_at: row.updated_at || '',
        }
      : undefined,
  };
}

// ── Default creator for unmapped rows ─────────────────────────────────

const defaultCreator: MarketplaceCreator = {
  id: '', user_id: '', display_name: 'Creador', avatar_url: null, slug: null,
  bio: null, location_city: null, location_country: null, country_flag: null,
  categories: [], content_types: [], level: 'bronze', is_verified: false,
  rating_avg: 0, rating_count: 0, base_price: null, currency: 'USD',
  portfolio_media: [], is_available: true, languages: ['es'],
  completed_projects: 0, joined_at: '', accepts_product_exchange: false,
};

// ── Main hook ──────────────────────────────────────────────────────────

interface UseMarketplaceCampaignsOptions {
  brandId?: string;
  organizationId?: string;
  createdBy?: string;
  status?: CampaignStatus | CampaignStatus[];
}

export function useMarketplaceCampaigns(options: UseMarketplaceCampaignsOptions = {}) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = (supabase as any)
        .from('marketplace_campaigns')
        .select('*')
        .order('updated_at', { ascending: false });

      if (options.brandId) {
        query = query.eq('brand_id', options.brandId);
      }

      if (options.organizationId) {
        query = query.eq('organization_id', options.organizationId);
      }

      if (options.createdBy) {
        query = query.eq('created_by', options.createdBy);
      }

      if (options.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status);
        } else {
          query = query.eq('status', options.status);
        }
      }

      const { data: rows, error: err } = await query;
      if (err) throw err;
      if (!rows?.length) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Fetch brand names
      const brandIds = [...new Set(rows.map((r: any) => r.brand_id).filter(Boolean))] as string[];
      const brandsMap = new Map<string, { name: string; logo_url: string | null }>();

      if (brandIds.length > 0) {
        const { data: brands } = await supabase
          .from('brands')
          .select('id, name, logo_url')
          .in('id', brandIds);
        for (const b of brands || []) {
          brandsMap.set(b.id, { name: b.name, logo_url: b.logo_url });
        }
      }

      // Fetch organization names
      const orgIds = [...new Set(rows.map((r: any) => r.organization_id).filter(Boolean))] as string[];
      const orgsMap = new Map<string, string>();

      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        for (const o of orgs || []) {
          orgsMap.set(o.id, o.name);
        }
      }

      const mapped = rows.map((row: any) => {
        const brand = brandsMap.get(row.brand_id);
        const orgName = orgsMap.get(row.organization_id);
        return mapCampaignRow(row, brand?.name, brand?.logo_url, orgName);
      });

      setCampaigns(mapped);
    } catch (err) {
      console.error('[useMarketplaceCampaigns] Error:', err);
      setError('Error al cargar campañas');
    } finally {
      setLoading(false);
    }
  }, [options.brandId, options.organizationId, options.status]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const getCampaignById = useCallback(
    (id: string) => campaigns.find(c => c.id === id),
    [campaigns],
  );

  // ── Write operations ──────────────────────────────────────────────

  const createCampaign = useCallback(async (data: Record<string, any>): Promise<string | null> => {
    try {
      const { data: result, error: err } = await (supabase as any)
        .from('marketplace_campaigns')
        .insert({
          created_by: user?.id,
          ...data,
        })
        .select('id')
        .single();

      if (err) throw err;
      return result?.id || null;
    } catch (err) {
      console.error('[useMarketplaceCampaigns] Create error:', err);
      return null;
    }
  }, [user?.id]);

  const updateCampaign = useCallback(async (id: string, data: Record<string, any>): Promise<boolean> => {
    try {
      const { error: err } = await (supabase as any)
        .from('marketplace_campaigns')
        .update(data)
        .eq('id', id);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('[useMarketplaceCampaigns] Update error:', err);
      return false;
    }
  }, []);

  const publishCampaign = useCallback(async (id: string): Promise<boolean> => {
    return updateCampaign(id, { status: 'active', published_at: new Date().toISOString() });
  }, [updateCampaign]);

  const submitApplication = useCallback(async (data: {
    campaign_id: string;
    creator_id: string;
    cover_letter?: string;
    proposed_price?: number;
    portfolio_links?: string[];
    availability_date?: string;
    bid_amount?: number;
    bid_message?: string;
  }): Promise<string | null> => {
    try {
      const { data: result, error: err } = await (supabase as any)
        .from('campaign_applications')
        .insert({
          ...data,
          status: 'pending',
        })
        .select('id')
        .single();

      if (err) throw err;
      return result?.id || null;
    } catch (err) {
      console.error('[useMarketplaceCampaigns] Application submit error:', err);
      return null;
    }
  }, []);

  const updateApplicationStatus = useCallback(async (
    applicationId: string,
    status: ApplicationStatus,
    notes?: string,
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, any> = { status };
      if (notes !== undefined) updateData.brand_notes = notes;

      const { error: err } = await (supabase as any)
        .from('campaign_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (err) throw err;
      return true;
    } catch (err) {
      console.error('[useMarketplaceCampaigns] Application status error:', err);
      return false;
    }
  }, []);

  // ── Media operations (credential issuer pattern) ─────────────────

  /**
   * Upload media for a campaign.
   * 2-step flow: POST to get Bunny credentials → client uploads directly → PUT to confirm.
   * Images go to Bunny Storage, videos to Bunny Stream.
   */
  const uploadCampaignMedia = useCallback(async (params: {
    campaign_id: string;
    media_type: CampaignMediaType;
    file: File;
    onProgress?: (progress: MediaUploadProgress) => void;
  }): Promise<{ id: string; file_url: string; thumbnail_url?: string } | null> => {
    const { campaign_id, media_type, file, onProgress } = params;

    // Client-side validation
    const isVideo = MEDIA_TYPE_IS_VIDEO[media_type] ?? false;
    const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      console.error(`[uploadCampaignMedia] Invalid MIME type '${file.type}' for ${media_type}`);
      return null;
    }
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      console.error(`[uploadCampaignMedia] File too large: ${file.size} > ${maxSize}`);
      return null;
    }

    try {
      // Step 1: Get upload credentials from edge function
      const { data: creds, error: credsError } = await supabase.functions.invoke(
        'upload-campaign-media',
        {
          method: 'POST',
          body: {
            campaign_id,
            media_type,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        },
      );

      if (credsError || !creds?.success) {
        throw new Error(credsError?.message || creds?.error || 'Error al obtener credenciales');
      }

      // Step 2: Upload directly to Bunny via XHR (for progress tracking)
      const uploadUrl: string = creds.upload_url;
      const accessKey: string = creds.access_key;
      const isStream = creds.upload_type === 'bunny_stream';

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress?.({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Error al subir: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Error de red al subir')));
        xhr.addEventListener('timeout', () => reject(new Error('Tiempo de espera agotado')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        if (!isStream) {
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        }
        xhr.timeout = isVideo ? 300000 : 60000; // 5min videos, 1min images
        xhr.send(file);
      });

      onProgress?.({ loaded: 1, total: 1, percentage: 100 });

      // Step 3: Confirm upload and create DB record
      const { data: confirmed, error: confirmError } = await supabase.functions.invoke(
        'upload-campaign-media',
        {
          method: 'PUT',
          body: {
            campaign_id,
            media_type,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            file_url: creds.cdn_url,
            thumbnail_url: creds.thumbnail_url || null,
            bunny_video_id: creds.video_id || null,
          },
        },
      );

      if (confirmError || !confirmed?.success) {
        throw new Error(confirmError?.message || confirmed?.error || 'Error al confirmar subida');
      }

      return {
        id: confirmed.media.id,
        file_url: confirmed.media.file_url,
        thumbnail_url: confirmed.media.thumbnail_url || undefined,
      };
    } catch (err) {
      console.error('[useMarketplaceCampaigns] Upload error:', err);
      return null;
    }
  }, []);

  /** Fetch all media for a campaign via SECURITY DEFINER RPC */
  const getCampaignMedia = useCallback(
    async (campaignId: string): Promise<CampaignMediaItem[]> => {
      try {
        const { data, error: err } = await supabase.rpc('get_campaign_media', {
          p_campaign_id: campaignId,
        });
        if (err) throw err;
        return (data || []) as CampaignMediaItem[];
      } catch (err) {
        console.error('[useMarketplaceCampaigns] Media fetch error:', err);
        return [];
      }
    },
    [],
  );

  /** Delete a campaign media item */
  const deleteCampaignMedia = useCallback(
    async (mediaId: string): Promise<boolean> => {
      try {
        const { error: err } = await (supabase as any)
          .from('campaign_media')
          .delete()
          .eq('id', mediaId);
        if (err) throw err;
        return true;
      } catch (err) {
        console.error('[useMarketplaceCampaigns] Media delete error:', err);
        return false;
      }
    },
    [],
  );

  // ── Campaign access (subscription/limits check) ─────────────────

  /**
   * Check if the current user can create campaigns.
   * Calls verify-campaign-access edge function (user_id extracted from JWT).
   */
  const checkCampaignAccess = useCallback(
    async (action: 'create_campaign' | 'view_limits' = 'view_limits'): Promise<CampaignAccessResult | null> => {
      try {
        const { data, error: err } = await supabase.functions.invoke(
          'verify-campaign-access',
          { body: { action } },
        );
        if (err) throw err;
        return data as CampaignAccessResult;
      } catch (err) {
        console.error('[useMarketplaceCampaigns] Access check error:', err);
        return null;
      }
    },
    [],
  );

  // ── Notifications ───────────────────────────────────────────────

  /**
   * Send matching notifications to eligible creators for a campaign.
   * Only callable by campaign owner/brand admin/org admin.
   * Campaign must be active and not already notified.
   */
  const sendCampaignNotifications = useCallback(
    async (campaignId: string, minMatchScore = 50): Promise<NotificationResult | null> => {
      try {
        const { data, error: err } = await supabase.functions.invoke(
          'campaign-notifications',
          {
            body: {
              campaign_id: campaignId,
              notification_type: 'new_campaign',
              min_match_score: minMatchScore,
            },
          },
        );
        if (err) throw err;
        return data as NotificationResult;
      } catch (err) {
        console.error('[useMarketplaceCampaigns] Notification error:', err);
        return null;
      }
    },
    [],
  );

  // ── Application read operations ───────────────────────────────────

  const getApplicationsForCampaign = useCallback(
    async (campaignId: string): Promise<CampaignApplication[]> => {
      try {
        const { data: appRows, error: err } = await (supabase as any)
          .from('campaign_applications')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        if (!appRows?.length) return [];

        const creatorIds = [...new Set(appRows.map((a: any) => a.creator_id).filter(Boolean))] as string[];
        const creatorsMap = new Map<string, MarketplaceCreator>();

        if (creatorIds.length > 0) {
          const { data: creators } = await (supabase as any)
            .from('creator_profiles')
            .select('*')
            .in('id', creatorIds);
          for (const c of creators || []) {
            creatorsMap.set(c.id, {
              id: c.id,
              user_id: c.user_id,
              slug: c.slug || null,
              display_name: c.display_name || '',
              avatar_url: c.avatar_url,
              bio: c.bio,
              location_city: c.location_city,
              location_country: c.location_country,
              country_flag: c.country_flag,
              categories: c.categories || [],
              content_types: c.content_types || [],
              level: c.level || 'bronze',
              is_verified: c.is_verified || false,
              rating_avg: Number(c.rating_avg) || 0,
              rating_count: Number(c.rating_count) || 0,
              base_price: c.base_price != null ? Number(c.base_price) : null,
              currency: c.currency || 'USD',
              portfolio_media: [],
              is_available: c.is_available !== false,
              languages: c.languages || ['es'],
              completed_projects: Number(c.completed_projects) || 0,
              joined_at: c.created_at || '',
              accepts_product_exchange: c.accepts_product_exchange || false,
              marketplace_roles: c.marketplace_roles || [],
            });
          }
        }

        return appRows.map((row: any) =>
          mapApplicationRow(row, creatorsMap.get(row.creator_id) || { ...defaultCreator }),
        );
      } catch (err) {
        console.error('[useMarketplaceCampaigns] Applications error:', err);
        return [];
      }
    },
    [],
  );

  const getApplicationsForCreator = useCallback(
    async (creatorProfileId: string): Promise<CampaignApplication[]> => {
      try {
        const { data: appRows, error: err } = await (supabase as any)
          .from('campaign_applications')
          .select('*')
          .eq('creator_id', creatorProfileId)
          .order('created_at', { ascending: false });

        if (err) throw err;
        if (!appRows?.length) return [];

        const { data: creatorRow } = await (supabase as any)
          .from('creator_profiles')
          .select('*')
          .eq('id', creatorProfileId)
          .maybeSingle();

        const creator: MarketplaceCreator = creatorRow
          ? {
              id: creatorRow.id,
              user_id: creatorRow.user_id,
              slug: creatorRow.slug || null,
              display_name: creatorRow.display_name || '',
              avatar_url: creatorRow.avatar_url,
              bio: creatorRow.bio,
              location_city: creatorRow.location_city,
              location_country: creatorRow.location_country,
              country_flag: creatorRow.country_flag,
              categories: creatorRow.categories || [],
              content_types: creatorRow.content_types || [],
              level: creatorRow.level || 'bronze',
              is_verified: creatorRow.is_verified || false,
              rating_avg: Number(creatorRow.rating_avg) || 0,
              rating_count: Number(creatorRow.rating_count) || 0,
              base_price: creatorRow.base_price != null ? Number(creatorRow.base_price) : null,
              currency: creatorRow.currency || 'USD',
              portfolio_media: [],
              is_available: creatorRow.is_available !== false,
              languages: creatorRow.languages || ['es'],
              completed_projects: Number(creatorRow.completed_projects) || 0,
              joined_at: creatorRow.created_at || '',
              accepts_product_exchange: creatorRow.accepts_product_exchange || false,
              marketplace_roles: creatorRow.marketplace_roles || [],
            }
          : { ...defaultCreator };

        return appRows.map((row: any) => mapApplicationRow(row, creator));
      } catch (err) {
        console.error('[useMarketplaceCampaigns] Creator applications error:', err);
        return [];
      }
    },
    [],
  );

  // ── Campaign checkout (Stripe) ─────────────────────────────────

  /**
   * Create a Stripe Checkout Session for a campaign.
   * Returns the checkout URL to redirect the user to, or null on error.
   */
  const createCampaignCheckout = useCallback(async (
    campaignId: string,
    checkoutType: 'create-publish-checkout' | 'create-bid-checkout',
  ): Promise<string | null> => {
    const { data, error } = await supabase.functions.invoke(
      `campaign-checkout/${checkoutType}`,
      { body: { campaign_id: campaignId } },
    );
    if (error) {
      console.error('[useMarketplaceCampaigns] Checkout invoke error:', error);
      throw new Error(error.message || 'Error invoking checkout function');
    }
    if (data?.error) {
      console.error('[useMarketplaceCampaigns] Checkout API error:', data.error);
      throw new Error(data.error);
    }
    if (!data?.checkout_url) {
      throw new Error('No checkout URL returned');
    }
    return data.checkout_url;
  }, []);

  // ── Campaign activation (payment + escrow) ─────────────────────

  /**
   * Activate a campaign: creates escrow hold for the budget, sets status to active.
   * Commission: 30% self-service, 40% with Kreoon Agency support.
   */
  const activateCampaign = useCallback(async (
    campaignId: string,
    paymentIntentId?: string,
  ): Promise<{ success: boolean; escrow_hold_id?: string; error?: string }> => {
    try {
      const { data, error: err } = await supabase.rpc('activate_campaign', {
        p_campaign_id: campaignId,
        p_payment_intent_id: paymentIntentId || null,
      });
      if (err) throw err;
      const result = data as any;
      if (result?.success) await fetchCampaigns();
      return result || { success: false, error: 'No response' };
    } catch (err: any) {
      console.error('[useMarketplaceCampaigns] Activate error:', err);
      return { success: false, error: err.message };
    }
  }, [fetchCampaigns]);

  /**
   * Approve an application: creates a project, assigns the creator.
   */
  const approveApplication = useCallback(async (
    applicationId: string,
    agreedPrice?: number,
  ): Promise<{ success: boolean; project_id?: string; error?: string }> => {
    try {
      const { data, error: err } = await supabase.rpc('approve_campaign_application', {
        p_application_id: applicationId,
        p_agreed_price: agreedPrice || null,
      });
      if (err) throw err;
      const result = data as any;
      if (result?.success) await fetchCampaigns();
      return result || { success: false, error: 'No response' };
    } catch (err: any) {
      console.error('[useMarketplaceCampaigns] Approve error:', err);
      return { success: false, error: err.message };
    }
  }, [fetchCampaigns]);

  /**
   * Complete a delivery: marks application as completed, releases payment.
   */
  const completeDelivery = useCallback(async (
    applicationId: string,
    rating?: number,
  ): Promise<{ success: boolean; creator_payout?: number; commission?: number; error?: string }> => {
    try {
      const { data, error: err } = await supabase.rpc('complete_campaign_delivery', {
        p_application_id: applicationId,
        p_rating: rating || null,
      });
      if (err) throw err;
      const result = data as any;
      if (result?.success) await fetchCampaigns();
      return result || { success: false, error: 'No response' };
    } catch (err: any) {
      console.error('[useMarketplaceCampaigns] Complete delivery error:', err);
      return { success: false, error: err.message };
    }
  }, [fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    getCampaignById,
    getApplicationsForCampaign,
    getApplicationsForCreator,
    refetch: fetchCampaigns,
    // Write operations
    createCampaign,
    updateCampaign,
    publishCampaign,
    submitApplication,
    updateApplicationStatus,
    // Media operations
    uploadCampaignMedia,
    getCampaignMedia,
    deleteCampaignMedia,
    // Access & subscriptions
    checkCampaignAccess,
    // Notifications
    sendCampaignNotifications,
    // Campaign checkout & payment
    createCampaignCheckout,
    activateCampaign,
    approveApplication,
    completeDelivery,
  };
}

// ── Campaign Templates hook ─────────────────────────────────────

export function useCampaignTemplates() {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('campaign_templates')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setTemplates((data || []).map((t: any) => ({
          ...t,
          default_content_types: Array.isArray(t.default_content_types) ? t.default_content_types : [],
          default_platforms: Array.isArray(t.default_platforms) ? t.default_platforms : [],
          default_deliverables: Array.isArray(t.default_deliverables) ? t.default_deliverables : [],
        })));
      } catch (err) {
        console.error('[useCampaignTemplates] Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { templates, loading };
}

// ── Smart Match hook ────────────────────────────────────────────

export function useSmartMatch(campaignId: string | null) {
  const [results, setResults] = useState<SmartMatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatch = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('smart_match_creators', {
        p_campaign_id: id,
      });
      if (error) throw error;
      setResults((data || []) as SmartMatchResult[]);
    } catch (err) {
      console.error('[useSmartMatch] Error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (campaignId) fetchMatch(campaignId);
  }, [campaignId, fetchMatch]);

  return { results, loading, refetch: () => campaignId && fetchMatch(campaignId) };
}

// ── Brand Credits hook ──────────────────────────────────────────

export function useBrandCredits(brandId: string | null) {
  const [credits, setCredits] = useState<BrandCredit | null>(null);
  const [transactions, setTransactions] = useState<BrandCreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brandId) { setLoading(false); return; }
    (async () => {
      try {
        const [creditsRes, txRes] = await Promise.all([
          (supabase as any)
            .from('brand_credits')
            .select('*')
            .eq('brand_id', brandId)
            .limit(1)
            .maybeSingle(),
          (supabase as any)
            .from('brand_credit_transactions')
            .select('*')
            .eq('brand_id', brandId)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);
        if (creditsRes.data) setCredits(creditsRes.data);
        if (txRes.data) setTransactions(txRes.data);
      } catch (err) {
        console.error('[useBrandCredits] Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [brandId]);

  return { credits, transactions, loading };
}

// ── Case Studies hook ───────────────────────────────────────────

export function useCaseStudies(brandId?: string) {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaseStudies = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from('campaign_case_studies')
        .select('*')
        .order('created_at', { ascending: false });

      if (brandId) {
        query = query.eq('brand_id', brandId);
      } else {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCaseStudies(data || []);
    } catch (err) {
      console.error('[useCaseStudies] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchCaseStudies();
  }, [fetchCaseStudies]);

  const publishCaseStudy = useCallback(async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('campaign_case_studies')
        .update({ is_published: true, published_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchCaseStudies();
      return true;
    } catch (err) {
      console.error('[useCaseStudies] Publish error:', err);
      return false;
    }
  }, [fetchCaseStudies]);

  const updateCaseStudy = useCallback(async (id: string, data: Partial<CaseStudy>) => {
    try {
      const { error } = await (supabase as any)
        .from('campaign_case_studies')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchCaseStudies();
      return true;
    } catch (err) {
      console.error('[useCaseStudies] Update error:', err);
      return false;
    }
  }, [fetchCaseStudies]);

  return { caseStudies, loading, refetch: fetchCaseStudies, publishCaseStudy, updateCaseStudy };
}
