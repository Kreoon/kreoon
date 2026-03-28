import { useState, useEffect, useRef, memo } from 'react';
import { CreatorCarousel } from './CreatorCarousel';
import type { MarketplaceCreator } from './types/marketplace';

interface LazyCarouselProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  creators: MarketplaceCreator[];
  onCreatorClick?: (id: string) => void;
  // Root margin for triggering load before visible
  rootMargin?: string;
}

/**
 * Lazy-loaded carousel that only renders when near viewport.
 * Improves initial page load by deferring off-screen content.
 */
function LazyCarouselComponent({
  title,
  subtitle,
  emoji,
  creators,
  onCreatorClick,
  rootMargin = '200px',
}: LazyCarouselProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Use IntersectionObserver for efficient visibility detection
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          // Once visible, stop observing
          observer.disconnect();
        }
      },
      {
        rootMargin, // Start loading before visible
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin]);

  // Placeholder while not visible - exact same structure as real carousel to prevent CLS
  if (!hasBeenVisible) {
    return (
      <div
        ref={containerRef}
        className="space-y-4"
      >
        {/* Header - exact same as CreatorCarousel */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {title} {emoji}
            </h2>
            {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {/* Cards placeholder - exact dimensions */}
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="snap-start flex-shrink-0 w-[180px] max-sm:w-[45vw]"
            >
              <div className="aspect-[9/16] bg-white/5 rounded-sm animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render actual carousel once visible
  return (
    <CreatorCarousel
      title={title}
      subtitle={subtitle}
      emoji={emoji}
      creators={creators}
      onCreatorClick={onCreatorClick}
    />
  );
}

export const LazyCarousel = memo(LazyCarouselComponent);
