import { memo } from 'react';
import { Filter, MapPin, Tag, Flame } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CreatorsFiltersState {
  niche: string;
  country: string;
  upRange: string;
}

interface CreatorsFiltersProps {
  filters: CreatorsFiltersState;
  onFilterChange: (key: keyof CreatorsFiltersState, value: string) => void;
  onClearFilters: () => void;
  niches: string[];
  countries: string[];
  className?: string;
}

const UP_RANGES = [
  { value: 'all', label: 'Todos' },
  { value: '0-500', label: '0 - 500 UP' },
  { value: '500-800', label: '500 - 800 UP' },
  { value: '800-1200', label: '800 - 1,200 UP' },
  { value: '1200+', label: '1,200+ UP' },
];

function CreatorsFiltersComponent({
  filters,
  onFilterChange,
  onClearFilters,
  niches,
  countries,
  className,
}: CreatorsFiltersProps) {
  const hasActiveFilters = filters.niche !== 'all' || filters.country !== 'all' || filters.upRange !== 'all';

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="flex items-center gap-2 text-social-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Filtros:</span>
      </div>

      {/* Niche Filter */}
      <Select
        value={filters.niche}
        onValueChange={(value) => onFilterChange('niche', value)}
      >
        <SelectTrigger className="w-[160px] bg-social-card border-social-border text-social-foreground">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-social-muted-foreground" />
            <SelectValue placeholder="Nicho" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-social-card border-social-border">
          <SelectItem value="all">Todos los nichos</SelectItem>
          {niches.map((niche) => (
            <SelectItem key={niche} value={niche}>
              {niche}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Country Filter */}
      <Select
        value={filters.country}
        onValueChange={(value) => onFilterChange('country', value)}
      >
        <SelectTrigger className="w-[160px] bg-social-card border-social-border text-social-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-social-muted-foreground" />
            <SelectValue placeholder="País" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-social-card border-social-border">
          <SelectItem value="all">Todos los países</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* UP Range Filter */}
      <Select
        value={filters.upRange}
        onValueChange={(value) => onFilterChange('upRange', value)}
      >
        <SelectTrigger className="w-[160px] bg-social-card border-social-border text-social-foreground">
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <SelectValue placeholder="Rango UP" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-social-card border-social-border">
          {UP_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-social-muted-foreground hover:text-social-foreground"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

export const CreatorsFilters = memo(CreatorsFiltersComponent);
