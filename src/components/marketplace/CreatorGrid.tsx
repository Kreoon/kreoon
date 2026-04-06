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
      /*
       * CLS fix: cuando no hay resultados reservamos la misma altura mínima
       * que ocupa el grid normal (≈4 filas × 320px mínimo) para que la
       * página no salte si el usuario limpia un filtro y aparecen cards.
       */
      <section
        className="flex flex-col items-center justify-center py-20 text-center"
        aria-label="Resultados de creadores"
        style={{ minHeight: '640px' }}
      >
        <Users className="h-16 w-16 text-muted-foreground mb-4" aria-hidden="true" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          No se encontraron resultados
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {searchQuery
            ? `No hay resultados para "${searchQuery}". Intenta con otros terminos.`
            : 'Intenta ajustar los filtros para ver mas resultados.'}
        </p>
      </section>
    );
  }

  return (
    <section
      className="space-y-6"
      aria-label="Resultados de creadores"
      /*
       * CLS fix: reservar altura mínima equivalente a 2 filas de cards (≈640px)
       * antes de que el contenido cargue evita el shift masivo de 0.618.
       * El valor 640px = 2 × CARD_HEIGHT(320px) cubre mobile (2 cols) y
       * desktop (4-5 cols) porque el alto de cada card es fijo por aspect-ratio.
       */
      style={{ minHeight: '640px', contain: 'layout' }}
    >
      {/* Header con contador — live region para anunciar cambios a screen readers */}
      {/*
       * CLS fix: min-h-[2rem] reserva espacio para la línea del contador
       * mientras isLoading es true y totalCount todavía es 0.
       */}
      <div className="flex items-center justify-between min-h-[2rem]">
        <h2
          className="text-xl font-semibold text-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {isLoading
            ? '\u00A0' /* non-breaking space: ocupa la línea sin mostrar texto */
            : searchQuery
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
          ? Array.from({ length: 10 }).map((_, i) => (
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
