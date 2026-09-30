import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceCreator } from './types/marketplace';
import { MarketplaceCreatorCard } from './CreatorCard';
import { CreatorCardSkeleton } from './CreatorCardSkeleton';

interface CreatorCarouselProps {
  title: string;
  subtitle?: string;
  emoji?: string;
  creators: MarketplaceCreator[];
  isLoading?: boolean;
  onSeeAll?: () => void;
  onCreatorClick?: (id: string) => void;
  /** Mark first items as priority for LCP optimization */
  priority?: boolean;
}

export function CreatorCarousel({
  title,
  subtitle,
  emoji,
  creators,
  isLoading,
  onSeeAll,
  onCreatorClick,
  priority = false,
}: CreatorCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, creators]);

  const scroll = useCallback((dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  }, []);

  if (!isLoading && creators.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {title}{emoji && <span aria-hidden="true"> {emoji}</span>}
          </h2>
          {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              Ver todos →
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Desplazar carrusel a la izquierda"
              className={cn(
                'w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center transition-all',
                canScrollLeft
                  ? 'hover:bg-muted text-foreground'
                  : 'opacity-30 cursor-not-allowed text-muted-foreground',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Desplazar carrusel a la derecha"
              className={cn(
                'w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center transition-all',
                canScrollRight
                  ? 'hover:bg-muted text-foreground'
                  : 'opacity-30 cursor-not-allowed text-muted-foreground',
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-[180px] max-sm:w-[45vw]">
                <CreatorCardSkeleton />
              </div>
            ))
          : creators.map((creator, i) => (
              <div
                key={creator.id}
                className="snap-start flex-shrink-0 w-[180px] max-sm:w-[45vw]"
              >
                <MarketplaceCreatorCard
                  creator={creator}
                  onClick={() => onCreatorClick?.(creator.slug || creator.id)}
                  priority={priority && i < 6} // First 6 items are priority when carousel is priority
                />
              </div>
            ))}
      </div>
    </section>
  );
}
