import React, { useState, useRef, useEffect } from 'react';
import { X, Search, MapPin, Globe, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  GeoLocation,
  GEO_LOCATIONS,
  searchGeoLocations,
  getLocationDisplayName,
} from '@/lib/product-dna-questions';

interface LocationSelectorProps {
  value: string[]; // Array de IDs de ubicaciones seleccionadas
  onChange: (locations: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
}

export function LocationSelector({
  value,
  onChange,
  placeholder = 'Buscar país, ciudad o región...',
  maxSelections = 10,
}: LocationSelectorProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GeoLocation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Búsqueda con debounce
  useEffect(() => {
    if (query.length >= 2) {
      const filtered = searchGeoLocations(query, 8).filter(
        (loc) => !value.includes(loc.id)
      );
      setResults(filtered);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, value]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (loc: GeoLocation) => {
    if (value.length < maxSelections) {
      onChange([...value, loc.id]);
    }
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const getSelectedLocations = (): GeoLocation[] => {
    return value
      .map((id) => GEO_LOCATIONS.find((loc) => loc.id === id))
      .filter(Boolean) as GeoLocation[];
  };

  const getIcon = (type: GeoLocation['type']) => {
    switch (type) {
      case 'region':
        return <Globe className="w-4 h-4 text-blue-500" />;
      case 'country':
        return <MapPin className="w-4 h-4 text-green-500" />;
      case 'city':
        return <Building2 className="w-4 h-4 text-orange-500" />;
    }
  };

  const getTypeLabel = (type: GeoLocation['type']) => {
    switch (type) {
      case 'region':
        return 'Región';
      case 'country':
        return 'País';
      case 'city':
        return 'Ciudad';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected locations as tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {getSelectedLocations().map((loc) => (
            <span
              key={loc.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
            >
              {getIcon(loc.type)}
              <span>{getLocationDisplayName(loc)}</span>
              <button
                type="button"
                onClick={() => handleRemove(loc.id)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={value.length >= maxSelections ? 'Máximo alcanzado' : placeholder}
          disabled={value.length >= maxSelections}
          className="pl-10"
        />
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelect(loc)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
            >
              {getIcon(loc.type)}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {getLocationDisplayName(loc)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {getTypeLabel(loc.type)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state when searching */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
          No se encontraron ubicaciones para "{query}"
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-1.5">
        {value.length === 0
          ? 'Escribe para buscar países, ciudades o regiones'
          : `${value.length} de ${maxSelections} ubicaciones seleccionadas`}
      </p>
    </div>
  );
}
