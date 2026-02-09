import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceCreator, MarketplaceFilters, MarketplaceRoleCategory, PortfolioMedia } from '@/components/marketplace/types/marketplace';
import { MARKETPLACE_ROLES } from '@/components/marketplace/roles/marketplaceRoleConfig';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';

// ── Helper: map DB row → MarketplaceCreator ────────────────────────────

function mapCreatorRow(row: Record<string, unknown>): MarketplaceCreator {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    slug: (row.slug as string) || null,
    display_name: (row.display_name as string) || '',
    avatar_url: row.avatar_url as string | null,
    bio: row.bio as string | null,
    location_city: row.location_city as string | null,
    location_country: row.location_country as string | null,
    country_flag: row.country_flag as string | null,
    categories: (row.categories as string[]) || [],
    content_types: (row.content_types as string[]) || [],
    level: (row.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    is_verified: (row.is_verified as boolean) || false,
    rating_avg: Number(row.rating_avg) || 0,
    rating_count: Number(row.rating_count) || 0,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    currency: (row.currency as string) || 'USD',
    portfolio_media: [],
    is_available: row.is_available !== false,
    languages: (row.languages as string[]) || ['es'],
    completed_projects: Number(row.completed_projects) || 0,
    joined_at: (row.created_at as string) || '',
    accepts_product_exchange: (row.accepts_product_exchange as boolean) || false,
    marketplace_roles: (row.marketplace_roles as any[]) || [],
  };
}

// ── Helper: map profiles row → MarketplaceCreator ──────────────────────

function mapProfileRow(row: Record<string, unknown>): MarketplaceCreator {
  return {
    id: `profile_${row.id as string}`,
    user_id: row.id as string,
    slug: (row.username as string) || null,
    display_name: (row.full_name as string) || 'Creador',
    avatar_url: row.avatar_url as string | null,
    bio: row.bio as string | null,
    location_city: row.city as string | null,
    location_country: row.country as string | null,
    country_flag: null,
    categories: (row.content_categories as string[]) || [],
    content_types: [],
    level: 'bronze',
    is_verified: false,
    rating_avg: Number(row.avg_rating) || 0,
    rating_count: 0,
    base_price: row.minimum_budget != null ? Number(row.minimum_budget) : null,
    currency: 'USD',
    portfolio_media: [],
    is_available: (row.is_available_for_hire as boolean) !== false,
    languages: (row.languages as string[]) || ['es'],
    completed_projects: Number(row.total_contracts_completed) || 0,
    joined_at: (row.created_at as string) || '',
    accepts_product_exchange: false,
    marketplace_roles: [],
  };
}

// ── Helper: resolve best video URL from content row ────────────────────

function resolveContentVideoUrl(row: Record<string, unknown>): string {
  const videoUrls = row.video_urls as string[] | null;
  if (videoUrls && videoUrls.length > 0) return videoUrls[0];
  if (row.bunny_embed_url) return row.bunny_embed_url as string;
  if (row.video_url) return row.video_url as string;
  return '';
}

// ── Main hook ──────────────────────────────────────────────────────────

export function useMarketplaceCreators(filters?: MarketplaceFilters) {
  const [allCreators, setAllCreators] = useState<MarketplaceCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCreators = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // ── 0. Fetch exclusions & subscriptions ──────────────────────────
      // Users who are clients of organizations should NOT appear as creators
      const { data: clientUserRows } = await supabase
        .from('client_users')
        .select('user_id');
      const clientUserIds = new Set((clientUserRows || []).map((r: any) => r.user_id));

      // Fetch paid subscriptions (basic or pro, active) to identify subscribed users
      const { data: subRows } = await (supabase as any)
        .from('user_subscriptions')
        .select('user_id, plan, status')
        .neq('plan', 'free')
        .eq('status', 'active');
      const subscribedUserIds = new Set((subRows || []).map((r: any) => r.user_id));

      // ── 1. Fetch from creator_profiles (marketplace-native) ──────────
      const { data: rows, error: err } = await (supabase as any)
        .from('creator_profiles')
        .select('*')
        .eq('is_active', true)
        .order('rating_avg', { ascending: false });

      if (err) throw err;

      // Filter out client users from creator_profiles
      const creatorRows = (rows || []).filter((r: any) => !clientUserIds.has(r.user_id));
      const creatorIds = creatorRows.map((r: any) => r.id);
      const creatorUserIds = creatorRows.map((r: any) => r.user_id);

      // ── 2. Fetch ALL content sources for creator_profiles ────────────
      // Map by creator_profiles.id (for portfolio_items) and by user_id (for content + portfolio_posts)
      const portfolioMap = new Map<string, PortfolioMedia[]>();
      // Build a user_id → creator_profiles.id lookup
      const userIdToCreatorId = new Map<string, string>();
      for (const r of creatorRows) {
        userIdToCreatorId.set(r.user_id, r.id);
      }

      if (creatorIds.length > 0) {
        // 2a. Fetch portfolio_items (marketplace-native uploads)
        const { data: portfolioRows } = await (supabase as any)
          .from('portfolio_items')
          .select('id, creator_id, media_url, thumbnail_url, media_type')
          .in('creator_id', creatorIds)
          .eq('is_public', true)
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true });

        for (const item of portfolioRows || []) {
          if (!portfolioMap.has(item.creator_id)) {
            portfolioMap.set(item.creator_id, []);
          }
          const list = portfolioMap.get(item.creator_id)!;
          if (list.length < 8) {
            list.push({
              id: item.id,
              url: item.media_url || '',
              thumbnail_url: item.thumbnail_url,
              type: item.media_type === 'video' ? 'video' : 'image',
            });
          }
        }

        // 2b. Fetch published content (videos from content creation workflow)
        const { data: contentRows } = await supabase
          .from('content')
          .select('id, title, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
          .in('creator_id', creatorUserIds)
          .eq('is_published', true);

        // Track URLs already in portfolio to avoid duplicates
        const seenUrls = new Map<string, Set<string>>();
        for (const [cid, items] of portfolioMap) {
          seenUrls.set(cid, new Set(items.map(i => i.url)));
        }

        for (const c of contentRows || []) {
          const userId = (c as any).creator_id as string;
          const cid = userIdToCreatorId.get(userId);
          if (!cid) continue;
          if (!portfolioMap.has(cid)) portfolioMap.set(cid, []);
          if (!seenUrls.has(cid)) seenUrls.set(cid, new Set());
          const list = portfolioMap.get(cid)!;
          const seen = seenUrls.get(cid)!;
          const url = resolveContentVideoUrl(c as Record<string, unknown>);
          if (url && !seen.has(url) && list.length < 8) {
            list.push({
              id: c.id,
              url,
              thumbnail_url: (c as any).thumbnail_url || getBunnyThumbnailUrl(url) || null,
              type: 'video',
            });
            seen.add(url);
          }
        }

        // 2c. Fetch portfolio_posts (social feed content)
        const { data: postRows } = await supabase
          .from('portfolio_posts')
          .select('id, media_url, media_type, thumbnail_url, user_id')
          .in('user_id', creatorUserIds)
          .order('created_at', { ascending: false });

        for (const p of postRows || []) {
          const cid = userIdToCreatorId.get(p.user_id);
          if (!cid) continue;
          if (!portfolioMap.has(cid)) portfolioMap.set(cid, []);
          if (!seenUrls.has(cid)) seenUrls.set(cid, new Set());
          const list = portfolioMap.get(cid)!;
          const seen = seenUrls.get(cid)!;
          if (p.media_url && !seen.has(p.media_url) && list.length < 8) {
            const postThumb = p.thumbnail_url
              || (p.media_type === 'video' ? getBunnyThumbnailUrl(p.media_url) : null)
              || null;
            list.push({
              id: p.id,
              url: p.media_url,
              thumbnail_url: postThumb,
              type: p.media_type === 'video' ? 'video' : 'image',
            });
            seen.add(p.media_url);
          }
        }
      }

      // ── 2d. Fetch avatar fallbacks from profiles table for creators missing avatar ──
      const missingAvatarUserIds = creatorRows
        .filter((r: any) => !r.avatar_url)
        .map((r: any) => r.user_id as string);

      const avatarFallbackMap = new Map<string, string>();
      if (missingAvatarUserIds.length > 0) {
        const { data: avatarRows } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', missingAvatarUserIds)
          .not('avatar_url', 'is', null)
          .neq('avatar_url', '');

        for (const r of avatarRows || []) {
          if (r.avatar_url) avatarFallbackMap.set(r.id, r.avatar_url);
        }
      }

      const mapped = creatorRows.map((row: any) => {
        const creator = mapCreatorRow(row);
        // Fallback avatar from profiles table
        if (!creator.avatar_url) {
          creator.avatar_url = avatarFallbackMap.get(row.user_id) || null;
        }
        // Show up to 5 items on the card (prioritized: portfolio_items first, then content, then posts)
        creator.portfolio_media = (portfolioMap.get(row.id) || []).slice(0, 5);
        // Enrich with subscription status
        creator.is_subscribed = subscribedUserIds.has(row.user_id);
        // Introductory discount: auto-suggest 20% for new talent with < 3 completed projects
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const isNew = Date.now() - new Date(creator.joined_at).getTime() < thirtyDays;
        if (isNew && creator.completed_projects < 3) {
          creator.introductory_discount_pct = 20;
        }
        return creator;
      // Include all active creator profiles — those with content sort higher
      });

      // ── 3. Fallback: Fetch profiles with content (not in creator_profiles) ──
      // Also exclude client users from profiles fallback
      const excludeIds = [...creatorUserIds, ...clientUserIds];
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, city, country, content_categories, languages, minimum_budget, is_available_for_hire, avg_rating, total_contracts_completed, created_at')
        .not('id', 'in', excludeIds.length > 0 ? `(${excludeIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)');

      const profilesWithContent: MarketplaceCreator[] = [];

      if (profileRows && profileRows.length > 0) {
        const profileUserIds = profileRows.map(p => p.id);

        // Fetch published content (videos from Bunny CDN) for these profiles
        const { data: contentRows } = await supabase
          .from('content')
          .select('id, title, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
          .in('creator_id', profileUserIds)
          .eq('is_published', true);

        // Fetch portfolio_posts for these profiles
        const { data: postRows } = await supabase
          .from('portfolio_posts')
          .select('id, media_url, media_type, thumbnail_url, user_id')
          .in('user_id', profileUserIds)
          .order('created_at', { ascending: false });

        // Build content map by user_id
        const contentMap = new Map<string, PortfolioMedia[]>();

        // Add content videos
        for (const c of contentRows || []) {
          const userId = (c as any).creator_id as string;
          if (!contentMap.has(userId)) contentMap.set(userId, []);
          const list = contentMap.get(userId)!;
          const url = resolveContentVideoUrl(c as Record<string, unknown>);
          if (url && list.length < 5) {
            list.push({
              id: c.id,
              url,
              thumbnail_url: (c as any).thumbnail_url || getBunnyThumbnailUrl(url) || null,
              type: 'video',
            });
          }
        }

        // Add portfolio posts (images and videos)
        for (const p of postRows || []) {
          const userId = p.user_id;
          if (!contentMap.has(userId)) contentMap.set(userId, []);
          const list = contentMap.get(userId)!;
          if (p.media_url && list.length < 5) {
            const postThumb = p.thumbnail_url
              || (p.media_type === 'video' ? getBunnyThumbnailUrl(p.media_url) : null)
              || null;
            list.push({
              id: p.id,
              url: p.media_url,
              thumbnail_url: postThumb,
              type: p.media_type === 'video' ? 'video' : 'image',
            });
          }
        }

        // Include profiles with a name — those with content get media attached
        for (const row of profileRows) {
          if (!row.full_name && !row.username) continue;
          const media = contentMap.get(row.id) || [];

          const creator = mapProfileRow(row as Record<string, unknown>);
          creator.portfolio_media = media;
          creator.is_subscribed = subscribedUserIds.has(row.id);
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          const isNewProfile = Date.now() - new Date(creator.joined_at).getTime() < thirtyDays;
          if (isNewProfile && creator.completed_projects < 3) {
            creator.introductory_discount_pct = 20;
          }
          profilesWithContent.push(creator);
        }
      }

      // ── 4. Merge: creator_profiles first, then profiles fallback ──
      // Sort so creators with portfolio content appear before those without
      const all = [...mapped, ...profilesWithContent];
      all.sort((a, b) => {
        const aHas = a.portfolio_media.length > 0 ? 1 : 0;
        const bHas = b.portfolio_media.length > 0 ? 1 : 0;
        return bHas - aHas;
      });
      setAllCreators(all);
    } catch (err) {
      console.error('[useMarketplaceCreators] Error:', err);
      setError('Error al cargar creadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // Apply client-side filters (same logic as old useCreatorSearch)
  const filtered = useMemo(() => {
    if (!filters) return allCreators;

    let result = [...allCreators];

    // Role category filter
    if (filters.role_category && filters.role_category !== 'all' && filters.role_category !== 'agencies') {
      const categoryRoleIds = MARKETPLACE_ROLES
        .filter(r => r.category === (filters.role_category as MarketplaceRoleCategory))
        .map(r => r.id);
      result = result.filter(c =>
        c.marketplace_roles?.some(r => categoryRoleIds.includes(r as any)),
      );
    }

    // Specific marketplace roles (sub-chips)
    if (filters.marketplace_roles && filters.marketplace_roles.length > 0) {
      result = result.filter(c =>
        filters.marketplace_roles.some(r => c.marketplace_roles?.includes(r as any)),
      );
    }

    // Accepts exchange (adaptive filter)
    if (filters.accepts_exchange === true) {
      result = result.filter(c => c.accepts_product_exchange);
    }

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        c =>
          c.display_name.toLowerCase().includes(q) ||
          c.bio?.toLowerCase().includes(q) ||
          c.categories.some(cat => cat.toLowerCase().includes(q)) ||
          c.location_city?.toLowerCase().includes(q) ||
          c.location_country?.toLowerCase().includes(q),
      );
    }

    // Category
    if (filters.category) {
      const cat = filters.category.toLowerCase();
      result = result.filter(c =>
        c.categories.some(cc => cc.toLowerCase() === cat),
      );
    }

    // Country
    if (filters.country) {
      const countryMap: Record<string, string> = {
        CO: 'Colombia', MX: 'México', CL: 'Chile', PE: 'Perú',
        AR: 'Argentina', EC: 'Ecuador', US: 'Estados Unidos',
      };
      const countryName = countryMap[filters.country];
      if (countryName) {
        result = result.filter(c => c.location_country === countryName);
      }
    }

    // Content types
    if (filters.content_type.length > 0) {
      result = result.filter(c =>
        filters.content_type.some(ct => c.content_types.includes(ct)),
      );
    }

    // Price range
    if (filters.price_min != null) {
      result = result.filter(c => c.base_price != null && c.base_price >= filters.price_min!);
    }
    if (filters.price_max != null) {
      result = result.filter(c => c.base_price != null && c.base_price <= filters.price_max!);
    }

    // Rating
    if (filters.rating_min != null) {
      result = result.filter(c => c.rating_avg >= filters.rating_min!);
    }

    // Level
    if (filters.level.length > 0) {
      result = result.filter(c => filters.level.includes(c.level));
    }

    // Languages
    if (filters.languages.length > 0) {
      result = result.filter(c =>
        filters.languages.some(l => c.languages.includes(l)),
      );
    }

    // Availability
    if (filters.availability === 'now') {
      result = result.filter(c => c.is_available);
    }

    // Sort
    switch (filters.sort_by) {
      case 'rating':
        result.sort((a, b) => b.rating_avg - a.rating_avg);
        break;
      case 'price_low':
        result.sort((a, b) => (a.base_price ?? Infinity) - (b.base_price ?? Infinity));
        break;
      case 'price_high':
        result.sort((a, b) => (b.base_price ?? 0) - (a.base_price ?? 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
        break;
      case 'most_projects':
        result.sort((a, b) => b.completed_projects - a.completed_projects);
        break;
      default:
        break;
    }

    return result;
  }, [allCreators, filters]);

  // Curated sections

  // Destacados: rating >= 4.8 OR (subscribed + rating >= 3.5) — all roles
  const featured = useMemo(
    () =>
      allCreators
        .filter(c =>
          c.rating_avg >= 4.8 ||
          (c.is_subscribed && c.rating_avg >= 3.5),
        )
        .sort((a, b) => b.rating_avg - a.rating_avg)
        .slice(0, 12),
    [allCreators],
  );

  // Nuevos talentos: joined in last 30 days, sorted newest first
  const newTalent = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return allCreators
      .filter(c => new Date(c.joined_at).getTime() > thirtyDaysAgo)
      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
      .slice(0, 12);
  }, [allCreators]);

  // Más valorados: all with rating >= 4.5
  const topRated = useMemo(
    () =>
      allCreators
        .filter(c => c.rating_avg >= 4.5)
        .sort((a, b) => b.rating_avg - a.rating_avg || b.rating_count - a.rating_count)
        .slice(0, 12),
    [allCreators],
  );

  // Get similar creators by categories
  const getSimilarCreators = useCallback(
    (categories: string[], excludeId?: string, limit = 6): MarketplaceCreator[] => {
      return allCreators
        .filter(c => c.id !== excludeId && c.categories.some(cat => categories.includes(cat)))
        .sort((a, b) => b.rating_avg - a.rating_avg)
        .slice(0, limit);
    },
    [allCreators],
  );

  return {
    creators: filtered,
    allCreators,
    featured,
    newTalent,
    topRated,
    isLoading: loading,
    error,
    totalCount: filtered.length,
    getSimilarCreators,
    refetch: fetchCreators,
  };
}
