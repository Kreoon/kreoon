import { useState, useMemo } from 'react';
import { Crown, Medal, TrendingUp, TrendingDown, Minus, Users, RefreshCw, Filter, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSeasonLeaderboard, LeaderboardEntry, RoleFilter } from '@/hooks/useSeasonLeaderboard';
import { useSeasonRewards } from '@/hooks/useSeasonRewards';
import { useAuth } from '@/hooks/useAuth';

interface SeasonLeaderboardLiveProps {
  organizationId: string;
  seasonId?: string;
  maxEntries?: number;
  showFilters?: boolean;
  showStats?: boolean;
  highlightUser?: boolean;
  className?: string;
}

const RANK_ICONS: Record<number, { icon: typeof Crown; color: string; bg: string }> = {
  1: { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/20' },
  2: { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-400/20' },
  3: { icon: Medal, color: 'text-orange-600', bg: 'bg-orange-500/20' }
};

const LEVEL_COLORS: Record<string, string> = {
  'Novato': 'bg-slate-500',
  'Pro': 'bg-emerald-500',
  'Elite': 'bg-blue-500',
  'Master': 'bg-purple-500',
  'Legend': 'bg-amber-500'
};

function LeaderboardRow({
  entry,
  isCurrentUser,
  potentialReward,
  showRewardIndicator
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
  potentialReward?: string;
  showRewardIndicator: boolean;
}) {
  const rankConfig = RANK_ICONS[entry.season_rank];
  const RankIcon = rankConfig?.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all',
        isCurrentUser
          ? 'bg-primary/10 border-2 border-primary/50 shadow-lg'
          : 'bg-muted/30 hover:bg-muted/50',
        entry.season_rank <= 3 && 'border-l-4',
        entry.season_rank === 1 && 'border-l-amber-500',
        entry.season_rank === 2 && 'border-l-slate-400',
        entry.season_rank === 3 && 'border-l-orange-500'
      )}
    >
      {/* Posicion */}
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
        rankConfig?.bg || 'bg-muted'
      )}>
        {RankIcon ? (
          <RankIcon className={cn('w-5 h-5', rankConfig.color)} />
        ) : (
          <span className="text-muted-foreground">#{entry.season_rank}</span>
        )}
      </div>

      {/* Avatar y nombre */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="w-10 h-10 border-2 border-background">
          <AvatarImage src={entry.avatar_url || undefined} />
          <AvatarFallback className="text-sm">
            {entry.full_name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">
              {entry.full_name}
              {isCurrentUser && (
                <span className="text-xs text-primary ml-1">(Tu)</span>
              )}
            </p>
            {entry.current_streak_days >= 7 && (
              <Flame className="w-4 h-4 text-orange-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', LEVEL_COLORS[entry.current_level])}
            >
              {entry.current_level}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {entry.role_key === 'creator' ? 'Creador' : 'Editor'}
            </span>
          </div>
        </div>
      </div>

      {/* Puntos y stats */}
      <div className="text-right">
        <p className="font-bold text-lg">{entry.season_points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">
          {Math.round(entry.on_time_rate * 100)}% a tiempo
        </p>
      </div>

      {/* Indicador de premio */}
      {showRewardIndicator && potentialReward && (
        <Badge
          variant="secondary"
          className="bg-amber-500/20 text-amber-600 border-amber-500/50"
        >
          {potentialReward}
        </Badge>
      )}
    </div>
  );
}

export function SeasonLeaderboardLive({
  organizationId,
  seasonId,
  maxEntries = 10,
  showFilters = true,
  showStats = true,
  highlightUser = true,
  className
}: SeasonLeaderboardLiveProps) {
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const {
    entries,
    loading,
    error,
    stats,
    lastRefresh,
    getTopN,
    getUserEntry,
    getEntriesAroundUser,
    isUserInPodium,
    refreshView
  } = useSeasonLeaderboard(organizationId, roleFilter);

  const { rewards, getPotentialReward } = useSeasonRewards(seasonId, organizationId);

  const userEntry = getUserEntry();
  const displayEntries = useMemo(() => {
    const top = getTopN(maxEntries);

    // Si el usuario no esta en el top, agregar su posicion
    if (highlightUser && userEntry && userEntry.season_rank > maxEntries) {
      const aroundUser = getEntriesAroundUser(1);
      return [...top, ...aroundUser.filter(e => e.season_rank > maxEntries)];
    }

    return top;
  }, [getTopN, maxEntries, highlightUser, userEntry, getEntriesAroundUser]);

  // Obtener premio potencial para cada posicion
  const getRewardForRank = (rank: number, percentile: number, points: number, role?: string): string | undefined => {
    const reward = getPotentialReward(rank, percentile, points, role);
    return reward?.display_name;
  };

  if (loading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => refreshView()} className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Ranking de Temporada
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshView()}
            className="h-8 w-8"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Tabs
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as RoleFilter)}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="creator" className="text-xs">
                Creadores
              </TabsTrigger>
              <TabsTrigger value="editor" className="text-xs">
                Editores
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent className="p-4">
        {/* Stats resumen */}
        {showStats && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalParticipants}</p>
              <p className="text-xs text-muted-foreground">Participantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.topScore.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Top Score</p>
            </div>
            <div className="text-center">
              {stats.userPosition ? (
                <>
                  <p className="text-2xl font-bold text-primary">#{stats.userPosition}</p>
                  <p className="text-xs text-muted-foreground">Tu posicion</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground">-</p>
                  <p className="text-xs text-muted-foreground">Sin ranking</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Lista de entries */}
        {displayEntries.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Aun no hay participantes en esta temporada
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayEntries.map((entry, index) => {
              // Separador visual si hay brecha en posiciones
              const prevEntry = displayEntries[index - 1];
              const hasGap = prevEntry && entry.season_rank - prevEntry.season_rank > 1;

              return (
                <div key={`${entry.user_id}-${entry.role_key}`}>
                  {hasGap && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                      <span className="text-xs text-muted-foreground">
                        ...
                      </span>
                      <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                    </div>
                  )}
                  <LeaderboardRow
                    entry={entry}
                    isCurrentUser={highlightUser && entry.user_id === user?.id}
                    potentialReward={getRewardForRank(
                      entry.season_rank,
                      entry.percentile,
                      entry.season_points,
                      entry.role_key
                    )}
                    showRewardIndicator={rewards.length > 0 && entry.season_rank <= 10}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Timestamp de actualizacion */}
        {lastRefresh && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Actualizado: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SeasonLeaderboardLive;
