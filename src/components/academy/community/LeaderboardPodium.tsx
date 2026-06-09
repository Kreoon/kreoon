import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpaceMemberPoints } from '@/types/academy-community';

interface LeaderboardPodiumProps {
  top3: SpaceMemberPoints[];
  period: 'all_time' | 'month' | 'week';
  accentColor?: string;
}

/**
 * Diferenciador KREOON vs Skool:
 * Skool muestra un listado lineal del top.
 * KREOON muestra un PODIO 3D ascendente con animación de entrada por nivel.
 * El segundo lugar entra desde la izquierda, tercero desde la derecha,
 * primero asciende desde abajo con efecto de "elevación".
 */
export function LeaderboardPodium({ top3, period, accentColor = '#8B5CF6' }: LeaderboardPodiumProps) {
  if (top3.length === 0) return null;

  const pointsKey =
    period === 'week' ? 'current_week_points' :
    period === 'month' ? 'current_month_points' : 'total_points';

  const [first, second, third] = [top3[0], top3[1], top3[2]];

  const periodLabel =
    period === 'week' ? 'esta semana' :
    period === 'month' ? 'este mes' : 'todo el tiempo';

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6 md:p-8 mb-6"
      style={{
        background: `radial-gradient(ellipse at center top, ${accentColor}20 0%, transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.4), transparent)`,
      }}
    >
      {/* Decorative glow */}
      <div
        className="absolute inset-x-1/3 -top-10 h-32 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      <div className="relative flex items-end justify-center gap-2 md:gap-4">
        {/* 2do lugar — entra desde la izquierda */}
        {second && (
          <PodiumColumn
            row={second}
            position={2}
            height={140}
            points={(second as any)[pointsKey] ?? 0}
            accentColor={accentColor}
            animationDelay={0.1}
            animationFrom="-translate-x-8"
          />
        )}

        {/* 1ro — asciende desde abajo */}
        {first && (
          <PodiumColumn
            row={first}
            position={1}
            height={180}
            points={(first as any)[pointsKey] ?? 0}
            accentColor={accentColor}
            animationDelay={0.3}
            animationFrom="translate-y-8"
            highlight
          />
        )}

        {/* 3ro — entra desde la derecha */}
        {third && (
          <PodiumColumn
            row={third}
            position={3}
            height={110}
            points={(third as any)[pointsKey] ?? 0}
            accentColor={accentColor}
            animationDelay={0.2}
            animationFrom="translate-x-8"
          />
        )}
      </div>

      <div className="mt-4 text-center text-xs text-zinc-300">
        Top 3 · {periodLabel}
      </div>
    </div>
  );
}

interface PodiumColumnProps {
  row: SpaceMemberPoints;
  position: 1 | 2 | 3;
  height: number;
  points: number;
  accentColor: string;
  animationDelay: number;
  animationFrom: string;
  highlight?: boolean;
}

function PodiumColumn({
  row,
  position,
  height,
  points,
  accentColor,
  animationDelay,
  animationFrom,
  highlight,
}: PodiumColumnProps) {
  const trophyColor =
    position === 1 ? '#fbbf24' :
    position === 2 ? '#a3a3a3' :
    '#cd7f32';

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700',
        animationFrom,
        'motion-safe:slide-in-from-bottom-4'
      )}
      style={{ animationDelay: `${animationDelay}s`, animationFillMode: 'backwards' }}
    >
      {/* Trophy + Avatar */}
      <Trophy
        className={cn(position === 1 ? 'h-7 w-7' : 'h-5 w-5')}
        style={{ color: trophyColor }}
        aria-hidden="true"
      />
      <Avatar profile={row.user} accentColor={accentColor} size={position === 1 ? 64 : 48} />
      <div className="text-xs font-semibold text-center truncate max-w-[80px]">
        {row.user?.full_name ?? 'Usuario'}
      </div>

      {/* Podium block */}
      <div
        className={cn(
          'w-20 md:w-24 rounded-t-xl flex flex-col items-center justify-end pb-2 pt-3 border-t-2 transition-all relative',
          highlight && 'motion-safe:animate-pulse'
        )}
        style={{
          height,
          backgroundColor: position === 1 ? `${accentColor}30` : 'rgba(255,255,255,0.05)',
          borderTopColor: position === 1 ? accentColor : trophyColor,
        }}
      >
        <div
          className="text-2xl font-bold font-mono"
          style={{ color: position === 1 ? accentColor : '#e4e4e7' }}
        >
          {points.toLocaleString()}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-zinc-300">pts</div>

        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm border-2"
          style={{
            backgroundColor: position === 1 ? '#fbbf24' : position === 2 ? '#a3a3a3' : '#cd7f32',
            borderColor: 'rgba(0,0,0,0.4)',
            color: '#0a0a0f',
          }}
          aria-label={`Posición ${position}`}
        >
          {position}
        </div>
      </div>
    </div>
  );
}

function Avatar({ profile, accentColor, size }: { profile: any; accentColor: string; size: number }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="rounded-full object-cover border-2 border-white/20"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white border-2 border-white/20"
      style={{
        height: size,
        width: size,
        backgroundColor: `${accentColor}40`,
        fontSize: size * 0.4,
      }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}
