import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  /** Variante de tamaño: 'compact' para pill, 'card' para tarjeta con descripción */
  variant?: 'compact' | 'card';
}

export function QuickAction({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
  variant = 'card',
}: QuickActionProps) {
  // Variante compacta (pill) - sin descripción
  if (variant === 'compact' || !description) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5',
          'bg-violet-500/8 border border-violet-500/15 rounded-full',
          'text-violet-300 text-[11.5px] font-medium',
          'transition-all duration-150 whitespace-nowrap',
          'hover:bg-violet-500/18 hover:border-violet-500/30',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </button>
    );
  }

  // Variante card - con descripción
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-start gap-0.5 p-2',
        'bg-violet-500/5 border border-violet-500/15 rounded-sm',
        'transition-all duration-150',
        'hover:bg-violet-500/12 hover:border-violet-500/25',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'text-left w-full'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[11px] font-medium text-violet-300">{label}</span>
      </div>
      <span className="text-[9px] text-gray-500 pl-5">{description}</span>
    </button>
  );
}
