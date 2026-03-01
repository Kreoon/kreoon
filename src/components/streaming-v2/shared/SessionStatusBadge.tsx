/**
 * SessionStatusBadge - Indicador visual de estado de sesión
 */

import { cn } from '@/lib/utils';
import type { StreamingSessionStatus } from '@/types/streaming.types';

interface SessionStatusBadgeProps {
  status: StreamingSessionStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  StreamingSessionStatus,
  { label: string; color: string; bgColor: string; pulse?: boolean }
> = {
  draft: {
    label: 'Borrador',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  scheduled: {
    label: 'Programado',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  preparing: {
    label: 'Preparando',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    pulse: true,
  },
  live: {
    label: 'EN VIVO',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    pulse: true,
  },
  paused: {
    label: 'Pausado',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  ended: {
    label: 'Finalizado',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function SessionStatusBadge({
  status,
  size = 'md',
  showPulse = true,
  className,
}: SessionStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.color,
        SIZE_CLASSES[size],
        className
      )}
    >
      {showPulse && config.pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              status === 'live' ? 'bg-red-400' : 'bg-yellow-400'
            )}
          />
          <span
            className={cn(
              'relative inline-flex h-2 w-2 rounded-full',
              status === 'live' ? 'bg-red-500' : 'bg-yellow-500'
            )}
          />
        </span>
      )}
      {config.label}
    </span>
  );
}

export default SessionStatusBadge;
