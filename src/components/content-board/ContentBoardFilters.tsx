import { CalendarDays, X } from "lucide-react";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { DateRangePresetPicker } from "@/components/ui/date-range-preset-picker";
import { resolvePreset, type DateRangeValue } from "@/lib/date-presets";

export interface ContentBoardFiltersProps {
  dateRangeFilter: DateRangeValue | null;
  setDateRangeFilter: (v: DateRangeValue | null) => void;
  filterCreatorId: string;
  setFilterCreatorId: (v: string) => void;
  creatorOptions: SearchableSelectOption[];
  filterEditorId: string;
  setFilterEditorId: (v: string) => void;
  editorOptions: SearchableSelectOption[];
  filterClientId: string;
  setFilterClientId: (v: string) => void;
  clientOptions: SearchableSelectOption[];
  filterProductId: string;
  setFilterProductId: (v: string) => void;
  productOptions: SearchableSelectOption[];
}

const SELECT = "h-10 min-w-[10rem] flex-1 sm:flex-none sm:w-[11.5rem] text-sm rounded-[var(--radius-control,0.75rem)] border-border/60 bg-background";

/**
 * Filtros del tablero (solo admin). Creador, editor y cliente se resuelven en el servidor;
 * producto, fecha de CREACIÓN, «sin creador/editor» y archivados, en el cliente sobre lo cargado.
 */
export function ContentBoardFilters({
  dateRangeFilter, setDateRangeFilter,
  filterCreatorId, setFilterCreatorId, creatorOptions,
  filterEditorId, setFilterEditorId, editorOptions,
  filterClientId, setFilterClientId, clientOptions,
  filterProductId, setFilterProductId, productOptions,
}: ContentBoardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros del tablero">
      {dateRangeFilter ? (
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">Creadas:</span>
          <DateRangePresetPicker
            value={dateRangeFilter}
            onChange={setDateRangeFilter}
            presets={['today', 'yesterday', 'last_7', 'last_15', 'last_30', 'this_week', 'this_month', 'last_month', 'custom']}
            align="start"
          />
          <button
            type="button"
            onClick={() => setDateRangeFilter(null)}
            aria-label="Quitar filtro de fecha de creación"
            title="Quitar filtro de fecha de creación"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDateRangeFilter({ preset: 'last_30', ...resolvePreset('last_30') })}
          className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control,0.75rem)] border border-border/60 bg-background px-3 text-sm text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Fecha de creación: cualquiera
        </button>
      )}

      <SearchableSelect
        value={filterCreatorId}
        onValueChange={setFilterCreatorId}
        options={creatorOptions}
        placeholder="Creadores"
        searchPlaceholder="Buscar creador..."
        triggerClassName={SELECT}
      />
      <SearchableSelect
        value={filterEditorId}
        onValueChange={setFilterEditorId}
        options={editorOptions}
        placeholder="Editores"
        searchPlaceholder="Buscar editor..."
        triggerClassName={SELECT}
      />
      <SearchableSelect
        value={filterClientId}
        onValueChange={setFilterClientId}
        options={clientOptions}
        placeholder="Clientes"
        searchPlaceholder="Buscar cliente..."
        triggerClassName={SELECT}
      />
      <SearchableSelect
        value={filterProductId}
        onValueChange={setFilterProductId}
        options={productOptions}
        placeholder="Productos"
        searchPlaceholder="Buscar producto..."
        triggerClassName={SELECT}
      />
    </div>
  );
}
