import { useUserPoints } from '@/hooks/useUserPoints';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Zap, TrendingUp, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UPWidgetProps {
  userId: string;
  compact?: boolean;
}

const LEVEL_ICONS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

export function UPWidget({ userId, compact = false }: UPWidgetProps) {
  const { 
    points, 
    loading, 
    getProgressToNextLevel,
    LEVEL_LABELS,
    LEVEL_COLORS,
    LEVEL_BG_COLORS
  } = useUserPoints(userId);

  if (loading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className={cn("flex items-center gap-4", compact ? "p-3" : "p-4")}>
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { progress, nextLevel, pointsNeeded } = getProgressToNextLevel();
  const level = points?.current_level || 'bronze';
  const totalPoints = points?.total_points || 0;
  const streak = points?.consecutive_on_time || 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
        LEVEL_BG_COLORS[level]
      )}>
        <span className="text-lg">{LEVEL_ICONS[level]}</span>
        <div className="flex items-center gap-1">
          <Zap className={cn("w-4 h-4", LEVEL_COLORS[level])} />
          <span className={cn("font-bold text-sm", LEVEL_COLORS[level])}>
            {totalPoints} UP
          </span>
        </div>
        {streak >= 3 && (
          <div className="flex items-center gap-0.5 text-orange-500">
            <Flame className="w-3 h-3" />
            <span className="text-xs font-medium">{streak}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "border-2 bg-gradient-to-br backdrop-blur-xl overflow-hidden",
      LEVEL_BG_COLORS[level]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center text-2xl",
              "bg-background/50 border",
              LEVEL_BG_COLORS[level]
            )}>
              {LEVEL_ICONS[level]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Zap className={cn("w-5 h-5", LEVEL_COLORS[level])} />
                <span className={cn("text-2xl font-bold", LEVEL_COLORS[level])}>
                  {totalPoints}
                </span>
                <span className="text-sm text-muted-foreground">UP</span>
              </div>
              <p className={cn("text-sm font-medium", LEVEL_COLORS[level])}>
                Nivel {LEVEL_LABELS[level]}
              </p>
            </div>
          </div>
          
          {streak >= 3 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{streak}</span>
            </div>
          )}
        </div>

        {level !== 'diamond' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Próximo: {LEVEL_LABELS[nextLevel]}
              </span>
              <span className="text-muted-foreground">
                {pointsNeeded} UP restantes
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {level === 'diamond' && (
          <div className="flex items-center gap-2 text-xs text-cyan-400">
            <Trophy className="w-4 h-4" />
            <span>¡Nivel máximo alcanzado!</span>
          </div>
        )}

        {/* Stats compactos */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="text-center">
            <p className="text-lg font-bold">{points?.total_completions || 0}</p>
            <p className="text-xs text-muted-foreground">Completados</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-success">{points?.total_on_time || 0}</p>
            <p className="text-xs text-muted-foreground">A tiempo</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-destructive">{points?.total_late || 0}</p>
            <p className="text-xs text-muted-foreground">Tardíos</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
