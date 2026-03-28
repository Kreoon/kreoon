import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type {
  SocialPlatform,
  PublicationVerificationStatus,
  VerificationMethod,
  BrandActivationConfig,
  ActivationPublication,
  CreatorSocialStats,
  ActivationEligibilityResult,
} from '@/components/marketplace/types/brandActivation';

// ── Tipos auxiliares ─────────────────────────────────────────────────────

export interface CreateActivationCampaignData {
  title: string;
  description?: string;
  brand_id?: string;
  brand_name_override?: string;
  category?: string;
  budget_per_video?: number;
  total_budget?: number;
  currency?: string;
  max_creators?: number;
  deadline?: string;
  activation_config: BrandActivationConfig;
  // Fechas opcionales
  application_deadline?: string;
  content_deadline?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
}

export interface SubmitContentData {
  publication_url: string;
  caption?: string;
  hashtags_used?: string[];
  mentions_used?: string[];
  publication_screenshot_url?: string;
}

export interface VerifyPublicationData {
  verification_status: PublicationVerificationStatus;
  verification_notes?: string;
  verification_method?: VerificationMethod;
}

export interface UpdateMetricsData {
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  saves_count?: number;
  views_count?: number;
  reach_count?: number;
  impressions_count?: number;
  followers_at_post?: number;
}

export interface UpdateSocialStatsData {
  platform: SocialPlatform;
  username?: string;
  profile_url?: string;
  followers_count: number;
  following_count?: number;
  posts_count?: number;
  avg_likes_per_post?: number;
  avg_comments_per_post?: number;
  avg_views_per_reel?: number;
  engagement_rate?: number;
  audience_demographics?: Record<string, unknown>;
  is_verified?: boolean;
  verification_screenshot_url?: string;
}

export interface PublicationWithCreator extends ActivationPublication {
  creator_display_name?: string;
  creator_avatar_url?: string;
  creator_slug?: string;
}

export interface EligibleCampaign {
  campaign_id: string;
  title: string;
  brand_name: string;
  budget_per_creator: number;
  required_platforms: string[];
  min_followers: Record<string, number>;
  meets_requirements: boolean;
  missing_requirements: Array<{
    type: string;
    platform: string;
    required: number;
    actual: number;
  }>;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useBrandActivation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ── Crear campaña de activación ──────────────────────────────────────

  const createActivationCampaign = useCallback(async (
    data: CreateActivationCampaignData,
  ): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from('marketplace_campaigns')
        .insert({
          title: data.title,
          description: data.description || '',
          brand_id: data.brand_id || null,
          brand_name_override: data.brand_name_override || null,
          category: data.category || 'brand_activation',
          campaign_type: 'paid',
          budget_per_video: data.budget_per_video || 0,
          total_budget: data.total_budget || 0,
          currency: data.currency || 'COP',
          max_creators: data.max_creators || 10,
          deadline: data.deadline || null,
          application_deadline: data.application_deadline || null,
          content_deadline: data.content_deadline || null,
          campaign_start_date: data.campaign_start_date || null,
          campaign_end_date: data.campaign_end_date || null,
          status: 'draft',
          visibility: 'public',
          is_brand_activation: true,
          activation_config: data.activation_config,
        })
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('[useBrandActivation] createActivationCampaign error:', error);
        toast({ title: 'Error al crear campaña', description: error.message, variant: 'destructive' });
        return null;
      }
      return row?.id || null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // ── Obtener publicaciones de una campaña (con info de creador) ────────

  const getCampaignPublications = useCallback(async (
    campaignId: string,
  ): Promise<PublicationWithCreator[]> => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('activation_publications')
        .select(`
          *,
          creator_profiles!activation_publications_creator_id_fkey (
            display_name,
            avatar_url,
            slug
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useBrandActivation] getCampaignPublications error:', error);
        return [];
      }

      return (rows || []).map((row: any) => ({
        ...row,
        creator_display_name: row.creator_profiles?.display_name,
        creator_avatar_url: row.creator_profiles?.avatar_url,
        creator_slug: row.creator_profiles?.slug,
        creator_profiles: undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Crear publicación para una aplicación ────────────────────────────

  const createPublication = useCallback(async (
    campaignId: string,
    applicationId: string,
    creatorId: string,
    platform: SocialPlatform,
    deliverableId?: string,
  ): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: row, error } = await supabase
        .from('activation_publications')
        .insert({
          campaign_id: campaignId,
          application_id: applicationId,
          creator_id: creatorId,
          platform,
          deliverable_id: deliverableId || null,
          verification_status: 'pending_content',
        })
        .select('id')
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Ya existe una publicación para esta plataforma', variant: 'destructive' });
          return null;
        }
        console.error('[useBrandActivation] createPublication error:', error);
        toast({ title: 'Error al crear publicación', description: error.message, variant: 'destructive' });
        return null;
      }
      return row?.id || null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Creador envía contenido para aprobación ──────────────────────────

  const submitContentForApproval = useCallback(async (
    publicationId: string,
    data: SubmitContentData,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activation_publications')
        .update({
          publication_url: data.publication_url,
          caption: data.caption || null,
          hashtags_used: data.hashtags_used || [],
          mentions_used: data.mentions_used || [],
          publication_screenshot_url: data.publication_screenshot_url || null,
          verification_status: 'pending_verification',
          content_submitted_at: new Date().toISOString(),
        })
        .eq('id', publicationId);

      if (error) {
        console.error('[useBrandActivation] submitContentForApproval error:', error);
        toast({ title: 'Error al enviar contenido', description: error.message, variant: 'destructive' });
        return false;
      }

      toast({ title: 'Contenido enviado para verificación' });
      return true;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Marca verifica una publicación ───────────────────────────────────
  // Primero actualiza el status, LUEGO calcula bonus si es "verified"

  const verifyPublication = useCallback(async (
    publicationId: string,
    data: VerifyPublicationData,
  ): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const updatePayload: Record<string, unknown> = {
        verification_status: data.verification_status,
        verification_notes: data.verification_notes || null,
        verification_method: data.verification_method || 'manual',
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      };

      if (data.verification_status === 'verified') {
        updatePayload.published_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('activation_publications')
        .update(updatePayload)
        .eq('id', publicationId);

      if (updateError) {
        console.error('[useBrandActivation] verifyPublication update error:', updateError);
        toast({ title: 'Error al verificar', description: updateError.message, variant: 'destructive' });
        return false;
      }

      // Calcular bonus DESPUÉS de actualizar status
      if (data.verification_status === 'verified') {
        const { error: bonusError } = await supabase
          .rpc('calculate_engagement_bonus', { p_publication_id: publicationId });

        if (bonusError) {
          console.warn('[useBrandActivation] calculate_engagement_bonus warning:', bonusError);
        }
      }

      const statusLabel = data.verification_status === 'verified' ? 'verificada' : 'actualizada';
      toast({ title: `Publicación ${statusLabel}` });
      return true;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // ── Actualizar métricas de engagement ────────────────────────────────

  const updatePublicationMetrics = useCallback(async (
    publicationId: string,
    metrics: UpdateMetricsData,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activation_publications')
        .update({
          ...metrics,
          metrics_captured_at: new Date().toISOString(),
          metrics_last_updated: new Date().toISOString(),
        })
        .eq('id', publicationId);

      if (error) {
        console.error('[useBrandActivation] updatePublicationMetrics error:', error);
        toast({ title: 'Error al actualizar métricas', description: error.message, variant: 'destructive' });
        return false;
      }

      // Recalcular bonus después de actualizar métricas
      const { error: bonusError } = await supabase
        .rpc('calculate_engagement_bonus', { p_publication_id: publicationId });

      if (bonusError) {
        console.warn('[useBrandActivation] recalculate bonus warning:', bonusError);
      }

      toast({ title: 'Métricas actualizadas' });
      return true;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Actualizar stats sociales del creador (upsert) ───────────────────

  const updateSocialStats = useCallback(async (
    creatorProfileId: string,
    data: UpdateSocialStatsData,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('creator_social_stats')
        .upsert(
          {
            creator_profile_id: creatorProfileId,
            platform: data.platform,
            username: data.username || null,
            profile_url: data.profile_url || null,
            followers_count: data.followers_count,
            following_count: data.following_count || 0,
            posts_count: data.posts_count || 0,
            avg_likes_per_post: data.avg_likes_per_post || 0,
            avg_comments_per_post: data.avg_comments_per_post || 0,
            avg_views_per_reel: data.avg_views_per_reel || 0,
            engagement_rate: data.engagement_rate || null,
            audience_demographics: data.audience_demographics || null,
            is_verified: data.is_verified || false,
            verification_screenshot_url: data.verification_screenshot_url || null,
            stats_updated_at: new Date().toISOString(),
          },
          { onConflict: 'creator_profile_id,platform' },
        );

      if (error) {
        console.error('[useBrandActivation] updateSocialStats error:', error);
        toast({ title: 'Error al actualizar stats', description: error.message, variant: 'destructive' });
        return false;
      }

      toast({ title: 'Stats sociales actualizados' });
      return true;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // ── Obtener stats sociales de un creador ─────────────────────────────

  const getCreatorSocialStats = useCallback(async (
    creatorProfileId: string,
  ): Promise<CreatorSocialStats[]> => {
    const { data: rows, error } = await supabase
      .from('creator_social_stats')
      .select('*')
      .eq('creator_profile_id', creatorProfileId)
      .order('followers_count', { ascending: false });

    if (error) {
      console.error('[useBrandActivation] getCreatorSocialStats error:', error);
      return [];
    }
    return rows || [];
  }, []);

  // ── Verificar elegibilidad de un creador para una campaña ────────────

  const checkEligibility = useCallback(async (
    creatorProfileId: string,
    campaignId: string,
  ): Promise<ActivationEligibilityResult | null> => {
    const { data, error } = await supabase
      .rpc('creator_meets_activation_requirements', {
        p_creator_profile_id: creatorProfileId,
        p_campaign_id: campaignId,
      });

    if (error) {
      console.error('[useBrandActivation] checkEligibility error:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      meets_requirements: row.meets_requirements,
      missing_requirements: typeof row.missing_requirements === 'string'
        ? JSON.parse(row.missing_requirements)
        : row.missing_requirements || [],
      creator_stats: typeof row.creator_stats === 'string'
        ? JSON.parse(row.creator_stats)
        : row.creator_stats || {},
    };
  }, []);

  // ── Obtener campañas elegibles para un creador ───────────────────────

  const getEligibleCampaigns = useCallback(async (
    creatorProfileId: string,
  ): Promise<EligibleCampaign[]> => {
    const { data, error } = await supabase
      .rpc('get_eligible_activation_campaigns', {
        p_creator_profile_id: creatorProfileId,
      });

    if (error) {
      console.error('[useBrandActivation] getEligibleCampaigns error:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      campaign_id: row.campaign_id,
      title: row.title,
      brand_name: row.brand_name,
      budget_per_creator: Number(row.budget_per_creator) || 0,
      required_platforms: row.required_platforms || [],
      min_followers: typeof row.min_followers === 'string'
        ? JSON.parse(row.min_followers)
        : row.min_followers || {},
      meets_requirements: row.meets_requirements ?? true,
      missing_requirements: typeof row.missing_requirements === 'string'
        ? JSON.parse(row.missing_requirements)
        : row.missing_requirements || [],
    }));
  }, []);

  // ── Obtener publicación individual ───────────────────────────────────

  const getPublication = useCallback(async (
    publicationId: string,
  ): Promise<ActivationPublication | null> => {
    const { data: row, error } = await supabase
      .from('activation_publications')
      .select('*')
      .eq('id', publicationId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[useBrandActivation] getPublication error:', error);
      return null;
    }
    return row || null;
  }, []);

  // ── Subir screenshot de insights ─────────────────────────────────────

  const uploadInsightsScreenshot = useCallback(async (
    publicationId: string,
    screenshotUrl: string,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activation_publications')
        .update({ insights_screenshot_url: screenshotUrl })
        .eq('id', publicationId);

      if (error) {
        console.error('[useBrandActivation] uploadInsightsScreenshot error:', error);
        return false;
      }
      return true;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Marcar publicación como eliminada (violation) ────────────────────

  const reportPublicationRemoved = useCallback(async (
    publicationId: string,
  ): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activation_publications')
        .update({
          is_still_live: false,
          removed_detected_at: new Date().toISOString(),
          verification_status: 'violation',
        })
        .eq('id', publicationId);

      if (error) {
        console.error('[useBrandActivation] reportPublicationRemoved error:', error);
        toast({ title: 'Error al reportar eliminación', variant: 'destructive' });
        return false;
      }

      toast({ title: 'Publicación marcada como eliminada' });
      return true;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    // Campaigns
    createActivationCampaign,
    getEligibleCampaigns,
    // Publications
    createPublication,
    getCampaignPublications,
    getPublication,
    submitContentForApproval,
    verifyPublication,
    updatePublicationMetrics,
    uploadInsightsScreenshot,
    reportPublicationRemoved,
    // Social stats
    updateSocialStats,
    getCreatorSocialStats,
    // Eligibility
    checkEligibility,
  };
}
