import { useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSpaceLeaderboard, useMySpacePoints } from '@/hooks/academy/useSpaceLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import type { LeaderboardPeriod, SpaceMemberPoints } from '@/types/academy-community';

interface SpaceLeaderboardProps {
  spaceId: string;
  accentColor?: string;
}

const TABS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'all_time', label: 'Todo el tiempo' },
  { id: 'month', label: 'Este mes' },
  { id: 'week', label: 'Esta semana' },
];

export function SpaceLeaderboard({ spaceId, accentColor = '#8B5CF6' }: SpaceLeaderboardProps) {
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
      <div className="flex items-center gap-1 border-b border-white/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPeriod(t.id)}
            className={cn(
              'px-4 py-2 text-sm border-b-2 transition-colors',
              period === t.id ? 'text-zinc-100' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
            style={period === t.id ? { borderColor: accentColor } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-center py-8">Cargando ranking...</div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center bg-white/5 border-white/10 text-zinc-500">
          Aún no hay actividad en el ranking.
        </Card>
      ) : (
        <>
          {/* Top 3 */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((r, i) => (
                <TopCard
                  key={r.id}
                  row={r}
                  rank={i + 1}
                  points={pointsValue(r)}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}

          {/* Resto */}
          {rest.length > 0 && (
            <Card className="p-2 bg-white/5 border-white/10">
              <ul className="divide-y divide-white/5">
                {rest.map((r, i) => (
                  <li key={r.id}>
                    <RankRow rank={i + 4} row={r} points={pointsValue(r)} accentColor={accentColor} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Mi posición */}
          {me && user?.id && myRank > 0 && myRank > rows.length && (
            <Card className="p-4 bg-purple-500/10 border-purple-500/30 sticky bottom-4">
              <div className="text-xs text-zinc-400 mb-1">Tu posición</div>
              <RankRow rank={myRank} row={me} points={pointsValue(me)} accentColor={accentColor} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TopCard({
  row,
  rank,
  points,
  accentColor,
}: {
  row: SpaceMemberPoints;
  rank: number;
  points: number;
  accentColor: string;
}) {
  const trophies = [Trophy, Medal, Award];
  const Icon = trophies[rank - 1] ?? Trophy;
  const colors = ['#fbbf24', '#a3a3a3', '#cd7f32'];

  return (
    <Card
      className={cn(
        'p-4 border-2 text-center',
        rank === 1 ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/5 border-white/10'
      )}
    >
      <Icon className="h-7 w-7 mx-auto mb-2" style={{ color: colors[rank - 1] }} />
      <Avatar profile={row.user} size={56} />
      <div className="font-semibold mt-2 truncate">{row.user?.full_name ?? 'Usuario'}</div>
      <div className="text-2xl font-bold mt-1" style={{ color: accentColor }}>
        {points.toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">puntos</div>
      <div className="text-xs text-zinc-400 mt-1">Nivel {row.level}</div>
    </Card>
  );
}

function RankRow({
  rank,
  row,
  points,
  accentColor,
}: {
  rank: number;
  row: SpaceMemberPoints;
  points: number;
  accentColor: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-2">
      <span className="text-sm text-zinc-500 w-6 text-center">{rank}</span>
      <Avatar profile={row.user} size={32} />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{row.user?.full_name ?? 'Usuario'}</div>
        <div className="mt-0.5 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full"
            style={{ width: `${Math.min(100, (row.level / 10) * 100)}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold" style={{ color: accentColor }}>
          {points.toLocaleString()}
        </div>
        <div className="text-[10px] text-zinc-500">Nv {row.level}</div>
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
        className="rounded-full object-cover"
        style={{ height: size, width: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-semibold"
      style={{ height: size, width: size, fontSize: size * 0.4 }}
    >
      {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}
