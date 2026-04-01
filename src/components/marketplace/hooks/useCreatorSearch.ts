import { useMemo } from 'react';
import type { MarketplaceFilters } from '../types/marketplace';
import { useMarketplaceCreators } from '@/hooks/useMarketplaceCreators';
import { useMarketplaceRecommendations, ScoredMarketplaceCreator } from '@/hooks/useMarketplaceRecommendations';

export function useCreatorSearch(filters: MarketplaceFilters) {
  const {
    creators: filteredCreators,
    allCreators,
    featured: rawFeatured,
    newTalent: rawNewTalent,
    topRated: rawTopRated,
    topPerformers: rawTopPerformers,
    organizations,
    isLoading,
    totalCount,
  } = useMarketplaceCreators(filters);

  const { scoreCreators, isPersonalized } = useMarketplaceRecommendations();

  // SIEMPRE aplicar scoring inteligente para ranking con variabilidad
  const scoredCreators = useMemo(() => {
    return scoreCreators(filteredCreators);
  }, [filteredCreators, scoreCreators]);

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
          // Tiebreaker: usar recommendation_score
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
  };
}
