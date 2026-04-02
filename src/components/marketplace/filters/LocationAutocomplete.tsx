import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapPin, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LocationOption } from '../types/marketplace';

interface LocationAutocompleteProps {
  value: { country: string | null; city: string | null };
  onChange: (location: { country: string | null; city: string | null }) => void;
  locations: LocationOption[];
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  locations,
  placeholder = 'Buscar pais o ciudad...',
  className,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Crear lista de opciones únicas (países + ciudades)
  const options = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<LocationOption & { displayLabel: string; searchText: string }> = [];

    // Primero agregar países únicos
    locations.forEach((loc) => {
      const countryKey = loc.country_code;
      if (!seen.has(countryKey)) {
        seen.add(countryKey);
        result.push({
          ...loc,
          city: null,
          displayLabel: `${loc.country_flag} ${loc.country_name}`,
          searchText: `${loc.country_name} ${loc.country_code}`.toLowerCase(),
        });
      }
    });

    // Luego agregar ciudades (con su país)
    locations.forEach((loc) => {
      if (loc.city) {
        const cityKey = `${loc.country_code}-${loc.city}`;
        if (!seen.has(cityKey)) {
          seen.add(cityKey);
          result.push({
            ...loc,
            displayLabel: `${loc.country_flag} ${loc.city}, ${loc.country_name}`,
            searchText: `${loc.city} ${loc.country_name} ${loc.country_code}`.toLowerCase(),
          });
        }
      }
    });

    return result;
  }, [locations]);

  // Filtrar opciones basado en búsqueda
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => opt.searchText.includes(term));
  }, [options, searchTerm]);

  // Obtener label actual
  const currentLabel = useMemo(() => {
    if (!value.country) return null;
    if (value.city) {
      const opt = options.find(
        (o) => o.country_code === value.country && o.city === value.city
      );
      return opt?.displayLabel;
    }
    const opt = options.find(
      (o) => o.country_code === value.country && !o.city
    );
    return opt?.displayLabel;
  }, [value, options]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll al elemento resaltado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = useCallback(
    (opt: (typeof options)[0]) => {
      onChange({ country: opt.country_code, city: opt.city });
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange({ country: null, city: null });
      setSearchTerm('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          break;
      }
    },
    [isOpen, filteredOptions, highlightedIndex, handleSelect]
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input trigger */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
          'bg-secondary/50 dark:bg-white/5 border border-border/20 dark:border-white/10',
          'hover:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500',
          isOpen && 'border-purple-500/50 ring-1 ring-purple-500'
        )}
      >
        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span
          className={cn(
            'flex-1 truncate',
            currentLabel ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {currentLabel || placeholder}
        </span>
        {currentLabel ? (
          <X
            className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search input */}
          <div className="p-2 border-b border-border/50">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe para buscar..."
              className={cn(
                'w-full px-3 py-2 rounded-md text-sm',
                'bg-secondary/50 dark:bg-white/5 border border-border/20 dark:border-white/10',
                'text-foreground placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-1 focus:ring-purple-500'
              )}
            />
          </div>

          {/* Options list */}
          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {/* "Cualquier lugar" option */}
            <button
              type="button"
              onClick={() => {
                onChange({ country: null, city: null });
                setIsOpen(false);
                setSearchTerm('');
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                'hover:bg-purple-600/20',
                !value.country && 'bg-purple-600/20 text-purple-300'
              )}
            >
              <span className="text-base">🌎</span>
              <span>Cualquier lugar</span>
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No se encontraron ubicaciones
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  value.country === opt.country_code && value.city === opt.city;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={`${opt.country_code}-${opt.city || 'country'}`}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                      isHighlighted && 'bg-muted/50',
                      isSelected && 'bg-purple-600/20 text-purple-300',
                      !isSelected && !isHighlighted && 'hover:bg-muted/30'
                    )}
                  >
                    <span>{opt.displayLabel}</span>
                    {opt.city && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Ciudad
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
