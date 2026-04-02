import { useState, useCallback } from 'react';
import { Sparkles, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMarketplaceAISearch } from '@/hooks/useMarketplaceAISearch';
import type { MarketplaceFilters } from './types/marketplace';

interface AISearchInputProps {
  onFiltersChange: (filters: Partial<MarketplaceFilters>) => void;
  className?: string;
}

export function AISearchInput({ onFiltersChange, className }: AISearchInputProps) {
  const [query, setQuery] = useState('');
  const { parseQuery, isLoading, suggestions } = useMarketplaceAISearch();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = useCallback(async () => {
    const filters = await parseQuery(query);
    if (filters) {
      onFiltersChange(filters);
    }
    setShowSuggestions(false);
  }, [query, parseQuery, onFiltersChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        <Sparkles className="absolute left-3 h-4 w-4 text-purple-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Busco creador UGC en Bogota para marca de skincare..."
          className="pl-10 pr-24 bg-white/5 border-white/10 focus:border-purple-500"
        />
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          size="sm"
          className="absolute right-1 bg-purple-600 hover:bg-purple-500"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-white/10 rounded-sm shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/5">
            Sugerencias
          </div>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
