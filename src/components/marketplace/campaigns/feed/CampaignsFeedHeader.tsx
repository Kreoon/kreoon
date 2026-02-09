import { Search, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignType } from '../../types/marketplace';

interface CampaignsFeedHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeTypeFilter: CampaignType | null;
  onTypeFilterChange: (type: CampaignType | null) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const TYPE_CHIPS: { value: CampaignType | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'paid', label: 'Pagadas' },
  { value: 'exchange', label: 'Canje' },
  { value: 'hybrid', label: 'Hibridas' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mas recientes' },
  { value: 'budget_high', label: 'Mayor presupuesto' },
  { value: 'budget_low', label: 'Menor presupuesto' },
  { value: 'deadline', label: 'Fecha limite' },
  { value: 'applications', label: 'Mas aplicaciones' },
];

export function CampaignsFeedHeader({
  search,
  onSearchChange,
  activeTypeFilter,
  onTypeFilterChange,
  sortBy,
  onSortChange,
}: CampaignsFeedHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Campanas Abiertas</h1>
          <p className="text-gray-500 text-sm">Encuentra campanas de marcas y aplica como creador</p>
        </div>
      </div>

      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar campanas..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_CHIPS.map(chip => (
          <button
            key={chip.label}
            onClick={() => onTypeFilterChange(chip.value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              activeTypeFilter === chip.value
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
