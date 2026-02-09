import { useState, useMemo, useCallback } from 'react';
import type { MarketplaceCreator } from '../types/marketplace';

const PAGE_SIZE = 12;

export function useInfiniteCreators(allCreators: MarketplaceCreator[]) {
  const [page, setPage] = useState(1);

  const visibleCreators = useMemo(
    () => allCreators.slice(0, page * PAGE_SIZE),
    [allCreators, page],
  );

  const hasMore = visibleCreators.length < allCreators.length;

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    visibleCreators,
    hasMore,
    loadMore,
    reset,
    totalCount: allCreators.length,
    shownCount: visibleCreators.length,
  };
}
