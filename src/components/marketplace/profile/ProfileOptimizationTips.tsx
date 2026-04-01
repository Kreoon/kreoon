import { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OptimizationTipStatus = 'completed' | 'pending' | 'optional';

export interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  points: number;
  status: OptimizationTipStatus;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ProfileOptimizationTipsProps {
  tips: OptimizationTip[];
  className?: string;
  maxVisible?: number;
  title?: string;
  /** En mobile, colapsa la lista si hay más de este número de items. Default: 3 */
  mobileCollapseThreshold?: number;
}

const STATUS_CONFIG: Record<
  OptimizationTipStatus,
  { icon: React.ReactNode; labelClass: string; rowClass: string; statusText: string }
> = {
  completed: {
    icon: (
      <CheckCircle2
        className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
        aria-hidden="true"
      />
    ),
    labelClass: 'text-emerald-700 dark:text-emerald-400',
    rowClass: 'opacity-60',
    statusText: 'Completado',
  },
  pending: {
    icon: (
      <Circle
        className="h-4 w-4 text-amber-600 dark:text-yellow-400 flex-shrink-0"
        aria-hidden="true"
      />
    ),
    labelClass: 'text-amber-700 dark:text-yellow-400',
    rowClass: '',
    statusText: 'Pendiente',
  },
  optional: {
    icon: (
      <Circle
        className="h-4 w-4 text-zinc-400 dark:text-gray-500 flex-shrink-0"
        aria-hidden="true"
      />
    ),
    labelClass: 'text-zinc-500 dark:text-gray-500',
    rowClass: 'opacity-70',
    statusText: 'Opcional',
  },
};

export function ProfileOptimizationTips({
  tips,
  className,
  maxVisible,
  title = 'Optimiza tu perfil',
  mobileCollapseThreshold = 3,
}: ProfileOptimizationTipsProps) {
  const visibleTips = maxVisible ? tips.slice(0, maxVisible) : tips;
  const completedCount = tips.filter((t) => t.status === 'completed').length;
  const pendingPoints = tips
    .filter((t) => t.status !== 'completed')
    .reduce((sum, t) => sum + t.points, 0);

  // Estado para controlar el colapso en mobile
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const shouldCollapse = visibleTips.length > mobileCollapseThreshold;
  const displayedTips =
    shouldCollapse && !mobileExpanded
      ? visibleTips.slice(0, mobileCollapseThreshold)
      : visibleTips;

  const hiddenCount = visibleTips.length - mobileCollapseThreshold;

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="opt-tips-heading">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          id="opt-tips-heading"
          className="text-zinc-900 dark:text-white font-semibold text-sm"
        >
          {title}
        </h3>
        <span
          className="text-zinc-400 dark:text-gray-500 text-xs"
          aria-label={`${completedCount} de ${tips.length} pasos completados`}
        >
          {completedCount}/{tips.length} completados
        </span>
      </div>

      {/* Resumen de puntos pendientes */}
      {pendingPoints > 0 && (
        <p className="text-zinc-500 dark:text-gray-400 text-xs" aria-live="polite">
          Puedes ganar{' '}
          <span className="text-amber-600 dark:text-yellow-400 font-semibold">
            +{pendingPoints} puntos
          </span>{' '}
          completando los pasos pendientes.
        </p>
      )}

      {/* Lista de tips */}
      <ul
        className="space-y-2"
        aria-label="Consejos de optimización de perfil"
      >
        {displayedTips.map((tip) => {
          const config = STATUS_CONFIG[tip.status];
          return (
            <li
              key={tip.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg',
                'bg-white/5 dark:bg-white/5 bg-zinc-50',
                'border border-white/10 dark:border-white/10 border-zinc-200',
                'transition-colors duration-150',
                tip.status === 'pending' &&
                  'border-amber-300/40 dark:border-yellow-400/20',
                config.rowClass,
              )}
              aria-label={`${config.statusText}: ${tip.title} — ${tip.points} puntos`}
            >
              {/* Icono de estado */}
              <div className="mt-0.5 min-w-[1rem]" aria-hidden="true">
                {config.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-sm font-medium leading-tight',
                      tip.status === 'completed'
                        ? 'text-zinc-400 dark:text-gray-400 line-through'
                        : 'text-zinc-900 dark:text-white',
                    )}
                  >
                    {tip.title}
                  </p>
                  <span
                    className={cn(
                      'text-xs font-semibold flex-shrink-0 tabular-nums',
                      config.labelClass,
                    )}
                    aria-hidden="true"
                  >
                    +{tip.points} pts
                  </span>
                </div>

                {tip.status !== 'completed' && (
                  <p className="text-zinc-400 dark:text-gray-500 text-xs mt-0.5 leading-snug">
                    {tip.description}
                  </p>
                )}

                {/* CTA — touch target >= 44px con padding aumentado */}
                {tip.status === 'pending' && tip.actionLabel && tip.onAction && (
                  <button
                    onClick={tip.onAction}
                    className={cn(
                      'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                      'text-purple-600 dark:text-purple-400',
                      'hover:text-purple-700 dark:hover:text-purple-300',
                      'transition-colors duration-150',
                      // Focus visible alineado con Nova design system
                      'focus-visible:outline-none focus-visible:ring-2',
                      'focus-visible:ring-purple-500 focus-visible:ring-offset-2',
                      'focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',
                      'rounded-sm',
                      // Touch target mínimo 44px — padding vertical compensa el text-xs
                      'py-2 -my-2',
                    )}
                    aria-label={`${tip.actionLabel} para "${tip.title}"`}
                  >
                    {tip.actionLabel}
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Botón colapsar/expandir — solo visible en mobile cuando aplica */}
      {shouldCollapse && (
        <button
          onClick={() => setMobileExpanded((prev) => !prev)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5',
            'text-zinc-400 dark:text-gray-500 text-xs',
            'hover:text-zinc-600 dark:hover:text-gray-300',
            'transition-colors duration-150',
            // Touch target >= 44px
            'min-h-[44px]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-purple-500 focus-visible:ring-offset-2',
            'focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',
            'rounded-sm',
          )}
          aria-expanded={mobileExpanded}
          aria-controls="opt-tips-collapsible"
        >
          {mobileExpanded ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              +{hiddenCount} consejos más disponibles
            </>
          )}
        </button>
      )}

      {/* Indicador estático de más items — cuando maxVisible limita, sin toggle */}
      {!shouldCollapse && maxVisible !== undefined && tips.length > maxVisible && (
        <p className="text-zinc-400 dark:text-gray-500 text-xs text-center" aria-live="polite">
          +{tips.length - maxVisible} consejos más disponibles
        </p>
      )}
    </section>
  );
}
