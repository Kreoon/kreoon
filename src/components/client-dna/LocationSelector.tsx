import { useState, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { LATAM_LOCATIONS, LOCATION_PRESETS, type AudienceLocation } from '@/lib/locations-data';

interface LocationSelectorProps {
  selectedLocations: AudienceLocation[];
  onChange: (locations: AudienceLocation[]) => void;
}

export function LocationSelector({ selectedLocations, onChange }: LocationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return LATAM_LOCATIONS;
    const term = searchTerm.toLowerCase();
    return LATAM_LOCATIONS.filter(loc =>
      loc.name.toLowerCase().includes(term) ||
      loc.code.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const addLocation = (location: AudienceLocation) => {
    if (!selectedLocations.find(l => l.code === location.code)) {
      onChange([...selectedLocations, location]);
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeLocation = (code: string) => {
    onChange(selectedLocations.filter(l => l.code !== code));
  };

  const applyPreset = (presetId: string) => {
    const preset = LOCATION_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const locations = LATAM_LOCATIONS.filter(l => preset.locations.includes(l.code));
      onChange(locations);
    }
    setShowDropdown(false);
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Presets rápidos */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {LOCATION_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700
                       active:bg-zinc-300 dark:active:bg-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-full transition-colors duration-150"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-white dark:bg-[#1a1a24] border border-zinc-200 dark:border-zinc-700/50 rounded-lg">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar país o ciudad..."
            className="flex-1 bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                       text-xs sm:text-sm outline-none min-w-0"
          />
          <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 shrink-0" />
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1f1f2e] border border-zinc-200 dark:border-zinc-700
                          rounded-lg shadow-lg dark:shadow-lg dark:shadow-black/20 max-h-40 sm:max-h-48 overflow-y-auto z-50">
            {filteredLocations.map(location => (
              <button
                key={location.code}
                onClick={() => addLocation(location)}
                disabled={selectedLocations.some(l => l.code === location.code)}
                className="w-full flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800
                           active:bg-zinc-100 dark:active:bg-zinc-700 text-left text-xs sm:text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>{location.flag}</span>
                <span className="text-zinc-900 dark:text-white truncate">{location.name}</span>
                <span className="text-zinc-500 text-[10px] sm:text-xs ml-auto shrink-0">{location.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chips seleccionados */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {selectedLocations.map(location => (
            <span
              key={location.code}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-600/20
                         text-purple-600 dark:text-purple-300 text-[10px] sm:text-sm rounded-full"
            >
              <span>{location.flag}</span>
              <span className="truncate max-w-[80px] sm:max-w-none">{location.name}</span>
              <button
                onClick={() => removeLocation(location.code)}
                className="ml-0.5 sm:ml-1 hover:text-purple-800 dark:hover:text-white transition-colors"
              >
                <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => onChange([])}
            className="text-[10px] sm:text-xs text-zinc-500 hover:text-red-500 dark:hover:text-red-400 underline ml-0.5 sm:ml-1 transition-colors"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Click fuera para cerrar */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
