import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, Scissors, TrendingUp, TrendingDown, CheckCircle, AlertCircle, 
  Crown, Medal, Award, Star, Zap
} from 'lucide-react';
import { useUPCreadores, UPCreadorTotals } from '@/hooks/useUPCreadores';
import { useUPEditores, UPEditorTotals } from '@/hooks/useUPEditores';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { 
  DEFAULT_LEVEL_THRESHOLDS, 
  LEVEL_LABELS, 
  LEVEL_COLORS, 
  LEVEL_ICONS_ALT,
  parseThresholdsFromDB,
  type LevelThresholds 
} from '@/lib/upLevels';

interface StatsCardProps {
  title: string;
  icon: React.ElementType;
  totals: UPCreadorTotals | UPEditorTotals | null;
  loading: boolean;
  type: 'creator' | 'editor';
  thresholds: LevelThresholds;
}

function StatsCard({ title, icon: Icon, totals, loading, type, thresholds }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!totals) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Zap className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Aún no tienes puntos como {type === 'creator' ? 'creador' : 'editor'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const level = totals.current_level as 'bronze' | 'silver' | 'gold' | 'diamond';
  const levelLabel = LEVEL_LABELS[level];
  const levelColor = LEVEL_COLORS[level];
  const LevelIcon = LEVEL_ICONS[level];

  // Calculate progress to next level
  const currentPoints = totals.total_points;
  let progress = 100;
  let nextLevelLabel = 'Gran Maestre';
  let pointsNeeded = 0;

  const levelOrder: Array<'bronze' | 'silver' | 'gold' | 'diamond'> = ['bronze', 'silver', 'gold', 'diamond'];
  const currentIdx = levelOrder.indexOf(level);

  if (level !== 'diamond') {
    const nextLevel = levelOrder[currentIdx + 1];
    nextLevelLabel = LEVEL_LABELS[nextLevel];
    const currentThreshold = thresholds[level];
    const nextThreshold = thresholds[nextLevel];
    const range = nextThreshold - currentThreshold;
    progress = ((currentPoints - currentThreshold) / range) * 100;
    pointsNeeded = nextThreshold - currentPoints;
  }

  const deliveryRate = totals.total_deliveries > 0 
    ? Math.round((totals.on_time_deliveries / totals.total_deliveries) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Points and Level */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold">{totals.total_points}</div>
            <div className="text-xs text-muted-foreground">Puntos UP</div>
          </div>
          <Badge className={cn("gap-1 text-sm py-1 px-3", levelColor.bg, levelColor.color)}>
            <LevelIcon className="h-4 w-4" />
            {levelLabel}
          </Badge>
        </div>

        {/* Progress to next level */}
        {level !== 'diamond' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso a {nextLevelLabel}</span>
              <span>{pointsNeeded} UP restantes</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, progress))} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">{totals.on_time_deliveries}</div>
              <div className="text-xs text-muted-foreground">A tiempo</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <div>
              <div className="text-sm font-medium">{totals.late_deliveries}</div>
              <div className="text-xs text-muted-foreground">Tarde</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <div>
              <div className="text-sm font-medium">{totals.clean_approvals}</div>
              <div className="text-xs text-muted-foreground">Limpias</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-sm font-medium">{totals.total_issues}</div>
              <div className="text-xs text-muted-foreground">Novedades</div>
            </div>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">Tasa de entrega a tiempo</span>
          <span className={cn(
            "font-medium",
            deliveryRate >= 80 ? "text-green-500" : deliveryRate >= 50 ? "text-yellow-500" : "text-red-500"
          )}>
            {deliveryRate}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface UPUserStatsProps {
  userId: string;
  showCreator?: boolean;
  showEditor?: boolean;
}

export function UPUserStats({ userId, showCreator = true, showEditor = true }: UPUserStatsProps) {
  const { totals: creatorTotals, loading: loadingCreator } = useUPCreadores(userId);
  const { totals: editorTotals, loading: loadingEditor } = useUPEditores(userId);
  const [thresholds, setThresholds] = useState<LevelThresholds>(DEFAULT_THRESHOLDS);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {showCreator && (
        <StatsCard
          title="Puntos como Creador"
          icon={Video}
          totals={creatorTotals}
          loading={loadingCreator}
          type="creator"
          thresholds={thresholds}
        />
      )}
      {showEditor && (
        <StatsCard
          title="Puntos como Editor"
          icon={Scissors}
          totals={editorTotals}
          loading={loadingEditor}
          type="editor"
          thresholds={thresholds}
        />
      )}
    </div>
  );
}
