import { memo, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceFilters } from './types/marketplace';
import { COUNTRIES, MARKETPLACE_CATEGORIES } from './types/marketplace';
import { MARKETPLACE_ROLES_MAP } from './roles/marketplaceRoleConfig';
import { PLATFORMS, SOFTWARE_TOOLS, TECH_STACKS, EDUCATION_FORMATS } from './hooks/useAdaptiveFilters';

interface ActiveFiltersProps {
  filters: MarketplaceFilters;
  onRemoveFilter: (key: keyof MarketplaceFilters, value?: string) => void;
  onClearAll: () => void;
}

interface FilterChip {
  key: keyof MarketplaceFilters;
  label: string;
  value?: string;
}

export const ActiveFilters = memo(function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const chips = useMemo(() => {
    const result: FilterChip[] = [];

    if (filters.category) {
      const cat = MARKETPLACE_CATEGORIES.find(c => c.id === filters.category);
      result.push({ key: 'category', label: cat?.label || filters.category });
    }

    if (filters.country) {
      const c = COUNTRIES.find(co => co.code === filters.country);
      result.push({ key: 'country', label: c ? `${c.flag} ${c.label}` : filters.country });
    }

    filters.content_type.forEach(ct => {
      result.push({ key: 'content_type', label: ct, value: ct });
    });

    if (filters.rating_min != null) {
      result.push({ key: 'rating_min', label: `⭐ ${filters.rating_min}+` });
    }

    if (filters.price_min != null || filters.price_max != null) {
      const parts = [];
      if (filters.price_min != null) parts.push(`$${filters.price_min.toLocaleString()}`);
      parts.push('-');
      if (filters.price_max != null) parts.push(`$${filters.price_max.toLocaleString()}`);
      result.push({ key: 'price_min', label: `💰 ${parts.join(' ')}` });
    }

    filters.level.forEach(l => {
      result.push({ key: 'level', label: l.charAt(0).toUpperCase() + l.slice(1), value: l });
    });

    filters.languages.forEach(l => {
      result.push({ key: 'languages', label: l, value: l });
    });

    if (filters.availability !== 'any') {
      result.push({
        key: 'availability',
        label: filters.availability === 'now' ? 'Disponible ahora' : 'Esta semana',
      });
    }

    // Role-based chips
    filters.marketplace_roles.forEach(roleId => {
      const role = MARKETPLACE_ROLES_MAP[roleId];
      result.push({ key: 'marketplace_roles', label: role?.label || roleId, value: roleId });
    });

    // Adaptive filter chips
    const lookupMap: Record<string, { list: typeof PLATFORMS; key: keyof MarketplaceFilters }> = {
      platforms: { list: PLATFORMS, key: 'platforms' },
      software: { list: SOFTWARE_TOOLS, key: 'software' },
      tech_stack: { list: TECH_STACKS, key: 'tech_stack' },
      education_format: { list: EDUCATION_FORMATS, key: 'education_format' },
    };

    for (const [, { list, key }] of Object.entries(lookupMap)) {
      const values = filters[key] as string[];
      if (values && values.length > 0) {
        values.forEach(v => {
          const opt = list.find(o => o.value === v);
          result.push({ key, label: opt?.label || v, value: v });
        });
      }
    }

    if (filters.accepts_exchange === true) {
      result.push({ key: 'accepts_exchange', label: 'Acepta intercambio' });
    }

    return result;
  }, [filters]);

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
      {chips.map((chip, i) => (
        <button
          key={`${chip.key}-${chip.value ?? i}`}
          onClick={() => onRemoveFilter(chip.key, chip.value)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm transition-colors',
            'bg-purple-500/20 border border-purple-500/30 text-purple-300',
            'hover:bg-purple-500/30 hover:border-purple-500/50',
          )}
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-purple-400 hover:text-white text-sm underline transition-colors"
      >
        Limpiar todo
      </button>
    </div>
  );
});
