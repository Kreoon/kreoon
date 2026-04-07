import { useMemo } from 'react';
import { TrendingUp, Award, Users, Target, ChevronRight, Crown, Medal, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useGlobalRanking, GlobalRankingEntry } from '@/hooks/useGlobalRanking';
import { useGlobalBadges } from '@/hooks/useGlobalBadges';
import { useAuth } from '@/hooks/useAuth';

interface GlobalRankingWidgetProps {
  showTopN?: number;
  showUserPosition?: boolean;
  showNextBadges?: boolean;
  compact?: boolean;
  onViewFullRanking?: () => void;
  className?: string;
}

const TIER_CONFIGS: Record<string, { color: string; icon: typeof Crown; bg: string }> = {
  'Top 1%': { color: 'text-rose-500', icon: Crown, bg: 'bg-rose-500/20' },
  'Top 5%': { color: 'text-amber-500', icon: Crown, bg: 'bg-amber-500/20' },
  'Top 10%': { color: 'text-purple-500', icon: Medal, bg: 'bg-purple-500/20' },
  'Top 25%': { color: 'text-blue-500', icon: Star, bg: 'bg-blue-500/20' },
  'Top 50%': { color: 'text-green-500', icon: TrendingUp, bg: 'bg-green-500/20' },
  'En progreso': { color: 'text-slate-500', icon: Target, bg: 'bg-slate-500/20' },
  'Sin ranking': { color: 'text-muted-foreground', icon: Users, bg: 'bg-muted' }
};

function RankEntry({
  entry,
  rank,
  isCurrentUser
}: {
  entry: GlobalRankingEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const rankConfig = rank <= 3 ? TIER_CONFIGS[`Top ${rank === 1 ? '1' : rank === 2 ? '5' : '10'}%`] : null;
  const RankIcon = rankConfig?.icon || null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg transition-all',
        isCurrentUser
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/50'
      )}
    >
      {/* Posicion */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
          rank === 1 && 'bg-amber-500 text-white',
          rank === 2 && 'bg-slate-400 text-white',
          rank === 3 && 'bg-orange-500 text-white',
          rank > 3 && 'bg-muted text-muted-foreground'
        )}
      >
        {rank <= 3 && RankIcon ? (
          <RankIcon className="w-4 h-4" />
        ) : (
          rank
        )}
      </div>

      {/* Avatar y nombre */}
      <Avatar className="w-8 h-8">
        <AvatarImage src={entry.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {entry.full_name?.substring(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm truncate',
          isCurrentUser && 'font-semibold text-primary'
        )}>
          {entry.full_name}
          {isCurrentUser && <span className="text-xs ml-1">(Tu)</span>}
        </p>
      </div>

      {/* Puntos */}
      <div className="text-right">
        <p className="text-sm font-semibold">{entry.total_badge_points}</p>
        <p className="text-xs text-muted-foreground">{entry.badges_completed_count} badges</p>
      </div>
    </div>
  );
}

export function GlobalRankingWidget({
  showTopN = 5,
  showUserPosition = true,
  showNextBadges = true,
  compact = false,
  onViewFullRanking,
  className
}: GlobalRankingWidgetProps) {
  const { user } = useAuth();
  const {
    entries,
    loading,
    stats,
    userPosition,
    getTopN,
    getUserTier
  } = useGlobalRanking();

  const {
    getNextBadgesToUnlock,
    getOverallProgress
  } = useGlobalBadges(user?.id);

  const topEntries = getTopN(showTopN);
  const tier = getUserTier();
  const tierConfig = TIER_CONFIGS[tier.name] || TIER_CONFIGS['Sin ranking'];
  const TierIcon = tierConfig.icon;

  const nextBadges = useMemo(() => {
    if (!showNextBadges) return [];
    return getNextBadgesToUnlock(2);
  }, [showNextBadges, getNextBadgesToUnlock]);

  const badgeProgress = getOverallProgress();

  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('pb-2', compact && 'py-3')}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Ranking Global
          </CardTitle>

          {onViewFullRanking && (
            <Button variant="ghost" size="sm" onClick={onViewFullRanking}>
              Ver todo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn('space-y-4', compact && 'pb-3')}>
        {/* Tu posicion destacada */}
        {showUserPosition && userPosition && (
          <div className={cn('p-3 rounded-xl', tierConfig.bg)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', tierConfig.bg)}>
                  <TierIcon className={cn('w-5 h-5', tierConfig.color)} />
                </div>
                <div>
                  <p className={cn('font-semibold', tierConfig.color)}>{tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Posicion #{userPosition.global_rank || '-'} de {stats.totalUsers}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold">{userPosition.total_badge_points}</p>
                <p className="text-xs text-muted-foreground">puntos</p>
              </div>
            </div>

            {/* Progreso de badges */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{badgeProgress.completed} de {badgeProgress.total} insignias</span>
                <span>{badgeProgress.percentage}%</span>
              </div>
              <Progress value={badgeProgress.percentage} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Top N */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Top {showTopN}
          </h4>
          <div className="space-y-1">
            {topEntries.map((entry, index) => (
              <RankEntry
                key={entry.user_id}
                entry={entry}
                rank={index + 1}
                isCurrentUser={entry.user_id === user?.id}
              />
            ))}
          </div>
        </div>

        {/* Proximas insignias */}
        {showNextBadges && nextBadges.length > 0 && !compact && (
          <div className="pt-3 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Proximas insignias
            </h4>
            <div className="space-y-2">
              {nextBadges.map(ub => (
                <div
                  key={ub.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Award className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ub.badge?.name || 'Insignia'}
                    </p>
                    <Progress
                      value={(ub.current_progress / ub.progress_max) * 100}
                      className="h-1 mt-1"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((ub.current_progress / ub.progress_max) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats globales */}
        {!compact && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <p className="text-lg font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuarios</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.averageBadges}</p>
              <p className="text-xs text-muted-foreground">Prom. badges</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{stats.topPoints}</p>
              <p className="text-xs text-muted-foreground">Top pts</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GlobalRankingWidget;
