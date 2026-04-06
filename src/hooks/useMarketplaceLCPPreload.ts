import { useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';
import type { MarketplaceCreator, PortfolioMedia } from '@/components/marketplace/types/marketplace';
import type { MarketplaceCreatorsResult } from '@/hooks/useMarketplaceCreators';
import { MARKETPLACE_CREATORS_QUERY_KEY } from '@/hooks/useMarketplaceCreators';

const THUMB_WIDTH = 360;

function resolveThumbUrl(item: PortfolioMedia): string {
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }
  const baseUrl = item.thumbnail_url || item.url;
  if (!baseUrl) return '';
  return getOptimizedImageUrl(baseUrl, { width: THUMB_WIDTH, quality: 75 });
}

function getCreatorThumbnail(creator: MarketplaceCreator): string | null {
  const firstMedia = creator.portfolio_media?.[0];
  if (firstMedia) return resolveThumbUrl(firstMedia);
  if (creator.avatar_url) {
    return getOptimizedImageUrl(creator.avatar_url, { width: THUMB_WIDTH, quality: 75 });
  }
  return null;
}

function injectPreloadLink(url: string, highPriority: boolean): HTMLLinkElement | null {
  if (!url) return null;
  const existing = document.head.querySelector(`link[rel="preload"][as="image"][href="${CSS.escape(url)}"]`);
  if (existing) return null;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  if (highPriority) link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
  return link;
}

/**
 * Preloads LCP images for the marketplace grid.
 *
 * Strategy:
 * 1. On mount: check React Query cache synchronously (zero delay if cached).
 * 2. On data arrival: inject preload links for the first N creators.
 *
 * This ensures that on repeat visits (cache hit) the preload links are
 * injected *before* any network request, eliminating the 4.5s LCP delay.
 */
export function useMarketplaceLCPPreload(
  creators: MarketplaceCreator[] | undefined,
  count: number = 6,
): void {
  const queryClient = useQueryClient();
  const injectedRef = useRef<Set<string>>(new Set());
  const mountDoneRef = useRef(false);

  // ── Paso 1: Sincrónico al montar — cache hit = preload inmediato ──
  if (!mountDoneRef.current) {
    mountDoneRef.current = true;
    const cached = queryClient.getQueryData<MarketplaceCreatorsResult>(MARKETPLACE_CREATORS_QUERY_KEY);
    if (cached?.allCreators?.length) {
      const toPreload = cached.allCreators.slice(0, count);
      toPreload.forEach((creator, i) => {
        const url = getCreatorThumbnail(creator);
        if (url && !injectedRef.current.has(url)) {
          injectedRef.current.add(url);
          injectPreloadLink(url, i < 2);
        }
      });
    }
  }

  // ── Paso 2: Effect — cuando llegan datos frescos (primera visita) ──
  useEffect(() => {
    if (!creators || creators.length === 0) return;

    const toPreload = creators.slice(0, count);
    toPreload.forEach((creator, i) => {
      const url = getCreatorThumbnail(creator);
      if (url && !injectedRef.current.has(url)) {
        injectedRef.current.add(url);
        injectPreloadLink(url, i < 2);
      }
    });
  }, [creators, count]);
}
