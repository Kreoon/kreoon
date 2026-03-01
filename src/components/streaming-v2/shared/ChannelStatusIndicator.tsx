/**
 * ChannelStatusIndicator - Indicador de estado de canal
 */

import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { StreamingChannelStatus } from '@/types/streaming.types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChannelStatusIndicatorProps {
  status: StreamingChannelStatus;
  errorMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  StreamingChannelStatus,
  { label: string; icon: typeof Wifi; color: string; animate?: boolean }
> = {
  idle: {
    label: 'Inactivo',
    icon: WifiOff,
    color: 'text-gray-400',
  },
  connecting: {
    label: 'Conectando',
    icon: Loader2,
    color: 'text-yellow-400',
    animate: true,
  },
  live: {
    label: 'En vivo',
    icon: Wifi,
    color: 'text-green-400',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    color: 'text-red-400',
  },
  ended: {
    label: 'Finalizado',
    icon: CheckCircle,
    color: 'text-gray-400',
  },
};

const SIZE_CLASSES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function ChannelStatusIndicator({
  status,
  errorMessage,
  size = 'md',
  showLabel = false,
  className,
}: ChannelStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const indicator = (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon
        className={cn(
          SIZE_CLASSES[size],
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      {showLabel && (
        <span className={cn('text-sm', config.color)}>{config.label}</span>
      )}
    </span>
  );

  if (status === 'error' && errorMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{indicator}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{errorMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
}

export default ChannelStatusIndicator;
