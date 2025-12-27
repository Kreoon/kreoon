import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PresenceIndicatorProps {
  isOnline: boolean;
  lastSeen?: string | null;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PresenceIndicator({
  isOnline,
  lastSeen,
  showText = false,
  size = 'sm',
  className
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  const getLastSeenText = () => {
    if (isOnline) return 'En línea';
    if (!lastSeen) return 'Desconectado';
    
    try {
      const date = new Date(lastSeen);
      const distance = formatDistanceToNow(date, { addSuffix: true, locale: es });
      return `Última vez ${distance}`;
    } catch {
      return 'Desconectado';
    }
  };

  const indicator = (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Circle
        className={cn(
          sizeClasses[size],
          'fill-current',
          isOnline 
            ? 'text-green-500' 
            : lastSeen 
              ? 'text-yellow-500' 
              : 'text-muted-foreground'
        )}
      />
      {showText && (
        <span className={cn(
          'text-xs',
          isOnline ? 'text-green-600' : 'text-muted-foreground'
        )}>
          {getLastSeenText()}
        </span>
      )}
    </div>
  );

  if (showText) return indicator;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {getLastSeenText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
