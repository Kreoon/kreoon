import { useState } from 'react';
import { BigCard } from '@/components/academy/big-cards/BigCard';
import { cn } from '@/lib/utils';
import { useSpaceLeaderboard, useMySpacePoints } from '@/hooks/academy/useSpaceLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardPodium } from './LeaderboardPodium';
import type { LeaderboardPeriod, SpaceMemberPoints } from '@/types/academy-community';

const KREOON_PURPLE = '#7c3aed';

interface SpaceLeaderboardProps {
  spaceId: string;
  accentColor?: string;
}

const TABS: { id: LeaderboardPeriod; label: string; emoji: string }[] = [
  { id: 'all_time', label: 'Siempre', emoji: '👑' },
  { id: 'month', label: 'Este mes', emoji: '🌙' },
  { id: 'week', label: 'Esta semana', emoji: '🔥' },
];

export function SpaceLeaderboard({ spaceId }: SpaceLeaderboardProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useSpaceLeaderboard(spaceId, period);
  const { data: me } = useMySpacePoints(spaceId);

  function pointsValue(row: SpaceMemberPoints) {
    return period === 'week'
      ? row.current_week_points
      : period === 'month'
        ? row.current_month_points
        : row.total_points;
  }

  const myRank = me ? rows.findIndex((r) => r.user_id === user?.id) + 1 : 0;
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="space-y-6">
      {/* Tabs como pills purple */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPeriod(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-2xl transition-all',
              period === t.id
                ? 'text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
            )}
            style={
              period === t.id
                ? {
                    backgroundColor: KREOON_PURPLE,
                    boxShadow: `0 4px 16px -4px ${KREOON_PURPLE}80`,
                  }
                : undefined
            }
          >
            <span aria-hidden="true">{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <BigCard className="p-10 text-center">
          <div className="text-5xl mb-3" aria-hidden="true">⏳</div>
          <div className="text-sm text-zinc-400">Cargando ranking...</div>
        </BigCard>
      ) : rows.length === 0 ? (
        <BigCard className="p-10 text-center border-dashed">
          <div className="text-6xl mb-3" aria-hidden="true">🌱</div>
          <h3 className="text-lg font-bold text-zinc-100 mb-1">Aún sin actividad</h3>
          <p className="text-sm text-zinc-400">
            Sé el primero en ganar XP y aparece en el podio
          </p>
        </BigCard>
      ) : (
        <>
          {/* Top 3 — Podio */}
          {top3.length > 0 && (
            <LeaderboardPodium top3={top3} period={period} accentColor={KREOON_PURPLE} />
          )}

          {/* Resto */}
          {rest.length > 0 && (
            <BigCard className="p-2">
              <ul className="divide-y divide-white/5">
                {rest.map((r, i) => (
                  <li key={r.id}>
                    <RankRow rank={i + 4} row={r} points={pointsValue(r)} />
                  </li>
                ))}
              </ul>
            </BigCard>
          )}

          {/* Mi posición sticky */}
          {me && user?.id && myRank > 0 && myRank > rows.length && (
            <BigCard
              accentColor={KREOON_PURPLE}
              glow
              gradient="purple"
              className="p-4 sticky bottom-4 z-10"
            >
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                🎯 Tu posición
              </div>
              <RankRow rank={myRank} row={me} points={pointsValue(me)} highlight />
            </BigCard>
          )}
        </>
      )}
    </div>
  );
}

function RankRow({
  rank,
  row,
  points,
  highlight,
}: {
  rank: number;
  row: SpaceMemberPoints;
  points: number;
  highlight?: boolean;
}) {
  const medal = rank === 1 ? '👑' : rank === 2 ? '⭐' : rank === 3 ? '✨' : null;
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3 px-3 rounded-2xl',
        highlight && 'bg-white/[0.03]'
      )}
    >
      <span
        className="text-xl w-8 text-center flex-shrink-0"
        aria-hidden="true"
      >
        {medal ?? (
          <span className="text-sm font-bold text-zinc-500 tabular-nums">{rank}</span>
        )}
      </span>
      <Avatar profile={row.user} size={40} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-zinc-100 truncate">
          {row.user?.full_name ?? 'Usuario'}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex-1 max-w-[120px]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (row.level / 10) * 100)}%`,
                background: `linear-gradient(90deg, ${KREOON_PURPLE}, #a855f7)`,
              }}
            />
          </div>
          <span className="text-[10px] font-bold text-zinc-500 uppercase">
            Nv {row.level}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div
          className="text-base font-extrabold tabular-nums"
          style={{ color: rank <= 3 ? KREOON_PURPLE : '#e4e4e7' }}
        >
          {points.toLocaleString()}
        </div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase">XP</div>
      </div>
    </div>
  );
}

function Avatar({ profile, size = 32 }: { profile: any; size?: number }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className="rounded-2xl object-cover border-2 border-white/10 flex-shrink-0"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-extrabold text-white border-2 border-white/10 flex-shrink-0"
      style={{
        height: size,
        width: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, ${KREOON_PURPLE}80, ${KREOON_PURPLE}30)`,
      }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}
