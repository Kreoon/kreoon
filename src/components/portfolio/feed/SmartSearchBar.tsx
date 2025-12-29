import { useState, useCallback } from 'react';
import { Search, X, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePortfolioAI } from '@/hooks/usePortfolioAI';
import { usePortfolioAIConfig } from '@/hooks/usePortfolioAIConfig';
import { toast } from 'sonner';

interface SmartSearchBarProps {
  className?: string;
  onSearch?: (query: string, aiResults?: { keywords: string[]; categories: string[] }) => void;
}

export default function SmartSearchBar({ className, onSearch }: SmartSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { semanticSearch, loading: aiLoading } = usePortfolioAI();
  const { isFeatureEnabled } = usePortfolioAIConfig();
  const aiSearchEnabled = isFeatureEnabled('ai_search');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    if (aiSearchEnabled) {
      const result = await semanticSearch(query);
      if (result) {
        toast.success('Búsqueda inteligente aplicada');
        onSearch?.(query, { keywords: result.keywords, categories: result.categories });
      } else {
        onSearch?.(query);
      }
    } else {
      onSearch?.(query);
    }
  }, [query, aiSearchEnabled, semanticSearch, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={aiSearchEnabled ? "Buscar con IA..." : "Buscar creadores, contenido..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={handleKeyDown}
          className={cn("pl-10", aiSearchEnabled ? "pr-20" : "pr-10")}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {aiSearchEnabled && query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary"
              onClick={handleSearch}
              disabled={aiLoading}
              title="Búsqueda inteligente"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
          )}
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { setQuery(''); setIsExpanded(false); }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* AI Search indicator */}
      {aiSearchEnabled && isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-muted/80 backdrop-blur rounded-lg border text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-primary" />
          Búsqueda inteligente activa - prueba "creadores de fitness en Medellín"
        </div>
      )}
    </div>
  );
}
