import { useCallback, useState } from 'react';
import {
  Instagram,
  Youtube,
  ChevronDown,
  MapPin,
  Tag,
  Star,
  DollarSign,
  Tv2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  FILTER_CONFIG,
  DEFAULT_FILTERS,
  type MarketplaceFilters,
} from '@/lib/marketplace/filterConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

interface FilterSidebarProps {
  filters: MarketplaceFilters;
  onChange: (filters: MarketplaceFilters) => void;
  resultCount?: number;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes locales
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_OPTIONS = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'text-pink-400',
    activeBg: 'bg-pink-500/10 border-pink-500/40',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: Tv2,
    color: 'text-sky-400',
    activeBg: 'bg-sky-500/10 border-sky-500/40',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    color: 'text-red-400',
    activeBg: 'bg-red-500/10 border-red-500/40',
  },
] as const;

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Sección colapsable
// ─────────────────────────────────────────────────────────────────────────────

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterSection({ title, icon, defaultOpen = true, children }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="py-5 border-b border-border/60 last:border-b-0">
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center justify-between w-full group"
            aria-expanded={open}
            aria-label={open ? `Colapsar ${title}` : `Expandir ${title}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{icon}</span>
              <span className="text-sm font-semibold text-foreground">{title}</span>
            </div>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
          <div className="pt-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export function FilterSidebar({
  filters,
  onChange,
  resultCount,
  className,
}: FilterSidebarProps) {

  // ── Helpers de actualización ──────────────────────────────────────────────

  const update = useCallback(
    <K extends keyof MarketplaceFilters>(key: K, value: MarketplaceFilters[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const toggleArrayItem = useCallback(
    (key: 'categories' | 'platforms', item: string) => {
      const current = filters[key] as string[];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      onChange({ ...filters, [key]: updated });
    },
    [filters, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(DEFAULT_FILTERS);
  }, [onChange]);

  // ── Conteo de filtros activos (para feedback visual) ──────────────────────

  const activeCount =
    filters.categories.length +
    filters.platforms.length +
    (filters.experience !== null ? 1 : 0) +
    (filters.location !== null ? 1 : 0) +
    (filters.priceMin > FILTER_CONFIG.priceRange.min ||
    filters.priceMax < FILTER_CONFIG.priceRange.max
      ? 1
      : 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside
      className={cn(
        'flex flex-col w-72 shrink-0',
        'bg-card/80 border border-border/60 rounded-xl backdrop-blur-sm',
        'overflow-hidden',
        className,
      )}
      aria-label="Filtros de busqueda"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Filtros</span>
          {activeCount > 0 && (
            <span
              className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
              aria-label={`${activeCount} filtros activos`}
            >
              {activeCount}
            </span>
          )}
        </div>
        {resultCount !== undefined && (
          <span className="text-xs text-muted-foreground" aria-live="polite" aria-atomic="true">
            {resultCount.toLocaleString('es-CO')} resultados
          </span>
        )}
      </div>

      {/* Secciones de filtros (scrolleable) */}
      <div className="flex-1 overflow-y-auto px-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">

        {/* 1. Categorías */}
        <FilterSection
          title="Categorias"
          icon={<Tag className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="space-y-2.5">
            {FILTER_CONFIG.categories.map((cat) => {
              const Icon = cat.icon;
              const checked = filters.categories.includes(cat.id);
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`cat-${cat.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleArrayItem('categories', cat.id)}
                    className="border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor={`cat-${cat.id}`}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer text-sm transition-colors',
                      checked ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn('h-3.5 w-3.5', checked ? 'text-primary' : 'text-muted-foreground')}
                    />
                    {cat.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </FilterSection>

        {/* 2. Experiencia */}
        <FilterSection
          title="Experiencia"
          icon={<Star className="h-4 w-4" />}
          defaultOpen={true}
        >
          <RadioGroup
            value={filters.experience ?? ''}
            onValueChange={(val) =>
              update(
                'experience',
                val === '' ? null : (val as MarketplaceFilters['experience']),
              )
            }
            className="space-y-2.5"
          >
            {/* Opción: sin filtro */}
            <div className="flex items-center gap-3">
              <RadioGroupItem
                id="exp-any"
                value=""
                className="border-border/60 text-primary"
              />
              <Label
                htmlFor="exp-any"
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cualquier nivel
              </Label>
            </div>

            {FILTER_CONFIG.experience.map((level) => (
              <div key={level.id} className="flex items-center gap-3">
                <RadioGroupItem
                  id={`exp-${level.id}`}
                  value={level.id}
                  className="border-border/60 text-primary"
                />
                <Label
                  htmlFor={`exp-${level.id}`}
                  className={cn(
                    'cursor-pointer text-sm transition-colors',
                    filters.experience === level.id
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {level.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </FilterSection>

        {/* 3. Rango de precio */}
        <FilterSection
          title="Rango de precio"
          icon={<DollarSign className="h-4 w-4" />}
          defaultOpen={false}
        >
          <div className="space-y-4">
            {/* Slider dual */}
            <Slider
              min={FILTER_CONFIG.priceRange.min}
              max={FILTER_CONFIG.priceRange.max}
              step={FILTER_CONFIG.priceRange.step}
              value={[filters.priceMin, filters.priceMax]}
              onValueChange={([min, max]) => {
                onChange({ ...filters, priceMin: min, priceMax: max });
              }}
              minStepsBetweenThumbs={1}
              className="mt-2"
              aria-label="Rango de precio"
            />

            {/* Labels de precio */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 bg-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Minimo</p>
                <p className="text-xs font-semibold text-foreground">
                  {formatCOP(filters.priceMin)}
                </p>
              </div>
              <span className="text-muted-foreground text-xs" aria-hidden="true">—</span>
              <div className="flex-1 bg-secondary/60 border border-border/60 rounded-lg px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">Maximo</p>
                <p className="text-xs font-semibold text-foreground">
                  {formatCOP(filters.priceMax)}
                </p>
              </div>
            </div>

            {/* Inputs manuales */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Precio minimo"
                value={filters.priceMin}
                min={FILTER_CONFIG.priceRange.min}
                max={filters.priceMax - FILTER_CONFIG.priceRange.step}
                step={FILTER_CONFIG.priceRange.step}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val < filters.priceMax) update('priceMin', val);
                }}
                className="flex-1 bg-secondary/60 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                placeholder="Min."
              />
              <input
                type="number"
                aria-label="Precio maximo"
                value={filters.priceMax}
                min={filters.priceMin + FILTER_CONFIG.priceRange.step}
                max={FILTER_CONFIG.priceRange.max}
                step={FILTER_CONFIG.priceRange.step}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > filters.priceMin) update('priceMax', val);
                }}
                className="flex-1 bg-secondary/60 border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                placeholder="Max."
              />
            </div>
          </div>
        </FilterSection>

        {/* 4. Plataformas */}
        <FilterSection
          title="Plataformas"
          icon={<Instagram className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="space-y-2">
            {PLATFORM_OPTIONS.map((platform) => {
              const Icon = platform.icon;
              const checked = filters.platforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => toggleArrayItem('platforms', platform.id)}
                  aria-pressed={checked}
                  aria-label={`${checked ? 'Quitar filtro' : 'Filtrar por'} ${platform.label}`}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                    checked
                      ? platform.activeBg
                      : 'border-border/60 hover:border-border hover:bg-secondary/50',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleArrayItem('platforms', platform.id)}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="border-border/60 pointer-events-none"
                  />
                  <Icon
                    aria-hidden="true"
                    className={cn('h-4 w-4', checked ? platform.color : 'text-muted-foreground')}
                  />
                  <span className={checked ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {platform.label}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* 5. Ubicacion */}
        <FilterSection
          title="Ubicacion"
          icon={<MapPin className="h-4 w-4" />}
          defaultOpen={false}
        >
          <Select
            value={filters.location ?? ''}
            onValueChange={(val) => update('location', val === '' ? null : val)}
          >
            <SelectTrigger
              className="bg-secondary/60 border-border/60 text-sm focus:ring-primary/50"
              aria-label="Seleccionar pais"
            >
              <SelectValue placeholder="Todos los paises" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border/80">
              <SelectItem value="">Todos los paises</SelectItem>
              {FILTER_CONFIG.locations.map((loc) => (
                <SelectItem key={loc.code} value={loc.code}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{loc.flag}</span>
                    <span>{loc.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
      </div>

      {/* Footer sticky: limpiar filtros */}
      <div className="shrink-0 px-5 py-4 border-t border-border/60 bg-card/90 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={activeCount === 0}
          aria-disabled={activeCount === 0}
          className={cn(
            'w-full gap-2 text-sm transition-colors',
            activeCount > 0
              ? 'text-primary hover:text-primary/80 hover:bg-primary/10'
              : 'text-muted-foreground cursor-not-allowed opacity-50',
          )}
          aria-label={
            activeCount > 0
              ? `Limpiar todos los filtros (${activeCount} activos)`
              : 'Limpiar filtros'
          }
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {activeCount > 0 ? `Limpiar filtros (${activeCount})` : 'Limpiar filtros'}
        </Button>
      </div>
    </aside>
  );
}
