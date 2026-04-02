import { Crown, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreatorTier = 'top' | 'rising' | 'new' | 'standard';

interface TierConfig {
  gradient: string;
  shadow: string;
  icon: React.ElementType;
  label: string;
  shimmer: boolean;
}

// ─── Tier Config ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<Exclude<CreatorTier, 'standard'>, TierConfig> = {
  top: {
    gradient: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    shadow: 'shadow-[0_2px_8px_rgba(245,158,11,0.45)]',
    icon: Crown,
    label: 'Top Creator',
    shimmer: true,
  },
  rising: {
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
    shadow: 'shadow-[0_2px_8px_rgba(168,85,247,0.4)]',
    icon: TrendingUp,
    label: 'Rising',
    shimmer: false,
  },
  new: {
    gradient: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    shadow: 'shadow-[0_2px_8px_rgba(6,182,212,0.4)]',
    icon: Sparkles,
    label: 'Nuevo',
    shimmer: false,
  },
};

// ─── Size Config ──────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: {
    text: 'text-[10px]',
    padding: 'px-2 py-0.5',
    icon: 'h-3 w-3',
  },
  md: {
    text: 'text-xs',
    padding: 'px-3 py-1',
    icon: 'h-4 w-4',
  },
} as const;

// ─── Utility export ───────────────────────────────────────────────────────────

/**
 * Calcula el tier de un creator basado en su score compuesto y proyectos completados.
 *
 * Reglas:
 * - top:     score >= 80 y projectsCompleted >= 5
 * - rising:  score >= 50 o projectsCompleted >= 2 (sin llegar a top)
 * - new:     projectsCompleted < 2 y score < 50
 * - standard: fallback (score 0, sin actividad)
 */
export function getCreatorTierFromScore(
  score: number,
  projectsCompleted: number
): CreatorTier {
  if (score >= 80 && projectsCompleted >= 5) return 'top';
  if (score >= 50 || projectsCompleted >= 2) return 'rising';
  if (score > 0 || projectsCompleted > 0) return 'new';
  return 'standard';
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface RankingBadgeProps {
  tier: CreatorTier;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function RankingBadge({
  tier,
  size = 'sm',
  showLabel = true,
  className,
}: RankingBadgeProps) {
  if (tier === 'standard') return null;

  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <span
      role="img"
      aria-label={config.label}
      className={cn(
        'relative inline-flex items-center gap-1 overflow-hidden rounded-full font-semibold text-white',
        config.gradient,
        config.shadow,
        sizeConfig.padding,
        sizeConfig.text,
        className
      )}
    >
      {/* Shimmer overlay solo para tier top */}
      {config.shimmer && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full',
            'bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)]',
            'bg-[length:200%_100%]',
            'animate-shimmer'
          )}
        />
      )}

      <Icon className={cn('relative shrink-0', sizeConfig.icon)} />

      {showLabel && (
        <span className="relative leading-none">{config.label}</span>
      )}
    </span>
  );
}
