import { useState, useCallback, useMemo } from 'react';
import type { MarketplaceOrg } from '../types/marketplace';

const PAGE_SIZE = 12;

export function useInfiniteOrgs(allOrgs: MarketplaceOrg[]) {
  const [page, setPage] = useState(1);

  const visibleOrgs = useMemo(() => allOrgs.slice(0, page * PAGE_SIZE), [allOrgs, page]);

  const hasMore = visibleOrgs.length < allOrgs.length;

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return { visibleOrgs, hasMore, loadMore, reset };
}
