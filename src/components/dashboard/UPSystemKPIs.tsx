import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, Users, Video, Clock, CheckCircle, AlertTriangle,
  TrendingUp, Zap, Star, Award, Target, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UPSystemKPIsProps {
  organizationId: string;
  className?: string;
}

interface CreatorStats {
  totalPoints: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  issues: number;
  cleanApprovals: number;
  reassignments: number;
  avgDeliveryDays: number;
  topPerformers: { name: string; points: number; level: string }[];
}

interface EditorStats {
  totalPoints: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  issues: number;
  cleanApprovals: number;
  reassignments: number;
  avgDeliveryDays: number;
  topPerformers: { name: string; points: number; level: string }[];
}

const LEVEL_COLORS: Record<string, string> = {
  diamond: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  gold: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  silver: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
  bronze: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
};

const LEVEL_ICONS: Record<string, typeof Trophy> = {
  diamond: Star,
  gold: Trophy,
  silver: Award,
  bronze: Target,
};

export function UPSystemKPIs({ organizationId, className }: UPSystemKPIsProps) {
  const [loading, setLoading] = useState(true);
  const [creatorStats, setCreatorStats] = useState<CreatorStats>({
    totalPoints: 0,
    totalDeliveries: 0,
    onTimeDeliveries: 0,
    lateDeliveries: 0,
    issues: 0,
    cleanApprovals: 0,
    reassignments: 0,
    avgDeliveryDays: 0,
    topPerformers: [],
  });
  const [editorStats, setEditorStats] = useState<EditorStats>({
    totalPoints: 0,
    totalDeliveries: 0,
    onTimeDeliveries: 0,
    lateDeliveries: 0,
    issues: 0,
    cleanApprovals: 0,
    reassignments: 0,
    avgDeliveryDays: 0,
    topPerformers: [],
  });

  useEffect(() => {
    if (!organizationId) return;
    fetchStats();
  }, [organizationId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch creator totals from V2 system only
      const { data: creatorTotals } = await supabase
        .from('up_creadores_totals')
        .select('*, profiles(full_name)')
        .eq('organization_id', organizationId)
        .order('total_points', { ascending: false });

      // Fetch editor totals
      const { data: editorTotals } = await supabase
        .from('up_editores_totals')
        .select('*, profiles(full_name)')
        .eq('organization_id', organizationId)
        .order('total_points', { ascending: false });

      // Fetch recent creator events for avg delivery days
      const { data: creatorEvents } = await supabase
        .from('up_creadores')
        .select('days_to_deliver')
        .eq('organization_id', organizationId)
        .not('days_to_deliver', 'is', null);

      // Fetch recent editor events for avg delivery days
      const { data: editorEvents } = await supabase
        .from('up_editores')
        .select('days_to_deliver')
        .eq('organization_id', organizationId)
        .not('days_to_deliver', 'is', null);

      // Calculate creator stats from V2 only
      if (creatorTotals) {
        const totals = creatorTotals.reduce((acc, ct) => ({
          totalPoints: acc.totalPoints + (ct.total_points || 0),
          totalDeliveries: acc.totalDeliveries + (ct.total_deliveries || 0),
          onTimeDeliveries: acc.onTimeDeliveries + (ct.on_time_deliveries || 0),
          lateDeliveries: acc.lateDeliveries + (ct.late_deliveries || 0),
          issues: acc.issues + (ct.total_issues || 0),
          cleanApprovals: acc.cleanApprovals + (ct.clean_approvals || 0),
          reassignments: acc.reassignments + (ct.reassignments || 0),
        }), {
          totalPoints: 0, totalDeliveries: 0, onTimeDeliveries: 0,
          lateDeliveries: 0, issues: 0, cleanApprovals: 0, reassignments: 0
        });

        const avgDays = creatorEvents?.length 
          ? creatorEvents.reduce((sum, e) => sum + (e.days_to_deliver || 0), 0) / creatorEvents.length
          : 0;

        setCreatorStats({
          ...totals,
          avgDeliveryDays: Math.round(avgDays * 10) / 10,
          topPerformers: creatorTotals.slice(0, 5).map(ct => ({
            name: (ct.profiles as any)?.full_name || 'Sin nombre',
            points: ct.total_points || 0,
            level: ct.current_level || 'bronze',
          })),
        });
      }

      // Calculate editor stats
      if (editorTotals) {
        const totals = editorTotals.reduce((acc, et) => ({
          totalPoints: acc.totalPoints + (et.total_points || 0),
          totalDeliveries: acc.totalDeliveries + (et.total_deliveries || 0),
          onTimeDeliveries: acc.onTimeDeliveries + (et.on_time_deliveries || 0),
          lateDeliveries: acc.lateDeliveries + (et.late_deliveries || 0),
          issues: acc.issues + (et.total_issues || 0),
          cleanApprovals: acc.cleanApprovals + (et.clean_approvals || 0),
          reassignments: acc.reassignments + (et.reassignments || 0),
        }), {
          totalPoints: 0, totalDeliveries: 0, onTimeDeliveries: 0,
          lateDeliveries: 0, issues: 0, cleanApprovals: 0, reassignments: 0
        });

        const avgDays = editorEvents?.length 
          ? editorEvents.reduce((sum, e) => sum + (e.days_to_deliver || 0), 0) / editorEvents.length
          : 0;

        setEditorStats({
          ...totals,
          avgDeliveryDays: Math.round(avgDays * 10) / 10,
          topPerformers: editorTotals.slice(0, 5).map(et => ({
            name: (et.profiles as any)?.full_name || 'Sin nombre',
            points: et.total_points || 0,
            level: et.current_level || 'bronze',
          })),
        });
      }
    } catch (error) {
      console.error('Error fetching UP stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onTimeRate = (onTime: number, total: number) => 
    total > 0 ? Math.round((onTime / total) * 100) : 0;

  const renderStatsGrid = (stats: CreatorStats | EditorStats, type: 'creator' | 'editor') => {
    const rate = onTimeRate(stats.onTimeDeliveries, stats.totalDeliveries);
    const color = type === 'creator' ? 'info' : 'warning';

    return (
      <div className="space-y-4">
        {/* Main KPIs */}
        <div className="grid grid-cols-4 gap-2">
          <div className={cn("p-3 rounded-lg border bg-gradient-to-br", `from-${color}/10 to-transparent border-${color}/20`)}>
            <div className="flex items-center gap-1 mb-1">
              <Zap className={cn("h-3 w-3", `text-${color}`)} />
              <span className="text-[10px] text-muted-foreground">Puntos</span>
            </div>
            <p className={cn("text-xl font-bold", `text-${color}`)}>{stats.totalPoints.toLocaleString()}</p>
          </div>
          
          <div className="p-3 rounded-lg border bg-gradient-to-br from-success/10 to-transparent border-success/20">
            <div className="flex items-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-success" />
              <span className="text-[10px] text-muted-foreground">A tiempo</span>
            </div>
            <p className="text-xl font-bold text-success">{stats.onTimeDeliveries}</p>
          </div>
          
          <div className="p-3 rounded-lg border bg-gradient-to-br from-warning/10 to-transparent border-warning/20">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-warning" />
              <span className="text-[10px] text-muted-foreground">Tardías</span>
            </div>
            <p className="text-xl font-bold text-warning">{stats.lateDeliveries}</p>
          </div>
          
          <div className="p-3 rounded-lg border bg-gradient-to-br from-destructive/10 to-transparent border-destructive/20">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] text-muted-foreground">Novedades</span>
            </div>
            <p className="text-xl font-bold text-destructive">{stats.issues}</p>
          </div>
        </div>

        {/* Progress and secondary metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Tasa de Puntualidad</span>
              <span className={cn(
                "text-sm font-bold",
                rate >= 80 ? "text-success" : rate >= 60 ? "text-warning" : "text-destructive"
              )}>{rate}%</span>
            </div>
            <Progress value={rate} className="h-2" />
          </div>
          
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-muted-foreground">Promedio Entrega</span>
              <span className="text-sm font-bold text-foreground">{stats.avgDeliveryDays} días</span>
            </div>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>✨ Aprobaciones limpias: {stats.cleanApprovals}</span>
              <span>🔄 Reasignaciones: {stats.reassignments}</span>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {stats.topPerformers.length > 0 && (
          <div className="p-3 rounded-lg border bg-card">
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-primary" />
              Top {type === 'creator' ? 'Creadores' : 'Editores'}
            </h4>
            <div className="space-y-1.5">
              {stats.topPerformers.map((performer, idx) => {
                const LevelIcon = LEVEL_ICONS[performer.level] || Target;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        idx === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        idx === 1 ? "bg-gray-400/20 text-gray-400" :
                        idx === 2 ? "bg-orange-500/20 text-orange-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="font-medium truncate max-w-[120px]">{performer.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", LEVEL_COLORS[performer.level])}>
                        <LevelIcon className="h-2.5 w-2.5 mr-0.5" />
                        {performer.level}
                      </Badge>
                      <span className="font-bold text-primary">{performer.points} UP</span>
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
      <div className={cn("rounded-xl border border-border/50 bg-card p-4", className)}>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-4 gap-2 mb-4">
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
    <div className={cn("rounded-xl border border-border/50 bg-card", className)}>
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
