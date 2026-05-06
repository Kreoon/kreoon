import { useMemo, useEffect, useRef } from 'react';
import type { MarketplaceFilters, MarketplaceCreator } from '../types/marketplace';
import { useMarketplaceCreators } from '@/hooks/useMarketplaceCreators';
import { useMarketplaceRecommendations, ScoredMarketplaceCreator } from '@/hooks/useMarketplaceRecommendations';
import { useMarketplaceSearch, SearchCreatorResult } from '@/hooks/useMarketplaceSearch';

// Helper: mapear SearchCreatorResult a MarketplaceCreator
function mapSearchResultToCreator(result: SearchCreatorResult): MarketplaceCreator {
  return {
    id: result.id,
    user_id: result.user_id,
    slug: result.slug,
    display_name: result.display_name,
    avatar_url: result.avatar_url,
    bio: result.bio,
    location_city: result.location_city,
    location_country: result.location_country,
    country_flag: null,
    categories: result.categories,
    content_types: result.content_types,
    level: (result.level as 'bronze' | 'silver' | 'gold' | 'elite') || 'bronze',
    is_verified: result.is_verified,
    rating_avg: result.rating_avg,
    rating_count: result.rating_count,
    base_price: result.base_price,
    currency: result.currency,
    portfolio_media: [],
    is_available: true,
    languages: result.languages,
    completed_projects: result.total_projects,
    joined_at: '',
    accepts_product_exchange: result.accepts_exchange,
    marketplace_roles: result.marketplace_roles,
    trust_score: result.quality_score * 100,
    trust_score_breakdown: null,
    is_new_profile: false,
  };
}

export function useCreatorSearch(filters: MarketplaceFilters) {
  // Hook para carruseles (sin filtros de búsqueda)
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

  // Hook optimizado para búsquedas con full-text search
  const marketplaceSearch = useMarketplaceSearch();
  const prevSearchRef = useRef(filters.search);

  // Determinar si hay búsqueda activa (texto de al menos 2 caracteres)
  const hasActiveSearch = filters.search.length >= 2;

  // Sincronizar filtros con el hook de búsqueda cuando cambia el search
  useEffect(() => {
    if (hasActiveSearch && filters.search !== prevSearchRef.current) {
      prevSearchRef.current = filters.search;
      marketplaceSearch.setFilters(prev => ({
        ...prev,
        query: filters.search,
        roles: filters.marketplace_roles.length > 0 ? filters.marketplace_roles : [],
        location_country: filters.country,
        location_city: filters.city,
        niches: filters.category ? [filters.category] : [],
        specializations: filters.specializations.length > 0 ? filters.specializations : [],
        min_rating: filters.rating_min,
        max_price: filters.price_max,
        accepts_exchange: filters.accepts_exchange,
        is_available: filters.availability === 'now' ? true : null,
        offset: 0,
      }));
    }
  }, [filters.search, hasActiveSearch]);

  const { scoreCreators, isPersonalized } = useMarketplaceRecommendations();

  // Mapear resultados de búsqueda optimizada a MarketplaceCreator
  const searchCreators = useMemo(() => {
    if (!hasActiveSearch || marketplaceSearch.creators.length === 0) return [];
    return marketplaceSearch.creators.map(mapSearchResultToCreator);
  }, [hasActiveSearch, marketplaceSearch.creators]);

  // Aplicar filtros client-side que no soporta el RPC
  const filteredSearchResults = useMemo(() => {
    if (!hasActiveSearch) return [];

    let result = [...searchCreators];

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
  }, [searchCreators, filters, hasActiveSearch]);

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

    // Crear copia para re-ordenar
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

  // Nuevos Talentos: NO aplicar scoring que reordene
  // Mantener el orden cronológico (más reciente primero)
  const newTalent = useMemo(() => {
    return rawNewTalent.slice(0, 12);
  }, [rawNewTalent]);

  const topRated = useMemo(() => {
    return scoreCreators(rawTopRated).slice(0, 12);
  }, [rawTopRated, scoreCreators]);

  // Top Performers: mantener orden por performance score (proyectos * calidad)
  const topPerformers = useMemo(() => {
    return rawTopPerformers.slice(0, 12);
  }, [rawTopPerformers]);

  // Personalized "Recomendados para ti" section from all creators
  const recommended = useMemo(() => {
    if (!isPersonalized) return [];
    return scoreCreators(allCreators).slice(0, 12);
  }, [allCreators, isPersonalized, scoreCreators]);

  // Determinar estado de carga según el modo
  const isLoading = hasActiveSearch ? marketplaceSearch.isLoading : isLoadingAll;
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
    isUsernameSearch: marketplaceSearch.isUsernameSearch,
    hasActiveSearch,
  };
}
