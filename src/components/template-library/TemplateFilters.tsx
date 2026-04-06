import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TemplateFiltersState {
  search: string;
  category: string;
  sortBy: 'popular' | 'most_used' | 'recent';
}

interface TemplateFiltersProps {
  filters: TemplateFiltersState;
  onFiltersChange: (filters: TemplateFiltersState) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'ugc', label: 'UGC' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'agencia', label: 'Agencia' },
  { value: 'profesional', label: 'Profesional B2B' },
  { value: 'creativo', label: 'Creativo' },
] as const;

const SORT_OPTIONS = [
  { value: 'popular', label: 'Populares' },
  { value: 'most_used', label: 'Mas usados' },
  { value: 'recent', label: 'Recientes' },
] as const;

export function TemplateFilters({ filters, onFiltersChange }: TemplateFiltersProps) {
  const update = (partial: Partial<TemplateFiltersState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Busqueda */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          type="search"
          placeholder="Buscar plantillas..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500"
          aria-label="Buscar plantillas"
        />
      </div>

      {/* Categoria */}
      <Select
        value={filters.category}
        onValueChange={(value) => update({ category: value })}
      >
        <SelectTrigger
          className="w-full sm:w-44 bg-gray-900 border-gray-700 text-white focus:border-purple-500"
          aria-label="Filtrar por categoria"
        >
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {CATEGORIES.map((cat) => (
            <SelectItem
              key={cat.value}
              value={cat.value}
              className="text-white hover:bg-gray-800 focus:bg-gray-800"
            >
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Ordenar */}
      <Select
        value={filters.sortBy}
        onValueChange={(value) =>
          update({ sortBy: value as TemplateFiltersState['sortBy'] })
        }
      >
        <SelectTrigger
          className="w-full sm:w-44 bg-gray-900 border-gray-700 text-white focus:border-purple-500"
          aria-label="Ordenar plantillas"
        >
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700">
          {SORT_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-white hover:bg-gray-800 focus:bg-gray-800"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
