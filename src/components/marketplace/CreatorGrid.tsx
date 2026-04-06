import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { MarketplaceCreator } from './types/marketplace';
import { MarketplaceCreatorCard } from './CreatorCard';
import { CreatorCardSkeleton } from './CreatorCardSkeleton';
import { Users } from 'lucide-react';
import { usePreloadLCPImages } from '@/hooks/usePreloadLCPImages';

interface CreatorGridProps {
  creators: MarketplaceCreator[];
  isLoading?: boolean;
  hasMore?: boolean;
  totalCount: number;
  onLoadMore?: () => void;
  onCreatorClick?: (id: string) => void;
  searchQuery?: string;
  /** Priority loading for first items (LCP optimization) */
  priority?: boolean;
}

export const CreatorGrid = memo(function CreatorGrid({
  creators,
  isLoading,
  hasMore,
  totalCount,
  onLoadMore,
  onCreatorClick,
  searchQuery,
  priority = false,
}: CreatorGridProps) {
  // Preload first 6 images for better LCP (2 rows on mobile)
  usePreloadLCPImages(priority ? creators : undefined, 6);

  if (!isLoading && creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          No se encontraron resultados
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {searchQuery
            ? `No hay resultados para "${searchQuery}". Intenta con otros terminos.`
            : 'Intenta ajustar los filtros para ver mas resultados.'}
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-label="Resultados de creadores">
      {/* Header con contador — live region para anunciar cambios a screen readers */}
      <div className="flex items-center justify-between">
        <h2
          className="text-xl font-semibold text-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {searchQuery
            ? `${totalCount} resultado${totalCount !== 1 ? 's' : ''} para "${searchQuery}"`
            : 'Explora Talento'}
        </h2>
      </div>

      {/* Grid — gap reducido en mobile para mejor densidad */}
      <div
        className={cn(
          'grid gap-3 sm:gap-4 lg:gap-6',
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        )}
        role={isLoading ? 'status' : undefined}
        aria-busy={isLoading}
        aria-label={isLoading ? 'Cargando creadores' : undefined}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))
          : creators.map((creator, i) => (
              <MarketplaceCreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => onCreatorClick?.(creator.slug || creator.id)}
                priority={priority && i < 6}
              />
            ))}
      </div>

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className={cn(
              'bg-secondary/50 border border-border rounded-lg px-6 py-3',
              'text-purple-400 hover:bg-secondary hover:text-purple-300',
              'transition-all text-sm font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
            )}
            aria-label="Cargar mas creadores"
          >
            Cargar mas talento
          </button>
        </div>
      )}
    </section>
  );
});
