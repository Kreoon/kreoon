import { useMemo } from 'react';
import type { MarketplaceFilters } from '../types/marketplace';
import { useMarketplaceCreators } from '@/hooks/useMarketplaceCreators';
import { useMarketplaceRecommendations } from '@/hooks/useMarketplaceRecommendations';

export function useCreatorSearch(filters: MarketplaceFilters) {
  const {
    creators: filteredCreators,
    allCreators,
    featured,
    newTalent,
    topRated,
    isLoading,
    totalCount,
  } = useMarketplaceCreators(filters);

  const { scoreCreators, isPersonalized } = useMarketplaceRecommendations();

  // Apply recommendation scoring when sort_by is 'relevance' (the default)
  const creators = useMemo(() => {
    if (filters.sort_by !== 'relevance') return filteredCreators;
    return scoreCreators(filteredCreators);
  }, [filteredCreators, filters.sort_by, scoreCreators]);

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
    recommended,
    isLoading,
    totalCount,
    isPersonalized,
  };
}
