import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTENT_TYPES } from './types/marketplace';
import { supabase } from '@/integrations/supabase/client';
import { useMarketplaceFilterOptions } from '@/hooks/useMarketplaceFilterOptions';
import { LocationAutocomplete } from './filters/LocationAutocomplete';
import { ContentTypeSelector } from './filters/ContentTypeSelector';

interface MarketplaceSearchBarProps {
  search: string;
  country: string | null;
  city: string | null;
  contentTypes: string[];
  onSearchChange: (value: string) => void;
  onLocationChange: (location: { country: string | null; city: string | null }) => void;
  onContentTypesChange: (value: string[]) => void;
  onSubmit: () => void;
  onAIFiltersChange?: (filters: {
    country?: string | null;
    marketplace_roles?: string[];
    category?: string | null;
    price_max?: number | null;
    accepts_exchange?: boolean | null;
  }) => void;
}

type ActiveSection = 'search' | 'country' | 'content' | null;

export function MarketplaceSearchBar({
  search,
  country,
  city,
  contentTypes,
  onSearchChange,
  onLocationChange,
  onContentTypesChange,
  onSubmit,
  onAIFiltersChange,
}: MarketplaceSearchBarProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtener opciones dinámicas de filtros
  const { data: filterOptions } = useMarketplaceFilterOptions();

  // --- AI: parseo silencioso en segundo plano ---
  const [aiChips, setAiChips] = useState<{ label: string; type: 'role' | 'location' | 'category' }[]>([]);
  const [isAIParsing, setIsAIParsing] = useState(false);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parseWithAI = useCallback(async (query: string) => {
    // Activar con queries más cortos: >12 chars o >2 palabras
    if (query.length < 12 && query.split(' ').length <= 2) {
      setAiChips([]);
      return;
    }

    console.log('[AI Search] Parsing query:', query);

    setIsAIParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-ai-search', {
        body: { query, use_gemini: query.length > 15 },
      });

      if (error || !data?.parsed) {
        console.log('[AI Search] No data or error:', error);
        setAiChips([]);
        return;
      }

      const { parsed } = data;
      console.log('[AI Search] Parsed result:', parsed);

      // Construir chips visuales de lo que entendió la IA
      const chips: { label: string; type: 'role' | 'location' | 'category' }[] = [];
      if (parsed.roles?.length > 0) {
        parsed.roles.slice(0, 2).forEach((r: string) =>
          chips.push({ label: r.replace(/_/g, ' '), type: 'role' })
        );
      }
      if (parsed.country) {
        const countryLabels: Record<string, string> = {
          CO: 'Colombia', MX: 'México', CL: 'Chile', AR: 'Argentina',
          PE: 'Perú', EC: 'Ecuador', VE: 'Venezuela', BR: 'Brasil', ES: 'España', US: 'USA',
        };
        chips.push({ label: countryLabels[parsed.country] ?? parsed.country, type: 'location' });
      }
      if (parsed.category) {
        chips.push({ label: parsed.category, type: 'category' });
      }
      setAiChips(chips);

      // Emitir filtros al padre si tiene el callback
      if (onAIFiltersChange && parsed.confidence >= 30) {
        onAIFiltersChange({
          country: parsed.country ?? null,
          marketplace_roles: parsed.roles?.length > 0 ? parsed.roles : undefined,
          category: parsed.category ?? null,
          price_max: parsed.price_max ?? null,
          accepts_exchange: parsed.accepts_exchange ?? null,
        });
      }
    } catch (err) {
      console.error('[AI Search] Error:', err);
      setAiChips([]);
    } finally {
      setIsAIParsing(false);
    }
  }, [onAIFiltersChange]);

  // Debounce del parse AI cuando cambia el search
  useEffect(() => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    if (!search || search.length < 8) {
      setAiChips([]);
      return;
    }
    // Debounce más corto para respuesta más rápida
    aiDebounceRef.current = setTimeout(() => parseWithAI(search), 500);
    return () => {
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
    };
  }, [search, parseWithAI]);
  // --- fin AI ---

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

  // Obtener label de ubicación actual
  const locationLabel = (() => {
    if (!country) return 'Cualquier lugar';
    const loc = filterOptions?.locations.find(
      (l) => l.country_code === country && l.city === city
    );
    if (loc) {
      return city
        ? `${loc.country_flag} ${city}, ${loc.country_name}`
        : `${loc.country_flag} ${loc.country_name}`;
    }
    return country;
  })();

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      {/* Main bar */}
      <div
        className={cn(
          'flex items-center rounded-[0.125rem] border transition-all duration-300',
          activeSection
            ? 'bg-secondary border-primary/40'
            : 'bg-secondary border-border hover:border-border',
        )}
      >
        {/* Search section */}
        <button
          className={cn(
            'flex-1 flex items-center gap-3 px-5 py-3.5 rounded-l-[0.125rem] transition-colors',
            activeSection === 'search' && 'bg-secondary',
          )}
          onClick={() => setActiveSection('search')}
        >
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs font-medium text-foreground/80">¿Qué buscas?</p>
            {activeSection === 'search' ? (
              <input
                autoFocus
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Creadores, estilos..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground truncate">
                {search || 'Creadores, estilos...'}
              </p>
            )}
          </div>
        </button>

        <div className="w-px h-8 bg-border" />

        {/* Country section */}
        <button
          className={cn(
            'flex-1 flex items-center gap-3 px-5 py-3.5 transition-colors hidden md:flex',
            activeSection === 'country' && 'bg-secondary',
          )}
          onClick={() => setActiveSection(prev => (prev === 'country' ? null : 'country'))}
        >
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs font-medium text-foreground/80">Pais/Ciudad</p>
            <p className="text-sm text-muted-foreground truncate">
              {locationLabel}
            </p>
          </div>
        </button>

        <div className="w-px h-8 bg-border hidden md:block" />

        {/* Content type section */}
        <button
          className={cn(
            'flex-1 flex items-center gap-3 px-5 py-3.5 transition-colors hidden md:flex',
            activeSection === 'content' && 'bg-secondary',
          )}
          onClick={() => setActiveSection(prev => (prev === 'content' ? null : 'content'))}
        >
          <Film className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs font-medium text-foreground/80">Tipo contenido</p>
            <p className="text-sm text-muted-foreground truncate">
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
            className="w-10 h-10 rounded-[0.125rem] bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors"
          >
            <Search className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Chips AI — solo visibles cuando hay texto y la IA detectó algo */}
      {aiChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-1">
          {aiChips.map((chip, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-[0.125rem] text-[11px] font-medium',
                chip.type === 'role' && 'bg-primary/15 border border-primary/25 text-primary',
                chip.type === 'location' && 'bg-primary/15 border border-primary/20 text-primary',
                chip.type === 'category' && 'bg-primary/15 border border-primary/20 text-primary',
              )}
            >
              {chip.type === 'role' && <span className="w-1.5 h-1.5 rounded-[0.125rem] bg-primary inline-block" />}
              {chip.type === 'location' && '📍'}
              {chip.type === 'category' && '#'}
              {chip.label}
            </span>
          ))}
          {isAIParsing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[0.125rem] text-[11px] text-muted-foreground">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              IA analizando...
            </span>
          )}
        </div>
      )}

      {/* Dropdowns */}
      {activeSection === 'country' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-sm shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <LocationAutocomplete
            value={{ country, city }}
            onChange={(loc) => {
              onLocationChange(loc);
              setActiveSection(null);
            }}
            locations={filterOptions?.locations ?? []}
            placeholder="Buscar pais o ciudad..."
          />
        </div>
      )}

      {activeSection === 'content' && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-sm shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <ContentTypeSelector
            value={contentTypes}
            onChange={onContentTypesChange}
            availableTypes={filterOptions?.content_types ?? CONTENT_TYPES as unknown as string[]}
          />
        </div>
      )}
    </div>
  );
}
