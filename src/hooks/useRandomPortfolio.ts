import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback } from 'react';
import { getOptimizedThumbnail } from '@/lib/imageOptimization';
import type { PortfolioItemData } from './usePortfolioItems';

const PORTFOLIO_RANDOM_KEY = 'portfolio-random';
const PRELOAD_COUNT = 6;

interface UseRandomPortfolioReturn {
  items: PortfolioItemData[];
  isLoading: boolean;
  isShuffling: boolean;
  shuffle: () => void;
}

/**
 * Hook para obtener items de portafolio aleatorios con limite.
 * Usa TanStack Query para caching y preload de thumbnails para LCP.
 */
export function useRandomPortfolio(
  creatorId: string | undefined,
  limit = 50
): UseRandomPortfolioReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [PORTFOLIO_RANDOM_KEY, creatorId, limit],
    queryFn: async () => {
      if (!creatorId) return [];

      const { data, error } = await (supabase as any).rpc('get_portfolio_items_random', {
        p_creator_id: creatorId,
        p_limit: limit,
      });

      if (error) {
        console.error('[useRandomPortfolio] Error:', error);
        throw error;
      }

      return (data || []) as PortfolioItemData[];
    },
    enabled: !!creatorId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Preload primeros thumbnails para mejor LCP
  useEffect(() => {
    if (!data?.length) return;

    const preloaded = new Set<string>();

    data.slice(0, PRELOAD_COUNT).forEach((item, i) => {
      const thumbUrl = getOptimizedThumbnail(
        item.thumbnail_url || item.media_url,
        600,
        1067,
        80
      );

      if (thumbUrl && !preloaded.has(thumbUrl)) {
        preloaded.add(thumbUrl);

        const existing = document.querySelector(`link[href="${CSS.escape(thumbUrl)}"]`);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = thumbUrl;
        if (i < 2) link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
      }
    });
  }, [data]);

  const shuffle = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [PORTFOLIO_RANDOM_KEY, creatorId]
    });
  }, [queryClient, creatorId]);

  return {
    items: data || [],
    isLoading,
    isShuffling: isFetching && !isLoading,
    shuffle,
  };
}
