import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorProfileData, ProfileCustomization } from './useCreatorProfile';
import type { PortfolioItemData } from './usePortfolioItems';
import type { CreatorService } from '@/types/marketplace';
import type { Specialization } from '@/types/database';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { fetchUserSpecializations } from './useUserSpecializations';

export interface CreatorReviewData {
  id: string;
  reviewer_user_id: string;
  brand_name: string | null;
  campaign_type: string | null;
  rating: number;
  text: string;
  date: string;
}

export interface CreatorTrustStats {
  // Proyectos
  completed_projects: number;
  marketplace_projects: number;
  org_projects: number;
  active_projects: number;
  cancelled_projects: number;
  cancellation_rate: number;

  // Ratings
  rating_avg: number;
  rating_count: number;

  // Tiempos
  response_time_hours: number;
  on_time_delivery_pct: number;
  avg_delivery_days: number;
  last_delivery_days: number;

  // Clientes
  unique_clients: number;
  repeat_clients: number;
  repeat_clients_pct: number;

  // Financiero
  total_earned: number;

  // Antigüedad
  member_since: string | null;
  days_on_platform: number;

  // Verificaciones
  identity_verified: boolean;
  email_verified: boolean;
  legal_docs_signed: number;
  payment_verified: boolean;
  onboarding_completed: boolean;

  // Portfolio
  portfolio_views: number;
  portfolio_likes: number;
  portfolio_saves: number;
  portfolio_items: number;

  // Experiencia
  industries: string[];
  organizations_worked: number;

  // Comunicación
  invitation_response_rate: number;
  invitations_received: number;
}

export interface CreatorPublicProfile {
  profile: CreatorProfileData;
  portfolioItems: PortfolioItemData[];
  services: CreatorService[];
  reviews: CreatorReviewData[];
  trustStats: CreatorTrustStats | null;
  specializations: Specialization[];
}

const DEFAULT_CUSTOMIZATION: ProfileCustomization = {
  theme: 'dark_purple',
  card_style: 'glass',
  cover_style: 'image',
  sections_order: ['about', 'services', 'portfolio', 'stats', 'reviews'],
  sections_visible: { about: true, services: true, portfolio: true, stats: true, reviews: true },
};

const mapProfileRow = (row: Record<string, unknown>): CreatorProfileData => ({
  id: row.id as string,
  user_id: row.user_id as string,
  display_name: (row.display_name as string) || '',
  slug: row.slug as string | null,
  bio: row.bio as string | null,
  bio_full: row.bio_full as string | null,
  avatar_url: row.avatar_url as string | null,
  banner_url: row.banner_url as string | null,
  location_city: row.location_city as string | null,
  location_country: (row.location_country as string) || 'CO',
  country_flag: (row.country_flag as string) || '',
  categories: (row.categories as string[]) || [],
  content_types: (row.content_types as string[]) || [],
  languages: (row.languages as string[]) || ['es'],
  platforms: (row.platforms as string[]) || [],
  social_links: (row.social_links as Record<string, string>) || {},
  level: (row.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
  is_verified: (row.is_verified as boolean) || false,
  is_available: row.is_available !== false,
  rating_avg: Number(row.rating_avg) || 0,
  rating_count: Number(row.rating_count) || 0,
  completed_projects: Number(row.completed_projects) || 0,
  base_price: row.base_price != null ? Number(row.base_price) : null,
  currency: (row.currency as string) || 'USD',
  accepts_product_exchange: (row.accepts_product_exchange as boolean) || false,
  exchange_conditions: row.exchange_conditions as string | null,
  response_time_hours: Number(row.response_time_hours) || 24,
  on_time_delivery_pct: Number(row.on_time_delivery_pct) || 100,
  repeat_clients_pct: Number(row.repeat_clients_pct) || 0,
  marketplace_roles: (row.marketplace_roles as string[]) || [],
  is_active: row.is_active !== false,
  profile_customization: (row.profile_customization as ProfileCustomization) || { ...DEFAULT_CUSTOMIZATION },
  showreel_video_id: row.showreel_video_id as string | null,
  showreel_url: row.showreel_url as string | null,
  showreel_thumbnail: row.showreel_thumbnail as string | null,
  created_at: (row.created_at as string) || '',
  updated_at: (row.updated_at as string) || '',
  // Talent DNA fields
  has_talent_dna: (row.has_talent_dna as boolean) || false,
  experience_level: row.experience_level as 'beginner' | 'intermediate' | 'advanced' | 'expert' | null,
  content_style: row.content_style as { tone_descriptors?: string[]; primary_style?: string } | null,
});

const mapPortfolioRow = (row: Record<string, unknown>): PortfolioItemData => ({
  id: row.id as string,
  creator_id: row.creator_id as string,
  title: row.title as string | null,
  description: row.description as string | null,
  media_type: (row.media_type as 'video' | 'image' | 'carousel') || 'image',
  media_url: (row.media_url as string) || '',
  thumbnail_url: row.thumbnail_url as string | null,
  bunny_video_id: row.bunny_video_id as string | null,
  duration_seconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
  aspect_ratio: (row.aspect_ratio as string) || '9:16',
  category: row.category as string | null,
  tags: (row.tags as string[]) || [],
  brand_name: row.brand_name as string | null,
  views_count: Number(row.views_count) || 0,
  likes_count: Number(row.likes_count) || 0,
  is_featured: (row.is_featured as boolean) || false,
  is_public: row.is_public !== false,
  display_order: Number(row.display_order) || 0,
  created_at: (row.created_at as string) || '',
  updated_at: (row.updated_at as string) || '',
});

/**
 * Fetches a creator's full public profile by creator_profile ID or user_id.
 * Used for the public profile page at /marketplace/creator/:id
 *
 * OPTIMIZED: Queries parallelizadas con Promise.all() para reducir latencia de ~2s a ~300ms
 */
export function useCreatorPublicProfile(creatorProfileId: string | undefined) {
  const [data, setData] = useState<CreatorPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorProfileId) {
      setLoading(false);
      return;
    }

    // AbortController para cancelar requests cuando el componente se desmonta
    const abortController = new AbortController();
    const signal = abortController.signal;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // ============================================================
        // FASE 1: Buscar profile (secuencial - es un fallback chain)
        // ============================================================
        let profileRow: Record<string, unknown> | null = null;

        // Try UUID match (creator_profile.id)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorProfileId);

        if (isUUID) {
          // Try by creator_profiles.id
          const { data: byId } = await (supabase as any)
            .from('creator_profiles')
            .select('*')
            .eq('id', creatorProfileId)
            .maybeSingle();

          if (byId) {
            profileRow = byId;
          } else {
            // Try by user_id
            const { data: byUserId } = await (supabase as any)
              .from('creator_profiles')
              .select('*')
              .eq('user_id', creatorProfileId)
              .maybeSingle();
            profileRow = byUserId;
          }
        } else {
          // Try by slug
          const { data: bySlug } = await (supabase as any)
            .from('creator_profiles')
            .select('*')
            .eq('slug', creatorProfileId)
            .maybeSingle();
          profileRow = bySlug;
        }

        // Verificar abort después de cada fase
        if (signal.aborted) return;

        if (!profileRow) {
          setData(null);
          setLoading(false);
          return;
        }

        const profile = mapProfileRow(profileRow);

        // ============================================================
        // FASE 2: Queries paralelas (todas dependen del profile)
        // ============================================================
        const [
          avatarResult,
          portfolioResult,
          contentResult,
          postsResult,
          servicesResult,
          reviewsResult,
          statsResult,
          specializationsResult
        ] = await Promise.all([
          // 1. Avatar fallback (solo si no tiene avatar)
          !profile.avatar_url && profile.user_id
            ? supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', profile.user_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),

          // 2. Portfolio items
          (supabase as any)
            .from('portfolio_items')
            .select('*')
            .eq('creator_id', profile.id)
            .eq('is_public', true)
            .order('is_featured', { ascending: false })
            .order('display_order', { ascending: true }),

          // 3. Content (videos publicados)
          supabase
            .from('content')
            .select('id, title, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
            .eq('creator_id', profile.user_id)
            .eq('is_published', true),

          // 4. Portfolio posts
          supabase
            .from('portfolio_posts')
            .select('id, media_url, media_type, thumbnail_url, caption, user_id, created_at')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false }),

          // 5. Services
          (supabase as any)
            .from('creator_services')
            .select('*')
            .eq('user_id', profile.user_id)
            .eq('is_active', true)
            .order('display_order', { ascending: true }),

          // 6. Reviews
          (supabase as any)
            .from('creator_reviews')
            .select('id, reviewer_id, rating, comment, created_at, project_id')
            .eq('creator_id', profile.id)
            .order('created_at', { ascending: false }),

          // 7. Unified stats
          (supabase as any)
            .rpc('get_creator_unified_stats', { p_user_id: profile.user_id }),

          // 8. Specializations
          fetchUserSpecializations(profile.user_id).catch((err) => {
            console.warn('[useCreatorPublicProfile] Error fetching specializations:', err);
            return [] as Specialization[];
          })
        ]);

        // Verificar abort después de las queries paralelas
        if (signal.aborted) return;

        // ============================================================
        // FASE 3: Procesar resultados
        // ============================================================

        // Aplicar avatar fallback
        if (avatarResult.data?.avatar_url) {
          profile.avatar_url = avatarResult.data.avatar_url;
        }

        // Procesar portfolio items
        const portfolioRows = portfolioResult.data || [];
        const portfolioItems = portfolioRows.map((r: Record<string, unknown>) => mapPortfolioRow(r));
        const seenUrls = new Set(portfolioItems.map(i => i.media_url));

        // Agregar content rows al portfolio
        for (const c of contentResult.data || []) {
          const videoUrls = (c as any).video_urls as string[] | null;
          const url = videoUrls?.[0] || (c as any).bunny_embed_url || (c as any).video_url || '';
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            portfolioItems.push({
              id: c.id,
              creator_id: profile.id,
              title: (c as any).title || null,
              description: null,
              media_type: 'video',
              media_url: url,
              thumbnail_url: (c as any).thumbnail_url || getBunnyThumbnailUrl(url) || null,
              bunny_video_id: null,
              duration_seconds: null,
              aspect_ratio: '9:16',
              category: null,
              tags: [],
              brand_name: null,
              views_count: 0,
              likes_count: 0,
              is_featured: false,
              is_public: true,
              display_order: portfolioItems.length,
              created_at: '',
              updated_at: '',
            });
          }
        }

        // Agregar portfolio posts
        for (const p of postsResult.data || []) {
          if (p.media_url && !seenUrls.has(p.media_url)) {
            seenUrls.add(p.media_url);
            portfolioItems.push({
              id: p.id,
              creator_id: profile.id,
              title: (p as any).caption || null,
              description: null,
              media_type: (p.media_type === 'video' ? 'video' : 'image') as any,
              media_url: p.media_url,
              thumbnail_url: p.thumbnail_url || (p.media_type === 'video' ? getBunnyThumbnailUrl(p.media_url) : null) || null,
              bunny_video_id: null,
              duration_seconds: null,
              aspect_ratio: '9:16',
              category: null,
              tags: [],
              brand_name: null,
              views_count: 0,
              likes_count: 0,
              is_featured: false,
              is_public: true,
              display_order: portfolioItems.length,
              created_at: p.created_at || '',
              updated_at: '',
            });
          }
        }

        // Procesar services
        const services: CreatorService[] = (servicesResult.data || []).map((s: any) => ({
          ...s,
          deliverables: s.deliverables || [],
          portfolio_items: s.portfolio_items || [],
        }));

        // Procesar reviews
        const reviews: CreatorReviewData[] = (reviewsResult.data || []).map((r: any) => ({
          id: r.id,
          reviewer_user_id: r.reviewer_id,
          brand_name: null,
          campaign_type: null,
          rating: Number(r.rating) || 5,
          text: r.comment || '',
          date: r.created_at || '',
        }));

        // Procesar unified stats
        let trustStats: CreatorTrustStats | null = null;
        const unifiedStats = statsResult.data;
        const statsError = statsResult.error;

        if (statsError) {
          console.warn('[useCreatorPublicProfile] Error fetching unified stats:', statsError);
        }

        if (unifiedStats && typeof unifiedStats === 'object') {
          profile.completed_projects = unifiedStats.completed_projects ?? profile.completed_projects;
          profile.rating_avg = unifiedStats.rating_avg ?? profile.rating_avg;
          profile.rating_count = unifiedStats.rating_count ?? profile.rating_count;
          profile.on_time_delivery_pct = unifiedStats.on_time_delivery_pct ?? profile.on_time_delivery_pct;
          profile.repeat_clients_pct = unifiedStats.repeat_clients_pct ?? profile.repeat_clients_pct;

          trustStats = {
            completed_projects: unifiedStats.completed_projects ?? 0,
            marketplace_projects: unifiedStats.marketplace_projects ?? 0,
            org_projects: unifiedStats.org_projects ?? 0,
            active_projects: unifiedStats.active_projects ?? 0,
            cancelled_projects: unifiedStats.cancelled_projects ?? 0,
            cancellation_rate: unifiedStats.cancellation_rate ?? 0,
            rating_avg: unifiedStats.rating_avg ?? 0,
            rating_count: unifiedStats.rating_count ?? 0,
            response_time_hours: unifiedStats.response_time_hours ?? 24,
            on_time_delivery_pct: unifiedStats.on_time_delivery_pct ?? 100,
            avg_delivery_days: unifiedStats.avg_delivery_days ?? 0,
            last_delivery_days: unifiedStats.last_delivery_days ?? 0,
            unique_clients: unifiedStats.unique_clients ?? 0,
            repeat_clients: unifiedStats.repeat_clients ?? 0,
            repeat_clients_pct: unifiedStats.repeat_clients_pct ?? 0,
            total_earned: unifiedStats.total_earned ?? 0,
            member_since: unifiedStats.member_since ?? null,
            days_on_platform: unifiedStats.days_on_platform ?? 0,
            identity_verified: unifiedStats.identity_verified ?? false,
            email_verified: unifiedStats.email_verified ?? false,
            legal_docs_signed: unifiedStats.legal_docs_signed ?? 0,
            payment_verified: unifiedStats.payment_verified ?? false,
            onboarding_completed: unifiedStats.onboarding_completed ?? false,
            portfolio_views: unifiedStats.portfolio_views ?? 0,
            portfolio_likes: unifiedStats.portfolio_likes ?? 0,
            portfolio_saves: unifiedStats.portfolio_saves ?? 0,
            portfolio_items: unifiedStats.portfolio_items ?? 0,
            industries: Array.isArray(unifiedStats.industries) ? unifiedStats.industries : [],
            organizations_worked: unifiedStats.organizations_worked ?? 0,
            invitation_response_rate: unifiedStats.invitation_response_rate ?? 0,
            invitations_received: unifiedStats.invitations_received ?? 0,
          };

          console.log('[useCreatorPublicProfile] Trust stats loaded:', trustStats);
        }

        // Specializations ya procesado en Promise.all
        const specializations = specializationsResult as Specialization[];

        // Verificar abort antes de actualizar estado
        if (signal.aborted) return;

        setData({ profile, portfolioItems, services, reviews, trustStats, specializations });
      } catch (err) {
        // Ignorar errores si fue abortado
        if (signal.aborted) return;

        console.error('[useCreatorPublicProfile] Error:', err);
        setError('Error al cargar el perfil');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAll();

    // Cleanup: abortar requests pendientes al desmontar
    return () => {
      abortController.abort();
    };
  }, [creatorProfileId]);

  return { data, loading, error };
}
