import { Check, Clock, Loader2, Send, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WithdrawalDisplay, WithdrawalStatus } from '../../types';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  timestamp?: string;
}

function getTimelineSteps(withdrawal: WithdrawalDisplay): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // Step 1: Solicitado
  steps.push({
    id: 'requested',
    title: 'Solicitado',
    description: 'Solicitud recibida correctamente',
    status: 'completed',
    timestamp: withdrawal.formattedDate,
  });

  // Step 2: En proceso / Rechazado
  if (withdrawal.status === 'rejected') {
    steps.push({
      id: 'review',
      title: 'Revisión',
      description: withdrawal.rejection_reason || 'Solicitud rechazada',
      status: 'error',
      timestamp: withdrawal.formattedProcessedDate || undefined,
    });
  } else if (withdrawal.status === 'cancelled') {
    steps.push({
      id: 'cancelled',
      title: 'Cancelado',
      description: 'Solicitud cancelada por el usuario',
      status: 'error',
    });
  } else {
    steps.push({
      id: 'review',
      title: 'En revisión',
      description:
        withdrawal.status === 'pending'
          ? 'Esperando revisión del equipo'
          : 'Revisión completada',
      status:
        withdrawal.status === 'pending'
          ? 'current'
          : 'completed',
    });
  }

  // Step 3: Procesando (solo si no fue rechazado/cancelado)
  if (withdrawal.status !== 'rejected' && withdrawal.status !== 'cancelled') {
    steps.push({
      id: 'processing',
      title: 'Procesando pago',
      description:
        withdrawal.status === 'processing'
          ? 'Tu pago está siendo procesado'
          : withdrawal.status === 'completed'
            ? 'Pago procesado'
            : 'Pendiente de procesamiento',
      status:
        withdrawal.status === 'processing'
          ? 'current'
          : withdrawal.status === 'completed'
            ? 'completed'
            : 'pending',
    });
  }

  // Step 4: Completado (solo si no fue rechazado/cancelado)
  if (withdrawal.status !== 'rejected' && withdrawal.status !== 'cancelled') {
    steps.push({
      id: 'completed',
      title: 'Completado',
      description:
        withdrawal.status === 'completed'
          ? 'Pago enviado exitosamente'
          : 'Recibirás el dinero pronto',
      status: withdrawal.status === 'completed' ? 'completed' : 'pending',
      timestamp: withdrawal.formattedProcessedDate || undefined,
    });
  }

  return steps;
}

interface WithdrawalStatusTimelineProps {
  withdrawal: WithdrawalDisplay;
  className?: string;
}

export function WithdrawalStatusTimeline({
  withdrawal,
  className,
}: WithdrawalStatusTimelineProps) {
  const steps = getTimelineSteps(withdrawal);

  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              {/* Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  step.status === 'completed' && 'bg-emerald-500/20',
                  step.status === 'current' && 'bg-[hsl(270,100%,60%,0.2)]',
                  step.status === 'pending' && 'bg-[hsl(270,100%,60%,0.05)]',
                  step.status === 'error' && 'bg-red-500/20'
                )}
              >
                {step.status === 'completed' && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
                {step.status === 'current' && (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                )}
                {step.status === 'pending' && (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                {step.status === 'error' && (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
              </div>

              {/* Line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[40px]',
                    step.status === 'completed'
                      ? 'bg-emerald-500/30'
                      : step.status === 'error'
                        ? 'bg-red-500/30'
                        : 'bg-[hsl(270,100%,60%,0.1)]'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-6', isLast && 'pb-0')}>
              <p
                className={cn(
                  'font-medium',
                  step.status === 'completed' && 'text-emerald-400',
                  step.status === 'current' && 'text-white',
                  step.status === 'pending' && 'text-muted-foreground',
                  step.status === 'error' && 'text-red-400'
                )}
              >
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {step.description}
              </p>
              {step.timestamp && (
                <p className="text-xs text-[hsl(270,30%,45%)] mt-1">
                  {step.timestamp}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
