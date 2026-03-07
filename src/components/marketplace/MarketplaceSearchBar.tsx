import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Film, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES, CONTENT_TYPES } from './types/marketplace';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceSearchBarProps {
  search: string;
  country: string | null;
  contentTypes: string[];
  onSearchChange: (value: string) => void;
  onCountryChange: (value: string | null) => void;
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
  contentTypes,
  onSearchChange,
  onCountryChange,
  onContentTypesChange,
  onSubmit,
  onAIFiltersChange,
}: MarketplaceSearchBarProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

      {/* Chips AI — solo visibles cuando hay texto y la IA detectó algo */}
      {aiChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-1">
          {aiChips.map((chip, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                chip.type === 'role' && 'bg-purple-500/15 border border-purple-500/25 text-purple-300',
                chip.type === 'location' && 'bg-blue-500/15 border border-blue-500/20 text-blue-300',
                chip.type === 'category' && 'bg-pink-500/15 border border-pink-500/20 text-pink-300',
              )}
            >
              {chip.type === 'role' && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />}
              {chip.type === 'location' && '📍'}
              {chip.type === 'category' && '#'}
              {chip.label}
            </span>
          ))}
          {isAIParsing && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-white/30">
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
