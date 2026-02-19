import { motion } from 'framer-motion';
import {
  Lock,
  User,
  Edit,
  Upload,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EscrowTimelineStep } from '../../types';

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Lock,
  User,
  Edit,
  Upload,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
};

interface EscrowTimelineProps {
  steps: EscrowTimelineStep[];
  className?: string;
}

export function EscrowTimeline({ steps, className }: EscrowTimelineProps) {
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
                  'absolute left-5 top-12 w-0.5 h-full -ml-px',
                  step.status === 'completed'
                    ? 'bg-emerald-500/50'
                    : 'bg-[hsl(270,100%,60%,0.1)]'
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0',
                step.status === 'completed' && 'bg-emerald-500/20',
                step.status === 'current' && 'bg-[hsl(270,100%,60%,0.2)] ring-2 ring-[hsl(270,100%,60%,0.4)]',
                step.status === 'pending' && 'bg-[hsl(270,100%,60%,0.05)]',
                step.status === 'skipped' && 'bg-gray-500/10'
              )}
            >
              {step.status === 'completed' ? (
                <Check className="h-5 w-5 text-emerald-400" />
              ) : (
                <Icon
                  className={cn(
                    'h-5 w-5',
                    step.status === 'current' && 'text-primary',
                    step.status === 'pending' && 'text-muted-foreground',
                    step.status === 'skipped' && 'text-gray-500'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    'font-medium',
                    step.status === 'completed' && 'text-emerald-400',
                    step.status === 'current' && 'text-white',
                    step.status === 'pending' && 'text-muted-foreground',
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
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
              {step.timestamp && (
                <p className="text-xs text-[hsl(270,30%,45%)] mt-1">
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
