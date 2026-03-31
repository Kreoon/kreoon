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
      // Use SECURITY DEFINER RPC to get client user_ids (works for anon + authenticated)
      // Fetch exclusions + active org subscriptions (platform_subscriptions)
      const [{ data: excludedRows }, { data: subOrgRows }] = await Promise.all([
        (supabase as any).rpc('get_marketplace_excluded_user_ids'),
        (supabase as any)
          .from('platform_subscriptions')
          .select('organization_id, tier, status')
          .not('tier', 'in', '(brand_free,creator_free)')
          .eq('status', 'active'),
      ]);
      const clientUserIds = new Set((excludedRows || []).map((r: any) => r.user_id));

      // Resolve subscribed user_ids from org memberships
      const subscribedOrgIds = (subOrgRows || []).map((r: any) => r.organization_id).filter(Boolean);
      let subscribedUserIds = new Set<string>();
      if (subscribedOrgIds.length > 0) {
        const { data: memberRows } = await (supabase as any)
          .from('organization_members')
          .select('user_id')
          .in('organization_id', subscribedOrgIds);
        subscribedUserIds = new Set((memberRows || []).map((r: any) => r.user_id));
      }

      // ── 1. Fetch from creator_profiles (marketplace-native) ──────────
      // Select solo campos necesarios (evita portfolio_media y otros JSONB pesados)
      const creatorFields = `
        id, user_id, slug, display_name, avatar_url, bio, location_city,
        location_country, country_flag, categories, content_types, level,
        is_verified, rating_avg, rating_count, base_price, currency,
        is_available, languages, completed_projects, created_at,
        accepts_product_exchange, marketplace_roles
      `;
      const { data: rows, error: err } = await (supabase as any)
        .from('creator_profiles')
        .select(creatorFields)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false }); // Sin LIMIT para mostrar todos los creators

      if (err) throw err;

      // Filter out client users from creator_profiles
      const creatorRows = (rows || []).filter((r: any) => !clientUserIds.has(r.user_id));
      const creatorIds = creatorRows.map((r: any) => r.id);
      const creatorUserIds = creatorRows.map((r: any) => r.user_id);

      // ── 1b. Stats maps (valores por defecto, sin loop de RPCs para performance) ──
      // NOTA: Eliminado el loop de RPCs get_creator_unified_stats que causaba N+1 queries
      // Las stats detalladas se cargan on-demand cuando se abre el perfil del creator
      const orgProjectsMap = new Map<string, number>();
      const onTimeDeliveryMap = new Map<string, number>();
      const responseTimeMap = new Map<string, number>();

      // ── 1c. Fetch real registration dates from profiles ──
      const registrationDateMap = new Map<string, string>();
      if (creatorUserIds.length > 0) {
        const { data: profileDates, error: dateError } = await supabase
          .from('profiles')
          .select('id, created_at')
          .in('id', creatorUserIds);

        for (const p of profileDates || []) {
          registrationDateMap.set(p.id, p.created_at);
        }
      }

      // ── 2. Fetch ALL content sources for creator_profiles ────────────
      // Map by creator_profiles.id (for portfolio_items) and by user_id (for content + portfolio_posts)
      const portfolioMap = new Map<string, PortfolioMedia[]>();
      // Build a user_id → creator_profiles.id lookup
      const userIdToCreatorId = new Map<string, string>();
      for (const r of creatorRows) {
        userIdToCreatorId.set(r.user_id, r.id);
      }

      if (creatorIds.length > 0) {
        // ── Fetch portfolio data en PARALELO para mejor performance ──
        const [{ data: portfolioRows }, { data: contentRows }, { data: postRows }] = await Promise.all([
          // 2a. Fetch portfolio_items (marketplace-native uploads)
          (supabase as any)
            .from('portfolio_items')
            .select('id, creator_id, media_url, thumbnail_url, media_type')
            .in('creator_id', creatorIds)
            .eq('is_public', true)
            .order('is_featured', { ascending: false })
            .order('display_order', { ascending: true })
            .limit(500), // Max 500 items totales
          // 2b. Fetch published content (videos from content creation workflow)
          supabase
            .from('content')
            .select('id, video_url, bunny_embed_url, video_urls, thumbnail_url, creator_id')
            .in('creator_id', creatorUserIds)
            .eq('is_published', true)
            .limit(500),
          // 2c. Fetch portfolio_posts (social feed content)
          supabase
            .from('portfolio_posts')
            .select('id, media_url, media_type, thumbnail_url, user_id')
            .in('user_id', creatorUserIds)
            .order('created_at', { ascending: false })
            .limit(500),
        ]);

        // Process portfolio_items
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

        // Track URLs already in portfolio to avoid duplicates
        const seenUrls = new Map<string, Set<string>>();
        for (const [cid, items] of portfolioMap) {
          seenUrls.set(cid, new Set(items.map(i => i.url)));
        }

        // Process content rows
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

        // Process portfolio_posts
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

      // ── 2d & 2e. Fetch avatar fallbacks AND organization memberships en PARALELO ──
      const missingAvatarUserIds = creatorRows
        .filter((r: any) => !r.avatar_url)
        .map((r: any) => r.user_id as string);

      const avatarFallbackMap = new Map<string, string>();
      const orgMemberMap = new Map<string, { org_id: string; org_name: string; org_logo: string | null }>();

      // Ejecutar ambas queries en paralelo
      const [avatarResult, orgMemberResult] = await Promise.all([
        // Avatar fallbacks
        missingAvatarUserIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, avatar_url')
              .in('id', missingAvatarUserIds)
              .not('avatar_url', 'is', null)
              .neq('avatar_url', '')
          : Promise.resolve({ data: [] }),
        // Organization memberships con JOIN para evitar 2 queries
        creatorUserIds.length > 0
          ? supabase
              .from('organization_members')
              .select('user_id, organization_id, organizations(id, name, logo_url)')
              .in('user_id', creatorUserIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Process avatar fallbacks
      for (const r of avatarResult.data || []) {
        if (r.avatar_url) avatarFallbackMap.set(r.id, r.avatar_url);
      }

      // Process organization memberships (ya tiene org details por el JOIN)
      for (const m of orgMemberResult.data || []) {
        const org = (m as any).organizations;
        if (org) {
          orgMemberMap.set(m.user_id, {
            org_id: m.organization_id,
            org_name: org.name,
            org_logo: org.logo_url,
          });
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
        // Enrich with organization info
        const orgInfo = orgMemberMap.get(row.user_id);
        if (orgInfo) {
          creator.organization_id = orgInfo.org_id;
          creator.organization_name = orgInfo.org_name;
          creator.organization_logo = orgInfo.org_logo;
        }

        // ── IMPORTANT: Enrich with org stats ──
        const orgProjects = orgProjectsMap.get(row.user_id) || 0;
        creator.org_projects = orgProjects;
        // Total de proyectos = marketplace + org
        creator.completed_projects = (creator.completed_projects || 0) + orgProjects;

        // Métricas de confiabilidad
        const onTimePct = onTimeDeliveryMap.get(row.user_id);
        const responseHours = responseTimeMap.get(row.user_id);
        if (onTimePct !== undefined) {
          (creator as any).on_time_delivery_pct = onTimePct;
        }
        if (responseHours !== undefined) {
          (creator as any).response_time_hours = responseHours;
        }

        // Para "Nuevos Talentos": usar fecha de creación del creator_profile
        // (cuando se activó en el marketplace, no cuando se registró en la plataforma)
        // row.created_at ya viene de creator_profiles, lo mantenemos en joined_at
        // creator.joined_at ya tiene el valor correcto de mapCreatorRow (row.created_at)

        // Introductory discount: auto-suggest 20% for new talent with < 3 completed projects
        const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
        const isNew = Date.now() - new Date(creator.joined_at).getTime() < fortyFiveDays;
        if (isNew && creator.completed_projects < 3) {
          creator.introductory_discount_pct = 20;
        }
        return creator;
      })
      // SOLO incluir creadores con portfolio (contenido visible)
      // Los creadores sin contenido no deben aparecer en el marketplace
      .filter(c => c.portfolio_media.length > 0);

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

        // Fetch organization memberships for profile users
        const profileOrgMap = new Map<string, { org_id: string; org_name: string; org_logo: string | null }>();
        if (profileUserIds.length > 0) {
          const { data: profileMemberRows } = await supabase
            .from('organization_members')
            .select('user_id, organization_id')
            .in('user_id', profileUserIds);

          if (profileMemberRows && profileMemberRows.length > 0) {
            const orgIds = [...new Set(profileMemberRows.map(m => m.organization_id))];
            const { data: orgRows } = await supabase
              .from('organizations')
              .select('id, name, logo_url')
              .in('id', orgIds);

            const orgDetailsMap = new Map<string, { name: string; logo_url: string | null }>();
            for (const org of orgRows || []) {
              orgDetailsMap.set(org.id, { name: org.name, logo_url: org.logo_url });
            }

            for (const m of profileMemberRows) {
              const orgDetail = orgDetailsMap.get(m.organization_id);
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

        // SOLO incluir profiles con contenido visible (portfolio)
        for (const row of profileRows) {
          if (!row.full_name && !row.username) continue;
          const media = contentMap.get(row.id) || [];

          // Skip profiles sin contenido - no deben aparecer en el marketplace
          if (media.length === 0) continue;

          const creator = mapProfileRow(row as Record<string, unknown>);
          creator.portfolio_media = media;
          creator.is_subscribed = subscribedUserIds.has(row.id);
          // Enrich with organization info
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
    // Include freelancers without marketplace_roles configured (they're not excluded from categories)
    if (filters.role_category && filters.role_category !== 'all' && filters.role_category !== 'agencies') {
      const categoryRoleIds = MARKETPLACE_ROLES
        .filter(r => r.category === (filters.role_category as MarketplaceRoleCategory))
        .map(r => r.id);
      result = result.filter(c => {
        // If creator has no marketplace_roles, include them (freelancers)
        if (!c.marketplace_roles || c.marketplace_roles.length === 0) return true;
        // Otherwise check if any of their roles match the category
        return c.marketplace_roles.some(r => categoryRoleIds.includes(r as any));
      });
    }

    // Specific marketplace roles (sub-chips)
    // Filtro más flexible: prioriza pero no excluye completamente
    if (filters.marketplace_roles && filters.marketplace_roles.length > 0) {
      // Separar creadores que coinciden con el rol vs los que no
      const withRole = result.filter(c => {
        if (!c.marketplace_roles || c.marketplace_roles.length === 0) return false;
        return filters.marketplace_roles.some(r => c.marketplace_roles?.includes(r as any));
      });

      // Si hay coincidencias de rol, usarlas. Si no hay ninguna, mantener todos (búsqueda de texto prevalece)
      if (withRole.length > 0) {
        result = withRole;
      }
      // Si no hay coincidencias, el filtro de texto ya habrá filtrado, no excluimos más
    }

    // Accepts exchange (adaptive filter)
    if (filters.accepts_exchange === true) {
      result = result.filter(c => c.accepts_product_exchange);
    }

    // Text search - buscar en múltiples campos
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const words = q.split(/\s+/).filter(w => w.length > 2);

      result = result.filter(c => {
        // Buscar en campos básicos
        const inName = c.display_name.toLowerCase().includes(q);
        const inBio = c.bio?.toLowerCase().includes(q);
        const inCategories = c.categories.some(cat => cat.toLowerCase().includes(q));
        const inCity = c.location_city?.toLowerCase().includes(q);
        const inCountry = c.location_country?.toLowerCase().includes(q);

        // Buscar en roles de marketplace (ej: "editor", "ugc", "influencer")
        const inRoles = c.marketplace_roles?.some(role =>
          role.toLowerCase().includes(q) || q.includes(role.toLowerCase().replace(/_/g, ' '))
        );

        // Buscar en tipos de contenido
        const inContentTypes = c.content_types?.some(ct => ct.toLowerCase().includes(q));

        // Buscar palabras individuales en nombre y bio
        const wordsMatch = words.length > 1 && words.every(word =>
          c.display_name.toLowerCase().includes(word) ||
          c.bio?.toLowerCase().includes(word) ||
          c.categories.some(cat => cat.toLowerCase().includes(word))
        );

        return inName || inBio || inCategories || inCity || inCountry || inRoles || inContentTypes || wordsMatch;
      });
    }

    // Category
    if (filters.category) {
      const cat = filters.category.toLowerCase();
      result = result.filter(c =>
        c.categories.some(cc => cc.toLowerCase() === cat),
      );
    }

    // Country - búsqueda flexible (incluye variaciones de escritura)
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

    // Content types
    // Include freelancers without content_types configured (they're not excluded)
    if (filters.content_type.length > 0) {
      result = result.filter(c => {
        // If creator has no content_types, include them (freelancers)
        if (!c.content_types || c.content_types.length === 0) return true;
        // Otherwise check if any content type matches
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

  // Nuevos talentos: los últimos 20 registros con portfolio visible
  // Ordenados por fecha de registro (más reciente primero)
  const newTalent = useMemo(() => {
    return allCreators
      .filter(c => c.portfolio_media.length > 0)
      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
      .slice(0, 20);
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
