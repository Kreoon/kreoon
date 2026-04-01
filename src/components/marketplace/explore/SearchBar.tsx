import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Clock, User, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchSuggestion {
  type: 'creator' | 'category' | 'recent';
  id: string;
  label: string;
  avatar?: string;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onCreatorSelect?: (creatorId: string) => void;
  onCategorySelect?: (category: string) => void;
  placeholder?: string;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'kreoon_marketplace_recent_searches';
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 300;

const CATEGORY_SUGGESTIONS = [
  { id: 'ugc', label: 'UGC Creator' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'beauty', label: 'Belleza' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'tech', label: 'Tecnologia' },
  { id: 'food', label: 'Comida' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'fashion', label: 'Moda' },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setSearches(JSON.parse(stored));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const addSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    setSearches((prev) => {
      const filtered = prev.filter((s) => s !== term);
      const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return { searches, addSearch, clearSearches };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchBar({
  value,
  onChange,
  onCreatorSelect,
  onCategorySelect,
  placeholder = 'Buscar creadores, categorias...',
  className,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { searches: recentSearches, addSearch } = useRecentSearches();

  const debouncedValue = useDebounce(value, DEBOUNCE_MS);

  // Fetch creator suggestions
  useEffect(() => {
    if (!debouncedValue.trim() || debouncedValue.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const { data: creators } = await supabase
          .from('creator_profiles')
          .select('id, display_name, avatar_url')
          .ilike('display_name', `%${debouncedValue}%`)
          .limit(5);

        const creatorSuggestions: SearchSuggestion[] = (creators || []).map((c) => ({
          type: 'creator' as const,
          id: c.id,
          label: c.display_name || 'Sin nombre',
          avatar: c.avatar_url || undefined,
        }));

        // Filter matching categories
        const matchingCategories = CATEGORY_SUGGESTIONS.filter((cat) =>
          cat.label.toLowerCase().includes(debouncedValue.toLowerCase())
        ).map((cat) => ({
          type: 'category' as const,
          id: cat.id,
          label: cat.label,
        }));

        setSuggestions([...creatorSuggestions, ...matchingCategories]);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue]);

  // Build display suggestions
  const displaySuggestions = useMemo(() => {
    if (value.trim().length >= 2) {
      return suggestions;
    }
    // Show recent searches when empty
    return recentSearches.map((term) => ({
      type: 'recent' as const,
      id: term,
      label: term,
    }));
  }, [value, suggestions, recentSearches]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || displaySuggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < displaySuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : displaySuggestions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            handleSelect(displaySuggestions[selectedIndex]);
          } else if (value.trim()) {
            addSearch(value.trim());
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [isOpen, displaySuggestions, selectedIndex, value, addSearch]
  );

  const handleSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      switch (suggestion.type) {
        case 'creator':
          onCreatorSelect?.(suggestion.id);
          addSearch(suggestion.label);
          break;
        case 'category':
          onCategorySelect?.(suggestion.id);
          break;
        case 'recent':
          onChange(suggestion.label);
          break;
      }
      setIsOpen(false);
      setSelectedIndex(-1);
    },
    [onCreatorSelect, onCategorySelect, onChange, addSearch]
  );

  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Buscar en el marketplace"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={cn(
            'w-full h-10 pl-10 pr-10 rounded-lg',
            'bg-background dark:bg-[#0f0f22] border border-border dark:border-purple-500/20',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50',
            'transition-all duration-200'
          )}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors"
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && displaySuggestions.length > 0 && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-1 w-full py-1 rounded-lg shadow-lg',
            'bg-popover dark:bg-[#0f0f22] border border-border dark:border-purple-500/20',
            'max-h-80 overflow-y-auto'
          )}
        >
          {displaySuggestions.map((suggestion, index) => {
            const Icon =
              suggestion.type === 'creator'
                ? User
                : suggestion.type === 'category'
                ? Tag
                : Clock;

            return (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left',
                  'hover:bg-muted dark:hover:bg-purple-500/10 transition-colors',
                  index === selectedIndex && 'bg-muted dark:bg-purple-500/10'
                )}
              >
                {suggestion.type === 'creator' && suggestion.avatar ? (
                  <img
                    src={suggestion.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted dark:bg-purple-500/20 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {suggestion.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.type === 'creator'
                      ? 'Creador'
                      : suggestion.type === 'category'
                      ? 'Categoria'
                      : 'Busqueda reciente'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
