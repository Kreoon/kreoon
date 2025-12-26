import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  className?: string;
  showTimestamp?: boolean;
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  className,
  showTimestamp = true,
}: AutoSaveIndicatorProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Guardando...</span>
          </>
        );
      case 'saved':
        return (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Guardado</span>
          </>
        );
      case 'error':
        return (
          <>
            <CloudOff className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Error al guardar</span>
          </>
        );
      default:
        if (lastSaved && showTimestamp) {
          return (
            <>
              <Cloud className="h-3 w-3 text-muted-foreground" />
              <span>
                Guardado{' '}
                {formatDistanceToNow(lastSaved, {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            </>
          );
        }
        return null;
    }
  };

  const content = getStatusContent();
  
  if (!content) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity',
        className
      )}
    >
      {content}
    </div>
  );
}
