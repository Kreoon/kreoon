import { useMemo } from 'react';
import { Trophy, Crown, Medal, Star, Gift, TrendingUp, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSeasonRewards, SeasonReward } from '@/hooks/useSeasonRewards';
import { useSeasonLeaderboard } from '@/hooks/useSeasonLeaderboard';

interface SeasonPrizesShowcaseProps {
  seasonId: string;
  organizationId: string;
  userRoleKey?: string;
  showUserPosition?: boolean;
  compact?: boolean;
  className?: string;
}

const REWARD_ICONS: Record<string, typeof Trophy> = {
  trophy: Trophy,
  crown: Crown,
  medal: Medal,
  star: Star,
  gift: Gift,
  'trending-up': TrendingUp
};

const POSITION_BADGES: Record<number, { label: string; color: string; gradient: string }> = {
  1: { label: '1er', color: 'text-amber-500', gradient: 'from-amber-400 to-yellow-500' },
  2: { label: '2do', color: 'text-slate-400', gradient: 'from-slate-300 to-slate-500' },
  3: { label: '3ro', color: 'text-orange-600', gradient: 'from-orange-400 to-amber-600' }
};

function RewardCard({
  reward,
  isEligible,
  userRank,
  userPercentile
}: {
  reward: SeasonReward;
  isEligible: boolean;
  userRank?: number;
  userPercentile?: number;
}) {
  const IconComponent = REWARD_ICONS[reward.display_icon] || Trophy;

  const positionLabel = useMemo(() => {
    if (reward.position_type === 'rank') {
      if (reward.position_max && reward.position_max > reward.position_min) {
        return `Top ${reward.position_min}-${reward.position_max}`;
      }
      return `#${reward.position_min}`;
    }
    if (reward.position_type === 'percentile') {
      return `Top ${reward.position_min}%`;
    }
    return `${reward.position_min}+ pts`;
  }, [reward]);

  const progress = useMemo(() => {
    if (!userRank && !userPercentile) return 0;

    if (reward.position_type === 'rank' && userRank) {
      const target = reward.position_max || reward.position_min;
      if (userRank <= target) return 100;
      // Progreso hacia el objetivo (invertido porque menor rank es mejor)
      return Math.max(0, Math.min(100, ((target * 2 - userRank) / target) * 100));
    }

    if (reward.position_type === 'percentile' && userPercentile !== undefined) {
      if (userPercentile <= reward.position_min) return 100;
      return Math.max(0, ((reward.position_min * 2 - userPercentile) / reward.position_min) * 100);
    }

    return 0;
  }, [reward, userRank, userPercentile]);

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all duration-300',
        isEligible
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20 scale-105'
          : 'border-muted-foreground/20 bg-card hover:border-muted-foreground/40'
      )}
    >
      {/* Indicador de elegibilidad */}
      {isEligible && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-green-500 text-white animate-pulse">
            Tu premio
          </Badge>
        </div>
      )}

      {/* Icono y posicion */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            `bg-gradient-to-br ${reward.position_min <= 3 ? POSITION_BADGES[reward.position_min]?.gradient || 'from-primary to-primary/70' : 'from-primary to-primary/70'}`
          )}
          style={{ backgroundColor: reward.display_color }}
        >
          <IconComponent className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-lg">{reward.display_name}</p>
          <p className="text-sm text-muted-foreground">{positionLabel}</p>
        </div>
      </div>

      {/* Descripcion del premio */}
      <div className="space-y-2">
        {reward.reward_type === 'points_bonus' && (
          <p className="text-sm">
            <span className="font-semibold text-primary">+{reward.points_amount}</span> puntos UP
          </p>
        )}
        {reward.reward_type === 'monetary' && (
          <p className="text-sm">
            <span className="font-semibold text-green-500">
              ${reward.monetary_amount} {reward.monetary_currency}
            </span>
          </p>
        )}
        {reward.reward_type === 'badge' && (
          <p className="text-sm">
            <span className="font-semibold text-purple-500">Badge exclusivo</span>
          </p>
        )}
        {reward.description && (
          <p className="text-xs text-muted-foreground">{reward.description}</p>
        )}
      </div>

      {/* Barra de progreso hacia el premio */}
      {!isEligible && progress > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progreso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
    </div>
  );
}

export function SeasonPrizesShowcase({
  seasonId,
  organizationId,
  userRoleKey,
  showUserPosition = true,
  compact = false,
  className
}: SeasonPrizesShowcaseProps) {
  const { rewards, loading: rewardsLoading } = useSeasonRewards(seasonId, organizationId);
  const { stats, getUserEntry, loading: leaderboardLoading } = useSeasonLeaderboard(organizationId);

  const userEntry = getUserEntry();
  const userRank = userEntry?.season_rank;
  const userPercentile = userEntry?.percentile;

  // Filtrar premios por rol si aplica
  const filteredRewards = useMemo(() => {
    return rewards.filter(r => !r.role_key || r.role_key === userRoleKey);
  }, [rewards, userRoleKey]);

  // Agrupar por tipo de posicion
  const { podiumRewards, otherRewards } = useMemo(() => {
    const podium = filteredRewards.filter(
      r => r.position_type === 'rank' && r.position_min <= 3
    );
    const others = filteredRewards.filter(
      r => !(r.position_type === 'rank' && r.position_min <= 3)
    );
    return { podiumRewards: podium, otherRewards: others };
  }, [filteredRewards]);

  // Verificar elegibilidad
  const isEligible = (reward: SeasonReward): boolean => {
    if (!userRank && !userPercentile) return false;

    if (reward.position_type === 'rank' && userRank) {
      const maxPos = reward.position_max || reward.position_min;
      return userRank >= reward.position_min && userRank <= maxPos;
    }
    if (reward.position_type === 'percentile' && userPercentile !== undefined) {
      return userPercentile <= reward.position_min;
    }
    if (reward.position_type === 'threshold' && userEntry) {
      return userEntry.season_points >= reward.position_min;
    }
    return false;
  };

  const loading = rewardsLoading || leaderboardLoading;

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredRewards.length === 0) {
    return null;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-purple-500/10">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Premios de Temporada
        </CardTitle>
        {showUserPosition && userRank && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              Tu posicion: #{userRank}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Top {Math.round(userPercentile || 0)}%
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        {/* Podium (Top 1-3) */}
        {podiumRewards.length > 0 && (
          <div className={cn('mb-6', compact ? '' : 'mb-8')}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Podium
            </h4>
            <div className={cn(
              'grid gap-4',
              compact ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-3'
            )}>
              {podiumRewards
                .sort((a, b) => a.position_min - b.position_min)
                .map(reward => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    isEligible={isEligible(reward)}
                    userRank={userRank}
                    userPercentile={userPercentile}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Otros premios */}
        {otherRewards.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-500" />
              Mas premios
            </h4>
            <div className={cn(
              'grid gap-4',
              compact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            )}>
              {otherRewards.map(reward => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  isEligible={isEligible(reward)}
                  userRank={userRank}
                  userPercentile={userPercentile}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mensaje motivacional */}
        {!userEntry && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Completa proyectos para aparecer en el ranking y competir por estos premios
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SeasonPrizesShowcase;
