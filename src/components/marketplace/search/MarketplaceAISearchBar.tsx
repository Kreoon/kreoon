import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import type { AIIntent } from '@/hooks/useMarketplaceSearch';

interface Props {
  aiQuery: string;
  onChange: (val: string) => void;
  onSubmit: (query: string) => void;
  suggestions: string[];
  isLoading: boolean;
  aiIntent?: AIIntent | null;
  className?: string;
}

export function MarketplaceAISearchBar({
  aiQuery,
  onChange,
  onSubmit,
  suggestions,
  isLoading,
  aiIntent,
  className
}: Props) {
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(aiQuery, 700);

  useEffect(() => {
    if (debounced && debounced.length >= 3) {
      onSubmit(debounced);
    }
  }, [debounced, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && aiQuery.trim().length >= 3) {
      onSubmit(aiQuery);
      setShowSuggestions(false);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Input */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200',
        'bg-white/5 backdrop-blur-sm',
        focused
          ? 'border-purple-500/60 shadow-[0_0_0_3px_rgba(139,92,246,0.15)]'
          : 'border-white/10 hover:border-white/20'
      )}>
        {isLoading ? (
          <Loader2 className="h-5 w-5 text-purple-400 animate-spin flex-shrink-0" />
        ) : (
          <Sparkles className="h-5 w-5 text-purple-400 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          value={aiQuery}
          onChange={e => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder="Ej: creador UGC para skincare en Medellín menos de $100..."
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
        />
        {aiQuery && (
          <button
            onClick={() => {
              onChange('');
              onSubmit('');
            }}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Chips de intent detectado */}
      {aiIntent && aiIntent.confidence >= 40 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {aiIntent.roles.slice(0, 2).map(r => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/15 border border-purple-500/25 text-purple-300"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block" />
              {r.replace(/_/g, ' ')}
            </span>
          ))}
          {aiIntent.niches.slice(0, 2).map(n => (
            <span
              key={n}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-500/15 border border-pink-500/25 text-pink-300"
            >
              {n}
            </span>
          ))}
          {(aiIntent.city || aiIntent.country) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/8 border border-white/12 text-white/60">
              📍 {aiIntent.city || aiIntent.country}
            </span>
          )}
          {aiIntent.accepts_exchange && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 border border-green-500/25 text-green-300">
              🔄 Acepta canje
            </span>
          )}
          {aiIntent.price_max && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 border border-amber-500/25 text-amber-300">
              💰 Max ${aiIntent.price_max}
            </span>
          )}
        </div>
      )}

      {/* Sugerencias */}
      {showSuggestions && suggestions.length > 0 && !aiQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#111120] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-widest font-semibold border-b border-white/5">
            Sugerencias
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => {
                onChange(s);
                onSubmit(s);
                setShowSuggestions(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
