import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectWorkflow } from '@/types/workflows';
import { getCurrentPhaseIndex } from '@/types/workflows';

interface WorkflowProgressBarProps {
  workflow: ProjectWorkflow;
  currentStatus: string;
}

export function WorkflowProgressBar({ workflow, currentStatus }: WorkflowProgressBarProps) {
  const phases = workflow.phases;
  const currentIndex = getCurrentPhaseIndex(workflow, currentStatus);

  // Don't render if only 1 phase or status not found in any phase
  if (phases.length <= 1 || currentIndex < 0) return null;

  return (
    <>
      {/* Desktop: horizontal stepper (hidden on small screens) */}
      <div className="hidden sm:flex items-center w-full" role="list" aria-label="Progreso del workflow">
        {phases.map((phase, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLast = i === phases.length - 1;

          return (
            <div key={phase.id} className={cn('flex items-center', !isLast && 'flex-1')} role="listitem">
              {/* Circle + Label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1',
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-[10px] leading-tight text-center whitespace-nowrap max-w-[80px] truncate',
                    isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {phase.name}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 mt-[-18px]">
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full transition-colors',
                      i < currentIndex ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact indicator (visible only on small screens) */}
      <div className="flex sm:hidden items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          Fase {currentIndex + 1} de {phases.length}
        </span>
        <span className="text-xs font-semibold text-foreground truncate">
          {phases[currentIndex]?.name}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {phases.map((phase, i) => (
            <div
              key={phase.id}
              className={cn(
                'rounded-full transition-colors',
                i === currentIndex ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5',
                i < currentIndex && 'bg-primary',
                i > currentIndex && 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}
