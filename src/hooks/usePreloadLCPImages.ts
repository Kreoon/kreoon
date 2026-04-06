import { useEffect, useRef } from 'react';
import { getBunnyThumbnailUrl } from '@/hooks/useHLSPlayer';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';
import type { MarketplaceCreator, PortfolioMedia } from '@/components/marketplace/types/marketplace';

// Card dimensions matching CreatorCard.tsx
const THUMB_WIDTH = 360; // 180 * 2 for retina
const THUMB_HEIGHT = 640; // 320 * 2 for retina

/**
 * Resolves the thumbnail URL for a portfolio media item
 * (duplicated from CreatorCard for preloading before component renders)
 */
function resolveThumbUrl(item: PortfolioMedia): string {
  if (item.type === 'video') {
    const bunnyThumb = getBunnyThumbnailUrl(item.url);
    if (bunnyThumb) return bunnyThumb;
  }
  const baseUrl = item.thumbnail_url || item.url;
  if (!baseUrl) return '';
  return getOptimizedImageUrl(baseUrl, { width: THUMB_WIDTH, quality: 75 });
}

/**
 * Gets the first visible thumbnail URL for a creator
 */
function getCreatorThumbnail(creator: MarketplaceCreator): string | null {
  const firstMedia = creator.portfolio_media?.[0];
  if (firstMedia) {
    return resolveThumbUrl(firstMedia);
  }
  if (creator.avatar_url) {
    return getOptimizedImageUrl(creator.avatar_url, { width: THUMB_WIDTH, quality: 75 });
  }
  return null;
}

/**
 * Hook to preload LCP images for the marketplace grid
 * Preloads the first N creator thumbnails with high priority
 *
 * @param creators - Array of marketplace creators
 * @param count - Number of images to preload (default: 6 for 2 rows mobile)
 */
export function usePreloadLCPImages(
  creators: MarketplaceCreator[] | undefined,
  count: number = 6
): void {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!creators || creators.length === 0) return;

    // Get the first N creators to preload
    const creatorsToPreload = creators.slice(0, count);

    creatorsToPreload.forEach((creator, index) => {
      const url = getCreatorThumbnail(creator);
      if (!url || preloadedRef.current.has(url)) return;

      preloadedRef.current.add(url);

      // Create preload link with high priority for first 2 images
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;

      // First 2 images get highest priority (likely LCP candidates)
      if (index < 2) {
        link.setAttribute('fetchpriority', 'high');
      }

      // Avoid duplicate preload links
      const existing = document.querySelector(`link[rel="preload"][href="${CSS.escape(url)}"]`);
      if (!existing) {
        document.head.appendChild(link);
      }
    });

    // Cleanup: remove preload links on unmount (optional, helps with navigation)
    return () => {
      // Keep preloaded images cached, just clear our tracking
      // (removing links doesn't un-cache the images)
    };
  }, [creators, count]);
}

/**
 * Batch preload multiple images at once
 * Useful for prefetching when user is about to scroll
 */
export function preloadImages(urls: string[]): void {
  if (typeof window === 'undefined') return;

  urls.forEach(url => {
    if (!url) return;

    const existing = document.querySelector(`link[rel="preload"][href="${CSS.escape(url)}"]`);
    if (existing) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}
