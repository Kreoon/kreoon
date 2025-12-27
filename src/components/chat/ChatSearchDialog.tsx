import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, X, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useChatSearch, type SearchResult } from '@/hooks/useChatSearch';
import { cn } from '@/lib/utils';

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectResult?: (result: SearchResult) => void;
  conversationId?: string;
}

export function ChatSearchDialog({
  open,
  onOpenChange,
  onSelectResult,
  conversationId
}: ChatSearchDialogProps) {
  const [query, setQuery] = useState('');
  const { results, loading, searchMessages, clearResults } = useChatSearch();

  useEffect(() => {
    if (!open) {
      setQuery('');
      clearResults();
    }
  }, [open, clearResults]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchMessages(query, conversationId);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, conversationId, searchMessages, clearResults]);

  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar en mensajes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar mensajes..."
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                {query.length >= 2 
                  ? 'No se encontraron mensajes'
                  : 'Escribe al menos 2 caracteres para buscar'
                }
              </div>
            ) : (
              <div className="space-y-2">
                {results.map(result => (
                  <button
                    key={result.id}
                    onClick={() => {
                      onSelectResult?.(result);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      'hover:bg-accent hover:border-accent'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {result.sender_name || 'Usuario'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(result.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {highlightMatch(result.content, query)}
                    </p>
                    {result.conversation_name && !conversationId && (
                      <p className="text-xs text-primary mt-1">
                        en {result.conversation_name}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
