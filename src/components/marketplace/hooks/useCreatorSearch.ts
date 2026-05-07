import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MarketplaceFilters, MarketplaceCreator } from '../types/marketplace';
import { useMarketplaceCreators } from '@/hooks/useMarketplaceCreators';
import { useMarketplaceRecommendations, ScoredMarketplaceCreator } from '@/hooks/useMarketplaceRecommendations';
import { supabase } from '@/integrations/supabase/client';

// Helper: mapear resultado de búsqueda a MarketplaceCreator
function mapSearchResultToCreator(row: Record<string, unknown>): MarketplaceCreator {
  // portfolio_thumbnail: viene del RPC (mejor imagen del portafolio via subquery)
  // featured_media_url: viene del query @username (imagen seleccionada por el creador)
  const bestImage = (row.portfolio_thumbnail as string | null)
    || (row.featured_media_url as string | null)
    || null;

  // trust_score viene como 0-100 en búsqueda @username; quality_score como 0-1 en el RPC
  const trustScore = row.trust_score != null && Number(row.trust_score) > 1
    ? Number(row.trust_score)
    : row.quality_score != null
      ? Math.round(Number(row.quality_score) * 100)
      : 50;

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    slug: row.slug as string | null,
    display_name: (row.display_name as string) || '',
    avatar_url: row.avatar_url as string | null,
    bio: row.bio as string | null,
    location_city: row.location_city as string | null,
    location_country: row.location_country as string | null,
    country_flag: null,
    categories: (row.categories as string[]) || [],
    content_types: (row.content_types as string[]) || [],
    level: (row.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    is_verified: (row.is_verified as boolean) || false,
    rating_avg: Number(row.rating_avg) || 0,
    rating_count: Number(row.rating_count) || 0,
    base_price: row.base_price != null ? Number(row.base_price) : null,
    currency: (row.currency as string) || 'USD',
    // Imagen para mostrar en la tarjeta (portfolio thumb o featured_media del creador)
    featured_media_url: bestImage,
    featured_media_type: bestImage ? 'image' : null,
    portfolio_media: [],
    is_available: true,
    languages: (row.languages as string[]) || ['es'],
    completed_projects: Number(row.total_projects || row.completed_projects) || 0,
    joined_at: (row.created_at as string) || '',
    accepts_product_exchange: (row.accepts_exchange as boolean) || (row.accepts_product_exchange as boolean) || false,
    marketplace_roles: (row.marketplace_roles as string[]) || [],
    // organization_name y organization_logo vienen del RPC via JOIN con organizations
    organization_id: (row.organization_id as string) || undefined,
    organization_name: (row.organization_name as string) || undefined,
    organization_logo: (row.organization_logo as string) || undefined,
    trust_score: trustScore,
    trust_score_breakdown: null,
    is_new_profile: false,
  };
}

export function useCreatorSearch(filters: MarketplaceFilters) {
  // Hook para carruseles y fallback (sin búsqueda activa)
  const {
    creators: filteredCreators,
    allCreators,
    featured: rawFeatured,
    newTalent: rawNewTalent,
    topRated: rawTopRated,
    topPerformers: rawTopPerformers,
    organizations,
    isLoading: isLoadingAll,
    totalCount: totalCountAll,
  } = useMarketplaceCreators(filters);

  const { scoreCreators, isPersonalized } = useMarketplaceRecommendations();

  // Determinar si hay búsqueda activa (texto de al menos 2 caracteres)
  const hasActiveSearch = filters.search.length >= 2;

  // Detectar búsqueda por @username
  const usernameSearch = useMemo(() => {
    const trimmed = filters.search.trim();
    if (trimmed.startsWith('@') && trimmed.length > 1) {
      return trimmed.slice(1).toLowerCase();
    }
    return null;
  }, [filters.search]);

  // Query directa al RPC cuando hay búsqueda activa
  const searchQuery = useQuery({
    queryKey: ['marketplace-search-optimized', filters.search, usernameSearch, filters.country, filters.category, filters.marketplace_roles],
    queryFn: async () => {
      // Obtener IDs de usuarios excluidos (clientes)
      const { data: excludedRows } = await supabase.rpc('get_marketplace_excluded_user_ids');
      const excludedUserIds = new Set((excludedRows || []).map((r: { user_id: string }) => r.user_id));

      // Búsqueda directa por @username
      if (usernameSearch) {
        const { data, error } = await supabase
          .from('creator_profiles')
          .select(`
            id, user_id, display_name, username, slug, avatar_url, bio,
            primary_role, location_city, location_country, rating_avg,
            rating_count, completed_projects, base_price, currency,
            accepts_product_exchange, is_verified, marketplace_roles,
            categories, content_types, languages, level, trust_score,
            quality_score, created_at, featured_media_url, featured_media_type
          `)
          .eq('is_active', true)
          .or(`slug.ilike.%${usernameSearch}%,username.ilike.%${usernameSearch}%,display_name.ilike.%${usernameSearch}%`)
          .order('rating_avg', { ascending: false })
          .limit(50);

        if (error) throw error;

        // Filtrar clientes
        return (data ?? [])
          .filter(row => !excludedUserIds.has(row.user_id))
          .slice(0, 30)
          .map(row => mapSearchResultToCreator(row as Record<string, unknown>));
      }

      // Búsqueda con RPC full-text search
      const { data, error } = await (supabase.rpc as any)('search_marketplace_creators', {
        p_query: filters.search || '',
        p_roles: filters.marketplace_roles.length > 0 ? filters.marketplace_roles : null,
        p_location_country: filters.country,
        p_location_city: filters.city,
        p_niches: filters.category ? [filters.category] : null,
        p_specializations: filters.specializations.length > 0 ? filters.specializations : null,
        p_min_rating: filters.rating_min,
        p_max_price: filters.price_max,
        p_accepts_exchange: filters.accepts_exchange,
        p_is_available: filters.availability === 'now' ? true : null,
        p_limit: 80,
        p_offset: 0,
      });

      if (error) {
        console.error('[useCreatorSearch] RPC error:', error);
        throw error;
      }

      // Filtrar clientes de los resultados del RPC
      return (data ?? [])
        .filter((row: Record<string, unknown>) => !excludedUserIds.has(row.user_id as string))
        .slice(0, 50)
        .map((row: Record<string, unknown>) => mapSearchResultToCreator(row));
    },
    enabled: hasActiveSearch,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  // Enriquecer resultados de búsqueda con datos completos de allCreators
  // El RPC determina QUÉ coincide, allCreators provee los datos completos (portafolio, org, trust score real)
  const filteredSearchResults = useMemo(() => {
    if (!hasActiveSearch || !searchQuery.data) return [];

    // Mapa O(1) de id → creator enriquecido (portafolio completo, org, trust_score real)
    const enrichedMap = new Map(allCreators.map(c => [c.id, c]));

    // Reemplazar datos del RPC con datos enriquecidos cuando estén disponibles
    let result = searchQuery.data.map(searchCreator =>
      enrichedMap.get(searchCreator.id) ?? searchCreator
    );

    // Level (no está en RPC)
    if (filters.level.length > 0) {
      result = result.filter(c => filters.level.includes(c.level));
    }

    // Languages
    if (filters.languages.length > 0) {
      result = result.filter(c =>
        c.languages?.some(l => filters.languages.includes(l))
      );
    }

    // Content type
    if (filters.content_type.length > 0) {
      result = result.filter(c =>
        c.content_types?.some(ct => filters.content_type.includes(ct))
      );
    }

    // Price min (RPC solo tiene max)
    if (filters.price_min != null) {
      result = result.filter(c => c.base_price != null && c.base_price >= filters.price_min!);
    }

    // Organization
    if (filters.organization_id) {
      result = result.filter(c => (c as any).organization_id === filters.organization_id);
    }

    return result;
  }, [searchQuery.data, allCreators, filters, hasActiveSearch]);

  // Elegir fuente de datos: búsqueda optimizada o client-side tradicional
  const baseCreators = hasActiveSearch ? filteredSearchResults : filteredCreators;

  // SIEMPRE aplicar scoring inteligente para ranking con variabilidad
  const scoredCreators = useMemo(() => {
    return scoreCreators(baseCreators);
  }, [baseCreators, scoreCreators]);

  // Aplicar sort secundario si el usuario eligió algo diferente a 'relevance'
  const creators = useMemo(() => {
    if (filters.sort_by === 'relevance') {
      return scoredCreators;
    }

    const sorted = [...scoredCreators];

    switch (filters.sort_by) {
      case 'rating':
        sorted.sort((a, b) => {
          const ratingDiff = b.rating_avg - a.rating_avg;
          if (ratingDiff !== 0) return ratingDiff;
          return (b as ScoredMarketplaceCreator).recommendation_score - (a as ScoredMarketplaceCreator).recommendation_score;
        });
        break;
      case 'price_low':
        sorted.sort((a, b) => {
          const priceDiff = (a.base_price ?? Infinity) - (b.base_price ?? Infinity);
          if (priceDiff !== 0) return priceDiff;
          return (b as ScoredMarketplaceCreator).recommendation_score - (a as ScoredMarketplaceCreator).recommendation_score;
        });
        break;
      case 'price_high':
        sorted.sort((a, b) => {
          const priceDiff = (b.base_price ?? 0) - (a.base_price ?? 0);
          if (priceDiff !== 0) return priceDiff;
          return (b as ScoredMarketplaceCreator).recommendation_score - (a as ScoredMarketplaceCreator).recommendation_score;
        });
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const dateDiff = new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
          if (dateDiff !== 0) return dateDiff;
          return (b as ScoredMarketplaceCreator).recommendation_score - (a as ScoredMarketplaceCreator).recommendation_score;
        });
        break;
      case 'most_projects':
        sorted.sort((a, b) => {
          const projectsDiff = b.completed_projects - a.completed_projects;
          if (projectsDiff !== 0) return projectsDiff;
          return (b as ScoredMarketplaceCreator).recommendation_score - (a as ScoredMarketplaceCreator).recommendation_score;
        });
        break;
    }

    return sorted;
  }, [scoredCreators, filters.sort_by]);

  // Carruseles con scoring aplicado para variabilidad diaria
  const featured = useMemo(() => {
    return scoreCreators(rawFeatured).slice(0, 12);
  }, [rawFeatured, scoreCreators]);

  const newTalent = useMemo(() => {
    return rawNewTalent.slice(0, 12);
  }, [rawNewTalent]);

  const topRated = useMemo(() => {
    return scoreCreators(rawTopRated).slice(0, 12);
  }, [rawTopRated, scoreCreators]);

  const topPerformers = useMemo(() => {
    return rawTopPerformers.slice(0, 12);
  }, [rawTopPerformers]);

  const recommended = useMemo(() => {
    if (!isPersonalized) return [];
    return scoreCreators(allCreators).slice(0, 12);
  }, [allCreators, isPersonalized, scoreCreators]);

  // Estado de carga según el modo
  const isLoading = hasActiveSearch ? searchQuery.isLoading : isLoadingAll;
  const totalCount = hasActiveSearch ? creators.length : totalCountAll;

  return {
    creators,
    featured,
    newTalent,
    topRated,
    topPerformers,
    recommended,
    organizations,
    isLoading,
    totalCount,
    isPersonalized,
    isUsernameSearch: !!usernameSearch,
    hasActiveSearch,
  };
}
