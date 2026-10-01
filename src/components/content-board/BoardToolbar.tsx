import { useId, useState, type ReactNode } from "react";
import { Filter, RotateCcw, Rows3, Rows4, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BoardViewSwitcher, type BoardView } from "@/components/board/BoardViewSwitcher";
import type { KanbanDensity } from "./kanban/kanbanTypes";

interface BoardToolbarProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  /** Texto de alcance de la búsqueda («Busca sobre las 500 cargadas…»). */
  searchHint: string;
  /** Filtros avanzados (solo admin). */
  filters?: ReactNode;
  activeFilterCount: number;
  onResetFilters: () => void;
  view: BoardView;
  onViewChange: (v: BoardView) => void;
  density: KanbanDensity;
  onDensityChange: (d: KanbanDensity) => void;
  /** Interruptor «Ocultar archivados» (admin). */
  hideArchived?: { checked: boolean; onChange: (v: boolean) => void };
  /** Acciones secundarias (vistas guardadas, configurar, analizar con IA, campos…). */
  actions?: ReactNode;
  /** Línea de estado: conteos, alcance, carga, guardado. */
  statusLine?: ReactNode;
}

/**
 * Una sola barra de herramientas: búsqueda única (antes duplicada escritorio/móvil), filtros,
 * densidad Cómoda/Compacta (preferencia visual por usuario, no cambia datos ni permisos) y vistas.
 * Los filtros avanzados se pliegan tras un botón «Filtros» (con contador de activos).
 */
export function BoardToolbar({
  searchTerm,
  onSearchChange,
  searchHint,
  filters,
  activeFilterCount,
  onResetFilters,
  view,
  onViewChange,
  density,
  onDensityChange,
  hideArchived,
  actions,
  statusLine,
}: BoardToolbarProps) {
  const searchId = useId();
  const hintId = useId();
  // Los filtros avanzados se pliegan por defecto (más tablero visible); se abren solos si ya hay alguno activo.
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);

  return (
    <section
      aria-label="Búsqueda, filtros y vistas"
      className="space-y-3 rounded-[var(--radius-card,1.25rem)] border border-border/50 bg-card p-3 shadow-[var(--shadow-soft,0_1px_2px_rgb(0_0_0/0.06))] md:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-44 sm:basis-64 md:max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Buscar producción
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            inputMode="search"
            autoComplete="off"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título, descripción o cliente…"
            aria-describedby={hintId}
            className="h-10 w-full rounded-[var(--radius-control,0.75rem)] border border-border/60 bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Borrar búsqueda"
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {filters && (
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="board-filters-panel"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control,0.75rem)] border border-border/60 bg-background px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {view === "kanban" && (
            <div role="group" aria-label="Densidad de las tarjetas" className="inline-flex items-center gap-0.5 rounded-[var(--radius-control,0.75rem)] bg-muted p-1">
              {(
                [
                  { value: "comfortable", label: "Cómoda", Icon: Rows3 },
                  { value: "compact", label: "Compacta", Icon: Rows4 },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={density === value}
                  onClick={() => onDensityChange(value)}
                  title={`Densidad ${label.toLowerCase()}`}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-1.5 rounded-[calc(var(--radius-control,0.75rem)-4px)] px-2.5 text-xs font-semibold transition-colors [@media(pointer:coarse)]:min-h-10",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    density === value
                      ? "bg-card text-foreground shadow-[var(--shadow-soft,0_1px_2px_rgb(0_0_0/0.08))]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden 2xl:inline">{label}</span>
                  <span className="sr-only 2xl:hidden">{label}</span>
                </button>
              ))}
            </div>
          )}
          <BoardViewSwitcher currentView={view} onViewChange={onViewChange} />
          {actions}
        </div>
      </div>

      {filters && (
        <div id="board-filters-panel" hidden={!filtersOpen}>
          {filters}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <p id={hintId} aria-live="polite" className="min-w-0">
          {searchHint}
        </p>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 font-semibold text-accent-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Quitar filtros ({activeFilterCount})
          </button>
        )}
        {hideArchived && (
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-foreground">
            <Switch checked={hideArchived.checked} onCheckedChange={hideArchived.onChange} aria-label="Ocultar archivados" />
            Ocultar archivados
          </label>
        )}
        {statusLine && <div className="ml-auto flex items-center gap-3 text-xs">{statusLine}</div>}
      </div>
    </section>
  );
}
