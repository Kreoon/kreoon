import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  filterCampaignWeek: string;
  setFilterCampaignWeek: (v: string) => void;
}

export function ContentBoardFilters({
  dateRangeFilter, setDateRangeFilter,
  filterCreatorId, setFilterCreatorId, creatorOptions,
  filterEditorId, setFilterEditorId, editorOptions,
  filterClientId, setFilterClientId, clientOptions,
  filterProductId, setFilterProductId, productOptions,
  filterCampaignWeek, setFilterCampaignWeek,
}: ContentBoardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3 px-4 md:px-6 pb-4 overflow-x-auto">
      <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />

      <DateRangePresetPicker
        value={dateRangeFilter ?? { preset: 'last_30', ...resolvePreset('last_30') }}
        onChange={setDateRangeFilter}
        presets={['today', 'yesterday', 'last_7', 'last_15', 'last_30', 'this_week', 'this_month', 'last_month', 'custom']}
        align="start"
      />
      {dateRangeFilter && (
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" onClick={() => setDateRangeFilter(null)}>
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      )}

      <div className="h-6 w-px bg-border hidden md:block" />

      <SearchableSelect
        value={filterCreatorId}
        onValueChange={setFilterCreatorId}
        options={creatorOptions}
        placeholder="Creadores"
        searchPlaceholder="Buscar creador..."
        triggerClassName="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm"
      />

      <SearchableSelect
        value={filterEditorId}
        onValueChange={setFilterEditorId}
        options={editorOptions}
        placeholder="Editores"
        searchPlaceholder="Buscar editor..."
        triggerClassName="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm"
      />

      <SearchableSelect
        value={filterClientId}
        onValueChange={setFilterClientId}
        options={clientOptions}
        placeholder="Clientes"
        searchPlaceholder="Buscar cliente..."
        triggerClassName="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm"
      />

      <div className="h-6 w-px bg-border hidden md:block" />

      <SearchableSelect
        value={filterProductId}
        onValueChange={setFilterProductId}
        options={productOptions}
        placeholder="Productos"
        searchPlaceholder="Buscar producto..."
        triggerClassName="w-[130px] md:w-[180px] h-8 md:h-9 text-xs md:text-sm"
      />

      <Input
        type="text"
        placeholder="Campaña/Semana"
        value={filterCampaignWeek}
        onChange={(e) => setFilterCampaignWeek(e.target.value)}
        className="w-[100px] md:w-[120px] h-8 md:h-9 text-xs md:text-sm"
      />
      {filterCampaignWeek && (
        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0" onClick={() => setFilterCampaignWeek('')}>
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      )}
    </div>
  );
}
