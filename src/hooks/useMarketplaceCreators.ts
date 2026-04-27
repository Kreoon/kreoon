import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    marketplace_roles: (row.marketplace_roles as string[]) || [],
    // Featured media seleccionado por el creador
    featured_media_url: row.featured_media_url as string | null,
    featured_media_type: row.featured_media_type as 'image' | 'video' | null,
    // Trust Score - base 50 para perfiles nuevos
    trust_score: Number(row.trust_score) || 50,
    trust_score_breakdown: (row.trust_score_breakdown as any) || null,
    is_new_profile: false, // se calcula después
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
    // Perfiles desde profiles table son considerados nuevos (base 50)
    trust_score: 50,
    trust_score_breakdown: null,
    is_new_profile: true,
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

// ── Fetch function (pure, no state) ────────────────────────────────────

export interface MarketplaceOrganization {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface MarketplaceCreatorsResult {
  allCreators: MarketplaceCreator[];
  organizations: MarketplaceOrganization[];
}

export async function fetchAllCreators(): Promise<MarketplaceCreatorsResult> {
  // ── 0. Fetch exclusions & subscriptions ──────────────────────────
  // Ejecutar en paralelo para reducir waterfall
  const [{ data: excludedRows }, { data: subOrgRows }] = await Promise.all([
    (supabase as any).rpc('get_marketplace_excluded_user_ids'),
    (supabase as any)
      .from('platform_subscriptions')
      .select('organization_id, tier, status')
      .not('tier', 'in', '(brand_free,creator_free)')
      .eq('status', 'active'),
  ]);
  const clientUserIds = new Set((excludedRows || []).map((r: any) => r.user_id as string));

  // Resolve subscribed user_ids from org memberships
  const subscribedOrgIds = (subOrgRows || []).map((r: any) => r.organization_id).filter(Boolean) as string[];
  let subscribedUserIds = new Set<string>();
  if (subscribedOrgIds.length > 0) {
    const { data: memberRows } = await (supabase as any)
      .from('organization_members')
      .select('user_id')
      .in('organization_id', subscribedOrgIds);
    subscribedUserIds = new Set((memberRows || []).map((r: any) => r.user_id as string));
  }

  // ── 1. Fetch from creator_profiles (marketplace-native) ──────────
  const creatorFields = `
    id, user_id, slug, display_name, avatar_url, bio, location_city,
    location_country, country_flag, categories, content_types, level,
    is_verified, rating_avg, rating_count, base_price, currency,
    is_available, languages, completed_projects, created_at,
    accepts_product_exchange, marketplace_roles,
    featured_media_url, featured_media_type,
    trust_score, trust_score_breakdown
  `;
  const { data: rows, error: err } = await (supabase as any)
    .from('creator_profiles')
    .select(creatorFields)
    .eq('is_active', true)
    .order('rating_avg', { ascending: false });

  if (err) throw err;

  // Filter out client users from creator_profiles
  const creatorRows = (rows || []).filter((r: any) => !clientUserIds.has(r.user_id));
  const creatorIds = creatorRows.map((r: any) => r.id as string);
  const creatorUserIds = creatorRows.map((r: any) => r.user_id as string);

  // ── 1b. Stats maps (valores por defecto, sin loop de RPCs) ──
  const orgProjectsMap = new Map<string, number>();
  const onTimeDeliveryMap = new Map<string, number>();
  const responseTimeMap = new Map<string, number>();

  // ── 1c. Fetch real registration dates + portfolio data en PARALELO ──
  const registrationDateMap = new Map<string, string>();
  const portfolioMap = new Map<string, PortfolioMedia[]>();

  const userIdToCreatorId = new Map<string, string>();
  for (const r of creatorRows) {
    userIdToCreatorId.set(r.user_id, r.id);
  }

  // ── Lanzar todas las queries de soporte en PARALELO ──
  const parallelQueries: Promise<any>[] = [
    // Fechas de registro reales
    creatorUserIds.length > 0
      ? supabase.from('profiles').select('id, created_at').in('id', creatorUserIds)
      : Promise.resolve({ data: [] }),
  ];

  if (creatorIds.length > 0) {
    // Portfolio en paralelo
    parallelQueries.push(
      (supabase as any)
        .from('portfolio_items')
        .select('id, creator_id, media_url, thumbnail_url, media_type')
        .in('creator_id', creatorIds)
        .eq('is_public', true)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .limit(500),
      supabase
        .from('content')
        .select('id, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
        .in('creator_id', creatorUserIds)
        .eq('is_published', true)
        .limit(500),
      supabase
        .from('portfolio_posts')
        .select('id, media_url, media_type, thumbnail_url, user_id')
        .in('user_id', creatorUserIds)
        .order('created_at', { ascending: false })
        .limit(500),
    );
  }

  const parallelResults = await Promise.all(parallelQueries);
  const [profileDatesResult, portfolioResult, contentResult, postResult] = parallelResults;

  // Procesar fechas de registro
  for (const p of (profileDatesResult?.data || [])) {
    registrationDateMap.set(p.id, p.created_at);
  }

  if (creatorIds.length > 0) {
    const portfolioRows = portfolioResult?.data || [];
    const contentRows = contentResult?.data || [];
    const postRows = postResult?.data || [];

    // Process portfolio_items - priorizar imágenes sobre videos
    // Primero agrupar todos los items por creator
    const tempPortfolioMap = new Map<string, Array<{
      id: string;
      url: string;
      thumbnail_url: string | null;
      type: 'image' | 'video';
    }>>();

    for (const item of portfolioRows) {
      if (!tempPortfolioMap.has(item.creator_id)) {
        tempPortfolioMap.set(item.creator_id, []);
      }
      tempPortfolioMap.get(item.creator_id)!.push({
        id: item.id,
        url: item.media_url || '',
        thumbnail_url: item.thumbnail_url,
        type: item.media_type === 'video' ? 'video' : 'image',
      });
    }

    // Ordenar: imágenes primero, luego videos, y tomar solo 8
    for (const [creatorId, items] of tempPortfolioMap) {
      const sorted = items.sort((a, b) => {
        if (a.type === 'image' && b.type === 'video') return -1;
        if (a.type === 'video' && b.type === 'image') return 1;
        return 0;
      });
      portfolioMap.set(creatorId, sorted.slice(0, 8));
    }

    // Track URLs already in portfolio to avoid duplicates
    const seenUrls = new Map<string, Set<string>>();
    for (const [cid, items] of portfolioMap) {
      seenUrls.set(cid, new Set(items.map(i => i.url)));
    }

    // Process content rows
    for (const c of contentRows) {
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

    // Process portfolio_posts
    for (const p of postRows) {
      const cid = userIdToCreatorId.get(p.user_id);
      if (!cid) continue;
      if (!portfolioMap.has(cid)) portfolioMap.set(cid, []);
      if (!seenUrls.has(cid)) seenUrls.set(cid, new Set());
      const list = portfolioMap.get(cid)!;
      const seen = seenUrls.get(cid)!;
      if (p.media_url && !seen.has(p.media_url) && list.length < 8) {
        const postThumb =
          p.thumbnail_url ||
          (p.media_type === 'video' ? getBunnyThumbnailUrl(p.media_url) : null) ||
          null;
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

  // ── 2d & 2e. Avatar fallbacks + org memberships en PARALELO ──
  const missingAvatarUserIds = creatorRows
    .filter((r: any) => !r.avatar_url)
    .map((r: any) => r.user_id as string);

  const avatarFallbackMap = new Map<string, string>();
  const orgMemberMap = new Map<string, { org_id: string; org_name: string; org_logo: string | null }>();

  const [avatarResult, orgMemberResult] = await Promise.all([
    missingAvatarUserIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', missingAvatarUserIds)
          .not('avatar_url', 'is', null)
          .neq('avatar_url', '')
      : Promise.resolve({ data: [] }),
    creatorUserIds.length > 0
      ? supabase
          .from('organization_members')
          .select('user_id, organization_id')
          .in('user_id', creatorUserIds)
      : Promise.resolve({ data: [] }),
  ]);

  for (const r of avatarResult.data || []) {
    if (r.avatar_url) avatarFallbackMap.set(r.id, r.avatar_url);
  }

  const orgIds = new Set<string>();
  const userOrgMap = new Map<string, string>();
  for (const m of orgMemberResult.data || []) {
    orgIds.add(m.organization_id);
    userOrgMap.set(m.user_id, m.organization_id);
  }

  const orgDetailsMap = new Map<string, { name: string; logo_url: string | null }>();
  const orgList: MarketplaceOrganization[] = [];
  if (orgIds.size > 0) {
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .in('id', Array.from(orgIds));
    for (const org of orgs || []) {
      orgDetailsMap.set(org.id, { name: org.name, logo_url: org.logo_url });
      orgList.push({ id: org.id, name: org.name, logo_url: org.logo_url });
    }
  }

  for (const [userId, orgId] of userOrgMap) {
    const orgDetails = orgDetailsMap.get(orgId);
    if (orgDetails) {
      orgMemberMap.set(userId, {
        org_id: orgId,
        org_name: orgDetails.name,
        org_logo: orgDetails.logo_url,
      });
    }
  }

  const mapped = creatorRows
    .map((row: any) => {
      const creator = mapCreatorRow(row);
      if (!creator.avatar_url) {
        creator.avatar_url = avatarFallbackMap.get(row.user_id) || null;
      }
      creator.portfolio_media = (portfolioMap.get(row.id) || []).slice(0, 5);
      creator.is_subscribed = subscribedUserIds.has(row.user_id);
      const orgInfo = orgMemberMap.get(row.user_id);
      if (orgInfo) {
        creator.organization_id = orgInfo.org_id;
        creator.organization_name = orgInfo.org_name;
        creator.organization_logo = orgInfo.org_logo;
      }

      const orgProjects = orgProjectsMap.get(row.user_id) || 0;
      creator.org_projects = orgProjects;
      creator.completed_projects = (creator.completed_projects || 0) + orgProjects;

      const onTimePct = onTimeDeliveryMap.get(row.user_id);
      const responseHours = responseTimeMap.get(row.user_id);
      if (onTimePct !== undefined) (creator as any).on_time_delivery_pct = onTimePct;
      if (responseHours !== undefined) (creator as any).response_time_hours = responseHours;

      // Introductory discount: auto-suggest 20% for new talent with < 3 completed projects
      const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
      const isNew = Date.now() - new Date(creator.joined_at).getTime() < fortyFiveDays;
      if (isNew && creator.completed_projects < 3) {
        creator.introductory_discount_pct = 20;
      }

      // Detectar perfil nuevo para Trust Score (< 30 días y sin proyectos)
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const isNewProfile = creator.completed_projects === 0 &&
        Date.now() - new Date(creator.joined_at).getTime() < thirtyDays;
      creator.is_new_profile = isNewProfile;

      // Si no hay trust_score en BD, usar 50 como base
      if (!creator.trust_score) {
        creator.trust_score = 50;
      }

      return creator;
    })
    .filter((c: MarketplaceCreator) => c.portfolio_media.length > 0);

  // ── 3. Fallback: Fetch profiles with content (not in creator_profiles) ──
  const excludeIds = [...creatorUserIds, ...clientUserIds];
  const { data: profileRows } = await supabase
    .from('profiles')
    .select(
      'id, full_name, username, avatar_url, bio, city, country, content_categories, languages, minimum_budget, is_available_for_hire, avg_rating, total_contracts_completed, created_at',
    )
    .not(
      'id',
      'in',
      excludeIds.length > 0
        ? `(${excludeIds.join(',')})`
        : '(00000000-0000-0000-0000-000000000000)',
    );

  const profilesWithContent: MarketplaceCreator[] = [];

  if (profileRows && profileRows.length > 0) {
    const profileUserIds = profileRows.map(p => p.id);

    const [{ data: contentRowsFallback }, { data: postRowsFallback }] = await Promise.all([
      supabase
        .from('content')
        .select('id, title, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
        .in('creator_id', profileUserIds)
        .eq('is_published', true),
      supabase
        .from('portfolio_posts')
        .select('id, media_url, media_type, thumbnail_url, user_id')
        .in('user_id', profileUserIds)
        .order('created_at', { ascending: false }),
    ]);

    const contentMap = new Map<string, PortfolioMedia[]>();

    for (const c of contentRowsFallback || []) {
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

    for (const p of postRowsFallback || []) {
      const userId = p.user_id;
      if (!contentMap.has(userId)) contentMap.set(userId, []);
      const list = contentMap.get(userId)!;
      if (p.media_url && list.length < 5) {
        const postThumb =
          p.thumbnail_url ||
          (p.media_type === 'video' ? getBunnyThumbnailUrl(p.media_url) : null) ||
          null;
        list.push({
          id: p.id,
          url: p.media_url,
          thumbnail_url: postThumb,
          type: p.media_type === 'video' ? 'video' : 'image',
        });
      }
    }

    // Fetch organization memberships for profile users en paralelo con el content fetch
    const profileOrgMap = new Map<string, { org_id: string; org_name: string; org_logo: string | null }>();
    if (profileUserIds.length > 0) {
      const { data: profileMemberRows } = await supabase
        .from('organization_members')
        .select('user_id, organization_id')
        .in('user_id', profileUserIds);

      if (profileMemberRows && profileMemberRows.length > 0) {
        const profileOrgIds = [...new Set(profileMemberRows.map(m => m.organization_id))];
        const { data: profileOrgRows } = await supabase
          .from('organizations')
          .select('id, name, logo_url')
          .in('id', profileOrgIds);

        const profileOrgDetailsMap = new Map<string, { name: string; logo_url: string | null }>();
        for (const org of profileOrgRows || []) {
          profileOrgDetailsMap.set(org.id, { name: org.name, logo_url: org.logo_url });
        }

        for (const m of profileMemberRows) {
          const orgDetail = profileOrgDetailsMap.get(m.organization_id);
          if (orgDetail) {
            profileOrgMap.set(m.user_id, {
              org_id: m.organization_id,
              org_name: orgDetail.name,
              org_logo: orgDetail.logo_url,
            });
          }
        }
      }
    }

    for (const row of profileRows) {
      if (!row.full_name && !row.username) continue;
      const media = contentMap.get(row.id) || [];
      if (media.length === 0) continue;

      const creator = mapProfileRow(row as Record<string, unknown>);
      creator.portfolio_media = media;
      creator.is_subscribed = subscribedUserIds.has(row.id);
      const orgInfo = profileOrgMap.get(row.id);
      if (orgInfo) {
        creator.organization_id = orgInfo.org_id;
        creator.organization_name = orgInfo.org_name;
        creator.organization_logo = orgInfo.org_logo;
      }
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const isNewProfile = Date.now() - new Date(creator.joined_at).getTime() < thirtyDays;
      if (isNewProfile && creator.completed_projects < 3) {
        creator.introductory_discount_pct = 20;
      }
      profilesWithContent.push(creator);
    }
  }

  // ── 4. Merge: creator_profiles first, then profiles fallback ──
  // Filter: show ONLY profiles with a VALID visible image
  // Valid = Bunny CDN URL or other working URL (not empty Supabase URLs)
  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url.trim() === '') return false;
    // Bunny CDN URLs are always valid
    if (url.includes('b-cdn.net') || url.includes('cdn.kreoon.com') || url.includes('mediadelivery.net')) {
      return true;
    }
    // Supabase storage URLs may not work, exclude them
    if (url.includes('supabase.co/storage')) {
      return false;
    }
    // Other URLs (external avatars like Google, etc.) - assume valid
    return url.startsWith('http');
  };

  const all = [...mapped, ...profilesWithContent].filter((c) => {
    const hasValidAvatar = isValidImageUrl(c.avatar_url);
    const hasValidFeaturedMedia = isValidImageUrl(c.featured_media_url) && c.featured_media_type === 'image';
    const hasValidPortfolioImage = c.portfolio_media.some(
      (item) => item.type === 'image' && (isValidImageUrl(item.thumbnail_url) || isValidImageUrl(item.url))
    );
    return hasValidAvatar || hasValidFeaturedMedia || hasValidPortfolioImage;
  });

  all.sort((a, b) => {
    const aHas = a.portfolio_media.length > 0 ? 1 : 0;
    const bHas = b.portfolio_media.length > 0 ? 1 : 0;
    return bHas - aHas;
  });

  return { allCreators: all, organizations: orgList };
}

// ── Query key ──────────────────────────────────────────────────────────

export const MARKETPLACE_CREATORS_QUERY_KEY = ['marketplace-creators'] as const;

// ── Main hook (React Query) ────────────────────────────────────────────

export function useMarketplaceCreators(filters?: MarketplaceFilters) {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: MARKETPLACE_CREATORS_QUERY_KEY,
    queryFn: fetchAllCreators,
    staleTime: 10 * 60 * 1000,  // 10 min – datos frescos, no refetch en navegación
    gcTime: 60 * 60 * 1000,     // 60 min – sobrevive entre rutas
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Mostrar datos del cache mientras recarga en background
    placeholderData: (prev) => prev,
  });

  const allCreators = data?.allCreators ?? [];
  const organizations = data?.organizations ?? [];

  // Apply client-side filters (same logic as before)
  const filtered = useMemo(() => {
    if (!filters) return allCreators;

    let result = [...allCreators];

    // Role category filter
    if (filters.role_category && filters.role_category !== 'all' && filters.role_category !== 'agencies') {
      const categoryRoleIds = MARKETPLACE_ROLES
        .filter(r => r.category === (filters.role_category as MarketplaceRoleCategory))
        .map(r => r.id);
      result = result.filter(c => {
        if (!c.marketplace_roles || c.marketplace_roles.length === 0) return true;
        return c.marketplace_roles.some(r => categoryRoleIds.includes(r as any));
      });
    }

    // Specific marketplace roles (sub-chips)
    if (filters.marketplace_roles && filters.marketplace_roles.length > 0) {
      const withRole = result.filter(c => {
        if (!c.marketplace_roles || c.marketplace_roles.length === 0) return false;
        return filters.marketplace_roles.some(r => c.marketplace_roles?.includes(r as any));
      });
      if (withRole.length > 0) {
        result = withRole;
      }
    }

    // Accepts exchange (adaptive filter)
    if (filters.accepts_exchange === true) {
      result = result.filter(c => c.accepts_product_exchange);
    }

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const words = q.split(/\s+/).filter(w => w.length > 2);

      result = result.filter(c => {
        const inName = c.display_name.toLowerCase().includes(q);
        const inBio = c.bio?.toLowerCase().includes(q);
        const inCategories = c.categories.some(cat => cat.toLowerCase().includes(q));
        const inCity = c.location_city?.toLowerCase().includes(q);
        const inCountry = c.location_country?.toLowerCase().includes(q);
        const inRoles = c.marketplace_roles?.some(role =>
          role.toLowerCase().includes(q) || q.includes(role.toLowerCase().replace(/_/g, ' ')),
        );
        const inContentTypes = c.content_types?.some(ct => ct.toLowerCase().includes(q));
        const wordsMatch =
          words.length > 1 &&
          words.every(
            word =>
              c.display_name.toLowerCase().includes(word) ||
              c.bio?.toLowerCase().includes(word) ||
              c.categories.some(cat => cat.toLowerCase().includes(word)),
          );

        return inName || inBio || inCategories || inCity || inCountry || inRoles || inContentTypes || wordsMatch;
      });
    }

    // Category
    if (filters.category) {
      const cat = filters.category.toLowerCase();
      result = result.filter(c => c.categories.some(cc => cc.toLowerCase() === cat));
    }

    // Country - búsqueda flexible
    if (filters.country) {
      const countryMap: Record<string, string[]> = {
        CO: ['colombia', 'co'],
        MX: ['méxico', 'mexico', 'mx'],
        CL: ['chile', 'cl'],
        PE: ['perú', 'peru', 'pe'],
        AR: ['argentina', 'ar'],
        EC: ['ecuador', 'ec'],
        US: ['estados unidos', 'usa', 'us', 'united states'],
        VE: ['venezuela', 've'],
        BR: ['brasil', 'brazil', 'br'],
        ES: ['españa', 'spain', 'es'],
      };
      const countryVariants = countryMap[filters.country] || [filters.country.toLowerCase()];
      result = result.filter(c => {
        const country = c.location_country?.toLowerCase() || '';
        const city = c.location_city?.toLowerCase() || '';
        return countryVariants.some(v => country.includes(v) || city.includes(v));
      });
    }

    // City
    if (filters.city) {
      const citySearch = filters.city.toLowerCase();
      result = result.filter(c => {
        const city = c.location_city?.toLowerCase() || '';
        return city.includes(citySearch) || city === citySearch;
      });
    }

    // Content types
    if (filters.content_type.length > 0) {
      result = result.filter(c => {
        if (!c.content_types || c.content_types.length === 0) return true;
        return filters.content_type.some(ct => c.content_types.includes(ct));
      });
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
      result = result.filter(c => filters.languages.some(l => c.languages.includes(l)));
    }

    // Availability
    if (filters.availability === 'now') {
      result = result.filter(c => c.is_available);
    }

    // Organization filter
    if (filters.organization_id) {
      result = result.filter(c => c.organization_id === filters.organization_id);
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

  const featured = useMemo(
    () =>
      allCreators
        .filter(
          c =>
            c.completed_projects >= 1 ||
            c.is_subscribed ||
            (c.portfolio_media.length >= 5 && c.rating_avg >= 4.0),
        )
        .sort((a, b) => {
          const projectsDiff = b.completed_projects - a.completed_projects;
          if (projectsDiff !== 0) return projectsDiff;
          if (a.is_subscribed !== b.is_subscribed) return b.is_subscribed ? 1 : -1;
          const ratingDiff = b.rating_avg - a.rating_avg;
          if (ratingDiff !== 0) return ratingDiff;
          return b.portfolio_media.length - a.portfolio_media.length;
        })
        .slice(0, 12),
    [allCreators],
  );

  const newTalent = useMemo(
    () =>
      allCreators
        .filter(c => c.portfolio_media.length > 0)
        .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
        .slice(0, 20),
    [allCreators],
  );

  const topRated = useMemo(
    () =>
      allCreators
        .filter(c => c.rating_avg >= 4.5)
        .sort((a, b) => b.rating_avg - a.rating_avg || b.rating_count - a.rating_count)
        .slice(0, 12),
    [allCreators],
  );

  const topPerformers = useMemo(() => {
    const withProjects = allCreators.filter(c => c.completed_projects >= 1);

    if (withProjects.length > 0) {
      return withProjects
        .map(c => {
          const ratingFactor = c.rating_avg / 5;
          const portfolioBonus = Math.min(c.portfolio_media.length / 5, 1) * 0.5;
          const performanceScore = c.completed_projects * (1 + ratingFactor + portfolioBonus);
          return { ...c, _performanceScore: performanceScore };
        })
        .sort((a, b) => b._performanceScore - a._performanceScore)
        .slice(0, 12);
    }

    return allCreators
      .filter(c => c.portfolio_media.length >= 3)
      .map(c => {
        const portfolioScore = c.portfolio_media.length * 2;
        const ratingBonus = c.rating_avg * 2;
        const performanceScore = portfolioScore + ratingBonus;
        return { ...c, _performanceScore: performanceScore };
      })
      .sort((a, b) => b._performanceScore - a._performanceScore)
      .slice(0, 12);
  }, [allCreators]);

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
    topPerformers,
    organizations,
    isLoading,
    error: isError ? 'Error al cargar creadores' : null,
    totalCount: filtered.length,
    getSimilarCreators,
    refetch,
  };
}
