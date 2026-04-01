import { useRef, useCallback } from 'react';
import {
  LayoutGrid,
  Video,
  Dumbbell,
  Shirt,
  Laptop,
  Sparkles,
  UtensilsCrossed,
  Home,
  GraduationCap,
  Gamepad2,
  PawPrint,
  Baby,
  Heart,
  Music,
  Plane,
  TrendingUp,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketplaceFilters } from '../types/marketplace';

// --- Categorias con iconos (subset de las mas usadas) ---

interface QuickFilterChip {
  id: string;
  label: string;
  Icon: LucideIcon;
}

const QUICK_CHIPS: QuickFilterChip[] = [
  { id: 'all',       label: 'Todos',      Icon: LayoutGrid },
  { id: 'ugc',       label: 'UGC',        Icon: Video },
  { id: 'fitness',   label: 'Fitness',    Icon: Dumbbell },
  { id: 'moda',      label: 'Moda',       Icon: Shirt },
  { id: 'tech',      label: 'Tech',       Icon: Laptop },
  { id: 'belleza',   label: 'Belleza',    Icon: Sparkles },
  { id: 'food',      label: 'Food',       Icon: UtensilsCrossed },
  { id: 'hogar',     label: 'Hogar',      Icon: Home },
  { id: 'educacion', label: 'Educacion',  Icon: GraduationCap },
  { id: 'gaming',    label: 'Gaming',     Icon: Gamepad2 },
  { id: 'mascotas',  label: 'Mascotas',   Icon: PawPrint },
  { id: 'bebes',     label: 'Bebes',      Icon: Baby },
  { id: 'salud',     label: 'Salud',      Icon: Heart },
  { id: 'musica',    label: 'Musica',     Icon: Music },
  { id: 'viajes',    label: 'Viajes',     Icon: Plane },
  { id: 'finanzas',  label: 'Finanzas',   Icon: TrendingUp },
];

interface FilterChipsProps {
  filters: MarketplaceFilters;
  onChange: (filters: MarketplaceFilters) => void;
  onOpenFilters: () => void;
}

export function FilterChips({ filters, onChange, onOpenFilters }: FilterChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCategoryClick = useCallback(
    (chipId: string) => {
      const next = chipId === 'all' ? null : chipId;
      onChange({ ...filters, category: next });
    },
    [filters, onChange],
  );

  // Contar filtros activos (excluyendo category que lo manejan los chips)
  const activeFilterCount = [
    filters.content_type.length > 0,
    filters.price_min !== null,
    filters.price_max !== null,
    filters.rating_min !== null,
    filters.level.length > 0,
    filters.languages.length > 0,
    filters.availability !== 'any',
    filters.platforms.length > 0,
    filters.software.length > 0,
    filters.accepts_exchange !== null,
    filters.marketplace_roles.length > 0,
    filters.specializations.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="relative w-full">
      {/* Contenedor scroll horizontal — sin scrollbar visible en mobile */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="toolbar"
        aria-label="Filtros rapidos de categoria"
      >
        {QUICK_CHIPS.map(({ id, label, Icon }) => {
          const isActive =
            (id === 'all' && filters.category === null) ||
            filters.category === id;

          return (
            <button
              key={id}
              onClick={() => handleCategoryClick(id)}
              aria-pressed={isActive}
              aria-label={`Filtrar por ${label}`}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                'border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                isActive
                  ? 'bg-purple-500 border-purple-500 text-white'
                  // dark: bg oscuro nova / light: bg neutro con borde sutil
                  : 'bg-background dark:bg-[#0f0f22] border-border dark:border-purple-500/20 text-muted-foreground hover:border-purple-500/50 hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          );
        })}

        {/* Divisor visual */}
        <div className="flex-shrink-0 w-px h-6 bg-border/50 mx-1" aria-hidden="true" />

        {/* Chip "Mas filtros" — visible en todas las vistas, trigger para sheet/sidebar */}
        <button
          onClick={onOpenFilters}
          aria-label={
            activeFilterCount > 0
              ? `Mas filtros — ${activeFilterCount} activo${activeFilterCount !== 1 ? 's' : ''}`
              : 'Mas filtros'
          }
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
            'border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
            activeFilterCount > 0
              ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
              : 'bg-background dark:bg-[#0f0f22] border-border dark:border-purple-500/20 text-muted-foreground hover:border-purple-500/50 hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">Mas filtros</span>
          {activeFilterCount > 0 && (
            <span
              className="flex items-center justify-center w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-semibold leading-none"
              aria-hidden="true"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
