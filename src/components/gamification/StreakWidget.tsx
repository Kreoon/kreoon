import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStreak } from '@/hooks/useStreak';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';

interface StreakWidgetProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function StreakWidget({ size = 'md', className }: StreakWidgetProps) {
  const { currentStreak, longestStreak, isAtRisk, isBroken, isLoading } = useStreak();

  if (isLoading) {
    return <KreoonSkeleton variant="rectangular" className={cn('h-9 w-16 rounded-full', className)} />;
  }

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-1.5 h-9 min-w-[44px] px-2.5 rounded-full border transition-colors',
            'border-kreoon-border bg-kreoon-bg-card hover:bg-kreoon-purple-500/10',
            isAtRisk && 'motion-safe:animate-pulse border-amber-500/50',
            className
          )}
          aria-label={
            isBroken
              ? 'Racha rota — revívela hoy'
              : `Racha de ${currentStreak} ${currentStreak === 1 ? 'día' : 'días'}${isAtRisk ? ', en riesgo' : ''}`
          }
        >
          <Flame
            className={cn(
              iconSize,
              isBroken
                ? 'text-kreoon-text-muted'
                : isAtRisk
                ? 'text-amber-500'
                : 'text-kreoon-purple-400 fill-current motion-safe:drop-shadow-[0_0_6px_var(--nova-accent-glow)]'
            )}
          />
          <span className={cn(textSize, 'font-bold text-kreoon-text-primary tabular-nums')}>
            {currentStreak}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 bg-kreoon-bg-card border-kreoon-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame className={cn('h-6 w-6', isBroken ? 'text-kreoon-text-muted' : 'text-kreoon-purple-400 fill-current')} />
          <div>
            <p className="text-sm font-bold text-kreoon-text-primary">
              {isBroken ? 'Racha rota' : `${currentStreak} ${currentStreak === 1 ? 'día' : 'días'} seguidos`}
            </p>
            <p className="text-xs text-kreoon-text-muted">Récord: {longestStreak} días</p>
          </div>
        </div>

        {isAtRisk && (
          <p className="text-xs text-amber-500">
            Sin actividad hoy todavía — revívela antes de medianoche.
          </p>
        )}
        <p className="text-xs text-kreoon-text-muted mt-1">
          Reacciona, entrega o completa una lección para sumar hoy.
        </p>
      </PopoverContent>
    </Popover>
  );
}
