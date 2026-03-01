/**
 * LiveBadge - Indicador de "En Vivo" para perfiles de creadores
 */

import { cn } from '@/lib/utils';
import { Radio } from 'lucide-react';

interface LiveBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  onClick?: () => void;
}

export function LiveBadge({
  className,
  size = 'sm',
  pulse = true,
  onClick,
}: LiveBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 bg-red-600 text-white font-medium rounded',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:bg-red-700 transition-colors',
        className
      )}
    >
      <span
        className={cn(
          'bg-white rounded-full',
          iconSizes[size],
          pulse && 'animate-pulse'
        )}
      />
      EN VIVO
    </span>
  );
}

/**
 * LiveBadgeOverlay - Badge para superponer en imágenes/avatares
 */
interface LiveBadgeOverlayProps {
  isLive: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onClick?: () => void;
}

export function LiveBadgeOverlay({
  isLive,
  position = 'bottom-left',
  onClick,
}: LiveBadgeOverlayProps) {
  if (!isLive) return null;

  const positionClasses = {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1',
    'bottom-left': 'bottom-1 left-1',
    'bottom-right': 'bottom-1 right-1',
  };

  return (
    <div className={cn('absolute z-10', positionClasses[position])}>
      <LiveBadge size="sm" onClick={onClick} />
    </div>
  );
}
