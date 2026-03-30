import { useState, useCallback, useMemo } from 'react';
import type { MarketplaceFilters } from '../types/marketplace';
import { DEFAULT_FILTERS } from '../types/marketplace';

export function useMarketplaceFilters() {
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K],
  ) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };

      // When changing role_category, clear sub-role selections and adaptive filters
      if (key === 'role_category') {
        next.marketplace_roles = [];
        next.platforms = [];
        next.software = [];
        next.accepts_exchange = null;
      }

      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.country) count++;
    if (filters.content_type.length > 0) count++;
    if (filters.price_min != null || filters.price_max != null) count++;
    if (filters.rating_min != null) count++;
    if (filters.level.length > 0) count++;
    if (filters.languages.length > 0) count++;
    if (filters.availability !== 'any') count++;
    // Role-based
    if (filters.marketplace_roles.length > 0) count++;
    // Adaptive
    if (filters.platforms.length > 0) count++;
    if (filters.software.length > 0) count++;
    if (filters.accepts_exchange != null) count++;
    // Specializations
    if (filters.specializations.length > 0) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0 || filters.search.length > 0;

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    activeFilterCount,
    hasActiveFilters,
  };
}
