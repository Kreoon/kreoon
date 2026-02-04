import { useRef, useCallback, memo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  getItemKey: (item: T, index: number) => string;
  columns?: number;
  gap?: number;
  className?: string;
  itemClassName?: string;
  overscan?: number;
  estimatedItemHeight?: number;
  enableVirtualization?: boolean;
  loadingPlaceholder?: React.ReactNode;
  emptyState?: React.ReactNode;
}

interface GridItemProps {
  children: React.ReactNode;
  className?: string;
  index: number;
  onVisible?: (index: number) => void;
}

/**
 * Grid item with intersection observer for lazy loading
 */
const GridItem = memo(function GridItem({
  children,
  className,
  index,
  onVisible,
}: GridItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.(index);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.01,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [index, onVisible]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : (
        <div className="w-full h-full animate-pulse bg-muted rounded-sm" />
      )}
    </div>
  );
});

/**
 * Virtualized grid component for efficient rendering of large lists
 * Uses IntersectionObserver for lazy loading items as they enter viewport
 */
function VirtualizedGridInner<T>({
  items,
  renderItem,
  getItemKey,
  columns = 3,
  gap = 4,
  className,
  itemClassName,
  overscan = 6,
  estimatedItemHeight = 300,
  enableVirtualization = true,
  loadingPlaceholder,
  emptyState,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(0);

  // Track which items have been rendered
  const [renderedItems, setRenderedItems] = useState<Set<number>>(new Set());

  const handleItemVisible = useCallback((index: number) => {
    setRenderedItems((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  // Update visible range based on scroll
  useEffect(() => {
    if (!enableVirtualization) return;

    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const { scrollTop, clientHeight } = container;
      const rowHeight = estimatedItemHeight + gap;

      const startRow = Math.floor(scrollTop / rowHeight);
      const visibleRows = Math.ceil(clientHeight / rowHeight);
      const endRow = startRow + visibleRows;

      const startIndex = Math.max(0, (startRow - overscan) * columns);
      const endIndex = Math.min(items.length - 1, (endRow + overscan + 1) * columns - 1);

      setVisibleRange({ start: startIndex, end: endIndex });
      setContainerHeight(clientHeight);
    };

    updateVisibleRange();

    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange, { passive: true });

    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [items.length, columns, estimatedItemHeight, gap, overscan, enableVirtualization]);

  if (items.length === 0) {
    return emptyState || null;
  }

  // For small lists, don't virtualize
  const shouldVirtualize = enableVirtualization && items.length > 30;

  if (!shouldVirtualize) {
    return (
      <div
        ref={containerRef}
        className={cn('grid', className)}
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {items.map((item, index) => (
          <GridItem
            key={getItemKey(item, index)}
            className={itemClassName}
            index={index}
            onVisible={handleItemVisible}
          >
            {renderItem(item, index, renderedItems.has(index))}
          </GridItem>
        ))}
      </div>
    );
  }

  // Virtualized rendering
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * (estimatedItemHeight + gap);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ height: '100%' }}
    >
      <div
        className="relative"
        style={{
          height: totalHeight,
          minHeight: totalHeight,
        }}
      >
        <div
          className="grid absolute inset-x-0"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
            top: Math.floor(visibleRange.start / columns) * (estimatedItemHeight + gap),
          }}
        >
          {items.slice(visibleRange.start, visibleRange.end + 1).map((item, idx) => {
            const actualIndex = visibleRange.start + idx;
            return (
              <GridItem
                key={getItemKey(item, actualIndex)}
                className={itemClassName}
                index={actualIndex}
                onVisible={handleItemVisible}
              >
                {renderItem(item, actualIndex, true)}
              </GridItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const VirtualizedGrid = memo(VirtualizedGridInner) as typeof VirtualizedGridInner;

/**
 * Simple lazy image component with intersection observer
 */
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholderClassName?: string;
  wrapperClassName?: string;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  wrapperClassName,
  ...props
}: LazyImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0.01 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('relative', wrapperClassName)}>
      {!isLoaded && !hasError && (
        <Skeleton className={cn('absolute inset-0', placeholderClassName)} />
      )}
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
      {hasError && (
        <div className={cn('absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm', placeholderClassName)}>
          Error
        </div>
      )}
    </div>
  );
});

/**
 * Lazy video component with intersection observer
 * Only loads video source when visible
 */
interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  wrapperClassName?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
}

export const LazyVideo = memo(function LazyVideo({
  src,
  poster,
  className,
  wrapperClassName,
  autoPlay = false,
  muted = true,
  loop = true,
  controls = false,
  onLoadStart,
  onCanPlay,
}: LazyVideoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Pause video when not visible to save resources
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (autoPlay) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [autoPlay, isLoaded]);

  return (
    <div ref={ref} className={cn('relative', wrapperClassName)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0" />
      )}
      {isVisible && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={controls}
          playsInline
          onLoadStart={onLoadStart}
          onCanPlay={() => {
            setIsLoaded(true);
            onCanPlay?.();
          }}
        />
      )}
    </div>
  );
});
