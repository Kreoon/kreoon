import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Users, Video, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Zap, Star, Award, Target, Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrgRanking } from '@/hooks/useUnifiedReputation';
import { LEVEL_META } from '@/lib/reputation/types';

interface UPSystemKPIsProps {
  organizationId: string;
  className?: string;
}

interface RoleStats {
  totalPoints: number;
  totalTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  avgOnTimeRate: number;
  maxStreak: number;
  topPerformers: { name: string; points: number; level: string }[];
}

export function UPSystemKPIs({ organizationId, className }: UPSystemKPIsProps) {
  const { ranking, loading } = useOrgRanking(organizationId);

  // Split ranking by role and compute aggregate stats
  const { creatorStats, editorStats } = useMemo(() => {
    if (!ranking || ranking.length === 0) {
      const emptyStats: RoleStats = {
        totalPoints: 0,
        totalTasks: 0,
        onTimeTasks: 0,
        lateTasks: 0,
        avgOnTimeRate: 0,
        maxStreak: 0,
        topPerformers: [],
      };
      return { creatorStats: emptyStats, editorStats: emptyStats };
    }

    const creators = ranking.filter(r => r.role_key === 'creator');
    const editors = ranking.filter(r => r.role_key === 'editor');

    const computeStats = (entries: typeof ranking): RoleStats => {
      if (entries.length === 0) {
        return {
          totalPoints: 0,
          totalTasks: 0,
          onTimeTasks: 0,
          lateTasks: 0,
          avgOnTimeRate: 0,
          maxStreak: 0,
          topPerformers: [],
        };
      }

      const totalPoints = entries.reduce((sum, e) => sum + (e.lifetime_points || 0), 0);
      const totalTasks = entries.reduce((sum, e) => sum + (e.lifetime_tasks || 0), 0);
      const onTimeTasks = entries.reduce(
        (sum, e) => sum + Math.round((e.on_time_rate || 0) * (e.lifetime_tasks || 0)),
        0
      );
      const lateTasks = totalTasks - onTimeTasks;
      const avgOnTimeRate = totalTasks > 0 ? Math.round((onTimeTasks / totalTasks) * 100) : 0;
      const maxStreak = Math.max(...entries.map(e => e.current_streak_days || 0), 0);

      const topPerformers = entries
        .slice(0, 5)
        .map(e => ({
          name: e.full_name || 'Sin nombre',
          points: e.lifetime_points || 0,
          level: e.current_level || 'Novato',
        }));

      return {
        totalPoints,
        totalTasks,
        onTimeTasks,
        lateTasks,
        avgOnTimeRate,
        maxStreak,
        topPerformers,
      };
    };

    return {
      creatorStats: computeStats(creators),
      editorStats: computeStats(editors),
    };
  }, [ranking]);

  const renderStatsGrid = (stats: RoleStats, type: 'creator' | 'editor') => {
    const color = type === 'creator' ? 'info' : 'warning';

    return (
      <div className="space-y-4">
        {/* Main KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={cn("p-3 rounded-sm border bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20")}>
            <div className="flex items-center gap-1 mb-1">
              <Zap className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground">Puntos</span>
            </div>
            <p className="text-xl font-bold text-blue-500">{stats.totalPoints.toLocaleString()}</p>
          </div>

          <div className="p-3 rounded-sm border bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-[10px] text-muted-foreground">A tiempo</span>
            </div>
            <p className="text-xl font-bold text-green-500">{stats.onTimeTasks}</p>
          </div>

          <div className="p-3 rounded-sm border bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              <span className="text-[10px] text-muted-foreground">Tardías</span>
            </div>
            <p className="text-xl font-bold text-yellow-500">{stats.lateTasks}</p>
          </div>

          <div className="p-3 rounded-sm border bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/20">
            <div className="flex items-center gap-1 mb-1">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-[10px] text-muted-foreground">Racha Max</span>
            </div>
            <p className="text-xl font-bold text-orange-500">{stats.maxStreak}d</p>
          </div>
        </div>

        {/* Progress and secondary metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-sm border bg-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Tasa de Puntualidad</span>
              <span className={cn(
                "text-sm font-bold",
                stats.avgOnTimeRate >= 80 ? "text-green-500" : stats.avgOnTimeRate >= 60 ? "text-yellow-500" : "text-red-500"
              )}>{stats.avgOnTimeRate}%</span>
            </div>
            <Progress value={stats.avgOnTimeRate} className="h-2" />
          </div>

          <div className="p-3 rounded-sm border bg-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Tareas Totales</span>
              <span className="text-sm font-bold text-foreground">{stats.totalTasks}</span>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>✅ Completadas: {stats.onTimeTasks}</span>
              <span>⏰ Tardías: {stats.lateTasks}</span>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {stats.topPerformers.length > 0 && (
          <div className="p-3 rounded-sm border bg-card">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-primary" />
              Top {type === 'creator' ? 'Creadores' : 'Editores'}
            </h4>
            <div className="space-y-1.5">
              {stats.topPerformers.map((performer, idx) => {
                const levelMeta = LEVEL_META[performer.level] || LEVEL_META.Novato;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        idx === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        idx === 1 ? "bg-muted text-muted-foreground" :
                        idx === 2 ? "bg-orange-500/20 text-orange-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="font-medium truncate max-w-[120px]">{performer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0 border",
                          levelMeta.color,
                          levelMeta.bgColor,
                          `border-${levelMeta.color.replace('text-', '')}/30`
                        )}
                      >
                        <span className="mr-0.5">{levelMeta.icon}</span>
                        {performer.level}
                      </Badge>
                      <span className="font-bold text-primary">{performer.points} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("rounded-sm border border-border/50 bg-card p-4", className)}>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-sm border border-border/50 bg-card", className)}>
      <Tabs defaultValue="creators" className="w-full">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Sistema UP</h3>
          </div>
          <TabsList className="h-7">
            <TabsTrigger value="creators" className="text-xs h-6 px-3">
              <Video className="h-3 w-3 mr-1" />
              Creadores
            </TabsTrigger>
            <TabsTrigger value="editors" className="text-xs h-6 px-3">
              <Users className="h-3 w-3 mr-1" />
              Editores
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-3">
          <TabsContent value="creators" className="m-0">
            {renderStatsGrid(creatorStats, 'creator')}
          </TabsContent>

          <TabsContent value="editors" className="m-0">
            {renderStatsGrid(editorStats, 'editor')}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
