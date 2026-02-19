import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Zap, TrendingUp, Clock, CheckCircle2, AlertTriangle, Video, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserReputation } from '@/hooks/useUnifiedReputation';
import { LEVEL_META } from '@/lib/reputation/types';

interface RoleUPWidgetProps {
  userId: string;
  role: 'creator' | 'editor';
  compact?: boolean;
}

const LEVEL_THRESHOLDS = {
  Novato: 0,
  Pro: 500,
  Elite: 2000,
  Master: 5000,
  Legend: 15000,
};

const LEVEL_ORDER = ['Novato', 'Pro', 'Elite', 'Master', 'Legend'] as const;

export function RoleUPWidget({ userId, role, compact = false }: RoleUPWidgetProps) {
  const { scores, loading } = useUserReputation(userId);

  const RoleIcon = role === 'creator' ? Video : Scissors;
  const roleLabel = role === 'creator' ? 'Creador' : 'Editor';

  // Find the score for the requested role
  const roleScore = useMemo(() => {
    return scores.find(s => s.role_key === role) || null;
  }, [scores, role]);

  // Calculate stats from the role score
  const stats = useMemo(() => {
    if (!roleScore) {
      return {
        totalPoints: 0,
        totalDeliveries: 0,
        onTimeDeliveries: 0,
        lateDeliveries: 0,
        cleanApprovals: 0,
        totalIssues: 0,
        currentLevel: 'Novato',
      };
    }

    const totalDeliveries = roleScore.lifetime_tasks;
    const onTimeDeliveries = Math.round(roleScore.on_time_rate * totalDeliveries);
    const lateDeliveries = totalDeliveries - onTimeDeliveries;
    const cleanApprovals = Math.round(roleScore.approval_rate * totalDeliveries);
    const totalIssues = Math.round(roleScore.revision_rate * totalDeliveries);

    return {
      totalPoints: roleScore.lifetime_points,
      totalDeliveries,
      onTimeDeliveries,
      lateDeliveries,
      cleanApprovals,
      totalIssues,
      currentLevel: roleScore.current_level || 'Novato',
    };
  }, [roleScore]);

  // Calculate progress to next level
  const progressData = useMemo(() => {
    const currentLevel = stats.currentLevel;
    const currentPoints = stats.totalPoints;

    const currentIndex = LEVEL_ORDER.indexOf(currentLevel as any);

    if (currentLevel === 'Legend' || currentIndex === -1) {
      return { progress: 100, nextLevel: 'Legend', pointsNeeded: 0 };
    }

    const nextLevel = LEVEL_ORDER[currentIndex + 1];
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel as keyof typeof LEVEL_THRESHOLDS];
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel];
    const pointsInLevel = currentPoints - currentThreshold;
    const pointsForLevel = nextThreshold - currentThreshold;
    const progress = Math.min(100, (pointsInLevel / pointsForLevel) * 100);
    const pointsNeeded = nextThreshold - currentPoints;

    return { progress, nextLevel, pointsNeeded };
  }, [stats.currentLevel, stats.totalPoints]);

  // Get level metadata
  const levelMeta = LEVEL_META[stats.currentLevel] || LEVEL_META.Novato;
  const nextLevelMeta = progressData.nextLevel !== stats.currentLevel
    ? LEVEL_META[progressData.nextLevel] || null
    : null;

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

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
          "bg-opacity-20 border-opacity-30"
        )}
        style={{
          backgroundColor: levelMeta.bgColor,
          borderColor: levelMeta.color,
        }}
      >
        <span className="text-lg">{levelMeta.icon}</span>
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4" style={{ color: levelMeta.color }} />
          <span className="font-bold text-sm" style={{ color: levelMeta.color }}>
            {stats.totalPoints} UP
          </span>
        </div>
        <RoleIcon className="w-3 h-3 text-muted-foreground ml-1" />
      </div>
    );
  }

  return (
    <Card
      className="border-2 bg-gradient-to-br backdrop-blur-xl overflow-hidden"
      style={{
        backgroundColor: `${levelMeta.bgColor}33`,
        borderColor: `${levelMeta.color}4D`,
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center text-2xl bg-background/50 border"
              style={{
                backgroundColor: `${levelMeta.bgColor}33`,
                borderColor: `${levelMeta.color}4D`,
              }}
            >
              {levelMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: levelMeta.color }} />
                <span className="text-2xl font-bold" style={{ color: levelMeta.color }}>
                  {stats.totalPoints}
                </span>
                <span className="text-sm text-muted-foreground">UP</span>
              </div>
              <p className="text-sm font-medium" style={{ color: levelMeta.color }}>
                Nivel {stats.currentLevel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/50">
            <RoleIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
        </div>

        {stats.currentLevel !== 'Legend' && nextLevelMeta && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Próximo: {progressData.nextLevel}
              </span>
              <span className="text-muted-foreground">
                {progressData.pointsNeeded} UP restantes
              </span>
            </div>
            <Progress value={progressData.progress} className="h-2" />
          </div>
        )}

        {stats.currentLevel === 'Legend' && (
          <div className="flex items-center gap-2 text-xs" style={{ color: levelMeta.color }}>
            <Trophy className="w-4 h-4" />
            <span>¡Nivel máximo alcanzado!</span>
          </div>
        )}

        {/* Stats del rol específico */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.onTimeDeliveries}</p>
              <p className="text-xs text-muted-foreground">A tiempo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-orange-500/20">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.lateDeliveries}</p>
              <p className="text-xs text-muted-foreground">Tardías</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-emerald-500/20">
              <Trophy className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.cleanApprovals}</p>
              <p className="text-xs text-muted-foreground">Limpias</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{stats.totalIssues}</p>
              <p className="text-xs text-muted-foreground">Novedades</p>
            </div>
          </div>
        </div>

        {/* Total entregas */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total entregas</span>
            <span className="font-bold">{stats.totalDeliveries}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
