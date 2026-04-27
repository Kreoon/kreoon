import { useRef, useState } from 'react';
import { Trophy, ShieldCheck, Shield, Clock, Sparkles, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrustScoreBreakdown {
  reviews: number;
  delivery: number;
  projects: number;
  profile: number;
  portfolio: number;
  response: number;
}

export interface TrustScoreBadgeProps {
  score: number;
  breakdown?: TrustScoreBreakdown;
  isNew?: boolean;
  showRating?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  compact?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Puntuación mínima visible — nunca mostrar 0 */
const MIN_DISPLAY_SCORE = 3.0;

/** Máximo por cada dimensión del breakdown (suman 100) */
const BREAKDOWN_MAX: Record<keyof TrustScoreBreakdown, number> = {
  reviews: 30,
  delivery: 25,
  projects: 20,
  profile: 10,
  portfolio: 10,
  response: 5,
};

const BREAKDOWN_LABELS: Record<keyof TrustScoreBreakdown, string> = {
  reviews: 'Reseñas',
  delivery: 'Entregas',
  projects: 'Proyectos',
  profile: 'Perfil',
  portfolio: 'Portfolio',
  response: 'Respuesta',
};

// Orden fijo de dimensiones en el desglose
const BREAKDOWN_ORDER: Array<keyof TrustScoreBreakdown> = [
  'reviews',
  'delivery',
  'projects',
  'profile',
  'portfolio',
  'response',
];

/** Delay en ms antes de cerrar el popover al salir el mouse */
const HOVER_CLOSE_DELAY = 150;

// ---------------------------------------------------------------------------
// Score config helpers
// ---------------------------------------------------------------------------

interface ScoreConfig {
  label: string;
  Icon: React.ElementType;
  badgeClass: string;
  barClass: string;
  scoreTextClass: string;
}

function getScoreConfig(score: number, isNew: boolean): ScoreConfig {
  if (isNew || score === 0) {
    return {
      label: 'Perfil nuevo',
      Icon: Sparkles,
      badgeClass:
        'bg-transparent border border-purple-500/40 text-purple-400 hover:border-purple-500/60',
      barClass: 'bg-purple-500',
      scoreTextClass: 'text-purple-400',
    };
  }
  if (score >= 90) {
    return {
      label: 'Excelente',
      Icon: Trophy,
      badgeClass:
        'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
      barClass: 'bg-amber-400',
      scoreTextClass: 'text-amber-400',
    };
  }
  if (score >= 75) {
    return {
      label: 'Muy confiable',
      Icon: ShieldCheck,
      badgeClass:
        'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
      barClass: 'bg-emerald-400',
      scoreTextClass: 'text-emerald-400',
    };
  }
  if (score >= 60) {
    return {
      label: 'Confiable',
      Icon: Shield,
      badgeClass:
        'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
      barClass: 'bg-blue-400',
      scoreTextClass: 'text-blue-400',
    };
  }
  return {
    label: 'En desarrollo',
    Icon: Clock,
    badgeClass:
      'bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/20',
    barClass: 'bg-zinc-400',
    scoreTextClass: 'text-zinc-400',
  };
}

function getCompactScoreClass(score: number, isNew: boolean): string {
  if (isNew || score === 0) return 'text-purple-400';
  if (score >= 90) return 'text-amber-400';
  if (score >= 75) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  return 'text-zinc-400';
}

/** Nunca mostrar 0 — mínimo visual es MIN_DISPLAY_SCORE */
function resolveDisplayScore(score: number, isNew: boolean): number {
  if (isNew || score === 0) return MIN_DISPLAY_SCORE;
  return score;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface BreakdownRowProps {
  label: string;
  value: number;
  max: number;
  barClass: string;
}

function BreakdownRow({ label, value, max, barClass }: BreakdownRowProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 flex-shrink-0 text-[11px] text-white/60 leading-none">
        {label}
      </span>
      <div
        className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${value} de ${max}`}
      >
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-300', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 flex-shrink-0 text-right text-[11px] text-white/40 tabular-nums leading-none">
        {value}/{max}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TrustScoreBadge({
  score,
  breakdown,
  isNew = false,
  showRating = false,
  ratingAvg,
  ratingCount,
  compact = false,
  className,
}: TrustScoreBadgeProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = getScoreConfig(score, isNew);
  const displayScore = resolveDisplayScore(score, isNew);
  const mainBarPct = Math.min(100, isNew || score === 0 ? 0 : score);

  // ----- Hover handlers for trigger -----
  function handleTriggerEnter() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  }

  function handleTriggerLeave() {
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }

  // ----- Hover handlers for popover content -----
  function handleContentEnter() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  function handleContentLeave() {
    closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }

  // ------------------------------------------------------------------
  // Compact mode — badge pill visible con score
  // ------------------------------------------------------------------
  if (compact) {
    // Determinar colores y estilos según score
    const getScoreStyles = () => {
      if (score >= 90) {
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          text: 'text-white',
          shadow: 'shadow-lg shadow-amber-500/30',
          label: 'TOP'
        };
      }
      if (score >= 75) {
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-teal-500',
          text: 'text-white',
          shadow: 'shadow-lg shadow-emerald-500/30',
          label: 'PRO'
        };
      }
      if (score >= 60) {
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          text: 'text-white',
          shadow: 'shadow-lg shadow-blue-500/25',
          label: null
        };
      }
      // Score < 60 (nuevos o en desarrollo)
      return {
        bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
        text: 'text-white',
        shadow: 'shadow-lg shadow-purple-500/25',
        label: 'NEW'
      };
    };

    const styles = getScoreStyles();

    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
          'text-xs font-bold tabular-nums',
          styles.bg,
          styles.text,
          styles.shadow,
          className,
        )}
        role="img"
        aria-label={`Trust Score: ${score}`}
        title={config.label}
      >
        <config.Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm">{score}</span>
        {styles.label && (
          <span className="text-[9px] font-semibold opacity-90 ml-0.5">{styles.label}</span>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Full mode — pill badge + hover popover con desglose
  // ------------------------------------------------------------------
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
            'text-[11px] font-semibold select-none cursor-default',
            'transition-all duration-200',
            config.badgeClass,
            className,
          )}
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeave}
          aria-label={`Trust Score: ${config.label}${!isNew ? `, ${displayScore} de 100` : ''}`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <config.Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{config.label}</span>
          {!isNew && (
            <span className="opacity-70 font-normal">{displayScore}</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        className={cn(
          'w-64 p-0 rounded-xl overflow-hidden',
          'border border-white/10',
          'bg-black/80 backdrop-blur-sm',
          'shadow-xl shadow-black/40',
          // override popover default background
          '!bg-[rgba(10,10,28,0.92)] [--popover-bg:transparent]',
        )}
        // Mantener abierto mientras el mouse está sobre el panel
        onMouseEnter={handleContentEnter}
        onMouseLeave={handleContentLeave}
        // Evitar que el foco salte automáticamente al abrir
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-3.5 pt-3 pb-2.5 border-b border-white/8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-white/90">
              Trust Score
            </span>
            <span
              className={cn('text-[13px] font-bold tabular-nums', config.scoreTextClass)}
            >
              {isNew ? '—' : `${displayScore}/100`}
            </span>
          </div>

          {/* Barra de progreso principal */}
          <div
            className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden"
            role="progressbar"
            aria-valuenow={isNew ? 0 : score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Trust Score: ${isNew ? 0 : score} de 100`}
          >
            {!isNew && score > 0 && (
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                  config.barClass,
                )}
                style={{ width: `${mainBarPct}%` }}
              />
            )}
          </div>

          {/* Label de estado */}
          <p className="mt-1.5 text-[11px] text-white/50">
            {config.label}
          </p>
        </div>

        {/* Rating tradicional (opcional) */}
        {showRating && ratingAvg !== undefined && ratingCount !== undefined && ratingCount > 0 && (
          <div className="px-3.5 py-2 border-b border-white/8 flex items-center justify-between">
            <span className="text-[11px] text-white/60">Rating de clientes</span>
            <div
              className="flex items-center gap-1"
              aria-label={`Calificacion: ${ratingAvg.toFixed(1)} de 5, ${ratingCount} reseñas`}
            >
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span className="text-[12px] font-semibold text-white/90 tabular-nums">
                {ratingAvg.toFixed(1)}
              </span>
              <span className="text-[11px] text-white/40 tabular-nums">
                ({ratingCount})
              </span>
            </div>
          </div>
        )}

        {/* Desglose por dimensión */}
        {breakdown && (
          <div className="px-3.5 py-3 space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1">
              Desglose
            </p>
            {BREAKDOWN_ORDER.map((key) => (
              <BreakdownRow
                key={key}
                label={BREAKDOWN_LABELS[key]}
                value={breakdown[key]}
                max={BREAKDOWN_MAX[key]}
                barClass={config.barClass}
              />
            ))}
          </div>
        )}

        {/* Footer explicativo para perfil nuevo */}
        {isNew && (
          <div className="px-3.5 pb-3 pt-2">
            <p className="text-[11px] text-white/40 leading-relaxed">
              El Trust Score se construye con el tiempo. Completa tu perfil y consigue tus primeros proyectos para comenzar.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
