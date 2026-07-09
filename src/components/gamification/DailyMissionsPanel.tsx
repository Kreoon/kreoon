import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDailyMissions } from '@/hooks/useDailyMissions';
import { KreoonSkeleton } from '@/components/ui/kreoon/KreoonSkeleton';
import { Progress } from '@/components/ui/progress';
import { KiroConfetti, KiroConfettiHandle } from '@/components/kiro/animations/KiroConfetti';

interface DailyMissionsPanelProps {
  className?: string;
}

export function DailyMissionsPanel({ className }: DailyMissionsPanelProps) {
  const { missions, completedCount, total, isLoading } = useDailyMissions();
  const confettiRef = useRef<KiroConfettiHandle>(null);
  const prevCompletedRef = useRef<Set<string>>(new Set());
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
  }, []);

  useEffect(() => {
    const nowCompleted = new Set(missions.filter((m) => m.completed_at).map((m) => m.id));
    const hasNewCompletion = [...nowCompleted].some((id) => !prevCompletedRef.current.has(id));
    if (hasNewCompletion && prevCompletedRef.current.size > 0) {
      confettiRef.current?.trigger(reducedMotion ? 'mini' : 'celebration');
    }
    prevCompletedRef.current = nowCompleted;
  }, [missions, reducedMotion]);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <KreoonSkeleton key={i} variant="card" className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (total === 0) return null;

  const allDone = completedCount === total;

  return (
    <div className={cn('relative space-y-3', className)}>
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none">
        <KiroConfetti width={320} height={200} reducedMotion={reducedMotion} ref={confettiRef} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-kreoon-text-primary flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-kreoon-purple-400" aria-hidden="true" />
          Misiones de hoy
        </h3>
        <span className="text-xs font-semibold text-kreoon-text-muted tabular-nums">
          {completedCount}/{total}
        </span>
      </div>

      <ul className="space-y-2">
        {missions.map((m) => {
          const pct = Math.min(100, Math.round((m.progress / m.target_count) * 100));
          const done = !!m.completed_at;
          return (
            <li
              key={m.id}
              className={cn(
                'rounded-sm border p-3 transition-colors',
                done
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-kreoon-border bg-kreoon-bg-card'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span
                  className={cn(
                    'text-sm font-medium leading-snug',
                    done ? 'text-emerald-400 line-through' : 'text-kreoon-text-primary'
                  )}
                >
                  {m.title}
                </span>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 motion-safe:animate-scale-in" aria-hidden="true" />
                ) : (
                  <span className="text-xs font-semibold text-kreoon-purple-400 shrink-0 tabular-nums">
                    +{m.up_reward} UP
                  </span>
                )}
              </div>
              <Progress
                value={pct}
                className="h-2 bg-kreoon-bg-secondary"
                aria-label={`Progreso: ${m.progress} de ${m.target_count}`}
              />
              <span className="text-[11px] text-kreoon-text-muted mt-1 block tabular-nums">
                {m.progress}/{m.target_count}
              </span>
            </li>
          );
        })}
      </ul>

      {allDone && (
        <p className="text-center text-sm font-semibold text-emerald-400 pt-1">
          ¡Todas completas! 🎉
        </p>
      )}
    </div>
  );
}
