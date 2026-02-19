import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES, CONTENT_TYPES } from './types/marketplace';

interface MarketplaceSearchBarProps {
  search: string;
  country: string | null;
  contentTypes: string[];
  onSearchChange: (value: string) => void;
  onCountryChange: (value: string | null) => void;
  onContentTypesChange: (value: string[]) => void;
  onSubmit: () => void;
}

type ActiveSection = 'search' | 'country' | 'content' | null;

export function MarketplaceSearchBar({
  search,
  country,
  contentTypes,
  onSearchChange,
  onCountryChange,
  onContentTypesChange,
  onSubmit,
}: MarketplaceSearchBarProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveSection(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setActiveSection(null);
        onSubmit();
      }
    },
    [onSubmit],
  );

  const toggleContentType = useCallback(
    (ct: string) => {
      onContentTypesChange(
        contentTypes.includes(ct)
          ? contentTypes.filter(t => t !== ct)
          : [...contentTypes, ct],
      );
    },
    [contentTypes, onContentTypesChange],
  );

  const selectedCountry = COUNTRIES.find(c => c.code === country);

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      {/* Main bar */}
      <div
        className={cn(
          'flex items-center rounded-full border transition-all duration-300',
          activeSection
            ? 'bg-white/10 border-purple-500/40 shadow-lg shadow-purple-500/10'
            : 'bg-white/5 border-white/10 hover:border-white/20',
        )}
      >
        {/* Search section */}
        <button
          className={cn(
            'flex-1 flex items-center gap-3 px-5 py-3.5 rounded-l-full transition-colors',
            activeSection === 'search' && 'bg-white/5',
          )}
          onClick={() => setActiveSection('search')}
        >
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs font-medium text-foreground/80">¿Qué buscas?</p>
            {activeSection === 'search' ? (
              <input
                autoFocus
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Creadores, estilos..."
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
              />
            ) : (
              <p className="text-sm text-gray-500 truncate">
                {search || 'Creadores, estilos...'}
              </p>
            )}
          </div>
        </button>

        <div className="w-px h-8 bg-white/10" />

        {/* Country section */}
        <button
          className={cn(
            'flex-1 flex items-center gap-3 px-5 py-3.5 transition-colors hidden md:flex',
            activeSection === 'country' && 'bg-white/5',
          )}
          onClick={() => setActiveSection(prev => (prev === 'country' ? null : 'country'))}
        >
          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs font-medium text-foreground/80">País/Ciudad</p>
            <p className="text-sm text-gray-500 truncate">
              {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.label}` : 'Cualquier lugar'}
            </p>
          </div>
        </button>

        <div className="w-px h-8 bg-white/10 hidden md:block" />

        {/* Content type section */}
        <button
          className={cn(
            'flex-1 flex items-center gap-3 px-5 py-3.5 transition-colors hidden md:flex',
            activeSection === 'content' && 'bg-white/5',
          )}
          onClick={() => setActiveSection(prev => (prev === 'content' ? null : 'content'))}
        >
          <Film className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs font-medium text-foreground/80">Tipo contenido</p>
            <p className="text-sm text-gray-500 truncate">
              {contentTypes.length > 0
                ? contentTypes.slice(0, 2).join(', ') + (contentTypes.length > 2 ? '...' : '')
                : 'UGC, Reels, VSL...'}
            </p>
          </div>
        </button>

        {/* Search button */}
        <div className="pr-2">
          <button
            onClick={() => {
              setActiveSection(null);
              onSubmit();
            }}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-colors"
          >
            <Search className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Dropdowns */}
      {activeSection === 'country' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            <button
              onClick={() => {
                onCountryChange(null);
                setActiveSection(null);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                country === null
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-foreground/80 hover:bg-white/5',
              )}
            >
              🌎 Todos los países
            </button>
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                onClick={() => {
                  onCountryChange(c.code);
                  setActiveSection(null);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                  country === c.code
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-foreground/80 hover:bg-white/5',
                )}
              >
                {c.flag} {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'content' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map(ct => (
              <button
                key={ct}
                onClick={() => toggleContentType(ct)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors text-sm',
                  contentTypes.includes(ct)
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-foreground/80 hover:bg-white/5 border border-transparent',
                )}
              >
                {contentTypes.includes(ct) && <X className="h-3 w-3" />}
                {ct}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
