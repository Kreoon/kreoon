import { Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierBadge } from './TierBadge';
import { cn } from '@/lib/utils';
import type { ReferralLeaderboardEntry } from '@/types/unified-finance.types';
import type { ReferralTierKey } from '@/lib/finance/constants';

interface ReferralLeaderboardProps {
  entries: ReferralLeaderboardEntry[];
  currentUserId?: string;
  isLoading?: boolean;
}

const PODIUM_COLORS = ['#f59e0b', '#9ca3af', '#b45309']; // gold, silver, bronze

export function ReferralLeaderboard({ entries, currentUserId, isLoading }: ReferralLeaderboardProps) {
  if (isLoading || entries.length === 0) {
    return null;
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 20);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          Leaderboard del Mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Podium top 3 */}
        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-3 mb-6">
            {/* 2nd place */}
            {top3[1] && (
              <PodiumEntry entry={top3[1]} rank={2} isCurrentUser={top3[1].user_id === currentUserId} />
            )}
            {/* 1st place */}
            {top3[0] && (
              <PodiumEntry entry={top3[0]} rank={1} isCurrentUser={top3[0].user_id === currentUserId} />
            )}
            {/* 3rd place */}
            {top3[2] && (
              <PodiumEntry entry={top3[2]} rank={3} isCurrentUser={top3[2].user_id === currentUserId} />
            )}
          </div>
        )}

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div className="space-y-1.5">
            {rest.map((entry) => {
              const isMe = entry.user_id === currentUserId;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg',
                    isMe ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : 'bg-white/5',
                  )}
                >
                  <span className="text-white/40 text-xs w-6 text-center font-mono">
                    #{entry.rank_position}
                  </span>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">
                      {(entry.full_name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">
                      {entry.full_name || 'Usuario'}
                      {isMe && <span className="text-purple-400 ml-1">(tu)</span>}
                    </p>
                  </div>
                  <TierBadge tierKey={(entry.referral_tier || 'starter') as ReferralTierKey} size="sm" showLabel={false} />
                  <div className="text-right">
                    <p className="text-white text-xs font-semibold">{entry.referrals_count}</p>
                    <p className="text-white/30 text-[9px]">referidos</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PodiumEntry({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: ReferralLeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const height = rank === 1 ? 'h-24' : rank === 2 ? 'h-16' : 'h-12';
  const color = PODIUM_COLORS[rank - 1];

  return (
    <div className="flex flex-col items-center gap-1.5 w-20">
      {entry.avatar_url ? (
        <img
          src={entry.avatar_url}
          alt=""
          className={cn(
            'rounded-full object-cover border-2',
            rank === 1 ? 'w-14 h-14' : 'w-10 h-10',
          )}
          style={{ borderColor: color }}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold text-white/80 border-2',
            rank === 1 ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm',
          )}
          style={{ borderColor: color, backgroundColor: `${color}30` }}
        >
          {(entry.full_name || '?')[0]?.toUpperCase()}
        </div>
      )}
      <p className="text-white text-[10px] font-medium text-center truncate max-w-full">
        {isCurrentUser ? 'Tu' : (entry.full_name || 'Usuario').split(' ')[0]}
      </p>
      <p className="text-white/50 text-[9px]">{entry.referrals_count} ref.</p>
      <div className={cn('w-full rounded-t-md flex items-end justify-center pb-1', height)} style={{ backgroundColor: `${color}30` }}>
        <span className="font-bold text-sm" style={{ color }}>#{rank}</span>
      </div>
    </div>
  );
}
