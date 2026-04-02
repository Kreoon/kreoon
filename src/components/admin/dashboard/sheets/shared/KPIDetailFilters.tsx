import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdown {
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface KPIDetailFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDropdown[];
  sortOptions?: FilterOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
}

export function KPIDetailFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  sortOptions,
  sortValue,
  onSortChange,
}: KPIDetailFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 py-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
        />
      </div>
      {filters?.map((filter, i) => (
        <Select key={i} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 text-white h-9 text-sm">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {sortOptions && onSortChange && (
        <Select value={sortValue} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 text-white h-9 text-sm">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
