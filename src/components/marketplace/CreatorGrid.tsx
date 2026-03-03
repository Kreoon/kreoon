import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { MarketplaceCreator } from './types/marketplace';
import { MarketplaceCreatorCard } from './CreatorCard';
import { CreatorCardSkeleton } from './CreatorCardSkeleton';
import { Users } from 'lucide-react';

interface CreatorGridProps {
  creators: MarketplaceCreator[];
  isLoading?: boolean;
  hasMore?: boolean;
  totalCount: number;
  onLoadMore?: () => void;
  onCreatorClick?: (id: string) => void;
  searchQuery?: string;
}

export const CreatorGrid = memo(function CreatorGrid({
  creators,
  isLoading,
  hasMore,
  totalCount,
  onLoadMore,
  onCreatorClick,
  searchQuery,
}: CreatorGridProps) {
  if (!isLoading && creators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">
          No se encontraron resultados
        </h3>
        <p className="text-gray-400 text-sm max-w-md">
          {searchQuery
            ? `No hay resultados para "${searchQuery}". Intenta con otros términos.`
            : 'Intenta ajustar los filtros para ver más resultados.'}
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {searchQuery
            ? `${totalCount} resultado${totalCount !== 1 ? 's' : ''} para "${searchQuery}"`
            : 'Explora Talento'}
        </h2>
      </div>

      {/* Grid */}
      <div
        className={cn(
          'grid gap-6',
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        )}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))
          : creators.map((creator) => (
              <MarketplaceCreatorCard
                key={creator.id}
                creator={creator}
                onClick={() => onCreatorClick?.(creator.slug || creator.id)}
              />
            ))}
      </div>

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-purple-400 hover:bg-white/10 hover:text-purple-300 transition-all text-sm font-medium"
          >
            Cargar más talento
          </button>
        </div>
      )}
    </section>
  );
});
