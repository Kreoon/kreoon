import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CreatorProfileData, ProfileCustomization } from './useCreatorProfile';
import type { PortfolioItemData } from './usePortfolioItems';
import type { CreatorService } from '@/types/marketplace';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

export interface CreatorReviewData {
  id: string;
  reviewer_user_id: string;
  brand_name: string | null;
  campaign_type: string | null;
  rating: number;
  text: string;
  date: string;
}

export interface CreatorPublicProfile {
  profile: CreatorProfileData;
  portfolioItems: PortfolioItemData[];
  services: CreatorService[];
  reviews: CreatorReviewData[];
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

    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch creator profile — try by ID first, then by user_id, then by slug
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

        if (!profileRow || cancelled) {
          if (!cancelled) {
            setData(null);
            setLoading(false);
          }
          return;
        }

        const profile = mapProfileRow(profileRow);

        // 1b. Fallback avatar from profiles table if creator_profiles.avatar_url is empty
        if (!profile.avatar_url && profile.user_id) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', profile.user_id)
            .maybeSingle();
          if (userProfile?.avatar_url) {
            profile.avatar_url = userProfile.avatar_url;
          }
        }

        // 2. Fetch portfolio items from ALL sources (portfolio_items + content + portfolio_posts)
        const { data: portfolioRows } = await (supabase as any)
          .from('portfolio_items')
          .select('*')
          .eq('creator_id', profile.id)
          .eq('is_public', true)
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true });

        const portfolioItems = (portfolioRows || []).map((r: Record<string, unknown>) => mapPortfolioRow(r));
        const seenUrls = new Set(portfolioItems.map(i => i.media_url));

        // 2b. Also fetch published content (videos from content workflow)
        const { data: contentRows } = await supabase
          .from('content')
          .select('id, title, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
          .eq('creator_id', profile.user_id)
          .eq('is_published', true);

        for (const c of contentRows || []) {
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

        // 2c. Also fetch portfolio_posts (social feed content)
        const { data: postRows } = await supabase
          .from('portfolio_posts')
          .select('id, media_url, media_type, thumbnail_url, caption, user_id, created_at')
          .eq('user_id', profile.user_id)
          .order('created_at', { ascending: false });

        for (const p of postRows || []) {
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

        // 3. Fetch services (active only)
        const { data: serviceRows } = await (supabase as any)
          .from('creator_services')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        const services: CreatorService[] = (serviceRows || []).map((s: any) => ({
          ...s,
          deliverables: s.deliverables || [],
          portfolio_items: s.portfolio_items || [],
        }));

        // 4. Fetch reviews
        const { data: reviewRows } = await (supabase as any)
          .from('creator_reviews')
          .select('id, reviewer_id, rating, comment, created_at, project_id')
          .eq('creator_id', profile.id)
          .order('created_at', { ascending: false });

        const reviews: CreatorReviewData[] = (reviewRows || []).map((r: any) => ({
          id: r.id,
          reviewer_user_id: r.reviewer_id,
          brand_name: null, // Will be populated from project data if needed
          campaign_type: null,
          rating: Number(r.rating) || 5,
          text: r.comment || '',
          date: r.created_at || '',
        }));

        if (!cancelled) {
          setData({ profile, portfolioItems, services, reviews });
        }
      } catch (err) {
        console.error('[useCreatorPublicProfile] Error:', err);
        if (!cancelled) {
          setError('Error al cargar el perfil');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [creatorProfileId]);

  return { data, loading, error };
}
