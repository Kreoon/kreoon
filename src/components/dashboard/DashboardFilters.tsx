import { Filter, X } from "lucide-react";
import { DateRangePresetPicker } from "@/components/ui/date-range-preset-picker";
import { resolvePreset, type DateRangeValue } from "@/lib/date-presets";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

interface Option {
  id: string;
  name: string;
}

interface DashboardFiltersProps {
  /** Muestra Cliente / Creador / Editor (solo admin). El selector de fechas se muestra siempre. */
  showEntityFilters: boolean;
  dateRange: DateRangeValue | null;
  onDateRangeChange: (v: DateRangeValue | null) => void;
  clientId: string;
  onClientChange: (v: string) => void;
  creatorId: string;
  onCreatorChange: (v: string) => void;
  editorId: string;
  onEditorChange: (v: string) => void;
  clients: Option[];
  creators: Option[];
  editors: Option[];
  hasActiveFilters: boolean;
  onClear: () => void;
}

const DESKTOP_PRESETS = ["today", "last_7", "last_30", "this_month", "last_month", "this_quarter", "custom"] as const;
const MOBILE_PRESETS = ["today", "last_7", "last_30", "this_month", "last_month", "custom"] as const;

/**
 * Barra de filtros de «Inicio». Monta UN solo selector de fechas por breakpoint
 * (useIsMobile decide qué variante existe en el DOM, no solo cuál se ve).
 * Los selects usan etiquetas completas y ancho suficiente: «Todos los clientes» no se trunca.
 */
export function DashboardFilters(props: DashboardFiltersProps) {
  const isMobile = useIsMobile();
  const {
    showEntityFilters, dateRange, onDateRangeChange, clientId, onClientChange, creatorId, onCreatorChange,
    editorId, onEditorChange, clients, creators, editors, hasActiveFilters, onClear,
  } = props;

  const activeCount = [clientId !== "all", creatorId !== "all", editorId !== "all", !!dateRange].filter(Boolean).length;
  const dateValue = dateRange ?? { preset: "last_30" as const, ...resolvePreset("last_30") };

  const triggerCls = "h-10 w-full rounded-control bg-card text-sm sm:w-[13rem]";

  const entitySelects = showEntityFilters && (
    <>
      <Select value={clientId} onValueChange={onClientChange}>
        <SelectTrigger className={triggerCls} aria-label="Filtrar por cliente">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los clientes</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={creatorId} onValueChange={onCreatorChange}>
        <SelectTrigger className={triggerCls} aria-label="Filtrar por creador">
          <SelectValue placeholder="Creador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los creadores</SelectItem>
          {creators.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={editorId} onValueChange={onEditorChange}>
        <SelectTrigger className={triggerCls} aria-label="Filtrar por editor">
          <SelectValue placeholder="Editor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los editores</SelectItem>
          {editors.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-11 w-full justify-between rounded-control bg-card">
            <span className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {hasActiveFilters ? "Filtros activos" : "Filtrar resultados"}
            </span>
            {hasActiveFilters && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground tabular-nums">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] rounded-card p-4" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filtros</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={onClear} className="h-8 text-xs">
                  <X className="mr-1 h-3 w-3" aria-hidden="true" />
                  Limpiar
                </Button>
              )}
            </div>
            <DateRangePresetPicker
              value={dateValue}
              onChange={onDateRangeChange}
              presets={[...MOBILE_PRESETS]}
              numberOfMonths={1}
              align="start"
              unsetLabel={dateRange ? undefined : "Todo el período"}
            />
            {entitySelects}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 pr-1 text-sm font-medium text-[hsl(var(--text-secondary))]">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filtros
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        )}
      </span>
      <DateRangePresetPicker
        value={dateValue}
        onChange={onDateRangeChange}
        presets={[...DESKTOP_PRESETS]}
        align="start"
        unsetLabel={dateRange ? undefined : "Todo el período"}
      />
      {entitySelects}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-10 rounded-control text-sm">
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
