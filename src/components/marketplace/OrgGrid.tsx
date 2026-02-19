import { memo } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { MarketplaceOrgCard } from './OrgCard';
import type { MarketplaceOrg } from './types/marketplace';

interface OrgGridProps {
  orgs: MarketplaceOrg[];
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
  onOrgClick: (slug: string) => void;
  loading?: boolean;
}

function OrgGridComponent({ orgs, hasMore, totalCount, onLoadMore, onOrgClick, loading }: OrgGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <OrgCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No se encontraron organizaciones</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Prueba ajustando los filtros o busca con otras palabras clave
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalCount} {totalCount === 1 ? 'organización' : 'organizaciones'}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgs.map((org, i) => (
          <div
            key={org.id}
            style={{ animationDelay: `${i * 50}ms` }}
            className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            <MarketplaceOrgCard
              org={org}
              onClick={() => onOrgClick(org.slug)}
            />
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className="px-6 py-2.5 rounded-xl bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Ver más organizaciones
          </button>
        </div>
      )}
    </div>
  );
}

function OrgCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden animate-pulse">
      <div className="h-28 bg-white/5" />
      <div className="px-4 pb-4 -mt-8 relative z-10">
        <div className="h-14 w-14 rounded-xl bg-white/10 mb-3" />
        <div className="h-4 w-3/4 bg-white/5 rounded mb-1" />
        <div className="h-3 w-full bg-white/5 rounded mb-3" />
        <div className="flex gap-1">
          <div className="h-4 w-12 bg-white/5 rounded-full" />
          <div className="h-4 w-12 bg-white/5 rounded-full" />
        </div>
        <div className="flex gap-3 mt-3">
          <div className="h-3 w-16 bg-white/5 rounded" />
          <div className="h-3 w-12 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

export const MarketplaceOrgGrid = memo(OrgGridComponent);
