import { motion } from 'framer-motion';
import {
  DollarSign,
  User,
  Film,
  Package,
  Unlock,
  Check,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EscrowTimelineStep } from '../../types';

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  User,
  Film,
  Package,
  Unlock,
  Lock: DollarSign,
  Edit: Film,
  Upload: Package,
  CheckCircle: Unlock,
};

type StepStatus = 'completed' | 'current' | 'pending' | 'skipped' | 'error';

interface EscrowTimelineEnhancedProps {
  steps: EscrowTimelineStep[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EscrowTimelineEnhanced({
  steps,
  orientation = 'vertical',
  size = 'md',
  className,
}: EscrowTimelineEnhancedProps) {
  if (orientation === 'horizontal') {
    return (
      <HorizontalTimeline steps={steps} size={size} className={className} />
    );
  }

  return (
    <VerticalTimeline steps={steps} size={size} className={className} />
  );
}

// Horizontal Timeline Component
function HorizontalTimeline({
  steps,
  size,
  className,
}: {
  steps: EscrowTimelineStep[];
  size: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  const dotSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <TooltipProvider>
      <div className={cn('flex items-center justify-between', className)}>
        {steps.map((step, index) => {
          const Icon = STEP_ICONS[step.icon] || Clock;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step dot */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-center justify-center rounded-full shrink-0 cursor-pointer',
                      dotSize,
                      step.status === 'completed' && 'bg-emerald-500/20',
                      step.status === 'current' && 'bg-[hsl(270,100%,60%,0.2)] ring-2 ring-[hsl(270,100%,60%,0.4)]',
                      step.status === 'pending' && 'bg-[hsl(270,100%,60%,0.05)]',
                      step.status === 'error' && 'bg-red-500/20',
                      step.status === 'skipped' && 'bg-gray-500/10'
                    )}
                  >
                    {step.status === 'completed' ? (
                      <Check className={cn(iconSize, 'text-emerald-400')} />
                    ) : step.status === 'error' ? (
                      <AlertTriangle className={cn(iconSize, 'text-red-400')} />
                    ) : (
                      <Icon
                        className={cn(
                          iconSize,
                          step.status === 'current' && 'text-[hsl(270,100%,70%)]',
                          step.status === 'pending' && 'text-[hsl(270,30%,50%)]',
                          step.status === 'skipped' && 'text-gray-500'
                        )}
                      />
                    )}
                    {step.status === 'current' && (
                      <span className="absolute flex h-full w-full">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(270,100%,60%)] opacity-30" />
                      </span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{step.label}</p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  )}
                  {step.timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(step.timestamp).toLocaleDateString('es-CO', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1',
                    step.status === 'completed'
                      ? 'bg-emerald-500/50'
                      : 'bg-[hsl(270,100%,60%,0.1)]'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels below (only for md and lg) */}
      {size !== 'sm' && (
        <div className="flex items-start justify-between mt-2">
          {steps.map((step, index) => (
            <div
              key={`label-${step.key}`}
              className={cn(
                'text-center flex-1 last:flex-none',
                size === 'md' ? 'max-w-[80px]' : 'max-w-[100px]'
              )}
            >
              <p
                className={cn(
                  'text-xs truncate',
                  step.status === 'completed' && 'text-emerald-400',
                  step.status === 'current' && 'text-white',
                  step.status === 'pending' && 'text-[hsl(270,30%,50%)]',
                  step.status === 'error' && 'text-red-400',
                  step.status === 'skipped' && 'text-gray-500'
                )}
              >
                {step.label.split(' ')[0]}
              </p>
            </div>
          ))}
        </div>
      )}
    </TooltipProvider>
  );
}

// Vertical Timeline Component (enhanced version)
function VerticalTimeline({
  steps,
  size,
  className,
}: {
  steps: EscrowTimelineStep[];
  size: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6';
  const dotSize = size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : 'w-12 h-12';

  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const Icon = STEP_ICONS[step.icon] || Clock;
        const isLast = index === steps.length - 1;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex gap-4"
          >
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute w-0.5 -ml-px',
                  size === 'sm' ? 'left-4 top-10 h-full' : size === 'md' ? 'left-5 top-12 h-full' : 'left-6 top-14 h-full',
                  step.status === 'completed'
                    ? 'bg-emerald-500/50'
                    : step.status === 'error'
                      ? 'bg-red-500/30'
                      : 'bg-[hsl(270,100%,60%,0.1)]'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center rounded-full shrink-0',
                dotSize,
                step.status === 'completed' && 'bg-emerald-500/20',
                step.status === 'current' && 'bg-[hsl(270,100%,60%,0.2)] ring-2 ring-[hsl(270,100%,60%,0.4)]',
                step.status === 'pending' && 'bg-[hsl(270,100%,60%,0.05)]',
                step.status === 'error' && 'bg-red-500/20',
                step.status === 'skipped' && 'bg-gray-500/10'
              )}
            >
              {step.status === 'completed' ? (
                <Check className={cn(iconSize, 'text-emerald-400')} />
              ) : step.status === 'error' ? (
                <AlertTriangle className={cn(iconSize, 'text-red-400')} />
              ) : (
                <Icon
                  className={cn(
                    iconSize,
                    step.status === 'current' && 'text-[hsl(270,100%,70%)]',
                    step.status === 'pending' && 'text-[hsl(270,30%,50%)]',
                    step.status === 'skipped' && 'text-gray-500'
                  )}
                />
              )}
              {step.status === 'current' && (
                <span className="absolute flex h-full w-full">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(270,100%,60%)] opacity-30" />
                </span>
              )}
            </div>

            {/* Content */}
            <div className={cn('flex-1', size === 'sm' ? 'pb-6' : size === 'md' ? 'pb-8' : 'pb-10')}>
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg',
                    'font-medium',
                    step.status === 'completed' && 'text-emerald-400',
                    step.status === 'current' && 'text-white',
                    step.status === 'pending' && 'text-[hsl(270,30%,60%)]',
                    step.status === 'error' && 'text-red-400',
                    step.status === 'skipped' && 'text-gray-500 line-through'
                  )}
                >
                  {step.label}
                </p>
                {step.status === 'current' && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[hsl(270,100%,60%)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(270,100%,60%)]" />
                  </span>
                )}
              </div>
              {step.description && (
                <p
                  className={cn(
                    'mt-0.5',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                    'text-[hsl(270,30%,50%)]'
                  )}
                >
                  {step.description}
                </p>
              )}
              {step.timestamp && (
                <p
                  className={cn(
                    'mt-1',
                    size === 'sm' ? 'text-[10px]' : 'text-xs',
                    'text-[hsl(270,30%,45%)]'
                  )}
                >
                  {new Date(step.timestamp).toLocaleDateString('es-CO', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
