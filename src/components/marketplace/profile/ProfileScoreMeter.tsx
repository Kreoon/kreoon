import { useEffect, useRef, useState } from 'react';
import {
  User,
  Image,
  FileText,
  MapPin,
  Share2,
  DollarSign,
  Video,
  ImageIcon,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type ProfileScoreBreakdown,
  type ProfileScoreStatus,
  PROFILE_SCORE_FACTORS,
} from '@/lib/marketplace/rankingAlgorithm';

// ─── Re-export del tipo para consumers ────────────────────────────────────────

export type { ProfileScoreBreakdown };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfileScoreMeterProps {
  score: ProfileScoreBreakdown;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─── Constantes de configuración ─────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { px: 48, radius: 18, strokeWidth: 4, innerFontSize: '9px' },
  md: { px: 64, radius: 24, strokeWidth: 5, innerFontSize: '11px' },
  lg: { px: 80, radius: 30, strokeWidth: 6, innerFontSize: '13px' },
} as const;

const STATUS_META: Record<
  ProfileScoreStatus,
  {
    label: string;
    /** Texto del badge — compatible dark y light */
    textColor: string;
    /** Fondo del badge — compatible dark y light */
    bgColor: string;
    /** Borde del badge — compatible dark y light */
    borderColor: string;
    gradientStart: string;
    gradientEnd: string;
  }
> = {
  optimal: {
    label: 'Perfil óptimo',
    textColor: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    gradientStart: '#16a34a',
    gradientEnd: '#4ade80',
  },
  good: {
    label: 'Perfil completo',
    textColor: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    gradientStart: '#1d4ed8',
    gradientEnd: '#60a5fa',
  },
  incomplete: {
    label: 'Perfil incompleto',
    textColor: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    gradientStart: '#b45309',
    gradientEnd: '#fbbf24',
  },
  minimal: {
    label: 'Perfil mínimo',
    textColor: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    gradientStart: '#b91c1c',
    gradientEnd: '#f87171',
  },
};

/** Claves de los 9 factores del Profile Score */
type ProfileFactorKey = 'avatar' | 'banner' | 'bio' | 'location' | 'socialLinks' | 'pricing' | 'portfolioVideos' | 'portfolioImages' | 'videoQuality';

interface FactorMeta {
  key: ProfileFactorKey;
  label: string;
  hint: string;
  maxPoints: number;
  Icon: React.ComponentType<{ className?: string }>;
}

const FACTOR_META: FactorMeta[] = [
  {
    key: 'avatar',
    label: PROFILE_SCORE_FACTORS.avatar.label,
    hint: PROFILE_SCORE_FACTORS.avatar.description,
    maxPoints: PROFILE_SCORE_FACTORS.avatar.maxPoints,
    Icon: User,
  },
  {
    key: 'banner',
    label: PROFILE_SCORE_FACTORS.banner.label,
    hint: PROFILE_SCORE_FACTORS.banner.description,
    maxPoints: PROFILE_SCORE_FACTORS.banner.maxPoints,
    Icon: Image,
  },
  {
    key: 'bio',
    label: PROFILE_SCORE_FACTORS.bio.label,
    hint: PROFILE_SCORE_FACTORS.bio.description,
    maxPoints: PROFILE_SCORE_FACTORS.bio.maxPoints,
    Icon: FileText,
  },
  {
    key: 'location',
    label: PROFILE_SCORE_FACTORS.location.label,
    hint: PROFILE_SCORE_FACTORS.location.description,
    maxPoints: PROFILE_SCORE_FACTORS.location.maxPoints,
    Icon: MapPin,
  },
  {
    key: 'socialLinks',
    label: PROFILE_SCORE_FACTORS.socialLinks.label,
    hint: PROFILE_SCORE_FACTORS.socialLinks.description,
    maxPoints: PROFILE_SCORE_FACTORS.socialLinks.maxPoints,
    Icon: Share2,
  },
  {
    key: 'pricing',
    label: PROFILE_SCORE_FACTORS.pricing.label,
    hint: PROFILE_SCORE_FACTORS.pricing.description,
    maxPoints: PROFILE_SCORE_FACTORS.pricing.maxPoints,
    Icon: DollarSign,
  },
  {
    key: 'portfolioVideos',
    label: PROFILE_SCORE_FACTORS.portfolioVideos.label,
    hint: PROFILE_SCORE_FACTORS.portfolioVideos.description,
    maxPoints: PROFILE_SCORE_FACTORS.portfolioVideos.maxPoints,
    Icon: Video,
  },
  {
    key: 'portfolioImages',
    label: PROFILE_SCORE_FACTORS.portfolioImages.label,
    hint: PROFILE_SCORE_FACTORS.portfolioImages.description,
    maxPoints: PROFILE_SCORE_FACTORS.portfolioImages.maxPoints,
    Icon: ImageIcon,
  },
  {
    key: 'videoQuality',
    label: PROFILE_SCORE_FACTORS.videoQuality.label,
    hint: PROFILE_SCORE_FACTORS.videoQuality.description,
    maxPoints: PROFILE_SCORE_FACTORS.videoQuality.maxPoints,
    Icon: Sparkles,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** El status ya viene calculado en ProfileScoreBreakdown, pero esta función sirve
 *  para casos donde necesitemos recalcularlo desde el porcentaje */
function resolveStatus(percentage: number): ProfileScoreStatus {
  if (percentage >= 90) return 'optimal';
  if (percentage >= 70) return 'good';
  if (percentage >= 40) return 'incomplete';
  return 'minimal';
}

// ─── Hook: contador numérico animado ─────────────────────────────────────────

function useAnimatedCount(target: number, duration = 700): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cúbica
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}

// ─── Sub-componente: círculo SVG animado ──────────────────────────────────────

interface CircularProgressProps {
  /** Porcentaje 0-100 */
  percentage: number;
  size: 'sm' | 'md' | 'lg';
  status: ProfileScoreStatus;
  /** Etiqueta de estado para el aria-label compuesto */
  statusLabel: string;
}

function CircularProgress({ percentage, size, status, statusLabel }: CircularProgressProps) {
  const { px, radius, strokeWidth, innerFontSize } = SIZE_CONFIG[size];
  const { gradientStart, gradientEnd } = STATUS_META[status];
  const gradientId = `psm-grad-${status}`;
  const circumference = 2 * Math.PI * radius;
  const center = px / 2;

  const animatedCount = useAnimatedCount(percentage);

  // Estado para activar la transición del arco en el siguiente frame
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const dashOffset = filled
    ? circumference - (percentage / 100) * circumference
    : circumference;

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Puntuación del perfil: ${percentage}%. Estado: ${statusLabel}`}
      focusable="false"
    >
      <title>{`Puntuación del perfil: ${percentage}% — ${statusLabel}`}</title>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>

      {/* Track de fondo */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />

      {/* Arco de progreso animado */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{
          transition: 'stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Número central — solo en md y lg */}
      {size !== 'sm' && (
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontWeight="700"
          fontSize={innerFontSize}
          fontFamily="inherit"
          aria-hidden="true"
        >
          {animatedCount}
        </text>
      )}
    </svg>
  );
}

// ─── Sub-componente: fila de factor ──────────────────────────────────────────

interface FactorRowProps {
  meta: FactorMeta;
  earned: number;
}

function FactorRow({ meta, earned }: FactorRowProps) {
  const { Icon, label, hint, maxPoints } = meta;
  const isDone = earned >= maxPoints;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors duration-150',
        isDone
          ? 'bg-green-500/5 border-green-500/20'
          : 'bg-white/[0.02] border-zinc-700/40 dark:border-zinc-700/40 border-zinc-200/60',
      )}
      title={isDone ? undefined : hint}
      role="listitem"
    >
      {/* Icono */}
      <div
        className={cn(
          'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
          isDone ? 'bg-green-500/15' : 'bg-zinc-700/40 dark:bg-zinc-700/40 bg-zinc-100',
        )}
        aria-hidden="true"
      >
        <Icon
          className={cn(
            'w-3.5 h-3.5',
            isDone
              ? 'text-green-600 dark:text-green-400'
              : 'text-zinc-500 dark:text-zinc-500',
          )}
        />
      </div>

      {/* Nombre del factor */}
      <span
        className={cn(
          'flex-1 min-w-0 text-xs truncate',
          isDone
            ? 'text-zinc-600 dark:text-zinc-300'
            : 'text-zinc-500 dark:text-zinc-500',
        )}
      >
        {label}
      </span>

      {/* Puntos earned / max */}
      <span
        className={cn(
          'flex-shrink-0 text-xs font-medium tabular-nums',
          isDone
            ? 'text-green-600 dark:text-green-400'
            : 'text-zinc-500 dark:text-zinc-600',
        )}
        aria-label={`${earned} de ${maxPoints} puntos`}
      >
        {earned}/{maxPoints}
      </span>

      {/* Indicador de estado */}
      {isDone ? (
        <Check
          className="flex-shrink-0 w-3.5 h-3.5 text-green-600 dark:text-green-400"
          aria-label="Completado"
        />
      ) : (
        <X
          className="flex-shrink-0 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 cursor-help"
          aria-label={`Incompleto — ${hint}`}
        />
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ProfileScoreMeter({
  score,
  showDetails = false,
  size = 'md',
  className,
}: ProfileScoreMeterProps) {
  // El status ya viene calculado en el score, pero usamos la función helper para consistencia
  const status = score.status;
  const { label, textColor, bgColor, borderColor } = STATUS_META[status];

  const showStatusText = size === 'md' || size === 'lg';
  const showFactorList = size === 'lg' || showDetails;

  return (
    <div
      className={cn('flex flex-col items-center gap-3', className)}
      aria-label="Medidor de puntuación del perfil"
    >
      {/* Círculo SVG — lleva role="progressbar" internamente */}
      <CircularProgress
        percentage={score.percentage}
        size={size}
        status={status}
        statusLabel={label}
      />

      {/* Puntaje numérico externo — solo en sm (md/lg lo muestran dentro del SVG) */}
      {size === 'sm' && (
        <span
          className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums"
          aria-hidden="true"
        >
          {score.percentage}
          <span className="text-zinc-400 dark:text-zinc-500 font-normal">%</span>
        </span>
      )}

      {/* Badge de status */}
      {showStatusText && (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
            bgColor,
            borderColor,
            textColor,
          )}
          aria-live="polite"
          aria-label={`Estado del perfil: ${label} — ${score.total} de 30 puntos (${score.percentage}%)`}
        >
          <span>{label}</span>
          <span className="opacity-40" aria-hidden="true">·</span>
          <span className="tabular-nums opacity-80" aria-hidden="true">
            {score.percentage}%
          </span>
        </div>
      )}

      {/* Lista de factores del breakdown */}
      {showFactorList && (
        <div className="w-full space-y-1.5" role="list" aria-label="Desglose de factores del score">
          <p
            className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-1 mb-2"
            aria-hidden="true"
          >
            Desglose del score ({score.total}/30 pts)
          </p>
          {FACTOR_META.map((meta) => (
            <FactorRow
              key={meta.key}
              meta={meta}
              earned={score[meta.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfileScoreMeter;
