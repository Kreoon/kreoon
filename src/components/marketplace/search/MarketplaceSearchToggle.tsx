import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketplaceAISearchBar } from './MarketplaceAISearchBar';
import type { useMarketplaceSearch } from '@/hooks/useMarketplaceSearch';

type SearchHook = ReturnType<typeof useMarketplaceSearch>;

interface Props {
  hook: SearchHook;
  className?: string;
}

export function MarketplaceSearchToggle({ hook, className }: Props) {
  const {
    aiMode,
    setAiMode,
    aiQuery,
    setAiQuery,
    aiSuggestions,
    aiIntent,
    isParsingAI,
    parseAIQuery,
    filters,
    updateFilter,
  } = hook;

  return (
    <div className={cn('w-full space-y-3', className)}>
      {/* Toggle normal / AI */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setAiMode(false)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
            !aiMode
              ? 'bg-purple-600 text-white shadow-[0_2px_10px_rgba(139,92,246,0.35)]'
              : 'bg-white/5 text-white/50 hover:text-white/80'
          )}
        >
          <Search className="h-3 w-3" />
          Búsqueda normal
        </button>
        <button
          onClick={() => setAiMode(true)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
            aiMode
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_2px_10px_rgba(139,92,246,0.35)]'
              : 'bg-white/5 text-white/50 hover:text-white/80'
          )}
        >
          <Sparkles className="h-3 w-3" />
          Buscar con IA
        </button>
      </div>

      {/* Barra activa */}
      {aiMode ? (
        <MarketplaceAISearchBar
          aiQuery={aiQuery}
          onChange={setAiQuery}
          onSubmit={parseAIQuery}
          suggestions={aiSuggestions}
          isLoading={isParsingAI}
          aiIntent={aiIntent}
        />
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition-colors focus-within:border-purple-500/60 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]">
          <Search className="h-4 w-4 text-white/40 flex-shrink-0" />
          <input
            value={filters.query}
            onChange={e => updateFilter('query', e.target.value)}
            placeholder="Buscar por nombre, rol, nicho..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
        </div>
      )}
    </div>
  );
}
