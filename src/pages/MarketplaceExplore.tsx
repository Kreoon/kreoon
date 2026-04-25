import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MarketplaceSearchBar } from '@/components/marketplace/MarketplaceSearchBar';
import { CategoryBar } from '@/components/marketplace/CategoryBar';
import { ActiveFilters } from '@/components/marketplace/ActiveFilters';
import { CreatorGrid } from '@/components/marketplace/CreatorGrid';
import { CreatorCarousel } from '@/components/marketplace/CreatorCarousel';
import { FilterModal, OrganizationOption } from '@/components/marketplace/FilterModal';
import { useMarketplaceFilters } from '@/components/marketplace/hooks/useMarketplaceFilters';
import { useCreatorSearch } from '@/components/marketplace/hooks/useCreatorSearch';
import { useInfiniteCreators } from '@/components/marketplace/hooks/useInfiniteCreators';
import { useMarketplaceFilterOptions } from '@/hooks/useMarketplaceFilterOptions';
import type { MarketplaceFilters } from '@/components/marketplace/types/marketplace';
import { CONTENT_TYPES } from '@/components/marketplace/types/marketplace';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';
import { LocationAutocomplete, ContentTypeSelector } from '@/components/marketplace/filters';
import {
  SPECIALIZATIONS_BY_ROLE,
  getSpecializationLabel,
  getSpecializationColor,
  getSpecializationBgColor,
} from '@/lib/specializations';
import type { Specialization, SpecializationCategory } from '@/types/database';

// ─── Constantes para filtros avanzados ────────────────────────────────────────

const ROLE_FILTERS = [
  { value: 'content_creator', label: 'Creador de Contenido' },
  { value: 'editor', label: 'Editor/Produccion' },
  { value: 'digital_strategist', label: 'Estratega Digital' },
  { value: 'creative_strategist', label: 'Estratega Creativo' },
  { value: 'community_manager', label: 'Community Manager' },
];

const LANGUAGES = ['Espanol', 'Ingles', 'Portugues'];

function getSpecializationsForRole(role: string): Specialization[] {
  const roleMap: Record<string, SpecializationCategory> = {
    content_creator: 'content_creator',
    editor: 'editor',
    digital_strategist: 'digital_strategist',
    creative_strategist: 'creative_strategist',
    community_manager: 'creative_strategist',
  };
  const category = roleMap[role];
  return category ? SPECIALIZATIONS_BY_ROLE[category] || [] : [];
}

// ─── Sidebar de filtros (desktop lg+) ────────────────────────────────────────

interface FilterSidebarProps {
  filters: MarketplaceFilters;
  onApply: (f: MarketplaceFilters) => void;
  resultCount: number;
  organizations: OrganizationOption[];
  filterOptions: ReturnType<typeof useMarketplaceFilterOptions>['data'];
}

function FilterSidebar({ filters, onApply, resultCount, organizations, filterOptions }: FilterSidebarProps) {
  return (
    <aside className="hidden lg:block w-[280px] shrink-0" aria-label="Filtros de busqueda">
      <div className="sticky top-[73px] rounded-lg border border-border/10 bg-card/50 dark:bg-white/5 dark:border-white/10 overflow-hidden max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border/10 dark:border-white/10 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Filtros</span>
          {resultCount > 0 && (
            <span
              className="text-xs text-muted-foreground"
              aria-live="polite"
              aria-atomic="true"
            >
              {resultCount} resultados
            </span>
          )}
        </div>
        <FilterModalInline
          filters={filters}
          onApply={onApply}
          resultCount={resultCount}
          organizations={organizations}
          filterOptions={filterOptions}
        />
      </div>
    </aside>
  );
}

// ─── Versión inline del FilterModal (para sidebar) ───────────────────────────

interface FilterModalInlineProps {
  filters: MarketplaceFilters;
  onApply: (f: MarketplaceFilters) => void;
  resultCount: number;
  organizations?: OrganizationOption[];
  filterOptions?: ReturnType<typeof useMarketplaceFilterOptions>['data'];
}

function FilterModalInline({ filters, onApply, resultCount, organizations = [], filterOptions }: FilterModalInlineProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(
    filters.marketplace_roles.length > 0 ? filters.marketplace_roles[0] : null
  );

  const sortSelectId = 'filter-inline-sort';
  const priceMinId = 'filter-inline-price-min';
  const priceMaxId = 'filter-inline-price-max';
  const exchangeId = 'filter-inline-exchange';

  // Contar filtros avanzados activos
  const advancedFilterCount =
    filters.marketplace_roles.length +
    (filters.organization_id ? 1 : 0) +
    filters.specializations.length +
    filters.languages.length +
    filters.content_type.length;

  const toggleArrayItem = (key: 'marketplace_roles' | 'specializations' | 'languages' | 'content_type', item: string) => {
    const arr = filters[key] as string[];
    const next = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    onApply({ ...filters, [key]: next });
  };

  const handleRoleSelect = (roleValue: string) => {
    setSelectedRole(prev => prev === roleValue ? null : roleValue);
    toggleArrayItem('marketplace_roles', roleValue);
  };

  return (
    <div className="p-4 space-y-5">
      {/* Sort */}
      <div className="space-y-2">
        <label
          htmlFor={sortSelectId}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Ordenar por
        </label>
        <select
          id={sortSelectId}
          value={filters.sort_by}
          onChange={(e) =>
            onApply({ ...filters, sort_by: e.target.value as MarketplaceFilters['sort_by'] })
          }
          className={cn(
            'w-full rounded-md px-3 py-2 text-sm',
            'bg-secondary/50 dark:bg-white/5 border border-border/20 dark:border-white/10',
            'text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500',
          )}
        >
          <option value="relevance">Relevancia</option>
          <option value="rating">Mejor calificacion</option>
          <option value="price_low">Precio: menor a mayor</option>
          <option value="price_high">Precio: mayor a menor</option>
          <option value="newest">Mas recientes</option>
          <option value="most_projects">Mas proyectos</option>
        </select>
      </div>

      {/* Disponibilidad */}
      <fieldset className="space-y-2 border-0 p-0 m-0">
        <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Disponibilidad
        </legend>
        <div className="space-y-1 pt-1">
          {(
            [
              { value: 'any', label: 'Cualquiera' },
              { value: 'now', label: 'Disponible ahora' },
              { value: 'week', label: 'Esta semana' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onApply({ ...filters, availability: opt.value })}
              aria-pressed={filters.availability === opt.value}
              aria-label={`Disponibilidad: ${opt.label}`}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                filters.availability === opt.value
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Nivel */}
      <fieldset className="space-y-2 border-0 p-0 m-0">
        <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Nivel
        </legend>
        <div className="flex flex-wrap gap-2 pt-1">
          {(['bronze', 'silver', 'gold', 'elite'] as const).map((lvl) => {
            const active = filters.level.includes(lvl);
            const labels: Record<string, string> = {
              bronze: 'Bronce',
              silver: 'Plata',
              gold: 'Oro',
              elite: 'Elite',
            };
            return (
              <button
                key={lvl}
                onClick={() => {
                  const next = active
                    ? filters.level.filter((l) => l !== lvl)
                    : [...filters.level, lvl];
                  onApply({ ...filters, level: next });
                }}
                aria-pressed={active}
                aria-label={`Nivel ${labels[lvl]}`}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                  active
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                    : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {labels[lvl]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Precio */}
      <div className="space-y-2">
        <span
          id="price-group-label"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
        >
          Precio (USD)
        </span>
        <div
          className="flex gap-2"
          role="group"
          aria-labelledby="price-group-label"
        >
          <label htmlFor={priceMinId} className="sr-only">
            Precio minimo
          </label>
          <input
            id={priceMinId}
            type="number"
            placeholder="Min"
            value={filters.price_min ?? ''}
            onChange={(e) =>
              onApply({
                ...filters,
                price_min: e.target.value ? Number(e.target.value) : null,
              })
            }
            className={cn(
              'w-full rounded-md px-3 py-2 text-sm',
              'bg-secondary/50 dark:bg-white/5 border border-border/20 dark:border-white/10',
              'text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-purple-500',
            )}
          />
          <label htmlFor={priceMaxId} className="sr-only">
            Precio maximo
          </label>
          <input
            id={priceMaxId}
            type="number"
            placeholder="Max"
            value={filters.price_max ?? ''}
            onChange={(e) =>
              onApply({
                ...filters,
                price_max: e.target.value ? Number(e.target.value) : null,
              })
            }
            className={cn(
              'w-full rounded-md px-3 py-2 text-sm',
              'bg-secondary/50 dark:bg-white/5 border border-border/20 dark:border-white/10',
              'text-foreground placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-purple-500',
            )}
          />
        </div>
      </div>

      {/* Intercambio de producto — toggle accesible */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={exchangeId}
          className="text-sm text-foreground cursor-pointer select-none"
        >
          Acepta canje
        </label>
        <button
          id={exchangeId}
          role="switch"
          aria-checked={filters.accepts_exchange === true}
          onClick={() =>
            onApply({
              ...filters,
              accepts_exchange: filters.accepts_exchange === true ? null : true,
            })
          }
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-1',
            filters.accepts_exchange === true ? 'bg-purple-600' : 'bg-muted dark:bg-white/10',
          )}
          aria-label="Filtrar creadores que aceptan canje"
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              filters.accepts_exchange === true ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>

      {/* Calificacion minima */}
      <fieldset className="space-y-2 border-0 p-0 m-0">
        <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Calificacion minima
        </legend>
        <div className="flex gap-2 pt-1">
          {[null, 3, 4, 4.5].map((val) => (
            <button
              key={String(val)}
              onClick={() => onApply({ ...filters, rating_min: val })}
              aria-pressed={filters.rating_min === val}
              aria-label={val === null ? 'Cualquier calificacion' : `Calificacion minima ${val} estrellas`}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                filters.rating_min === val
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                  : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              {val === null ? 'Todas' : `${val}+`}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Botón filtros avanzados - toggle para expandir/colapsar */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className={cn(
          'w-full py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
          advancedFilterCount > 0
            ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
            : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filtros avanzados</span>
        {advancedFilterCount > 0 && (
          <span className="ml-1 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center">
            {advancedFilterCount}
          </span>
        )}
        {showAdvanced ? (
          <ChevronUp className="w-4 h-4 ml-auto" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto" />
        )}
      </button>

      {/* Sección expandible de filtros avanzados */}
      {showAdvanced && (
        <div className="space-y-5 pt-2 border-t border-border/10 dark:border-white/10">
          {/* Tipo de Talento */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tipo de Talento
            </legend>
            <div className="flex flex-wrap gap-2 pt-1">
              {ROLE_FILTERS.map((role) => (
                <button
                  key={role.value}
                  onClick={() => handleRoleSelect(role.value)}
                  aria-pressed={filters.marketplace_roles.includes(role.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                    filters.marketplace_roles.includes(role.value)
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                      : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Organizacion / Agencia */}
          {organizations.length > 0 && (
            <fieldset className="space-y-2 border-0 p-0 m-0">
              <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Agencia / Organizacion
              </legend>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onApply({ ...filters, organization_id: null })}
                  aria-pressed={filters.organization_id === null}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                    filters.organization_id === null
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                      : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  Todas
                </button>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => onApply({ ...filters, organization_id: org.id })}
                    aria-pressed={filters.organization_id === org.id}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border flex items-center gap-1.5',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                      filters.organization_id === org.id
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                        : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    {org.logo_url ? (
                      <img
                        src={getOptimizedImageUrl(org.logo_url, { width: 32, quality: 70 })}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-3.5 h-3.5" />
                    )}
                    {org.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Especializaciones (solo si hay un rol seleccionado) */}
          {selectedRole && getSpecializationsForRole(selectedRole).length > 0 && (
            <fieldset className="space-y-2 border-0 p-0 m-0">
              <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Especializacion
              </legend>
              <div className="flex flex-wrap gap-2 pt-1">
                {getSpecializationsForRole(selectedRole).map((spec) => (
                  <button
                    key={spec}
                    onClick={() => toggleArrayItem('specializations', spec)}
                    aria-pressed={filters.specializations.includes(spec)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs transition-colors border',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                      filters.specializations.includes(spec)
                        ? cn(getSpecializationBgColor(spec), 'border-primary/40', getSpecializationColor(spec))
                        : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    {getSpecializationLabel(spec)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Idiomas */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Idiomas
            </legend>
            <div className="flex flex-wrap gap-2 pt-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleArrayItem('languages', lang)}
                  aria-pressed={filters.languages.includes(lang)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                    filters.languages.includes(lang)
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                      : 'border-border/20 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Tipo de contenido - usando datos dinámicos */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tipo de contenido
            </legend>
            <ContentTypeSelector
              value={filters.content_type}
              onChange={(types) => onApply({ ...filters, content_type: types })}
              availableTypes={filterOptions?.content_types ?? CONTENT_TYPES as unknown as string[]}
              className="pt-1"
            />
          </fieldset>

          {/* Ubicación - autocompletado */}
          <fieldset className="space-y-2 border-0 p-0 m-0">
            <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Ubicacion
            </legend>
            <LocationAutocomplete
              value={{ country: filters.country, city: filters.city }}
              onChange={(loc) => onApply({ ...filters, country: loc.country, city: loc.city })}
              locations={filterOptions?.locations ?? []}
              placeholder="Buscar pais o ciudad..."
            />
          </fieldset>
        </div>
      )}

      {/* Contador de resultados al pie */}
      <div className="pt-2 border-t border-border/10 dark:border-white/10 text-center">
        <span
          className="text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {resultCount} creador{resultCount !== 1 ? 'es' : ''} encontrado{resultCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

// ─── Sheet de filtros para mobile ─────────────────────────────────────────────

interface MobileFilterSheetLocalProps {
  open: boolean;
  onClose: () => void;
  filters: MarketplaceFilters;
  onApply: (f: MarketplaceFilters) => void;
  resultCount: number;
  organizations: OrganizationOption[];
  filterOptions?: ReturnType<typeof useMarketplaceFilterOptions>['data'];
}

function MobileFilterSheetLocal({
  open,
  onClose,
  filters,
  onApply,
  resultCount,
  organizations,
  filterOptions,
}: MobileFilterSheetLocalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-50 transition-opacity lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-card dark:bg-[#0f0f14] border-t border-border/70 dark:border-white/10',
          'rounded-t-2xl transition-transform duration-300 lg:hidden',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros del marketplace"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 dark:border-white/10">
          <span className="text-base font-semibold text-foreground">Filtros</span>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-md text-muted-foreground',
              'hover:text-foreground hover:bg-muted/50 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
            )}
            aria-label="Cerrar filtros"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido (scrollable) */}
        <div className="overflow-y-auto max-h-[70vh]">
          <FilterModalInline filters={filters} onApply={onApply} resultCount={resultCount} organizations={organizations} filterOptions={filterOptions} />
        </div>
      </div>
    </>
  );
}

// ─── Hook: infinite scroll trigger ────────────────────────────────────────────

function useInfiniteScrollTrigger(onTrigger: () => void, enabled: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onTrigger();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onTrigger, enabled]);

  return sentinelRef;
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function MarketplaceExplore() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estado de filtros
  const { filters, setFilters, updateFilter, resetFilters, activeFilterCount, hasActiveFilters } =
    useMarketplaceFilters();

  // Búsqueda y paginación
  const { creators, featured, newTalent, topPerformers, organizations, isLoading, totalCount } = useCreatorSearch(filters);
  const { visibleCreators, hasMore, loadMore, reset } = useInfiniteCreators(creators);

  // Opciones dinámicas de filtros (países, content types desde BD)
  const { data: filterOptions } = useMarketplaceFilterOptions();

  // Mostrar carruseles solo cuando no hay búsqueda ni filtros activos
  const showCarousels = !filters.search && !filters.category && activeFilterCount === 0;

  // UI state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Resetear paginación al cambiar filtros
  useEffect(() => {
    reset();
  }, [filters, reset]);

  // Infinite scroll sentinel
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) loadMore();
  }, [hasMore, isLoading, loadMore]);

  const sentinelRef = useInfiniteScrollTrigger(handleLoadMore, hasMore && !isLoading);

  // Remover un filtro individual (compatible con ActiveFilters)
  const handleRemoveFilter = useCallback(
    (key: keyof MarketplaceFilters, value?: string) => {
      const current = filters[key];

      if (Array.isArray(current) && value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateFilter(key, (current as any[]).filter((v) => v !== value) as any);
      } else {
        // Scalars: restaurar valor por defecto
        const defaults: Partial<MarketplaceFilters> = {
          category: null,
          country: null,
          city: null,
          rating_min: null,
          price_min: null,
          price_max: null,
          availability: 'any',
          accepts_exchange: null,
        };
        if (key in defaults) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateFilter(key, (defaults as any)[key]);
        }
      }
    },
    [filters, updateFilter],
  );

  // Aplicar filtros desde sidebar / sheet
  const handleApplyFilters = useCallback(
    (next: MarketplaceFilters) => {
      setFilters(next);
    },
    [setFilters],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/10 dark:border-white/10">
        <div className="px-4 md:px-6 py-3 space-y-3">
          {/* Barra de búsqueda */}
          <MarketplaceSearchBar
            search={filters.search}
            country={filters.country}
            city={filters.city}
            contentTypes={filters.content_type}
            onSearchChange={(val) => updateFilter('search', val)}
            onLocationChange={(loc) => {
              setFilters((prev) => ({
                ...prev,
                country: loc.country,
                city: loc.city,
              }));
            }}
            onContentTypesChange={(val) => updateFilter('content_type', val)}
            onSubmit={() => {}}
            onAIFiltersChange={(ai) => {
              setFilters((prev) => ({
                ...prev,
                ...(ai.country !== undefined && { country: ai.country, city: null }),
                ...(ai.marketplace_roles !== undefined && {
                  marketplace_roles: ai.marketplace_roles as MarketplaceFilters['marketplace_roles'],
                }),
                ...(ai.category !== undefined && { category: ai.category }),
                ...(ai.price_max !== undefined && { price_max: ai.price_max }),
                ...(ai.accepts_exchange !== undefined && {
                  accepts_exchange: ai.accepts_exchange,
                }),
              }));
            }}
          />

          {/* Category bar — contiene el botón de filtros avanzados */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <CategoryBar
                activeCategory={filters.category}
                onCategoryChange={(cat) =>
                  updateFilter('category', cat === filters.category ? null : cat)
                }
                onOpenFilters={() => setFilterModalOpen(true)}
                activeFilterCount={activeFilterCount}
              />
            </div>

            {/* Botón "Más filtros" visible solo en mobile */}
            <button
              onClick={() => setMobileSheetOpen(true)}
              className={cn(
                'lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                activeFilterCount > 0
                  ? 'border-purple-500/50 bg-purple-600/20 text-purple-300'
                  : 'border-border/20 dark:border-white/10 bg-muted/30 dark:bg-white/5 text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
              aria-label={
                activeFilterCount > 0
                  ? `Abrir filtros avanzados — ${activeFilterCount} activos`
                  : 'Abrir filtros avanzados'
              }
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white"
                  aria-hidden="true"
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Chips de filtros activos */}
          {hasActiveFilters && (
            <ActiveFilters
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={resetFilters}
            />
          )}
        </div>
      </header>

      {/* ── Cuerpo principal: sidebar + grid ──────────────────────────────── */}
      <div className="flex gap-6 px-4 md:px-6 py-6">
        {/* Sidebar (lg+) - Solo para usuarios autenticados */}
        {user && (
          <FilterSidebar
            filters={filters}
            onApply={handleApplyFilters}
            resultCount={totalCount}
            organizations={organizations}
            filterOptions={filterOptions}
          />
        )}

        {/* Área principal */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Carruseles curados (solo cuando no hay búsqueda ni filtros) */}
          {showCarousels && (
            <>
              {/* Top Performers: los que más proyectos han entregado */}
              {topPerformers.length > 0 && (
                <CreatorCarousel
                  title="Top Performers"
                  emoji="🔥"
                  subtitle="Los creadores con más proyectos entregados y mejor rendimiento"
                  creators={topPerformers.slice(0, 8)}
                  onCreatorClick={(slugOrId) => navigate(`/marketplace/creator/${slugOrId}`)}
                  priority
                />
              )}

              {/* Destacados: creadores con proyectos pagados y buena calificación */}
              {featured.length > 0 && (
                <CreatorCarousel
                  title="Talento Destacado"
                  emoji="🏆"
                  subtitle="Creadores verificados con proyectos aprobados"
                  creators={featured.slice(0, 8)}
                  onCreatorClick={(slugOrId) => navigate(`/marketplace/creator/${slugOrId}`)}
                />
              )}

              {/* Nuevos talentos */}
              {newTalent.length > 0 && (
                <CreatorCarousel
                  title="Nuevos Talentos"
                  emoji="✨"
                  subtitle="Recién llegados con propuestas frescas"
                  creators={newTalent.slice(0, 8)}
                  onCreatorClick={(slugOrId) => navigate(`/marketplace/creator/${slugOrId}`)}
                />
              )}
            </>
          )}

          {/* Grid de creators */}
          <CreatorGrid
            creators={visibleCreators}
            isLoading={isLoading}
            hasMore={hasMore}
            totalCount={totalCount}
            onCreatorClick={(slugOrId) => navigate(`/marketplace/creator/${slugOrId}`)}
            onLoadMore={loadMore}
            searchQuery={filters.search || undefined}
            priority
          />

          {/* Sentinel para infinite scroll */}
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />
        </main>
      </div>

      {/* ── FilterModal (desktop, reutilizado) ────────────────────────────── */}
      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={filters}
        onApply={(next) => {
          handleApplyFilters(next);
          setFilterModalOpen(false);
        }}
        resultCount={totalCount}
        activeRoleCategory={filters.role_category}
        organizations={organizations}
      />

      {/* ── Sheet de filtros (mobile) ──────────────────────────────────────── */}
      <MobileFilterSheetLocal
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        filters={filters}
        onApply={(next) => {
          handleApplyFilters(next);
          setMobileSheetOpen(false);
        }}
        resultCount={totalCount}
        organizations={organizations}
        filterOptions={filterOptions}
      />
    </div>
  );
}
