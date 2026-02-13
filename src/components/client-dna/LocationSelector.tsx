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
    <div className="space-y-3">
      {/* Presets rápidos */}
      <div className="flex flex-wrap gap-2">
        {LOCATION_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700
                       text-gray-300 rounded-full transition-colors"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar país o ciudad..."
            className="flex-1 bg-transparent text-white placeholder:text-gray-500
                       text-sm outline-none"
          />
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700
                          rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
            {filteredLocations.map(location => (
              <button
                key={location.code}
                onClick={() => addLocation(location)}
                disabled={selectedLocations.some(l => l.code === location.code)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700
                           text-left text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{location.flag}</span>
                <span className="text-white">{location.name}</span>
                <span className="text-gray-500 text-xs ml-auto">{location.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chips seleccionados */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedLocations.map(location => (
            <span
              key={location.code}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-600/20
                         text-purple-300 text-sm rounded-full"
            >
              <span>{location.flag}</span>
              <span>{location.name}</span>
              <button
                onClick={() => removeLocation(location.code)}
                className="ml-1 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => onChange([])}
            className="text-xs text-gray-500 hover:text-red-400 underline ml-1 transition-colors"
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
