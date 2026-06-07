import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakFlameProps {
  days: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakFlame({ days, showLabel = true, size = 'md' }: StreakFlameProps) {
  // La llama se hace más intensa con días
  const color =
    days >= 100 ? '#fbbf24' :
    days >= 30  ? '#dc2626' :
    days >= 7   ? '#f97316' :
    '#71717a';

  const sizes = {
    sm: { icon: 'h-3 w-3', text: 'text-[10px]' },
    md: { icon: 'h-4 w-4', text: 'text-xs' },
    lg: { icon: 'h-6 w-6', text: 'text-base' },
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        days >= 7 && 'animate-pulse'
      )}
      title={`${days} días seguidos aprendiendo`}
    >
      <Flame
        className={cn(sizes[size].icon, days > 0 && 'fill-current')}
        style={{ color }}
      />
      {showLabel && (
        <span className={cn(sizes[size].text, 'font-bold')} style={{ color }}>
          {days}
        </span>
      )}
    </div>
  );
}
