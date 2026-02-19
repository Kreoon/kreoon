import { X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETPLACE_CATEGORIES, CONTENT_TYPES } from '../../types/marketplace';
import type { CampaignFilters, CampaignPricingMode } from '../../types/marketplace';

const PRICING_MODES: { value: CampaignPricingMode; label: string }[] = [
  { value: 'fixed', label: 'Precio Fijo' },
  { value: 'auction', label: 'Subasta' },
  { value: 'range', label: 'Rango' },
];

interface CampaignsFeedFiltersProps {
  filters: CampaignFilters;
  onFiltersChange: (filters: CampaignFilters) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function CampaignsFeedFilters({ filters, onFiltersChange, isOpen, onToggle }: CampaignsFeedFiltersProps) {
  const update = (partial: Partial<CampaignFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const hasActiveFilters = filters.category || filters.budget_min || filters.budget_max || filters.pricing_mode;

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      category: null,
      budget_min: null,
      budget_max: null,
      pricing_mode: null,
    });
  };

  return (
    <>
      {/* Toggle button (mobile) */}
      <button
        onClick={onToggle}
        className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtros
        {hasActiveFilters && (
          <span className="w-2 h-2 rounded-full bg-purple-500" />
        )}
      </button>

      {/* Filter panel */}
      <div
        className={cn(
          'space-y-6 lg:block',
          isOpen ? 'block' : 'hidden',
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground/80">Filtros</h3>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-purple-400 text-xs hover:text-purple-300">
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Category filter */}
        <div>
          <label className="text-gray-500 text-xs block mb-2">Categoria</label>
          <div className="space-y-1">
            {MARKETPLACE_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                onClick={() => update({ category: filters.category === cat.id ? null : cat.id })}
                className={cn(
                  'w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors',
                  filters.category === cat.id
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-gray-400 hover:bg-white/5',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing mode filter */}
        <div>
          <label className="text-gray-500 text-xs block mb-2">Modo de Precio</label>
          <div className="flex flex-wrap gap-1.5">
            {PRICING_MODES.map(mode => (
              <button
                key={mode.value}
                onClick={() => update({ pricing_mode: filters.pricing_mode === mode.value ? null : mode.value })}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filters.pricing_mode === mode.value
                    ? mode.value === 'auction'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : mode.value === 'range'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget range */}
        <div>
          <label className="text-gray-500 text-xs block mb-2">Presupuesto (COP)</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.budget_min ?? ''}
              onChange={e => update({ budget_min: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.budget_max ?? ''}
              onChange={e => update({ budget_max: e.target.value ? Number(e.target.value) : null })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Close on mobile */}
        {isOpen && (
          <button
            onClick={onToggle}
            className="lg:hidden w-full py-2 text-gray-500 text-sm flex items-center justify-center gap-1"
          >
            <X className="h-3 w-3" />
            Cerrar filtros
          </button>
        )}
      </div>
    </>
  );
}
