import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { MarketplaceFilters } from '../types/marketplace';
import { CONTENT_TYPES } from '../types/marketplace';
import type { Specialization, SpecializationCategory } from '@/types/database';
import {
  SPECIALIZATIONS_BY_ROLE,
  getSpecializationLabel,
  getSpecializationColor,
  getSpecializationBgColor,
} from '@/lib/specializations';

// --- Opciones de filtro (mismas que FilterModal) ---

const ROLE_FILTERS = [
  { value: 'content_creator',    label: 'Creador de Contenido' },
  { value: 'editor',             label: 'Editor/Produccion' },
  { value: 'digital_strategist', label: 'Estratega Digital' },
  { value: 'creative_strategist',label: 'Estratega Creativo' },
  { value: 'community_manager',  label: 'Community Manager' },
];

const LEVELS = [
  { id: 'bronze', label: 'Bronce' },
  { id: 'silver', label: 'Plata' },
  { id: 'gold',   label: 'Oro' },
  { id: 'elite',  label: 'Elite' },
];

const LANGUAGES = ['Espanol', 'Ingles', 'Portugues'];

const RATING_OPTIONS = [
  { value: null,  label: 'Cualquiera' },
  { value: 4.0,   label: '4.0+' },
  { value: 4.5,   label: '4.5+' },
  { value: 4.8,   label: '4.8+' },
];

const AVAILABILITY_OPTIONS = [
  { id: 'any'  as const, label: 'Cualquier momento' },
  { id: 'now'  as const, label: 'Disponible ahora' },
  { id: 'week' as const, label: 'Esta semana' },
];

function getSpecializationsForRole(role: string): Specialization[] {
  const roleMap: Record<string, SpecializationCategory> = {
    content_creator:    'content_creator',
    editor:             'editor',
    digital_strategist: 'digital_strategist',
    creative_strategist:'creative_strategist',
    community_manager:  'creative_strategist',
  };
  const category = roleMap[role];
  return category ? (SPECIALIZATIONS_BY_ROLE[category] ?? []) : [];
}

// --- Tipos ---

interface MobileFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: MarketplaceFilters;
  onApply: (filters: MarketplaceFilters) => void;
  resultCount?: number;
}

// --- Sub-componente: sección colapsable ---

interface CollapsibleSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, expanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-border/70 py-5">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full mb-3"
        aria-expanded={expanded}
        aria-label={expanded ? `Colapsar ${title}` : `Expandir ${title}`}
      >
        <h4 className="text-sm font-semibold text-purple-400 dark:text-purple-400">{title}</h4>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        }
      </button>
      {expanded && children}
    </div>
  );
}

// --- Chip reutilizable ---

interface FilterChipButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  colorOverride?: string;
}

function FilterChipButton({ active, onClick, label, colorOverride }: FilterChipButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
        active
          ? colorOverride ?? 'bg-purple-500/20 border-purple-500/40 text-purple-300 dark:text-purple-300'
          : 'bg-background dark:bg-[#0f0f22] border-border dark:border-zinc-700/50 text-muted-foreground hover:border-border/80 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// --- Componente principal ---

export function MobileFilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  resultCount,
}: MobileFilterSheetProps) {
  const [local, setLocal] = useState<MarketplaceFilters>(filters);
  // Inicializar selectedRole con el primer rol activo si hay roles preseleccionados
  const [selectedRole, setSelectedRole] = useState<string | null>(
    filters.marketplace_roles?.[0] ?? null
  );

  // Secciones colapsables
  const [expandedRoles,   setExpandedRoles]   = useState(true);
  const [expandedSpecs,   setExpandedSpecs]   = useState(true);
  const [expandedContent, setExpandedContent] = useState(true);
  const [expandedPrice,   setExpandedPrice]   = useState(false);
  const [expandedRating,  setExpandedRating]  = useState(false);
  const [expandedLevel,   setExpandedLevel]   = useState(false);
  const [expandedLang,    setExpandedLang]    = useState(false);
  const [expandedAvail,   setExpandedAvail]   = useState(false);

  // Sincronizar estado local cuando se abre el sheet con filtros externos actualizados
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setLocal(filters);
        // Sincronizar selectedRole con el primer rol activo de los filtros externos
        setSelectedRole(filters.marketplace_roles?.[0] ?? null);
      }
      onOpenChange(nextOpen);
    },
    [filters, onOpenChange],
  );

  const update = useCallback(
    <K extends keyof MarketplaceFilters>(key: K, value: MarketplaceFilters[K]) => {
      setLocal(prev => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleArrayItem = useCallback(
    (
      key: 'content_type' | 'level' | 'languages' | 'platforms' | 'software' | 'marketplace_roles' | 'specializations',
      item: string,
    ) => {
      setLocal(prev => {
        const arr = prev[key] as string[];
        return {
          ...prev,
          [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
        };
      });
    },
    [],
  );

  const handleRoleSelect = useCallback(
    (roleValue: string) => {
      setSelectedRole(prev => (prev === roleValue ? null : roleValue));
      toggleArrayItem('marketplace_roles', roleValue);
    },
    [toggleArrayItem],
  );

  const handleClear = useCallback(() => {
    setLocal(prev => ({
      ...prev,
      price_min:         null,
      price_max:         null,
      rating_min:        null,
      level:             [],
      languages:         [],
      content_type:      [],
      availability:      'any',
      platforms:         [],
      software:          [],
      accepts_exchange:  null,
      marketplace_roles: [],
      specializations:   [],
    }));
    setSelectedRole(null);
  }, []);

  const handleApply = useCallback(() => {
    onApply(local);
    onOpenChange(false);
  }, [local, onApply, onOpenChange]);

  const roleSpecs = selectedRole ? getSpecializationsForRole(selectedRole) : [];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'flex flex-col',
          'rounded-t-2xl border-t border-border/70',
          // Variables CSS para dark/light mode
          'bg-card dark:bg-[#0f0f14] p-0',
          'max-h-[90dvh]',
          // Solo visible en mobile — en lg+ el sidebar maneja los filtros
          'lg:hidden',
        )}
        aria-describedby={undefined}
      >
        {/* Handle de arrastre */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <SheetHeader className="px-5 pb-3 flex-shrink-0 border-b border-border/70">
          <SheetTitle className="text-base font-semibold text-foreground text-center">
            Filtros
          </SheetTitle>
        </SheetHeader>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5">

          {/* Tipo de talento */}
          <CollapsibleSection
            title="Tipo de Talento"
            expanded={expandedRoles}
            onToggle={() => setExpandedRoles(v => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {ROLE_FILTERS.map(role => (
                <FilterChipButton
                  key={role.value}
                  active={(local.marketplace_roles as string[]).includes(role.value)}
                  onClick={() => handleRoleSelect(role.value)}
                  label={role.label}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Especializacion (condicionado a rol seleccionado) */}
          {selectedRole && roleSpecs.length > 0 && (
            <CollapsibleSection
              title="Especializacion"
              expanded={expandedSpecs}
              onToggle={() => setExpandedSpecs(v => !v)}
            >
              <div className="flex flex-wrap gap-2">
                {roleSpecs.map(spec => {
                  const active = local.specializations.includes(spec);
                  return (
                    <button
                      key={spec}
                      onClick={() => toggleArrayItem('specializations', spec)}
                      aria-pressed={active}
                      aria-label={getSpecializationLabel(spec)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
                        active
                          ? cn(
                              getSpecializationBgColor(spec),
                              'border-purple-500/40',
                              getSpecializationColor(spec),
                            )
                          : 'bg-background dark:bg-[#0f0f22] border-border dark:border-zinc-700/50 text-muted-foreground hover:border-border/80 hover:text-foreground',
                      )}
                    >
                      {getSpecializationLabel(spec)}
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Tipo de contenido */}
          <CollapsibleSection
            title="Tipo de Contenido"
            expanded={expandedContent}
            onToggle={() => setExpandedContent(v => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(ct => (
                <FilterChipButton
                  key={ct}
                  active={local.content_type.includes(ct)}
                  onClick={() => toggleArrayItem('content_type', ct)}
                  label={ct}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Rango de precio */}
          <CollapsibleSection
            title="Rango de Precio"
            expanded={expandedPrice}
            onToggle={() => setExpandedPrice(v => !v)}
          >
            <div className="flex items-center gap-3">
              <input
                type="number"
                placeholder="Minimo"
                aria-label="Precio minimo"
                value={local.price_min ?? ''}
                onChange={e => update('price_min', e.target.value ? Number(e.target.value) : null)}
                className={cn(
                  'flex-1 h-10 rounded-lg px-3 text-sm',
                  'bg-secondary/60 border border-border/70',
                  'text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30',
                )}
              />
              <span className="text-muted-foreground text-sm" aria-hidden="true">-</span>
              <input
                type="number"
                placeholder="Maximo"
                aria-label="Precio maximo"
                value={local.price_max ?? ''}
                onChange={e => update('price_max', e.target.value ? Number(e.target.value) : null)}
                className={cn(
                  'flex-1 h-10 rounded-lg px-3 text-sm',
                  'bg-secondary/60 border border-border/70',
                  'text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30',
                )}
              />
            </div>
          </CollapsibleSection>

          {/* Calificacion minima */}
          <CollapsibleSection
            title="Calificacion Minima"
            expanded={expandedRating}
            onToggle={() => setExpandedRating(v => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map(opt => (
                <FilterChipButton
                  key={opt.label}
                  active={local.rating_min === opt.value}
                  onClick={() => update('rating_min', opt.value)}
                  label={opt.value ? `${opt.label}` : opt.label}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Nivel del creador */}
          <CollapsibleSection
            title="Nivel del Creador"
            expanded={expandedLevel}
            onToggle={() => setExpandedLevel(v => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(l => (
                <FilterChipButton
                  key={l.id}
                  active={local.level.includes(l.id)}
                  onClick={() => toggleArrayItem('level', l.id)}
                  label={l.label}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Idiomas */}
          <CollapsibleSection
            title="Idiomas"
            expanded={expandedLang}
            onToggle={() => setExpandedLang(v => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(l => (
                <FilterChipButton
                  key={l}
                  active={local.languages.includes(l)}
                  onClick={() => toggleArrayItem('languages', l)}
                  label={l}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Disponibilidad */}
          <CollapsibleSection
            title="Disponibilidad"
            expanded={expandedAvail}
            onToggle={() => setExpandedAvail(v => !v)}
          >
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(opt => (
                <FilterChipButton
                  key={opt.id}
                  active={local.availability === opt.id}
                  onClick={() => update('availability', opt.id)}
                  label={opt.label}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Espacio inferior para que el footer no tape el ultimo item */}
          <div className="h-4" aria-hidden="true" />
        </div>

        {/* Footer con acciones — sticky en la parte inferior */}
        <div
          className={cn(
            'flex-shrink-0 flex items-center justify-between gap-3',
            'px-5 py-4 border-t border-border/70',
            'bg-card dark:bg-[#0f0f14]',
          )}
        >
          <button
            onClick={handleClear}
            className={cn(
              'flex-1 h-11 rounded-lg text-sm font-medium',
              'bg-secondary hover:bg-secondary/80 text-foreground',
              'border border-border/70',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
            )}
            aria-label="Limpiar todos los filtros"
          >
            Limpiar
          </button>
          <button
            onClick={handleApply}
            className={cn(
              'flex-1 h-11 rounded-lg text-sm font-medium text-white',
              'bg-purple-600 hover:bg-purple-500',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50',
            )}
            aria-label={
              resultCount !== undefined
                ? `Aplicar filtros — mostrar ${resultCount} resultados`
                : 'Aplicar filtros'
            }
          >
            {resultCount !== undefined
              ? `Mostrar ${resultCount} resultados`
              : 'Aplicar filtros'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
