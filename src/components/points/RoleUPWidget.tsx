import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Zap, TrendingUp, Clock, CheckCircle2, AlertTriangle, Video, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface RoleUPWidgetProps {
  userId: string;
  role: 'creator' | 'editor';
  compact?: boolean;
}

type UPLevel = 'bronze' | 'silver' | 'gold' | 'diamond';

interface RolePoints {
  total_points: number;
  current_level: UPLevel;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  clean_approvals: number;
  total_issues: number;
}

interface LevelThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

const LEVEL_ICONS: Record<UPLevel, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎'
};

const LEVEL_LABELS: Record<UPLevel, string> = {
  bronze: 'Escudero',
  silver: 'Caballero',
  gold: 'Comandante',
  diamond: 'Gran Maestre'
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

// Default thresholds (fallback if DB not available)
const DEFAULT_THRESHOLDS: LevelThresholds = {
  bronze: 0,
  silver: 500,
  gold: 800,
  diamond: 1200
};

function calculateLevel(points: number, thresholds: LevelThresholds): UPLevel {
  if (points >= thresholds.diamond) return 'diamond';
  if (points >= thresholds.gold) return 'gold';
  if (points >= thresholds.silver) return 'silver';
  return 'bronze';
}

export function RoleUPWidget({ userId, role, compact = false }: RoleUPWidgetProps) {
  const [points, setPoints] = useState<RolePoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<LevelThresholds>(DEFAULT_THRESHOLDS);

  const tableName = role === 'creator' ? 'up_creadores_totals' : 'up_editores_totals';
  const RoleIcon = role === 'creator' ? Video : Scissors;
  const roleLabel = role === 'creator' ? 'Creador' : 'Editor';

  // Fetch level thresholds from up_settings
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const { data } = await supabase
          .from('up_settings')
          .select('value')
          .eq('key', 'level_thresholds')
          .maybeSingle();
        
        if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
          const val = data.value as Record<string, number>;
          setThresholds({
            bronze: val.bronze ?? 0,
            silver: val.silver ?? 500,
            gold: val.gold ?? 800,
            diamond: val.diamond ?? 1200
          });
        }
      } catch (err) {
        console.error('Error fetching level thresholds:', err);
      }
    };
    fetchThresholds();
  }, []);

  const fetchPoints = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch V2 data
      const { data: v2Data, error: v2Error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (v2Error) throw v2Error;

      // For creators, also fetch legacy points from user_points table
      let legacyPoints = 0;
      if (role === 'creator') {
        const { data: legacyData } = await supabase
          .from('user_points')
          .select('total_points')
          .eq('user_id', userId)
          .maybeSingle();
        
        legacyPoints = legacyData?.total_points || 0;
      }

      // Use the maximum between V2 and legacy points
      const v2Points = v2Data?.total_points || 0;
      const totalPoints = Math.max(v2Points, legacyPoints);

      const rolePoints: RolePoints = {
        total_points: totalPoints,
        current_level: calculateLevel(totalPoints, thresholds),
        total_deliveries: v2Data?.total_deliveries || 0,
        on_time_deliveries: v2Data?.on_time_deliveries || 0,
        late_deliveries: v2Data?.late_deliveries || 0,
        clean_approvals: v2Data?.clean_approvals || 0,
        total_issues: v2Data?.total_issues || 0
      };

      setPoints(rolePoints);
    } catch (err) {
      console.error(`Error fetching ${role} points:`, err);
    } finally {
      setLoading(false);
    }
  }, [userId, tableName, role, thresholds]);

  useEffect(() => {
    fetchPoints();

    const channel = supabase
      .channel(`${tableName}_widget_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${userId}`
        },
        () => fetchPoints()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPoints, userId, tableName]);

  const getProgressToNextLevel = useCallback(() => {
    const currentPoints = points?.total_points || 0;
    const currentLevel = points?.current_level || 'bronze';

    const levels: UPLevel[] = ['bronze', 'silver', 'gold', 'diamond'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentLevel === 'diamond') {
      return { progress: 100, nextLevel: 'diamond' as UPLevel, pointsNeeded: 0 };
    }

    const nextLevel = levels[currentIndex + 1] as UPLevel;
    const currentThreshold = thresholds[currentLevel];
    const nextThreshold = thresholds[nextLevel];
    const pointsInLevel = currentPoints - currentThreshold;
    const pointsForLevel = nextThreshold - currentThreshold;
    const progress = Math.min(100, (pointsInLevel / pointsForLevel) * 100);
    const pointsNeeded = nextThreshold - currentPoints;

    return { progress, nextLevel, pointsNeeded };
  }, [points, thresholds]);

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
        <RoleIcon className="w-3 h-3 text-muted-foreground ml-1" />
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
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/50">
            <RoleIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
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

        {/* Stats del rol específico */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{points?.on_time_deliveries || 0}</p>
              <p className="text-xs text-muted-foreground">A tiempo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-orange-500/20">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{points?.late_deliveries || 0}</p>
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
              <p className="text-lg font-bold">{points?.clean_approvals || 0}</p>
              <p className="text-xs text-muted-foreground">Limpias</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
            <div className="p-1.5 rounded-md bg-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{points?.total_issues || 0}</p>
              <p className="text-xs text-muted-foreground">Novedades</p>
            </div>
          </div>
        </div>

        {/* Total entregas */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total entregas</span>
            <span className="font-bold">{points?.total_deliveries || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
