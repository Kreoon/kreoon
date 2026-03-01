/**
 * ActiveLivesCarousel - Carrusel horizontal de streams en vivo activos
 */

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { LiveCard, LiveCardSkeleton, LiveCardCompact } from './LiveCard';
import { useActiveLives } from '@/hooks/useLiveStream';
import type { LiveStreamWithCreator } from '@/types/live-streaming.types';

interface ActiveLivesCarouselProps {
  category?: string;
  limit?: number;
  className?: string;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function ActiveLivesCarousel({
  category,
  limit = 10,
  className,
  title = 'En Vivo Ahora',
  showViewAll = true,
  onViewAll,
}: ActiveLivesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: streams, isLoading } = useActiveLives({ category, limit });

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 280; // Aproximadamente el ancho de una card
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <LiveCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!streams || streams.length === 0) {
    return null; // No mostrar nada si no hay streams activos
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500 animate-pulse" />
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">
            {streams.length} {streams.length === 1 ? 'stream' : 'streams'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showViewAll && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              Ver todos
            </Button>
          )}

          {/* Navigation arrows */}
          {streams.length > 3 && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {(streams as LiveStreamWithCreator[]).map((stream) => (
          <div key={stream.id} style={{ scrollSnapAlign: 'start' }}>
            <LiveCard stream={stream} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ActiveLivesSidebar - Lista compacta para sidebar
 */
interface ActiveLivesSidebarProps {
  limit?: number;
  className?: string;
}

export function ActiveLivesSidebar({ limit = 5, className }: ActiveLivesSidebarProps) {
  const { data: streams, isLoading } = useActiveLives({ limit });

  if (isLoading || !streams || streams.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 px-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-xs font-medium text-muted-foreground uppercase">
          En Vivo ({streams.length})
        </span>
      </div>

      <div className="space-y-1">
        {(streams as LiveStreamWithCreator[]).map((stream) => (
          <LiveCardCompact key={stream.id} stream={stream} />
        ))}
      </div>
    </div>
  );
}

/**
 * LivesGrid - Grid de streams para página de descubrimiento
 */
interface LivesGridProps {
  streams: LiveStreamWithCreator[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function LivesGrid({
  streams,
  isLoading = false,
  emptyMessage = 'No hay transmisiones en vivo en este momento',
  className,
}: LivesGridProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <LiveCardSkeleton key={i} size="lg" />
        ))}
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {streams.map((stream) => (
        <LiveCard key={stream.id} stream={stream} size="lg" className="w-full" />
      ))}
    </div>
  );
}
