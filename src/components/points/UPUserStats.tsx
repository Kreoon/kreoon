import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, Scissors, TrendingUp, TrendingDown, CheckCircle, AlertCircle, 
  Trophy, Crown, Medal, Award, Star, Zap
} from 'lucide-react';
import { useUPCreadores, UPCreadorTotals } from '@/hooks/useUPCreadores';
import { useUPEditores, UPEditorTotals } from '@/hooks/useUPEditores';
import { cn } from '@/lib/utils';

const LEVEL_CONFIG = {
  bronze: { label: 'Bronce', color: 'text-amber-600', bg: 'bg-amber-600/20', icon: Medal, min: 0, max: 99 },
  silver: { label: 'Plata', color: 'text-slate-400', bg: 'bg-slate-400/20', icon: Award, min: 100, max: 249 },
  gold: { label: 'Oro', color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: Crown, min: 250, max: 499 },
  diamond: { label: 'Diamante', color: 'text-cyan-400', bg: 'bg-cyan-400/20', icon: Star, min: 500, max: Infinity }
};

interface StatsCardProps {
  title: string;
  icon: React.ElementType;
  totals: UPCreadorTotals | UPEditorTotals | null;
  loading: boolean;
  type: 'creator' | 'editor';
}

function StatsCard({ title, icon: Icon, totals, loading, type }: StatsCardProps) {
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

  const level = totals.current_level as keyof typeof LEVEL_CONFIG;
  const levelConfig = LEVEL_CONFIG[level];
  const LevelIcon = levelConfig.icon;

  // Calculate progress to next level
  const currentPoints = totals.total_points;
  let progress = 100;
  let nextLevel = 'diamond';
  let pointsNeeded = 0;

  if (level !== 'diamond') {
    const levelOrder: Array<keyof typeof LEVEL_CONFIG> = ['bronze', 'silver', 'gold', 'diamond'];
    const currentIdx = levelOrder.indexOf(level);
    nextLevel = levelOrder[currentIdx + 1];
    const nextConfig = LEVEL_CONFIG[nextLevel as keyof typeof LEVEL_CONFIG];
    const range = nextConfig.min - levelConfig.min;
    progress = ((currentPoints - levelConfig.min) / range) * 100;
    pointsNeeded = nextConfig.min - currentPoints;
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
          <Badge className={cn("gap-1 text-sm py-1 px-3", levelConfig.bg, levelConfig.color)}>
            <LevelIcon className="h-4 w-4" />
            {levelConfig.label}
          </Badge>
        </div>

        {/* Progress to next level */}
        {level !== 'diamond' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progreso a {LEVEL_CONFIG[nextLevel as keyof typeof LEVEL_CONFIG].label}</span>
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {showCreator && (
        <StatsCard
          title="Puntos como Creador"
          icon={Video}
          totals={creatorTotals}
          loading={loadingCreator}
          type="creator"
        />
      )}
      {showEditor && (
        <StatsCard
          title="Puntos como Editor"
          icon={Scissors}
          totals={editorTotals}
          loading={loadingEditor}
          type="editor"
        />
      )}
    </div>
  );
}
