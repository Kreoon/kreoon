import { useState } from "react";
import { Trophy, Medal, Star, Flame, Zap } from "lucide-react";
import { useOrgRanking } from "@/hooks/useUnifiedReputation";
import { LEVEL_META } from "@/lib/reputation/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TalentRanking() {
  const { ranking, loading } = useOrgRanking();
  const [filter, setFilter] = useState<'all' | 'creator' | 'editor'>('all');

  const filteredTalents = filter === 'all'
    ? ranking
    : ranking.filter(t => t.role_key === filter);

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return "text-amber-500";
      case 1: return "text-slate-400";
      case 2: return "text-orange-600";
      default: return "text-muted-foreground";
    }
  };

  const getPunctualityRate = (onTimeRate: number) =>
    Math.round(onTimeRate * 100);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Flame className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Ranking Sistema Reputación</h3>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'creator', 'editor'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-sm text-sm font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {f === 'all' ? 'Todos' : f === 'creator' ? 'Creadores' : 'Editores'}
          </button>
        ))}
      </div>

      {/* Ranking list */}
      <div className="space-y-2">
        {filteredTalents.map((talent, index) => {
          const punctualityRate = getPunctualityRate(talent.on_time_rate);
          const onTimeDeliveries = Math.round(talent.on_time_rate * talent.lifetime_tasks);
          const lateDeliveries = talent.lifetime_tasks - onTimeDeliveries;
          const levelMeta = LEVEL_META[talent.current_level];

          return (
            <div
              key={talent.user_id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-sm border bg-card transition-all hover:shadow-md",
                index < 3 && "border-amber-500/30 bg-gradient-to-r from-card to-amber-500/5"
              )}
            >
              {/* Position */}
              <div className="flex-shrink-0 w-8 text-center">
                {index < 3 ? (
                  <Medal className={cn("h-5 w-5 mx-auto", getMedalColor(index))} />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>
                )}
              </div>

              {/* Avatar */}
              {talent.avatar_url ? (
                <img
                  src={talent.avatar_url}
                  alt={talent.full_name}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                  <span className="text-sm font-semibold text-primary">
                    {talent.full_name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate text-sm">{talent.full_name}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border"
                    style={{
                      color: levelMeta.color,
                      backgroundColor: levelMeta.bgColor,
                      borderColor: levelMeta.color + '30'
                    }}
                  >
                    {levelMeta.icon} {talent.current_level}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {talent.role_key === 'creator' ? 'Creador' : talent.role_key === 'editor' ? 'Editor' : talent.role_key}
                  </Badge>
                  <span>{talent.lifetime_tasks} contenidos</span>
                  {talent.current_streak_days > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {talent.current_streak_days}d
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                {/* Lifetime Points */}
                <div className="text-center">
                  <div className="flex items-center gap-1 text-primary">
                    <Zap className="h-3 w-3" />
                    <span className="font-bold">{talent.lifetime_points}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Puntos</span>
                </div>

                {/* Punctuality */}
                <div className="text-center">
                  <span className={cn(
                    "font-bold",
                    punctualityRate >= 80 ? "text-success" : punctualityRate >= 60 ? "text-warning" : "text-destructive"
                  )}>
                    {punctualityRate}%
                  </span>
                  <div className="text-[10px] text-muted-foreground">Puntual</div>
                </div>

                {/* Deliveries */}
                <div className="text-center hidden sm:block">
                  <span className="font-bold text-foreground">{talent.lifetime_tasks}</span>
                  <div className="text-[10px] text-muted-foreground">Entregas</div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTalents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay datos de ranking disponibles</p>
            <p className="text-xs mt-1">Los puntos se acumulan cuando se completan tareas</p>
          </div>
        )}
      </div>
    </div>
  );
}
