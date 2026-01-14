import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Zap, TrendingUp, Flame, Video, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UPWidgetProps {
  userId: string;
  compact?: boolean;
}

type UPLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

interface CombinedPoints {
  total_points: number;
  current_level: UPLevel;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  clean_approvals: number;
  total_issues: number;
  creator_points: number;
  editor_points: number;
}

const LEVEL_ICONS: Record<UPLevel, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

const LEVEL_LABELS: Record<UPLevel, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  diamond: 'Diamante'
};

const LEVEL_COLORS: Record<UPLevel, string> = {
  bronze: 'text-amber-600',
  silver: 'text-slate-400',
  gold: 'text-yellow-500',
  diamond: 'text-cyan-400'
};

const LEVEL_BG_COLORS: Record<UPLevel, string> = {
  bronze: 'bg-amber-600/20 border-amber-600/30',
  silver: 'bg-slate-400/20 border-slate-400/30',
  gold: 'bg-yellow-500/20 border-yellow-500/30',
  diamond: 'bg-cyan-400/20 border-cyan-400/30'
};

const LEVEL_THRESHOLDS: Record<UPLevel, number> = {
  bronze: 0,
  silver: 100,
  gold: 300,
  diamond: 600
};

function calculateLevel(points: number): UPLevel {
  if (points >= LEVEL_THRESHOLDS.diamond) return 'diamond';
  if (points >= LEVEL_THRESHOLDS.gold) return 'gold';
  if (points >= LEVEL_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export function UPWidget({ userId, compact = false }: UPWidgetProps) {
  const [points, setPoints] = useState<CombinedPoints | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPoints = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch from both creator and editor totals
      const [creatorResult, editorResult] = await Promise.all([
        supabase
          .from('up_creadores_totals')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('up_editores_totals')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      const creatorData = creatorResult.data;
      const editorData = editorResult.data;

      const creatorPoints = creatorData?.total_points || 0;
      const editorPoints = editorData?.total_points || 0;
      const totalPoints = creatorPoints + editorPoints;

      const combinedPoints: CombinedPoints = {
        total_points: totalPoints,
        current_level: calculateLevel(totalPoints),
        total_deliveries: (creatorData?.total_deliveries || 0) + (editorData?.total_deliveries || 0),
        on_time_deliveries: (creatorData?.on_time_deliveries || 0) + (editorData?.on_time_deliveries || 0),
        late_deliveries: (creatorData?.late_deliveries || 0) + (editorData?.late_deliveries || 0),
        clean_approvals: (creatorData?.clean_approvals || 0) + (editorData?.clean_approvals || 0),
        total_issues: (creatorData?.total_issues || 0) + (editorData?.total_issues || 0),
        creator_points: creatorPoints,
        editor_points: editorPoints
      };

      setPoints(combinedPoints);
    } catch (err) {
      console.error('Error fetching user points:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPoints();

    // Set up realtime subscriptions
    const creatorChannel = supabase
      .channel(`up_creadores_totals_widget_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_creadores_totals',
          filter: `user_id=eq.${userId}`
        },
        () => fetchPoints()
      )
      .subscribe();

    const editorChannel = supabase
      .channel(`up_editores_totals_widget_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'up_editores_totals',
          filter: `user_id=eq.${userId}`
        },
        () => fetchPoints()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creatorChannel);
      supabase.removeChannel(editorChannel);
    };
  }, [fetchPoints, userId]);

  const getProgressToNextLevel = useCallback(() => {
    const currentPoints = points?.total_points || 0;
    const currentLevel = points?.current_level || 'bronze';

    const levels: UPLevel[] = ['bronze', 'silver', 'gold', 'diamond'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentLevel === 'diamond') {
      return { progress: 100, nextLevel: 'diamond' as UPLevel, pointsNeeded: 0 };
    }

    const nextLevel = levels[currentIndex + 1] as UPLevel;
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
    const nextThreshold = LEVEL_THRESHOLDS[nextLevel];
    const pointsInLevel = currentPoints - currentThreshold;
    const pointsForLevel = nextThreshold - currentThreshold;
    const progress = Math.min(100, (pointsInLevel / pointsForLevel) * 100);
    const pointsNeeded = nextThreshold - currentPoints;

    return { progress, nextLevel, pointsNeeded };
  }, [points]);

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
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <Video className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold">{points?.creator_points || 0}</p>
              <p className="text-xs text-muted-foreground">Creador</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <Scissors className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold">{points?.editor_points || 0}</p>
              <p className="text-xs text-muted-foreground">Editor</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="text-center">
            <p className="text-sm font-bold text-green-500">{points?.on_time_deliveries || 0}</p>
            <p className="text-xs text-muted-foreground">A tiempo</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-emerald-500">{points?.clean_approvals || 0}</p>
            <p className="text-xs text-muted-foreground">Limpias</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-orange-500">{points?.total_issues || 0}</p>
            <p className="text-xs text-muted-foreground">Novedades</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
