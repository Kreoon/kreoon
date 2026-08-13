import { ReactNode } from 'react';
import { Check, Clock, Loader2, AlertTriangle, Lock, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Una tarjeta del checklist. Cinco de estas, una debajo de otra.
 *
 * Reglas de la tarjeta:
 *  · un solo botón primario (`primaryAction`)
 *  · lo secundario ("Pedir un cambio") va discreto (`secondaryAction`)
 *  · el estado se dice en palabras, nunca en jerga
 */

export type StepState = 'done' | 'working' | 'ready' | 'attention' | 'locked';

const STATE_UI: Record<StepState, { label: string; icon: typeof Check; dot: string; text: string }> = {
  done: {
    label: 'Listo',
    icon: Check,
    dot: 'bg-emerald-500 text-white',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  working: {
    label: 'Lo estamos preparando',
    icon: Loader2,
    dot: 'bg-violet-500 text-white',
    text: 'text-violet-600 dark:text-violet-400',
  },
  ready: {
    label: 'Listo para que lo revises',
    icon: Clock,
    dot: 'bg-amber-500 text-white',
    text: 'text-amber-600 dark:text-amber-400',
  },
  attention: {
    label: 'Necesita atención',
    icon: AlertTriangle,
    dot: 'bg-red-500 text-white',
    text: 'text-red-600 dark:text-red-400',
  },
  locked: {
    label: 'Aún no empieza',
    icon: Lock,
    dot: 'bg-muted text-muted-foreground',
    text: 'text-muted-foreground',
  },
};

interface StepCardProps {
  number: number;
  title: string;
  /** Máximo dos líneas. Se dice qué pasa ahora, no qué es técnicamente. */
  description: string;
  state: StepState;
  /** Sobrescribe el texto de estado por defecto cuando hace falta ser más concreto. */
  stateLabel?: string;
  /** Última tarjeta: no pinta la línea que baja al siguiente paso. */
  isLast?: boolean;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  children?: ReactNode;
  /**
   * Volver a intentar un paso que se cayó. Solo se pinta en estado
   * 'attention', junto al estado y sin texto: un icono basta, y así no compite
   * con la acción principal de la tarjeta.
   */
  onRetry?: () => void;
  /** Reintento en curso: el icono gira y no se puede pulsar otra vez. */
  retrying?: boolean;
}

export function StepCard({
  number,
  title,
  description,
  state,
  stateLabel,
  isLast,
  primaryAction,
  secondaryAction,
  children,
  onRetry,
  retrying,
}: StepCardProps) {
  const ui = STATE_UI[state];
  const Icon = ui.icon;

  return (
    <div className="relative flex gap-3 sm:gap-4">
      {/* Riel: número + línea vertical */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0',
            ui.dot,
          )}
        >
          {state === 'done' ? (
            <Check className="w-5 h-5" />
          ) : state === 'working' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            number
          )}
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[16px] bg-border mt-2" />}
      </div>

      {/* Contenido */}
      <div
        className={cn(
          'flex-1 min-w-0 rounded-xl border bg-card p-4 mb-4',
          state === 'ready' && 'border-amber-300 dark:border-amber-800/60 shadow-sm',
          state === 'attention' && 'border-red-300 dark:border-red-900/60',
          state === 'locked' && 'opacity-70',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base leading-snug">{title}</h3>
          <span className={cn('flex items-center gap-1 text-xs shrink-0 pt-0.5', ui.text)}>
            <Icon className={cn('w-3.5 h-3.5', state === 'working' && 'animate-spin')} />
            <span className="hidden sm:inline">{stateLabel ?? ui.label}</span>

            {/* Solo icono, sin texto: si algo se cayó, lo que hace falta es
                poder reintentarlo, no leer una explicación. */}
            {state === 'attention' && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                title="Volver a intentar"
                aria-label="Volver a intentar"
                className={cn(
                  'ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full',
                  'text-muted-foreground transition-colors',
                  'hover:bg-muted hover:text-foreground',
                  'disabled:opacity-50 disabled:pointer-events-none',
                )}
              >
                <RotateCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
              </button>
            )}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>

        {/* Estado en móvil (el badge de arriba oculta su texto para no romper a 375px) */}
        <p className={cn('mt-2 text-xs sm:hidden', ui.text)}>{stateLabel ?? ui.label}</p>

        {children}

        {(primaryAction || secondaryAction) && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}
