import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualizedGridOptions<T> {
  items: T[];
  columns?: number;
  rowHeight?: number;
  overscan?: number;
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

interface VirtualizedGridResult<T> {
  visibleItems: Array<{ item: T; index: number; style: React.CSSProperties }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  isVirtualized: boolean;
}

/**
 * Hook for virtualizing grid layouts - renders only visible items plus overscan
 * Dramatically improves performance for large lists (100+ items)
 */
export function useVirtualizedGrid<T>({
  items,
  columns = 3,
  rowHeight = 300,
  overscan = 3,
  containerRef,
  enabled = true,
}: UseVirtualizedGridOptions<T>): VirtualizedGridResult<T> {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate grid metrics
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * rowHeight;

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    // Initial setup
    handleResize();
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Use ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [containerRef, enabled]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (!enabled || containerHeight === 0) {
      return { startIndex: 0, endIndex: items.length - 1 };
    }

    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.ceil((scrollTop + containerHeight) / rowHeight);

    // Apply overscan
    const overscanStartRow = Math.max(0, startRow - overscan);
    const overscanEndRow = Math.min(totalRows - 1, endRow + overscan);

    return {
      startIndex: overscanStartRow * columns,
      endIndex: Math.min(items.length - 1, (overscanEndRow + 1) * columns - 1),
    };
  }, [scrollTop, containerHeight, rowHeight, columns, overscan, totalRows, items.length, enabled]);

  // Generate visible items with positioning
  const visibleItems = useMemo(() => {
    if (!enabled) {
      // Return all items without virtualization
      return items.map((item, index) => ({
        item,
        index,
        style: {} as React.CSSProperties,
      }));
    }

    const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];

    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;

      result.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: row * rowHeight,
          left: `${(col / columns) * 100}%`,
          width: `${100 / columns}%`,
          height: rowHeight,
        },
      });
    }

    return result;
  }, [items, startIndex, endIndex, columns, rowHeight, enabled]);

  return {
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    isVirtualized: enabled,
  };
}

/**
 * Hook for lazy loading items as they enter viewport
 * Uses IntersectionObserver for efficient visibility detection
 */
interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  options: UseLazyLoadOptions = {}
): boolean {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;
  const [isVisible, setIsVisible] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, threshold, rootMargin, enabled]);

  return isVisible;
}

/**
 * Hook for infinite scroll pagination
 */
interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
}

export function useInfiniteScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: UseInfiniteScrollOptions
) {
  const { hasMore, isLoading, onLoadMore, threshold = 200 } = options;
  const loadingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (loadingRef.current || isLoading || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceFromBottom < threshold) {
        loadingRef.current = true;
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef, hasMore, isLoading, onLoadMore, threshold]);

  // Reset loading ref when loading finishes
  useEffect(() => {
    if (!isLoading) {
      loadingRef.current = false;
    }
  }, [isLoading]);
}

/**
 * Hook for preloading images/videos in batch
 */
export function usePreloadMedia(urls: string[], enabled = true) {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);

  const preload = useCallback(async () => {
    if (!enabled || urls.length === 0) return;

    setIsPreloading(true);
    const newLoaded = new Set(loadedUrls);

    // Preload in batches of 5 to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      await Promise.all(
        batch.map(
          (url) =>
            new Promise<void>((resolve) => {
              if (newLoaded.has(url)) {
                resolve();
                return;
              }

              // Check if it's an image or video
              const isVideo = url.includes('.mp4') || url.includes('.m3u8') || url.includes('bunny');

              if (isVideo) {
                // For videos, just mark as "preloaded" - actual preload happens on hover
                newLoaded.add(url);
                resolve();
              } else {
                const img = new Image();
                img.onload = () => {
                  newLoaded.add(url);
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = url;
              }
            })
        )
      );
    }

    setLoadedUrls(newLoaded);
    setIsPreloading(false);
  }, [urls, enabled, loadedUrls]);

  useEffect(() => {
    preload();
  }, [preload]);

  return {
    isPreloading,
    isLoaded: (url: string) => loadedUrls.has(url),
    loadedCount: loadedUrls.size,
  };
}
