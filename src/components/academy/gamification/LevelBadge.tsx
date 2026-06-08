import { useLevelTiers } from '@/hooks/academy/useAcademyGamification';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  title?: string;
  xp?: number;
  showProgress?: boolean;
  accentColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

const RARITY_GLOW: Record<number, string> = {
  1: 'shadow-none',
  2: 'shadow-[0_0_10px_rgba(34,211,238,0.3)]',
  3: 'shadow-[0_0_12px_rgba(167,139,250,0.4)]',
  4: 'shadow-[0_0_14px_rgba(167,139,250,0.5)]',
  5: 'shadow-[0_0_16px_rgba(236,72,153,0.5)]',
  6: 'shadow-[0_0_18px_rgba(14,165,233,0.6)]',
  7: 'shadow-[0_0_20px_rgba(251,191,36,0.7)]',
  8: 'shadow-[0_0_22px_rgba(220,38,38,0.7)]',
  9: 'shadow-[0_0_24px_rgba(251,191,36,0.8)]',
  10: 'shadow-[0_0_28px_rgba(251,191,36,0.9),0_0_50px_rgba(168,85,247,0.4)]',
};

export function LevelBadge({
  level,
  title,
  xp,
  showProgress = false,
  accentColor = '#8B5CF6',
  size = 'md',
}: LevelBadgeProps) {
  const { data: tiers = [] } = useLevelTiers();
  const tier = tiers.find((t) => t.level === level);
  const nextTier = tiers.find((t) => t.level === level + 1);
  const displayTitle = title ?? tier?.title ?? 'Aprendiz';
  const emoji = tier?.emoji ?? '🌱';

  const sizes = {
    sm: { box: 'h-7 w-7 text-sm', text: 'text-[10px]' },
    md: { box: 'h-10 w-10 text-base', text: 'text-xs' },
    lg: { box: 'h-14 w-14 text-2xl', text: 'text-sm' },
  };

  const progressPct =
    showProgress && tier && nextTier && xp != null
      ? Math.min(100, ((xp - tier.min_xp) / (nextTier.min_xp - tier.min_xp)) * 100)
      : 0;

  const accessibleLabel = `Nivel ${level}: ${displayTitle}${
    showProgress && xp != null ? ` con ${xp} puntos de experiencia` : ''
  }`;

  return (
    <div className="inline-flex items-center gap-2" aria-label={accessibleLabel}>
      <div
        className={cn(
          'rounded-xl flex items-center justify-center font-bold flex-shrink-0',
          sizes[size].box,
          RARITY_GLOW[level] ?? ''
        )}
        style={{
          backgroundColor: `${accentColor}25`,
          color: accentColor,
          border: `1.5px solid ${accentColor}50`,
        }}
        title={tier?.perk_description ?? ''}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <div className={cn('font-semibold leading-tight', sizes[size].text)}>{displayTitle}</div>
        {showProgress && nextTier && xp != null && (
          <div className="mt-1">
            <div
              className="h-1 w-24 bg-white/5 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(progressPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso al siguiente nivel: ${Math.round(progressPct)}%`}
            >
              <div
                className="h-full transition-all"
                style={{ width: `${progressPct}%`, backgroundColor: accentColor }}
              />
            </div>
            <div className="text-[10px] text-zinc-300 mt-0.5 font-mono">
              {xp} / {nextTier.min_xp} XP
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
