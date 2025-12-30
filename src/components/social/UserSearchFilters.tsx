import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Search, SlidersHorizontal, X, MapPin, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  query: string;
  category: string;
  city: string;
  country: string;
  hasContent: boolean;
  isVerified: boolean;
  sortBy: 'recent' | 'followers' | 'content' | 'name';
}

interface UserSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  categories?: string[];
  cities?: string[];
  countries?: string[];
  className?: string;
}

const DEFAULT_CATEGORIES = [
  'Creador de contenido',
  'Influencer',
  'Fotógrafo',
  'Videógrafo',
  'Diseñador',
  'Artista',
  'Músico',
  'Streamer',
  'Podcaster',
  'Escritor',
];

const DEFAULT_COUNTRIES = [
  'España',
  'México',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
  'Estados Unidos',
];

export function UserSearchFilters({
  filters,
  onFiltersChange,
  onSearch,
  categories = DEFAULT_CATEGORIES,
  cities = [],
  countries = DEFAULT_COUNTRIES,
  className,
}: UserSearchFiltersProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      query: '',
      category: '',
      city: '',
      country: '',
      hasContent: false,
      isVerified: false,
      sortBy: 'followers',
    });
  };

  const activeFiltersCount = [
    filters.category,
    filters.city,
    filters.country,
    filters.hasContent,
    filters.isVerified,
  ].filter(Boolean).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className={cn(
          "relative flex-1 transition-all duration-300",
          searchFocused && "scale-[1.01]"
        )}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-social-muted-foreground" />
          <Input
            placeholder="Buscar creadores por nombre o username..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "pl-12 h-12 rounded-xl text-base",
              "bg-social-card border-social-border",
              "focus:border-social-accent/50 focus:ring-2 focus:ring-social-accent/20",
              "transition-all duration-300"
            )}
          />
          {filters.query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-social-muted-foreground"
              onClick={() => updateFilter('query', '')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters button */}
        <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-12 px-4 rounded-xl border-social-border",
                "hover:bg-social-muted hover:border-social-accent/30",
                activeFiltersCount > 0 && "border-social-accent bg-social-accent/10"
              )}
            >
              <SlidersHorizontal className="h-5 w-5 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-2 h-5 w-5 p-0 justify-center bg-social-accent text-social-accent-foreground"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-social-card border-social-border">
            <SheetHeader>
              <SheetTitle className="text-social-foreground">Filtros de búsqueda</SheetTitle>
              <SheetDescription className="text-social-muted-foreground">
                Refina tu búsqueda de creadores
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-social-accent" />
                  Categoría
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => updateFilter('category', value)}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-social-accent" />
                  País
                </label>
                <Select
                  value={filters.country}
                  onValueChange={(value) => updateFilter('country', value)}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
                    <SelectValue placeholder="Todos los países" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los países</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City (if country selected) */}
              {filters.country && cities.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-social-foreground">Ciudad</label>
                  <Select
                    value={filters.city}
                    onValueChange={(value) => updateFilter('city', value)}
                  >
                    <SelectTrigger className="bg-social-muted border-social-border">
                      <SelectValue placeholder="Todas las ciudades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las ciudades</SelectItem>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort by */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-social-foreground">Ordenar por</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: SearchFilters['sortBy']) => updateFilter('sortBy', value)}
                >
                  <SelectTrigger className="bg-social-muted border-social-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="followers">Más seguidores</SelectItem>
                    <SelectItem value="content">Más contenido</SelectItem>
                    <SelectItem value="recent">Más recientes</SelectItem>
                    <SelectItem value="name">Nombre A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle filters */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-social-foreground">Filtros adicionales</label>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={filters.hasContent ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 transition-colors",
                      filters.hasContent 
                        ? "bg-social-accent text-social-accent-foreground" 
                        : "border-social-border hover:bg-social-muted"
                    )}
                    onClick={() => updateFilter('hasContent', !filters.hasContent)}
                  >
                    Con contenido
                  </Badge>
                  <Badge
                    variant={filters.isVerified ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 transition-colors",
                      filters.isVerified 
                        ? "bg-social-accent text-social-accent-foreground" 
                        : "border-social-border hover:bg-social-muted"
                    )}
                    onClick={() => updateFilter('isVerified', !filters.isVerified)}
                  >
                    Verificados
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-social-border"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
                <Button
                  className="flex-1 bg-social-accent hover:bg-social-accent/90"
                  onClick={() => {
                    onSearch();
                    setIsFiltersOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </form>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {filters.category && (
            <Badge variant="secondary" className="bg-social-muted text-social-foreground gap-1.5">
              {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('category', '')}
              />
            </Badge>
          )}
          {filters.country && (
            <Badge variant="secondary" className="bg-social-muted text-social-foreground gap-1.5">
              {filters.country}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('country', '')}
              />
            </Badge>
          )}
          {filters.city && (
            <Badge variant="secondary" className="bg-social-muted text-social-foreground gap-1.5">
              {filters.city}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('city', '')}
              />
            </Badge>
          )}
          {filters.hasContent && (
            <Badge variant="secondary" className="bg-social-muted text-social-foreground gap-1.5">
              Con contenido
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('hasContent', false)}
              />
            </Badge>
          )}
          {filters.isVerified && (
            <Badge variant="secondary" className="bg-social-muted text-social-foreground gap-1.5">
              Verificados
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilter('isVerified', false)}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-social-muted-foreground hover:text-social-foreground"
            onClick={clearFilters}
          >
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
}
