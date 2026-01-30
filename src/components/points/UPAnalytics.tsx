import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, TrendingUp, Users, Zap, Trophy, 
  CheckCircle2, Target, Flame, Video, Scissors
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UPAnalyticsProps {
  organizationId: string;
}

interface AnalyticsData {
  totalCreators: number;
  totalEditors: number;
  totalCreatorPoints: number;
  totalEditorPoints: number;
  avgCreatorPoints: number;
  avgEditorPoints: number;
  topCreators: any[];
  topEditors: any[];
  creatorLevelDistribution: Record<string, number>;
  editorLevelDistribution: Record<string, number>;
  eventBreakdown: { type: string; count: number; points: number }[];
  onTimeRateCreators: number;
  onTimeRateEditors: number;
}

const LEVEL_COLORS = {
  bronze: 'bg-amber-700',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-600',
  diamond: 'bg-cyan-400'
};

export function UPAnalytics({ organizationId }: UPAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState('creators');

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch from V2 tables (without embedded profile joins for Kreoon compatibility)
      const [creatorsResult, editorsResult, eventsResult] = await Promise.all([
        supabase
          .from('up_creadores_totals')
          .select('*')
          .eq('organization_id', organizationId)
          .order('total_points', { ascending: false }),
        supabase
          .from('up_editores_totals')
          .select('*')
          .eq('organization_id', organizationId)
          .order('total_points', { ascending: false }),
        supabase
          .from('up_events')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(500)
      ]);

      let creators = creatorsResult.data || [];
      let editors = editorsResult.data || [];
      const events = eventsResult.data || [];

      // Fetch profiles separately for compatibility with Kreoon DB (no FK relations)
      const allUserIds = [
        ...creators.map(c => c.user_id),
        ...editors.map(e => e.user_id)
      ].filter(Boolean);

      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allUserIds);

        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        // Merge profiles into creators and editors
        creators = creators.map(c => ({
          ...c,
          profiles: profilesMap.get(c.user_id) || null
        }));
        editors = editors.map(e => ({
          ...e,
          profiles: profilesMap.get(e.user_id) || null
        }));
      }

      // Calculate creator stats
      const totalCreatorPoints = creators.reduce((sum, c) => sum + (c.total_points || 0), 0);
      const avgCreatorPoints = creators.length > 0 ? Math.round(totalCreatorPoints / creators.length) : 0;
      const creatorLevelDistribution = creators.reduce((acc, c) => {
        const level = c.current_level || 'bronze';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate editor stats
      const totalEditorPoints = editors.reduce((sum, e) => sum + (e.total_points || 0), 0);
      const avgEditorPoints = editors.length > 0 ? Math.round(totalEditorPoints / editors.length) : 0;
      const editorLevelDistribution = editors.reduce((acc, e) => {
        const level = e.current_level || 'bronze';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // On-time rates
      const onTimeRateCreators = creators.length > 0 
        ? Math.round((creators.reduce((sum, c) => sum + (c.on_time_deliveries || 0), 0) / 
            Math.max(1, creators.reduce((sum, c) => sum + (c.total_deliveries || 0), 0))) * 100)
        : 0;
      const onTimeRateEditors = editors.length > 0
        ? Math.round((editors.reduce((sum, e) => sum + (e.on_time_deliveries || 0), 0) / 
            Math.max(1, editors.reduce((sum, e) => sum + (e.total_deliveries || 0), 0))) * 100)
        : 0;

      // Event breakdown
      const eventCounts = events.reduce((acc, e) => {
        const eventKey = e.event_type_key || 'unknown';
        if (!acc[eventKey]) {
          acc[eventKey] = { count: 0, points: 0 };
        }
        acc[eventKey].count += 1;
        acc[eventKey].points += e.points_awarded || 0;
        return acc;
      }, {} as Record<string, { count: number; points: number }>);

      const eventBreakdown = Object.entries(eventCounts).map(([type, eData]) => ({
        type,
        ...eData
      })).sort((a, b) => b.count - a.count);

      setData({
        totalCreators: creators.length,
        totalEditors: editors.length,
        totalCreatorPoints,
        totalEditorPoints,
        avgCreatorPoints,
        avgEditorPoints,
        topCreators: creators.slice(0, 5),
        topEditors: editors.slice(0, 5),
        creatorLevelDistribution,
        editorLevelDistribution,
        eventBreakdown,
        onTimeRateCreators,
        onTimeRateEditors
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalPoints = data.totalCreatorPoints + data.totalEditorPoints;
  const totalUsers = data.totalCreators + data.totalEditors;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="quarter">Trimestre</SelectItem>
            <SelectItem value="year">Este Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalCreators}</p>
              <p className="text-xs text-muted-foreground">Creadores</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Scissors className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalEditors}</p>
              <p className="text-xs text-muted-foreground">Editores</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Zap className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">UP Totales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <TrendingUp className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0}
              </p>
              <p className="text-xs text-muted-foreground">Promedio UP</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Creators vs Editors */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="creators" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Creadores
          </TabsTrigger>
          <TabsTrigger value="editors" className="flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Editores
          </TabsTrigger>
        </TabsList>

        {/* Creator Tab */}
        <TabsContent value="creators" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Creator Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Niveles de Creadores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['diamond', 'gold', 'silver', 'bronze'] as const).map(level => {
                  const count = data.creatorLevelDistribution[level] || 0;
                  const percentage = data.totalCreators > 0 
                    ? Math.round((count / data.totalCreators) * 100) 
                    : 0;

                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize flex items-center gap-2">
                          {level === 'diamond' && '💎'}
                          {level === 'gold' && '🥇'}
                          {level === 'silver' && '🥈'}
                          {level === 'bronze' && '🥉'}
                          {level}
                        </span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", LEVEL_COLORS[level])}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Creators */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Top Creadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topCreators.map((user, index) => (
                    <div 
                      key={user.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 && "bg-yellow-600 text-white",
                        index === 1 && "bg-slate-400 text-white",
                        index === 2 && "bg-amber-700 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {(user.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.profiles?.full_name || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user.current_level}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{user.total_points} UP</p>
                        <p className="text-xs text-muted-foreground">
                          {user.total_deliveries || 0} entregas
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Creator Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Métricas de Creadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                    <p className="text-3xl font-bold text-success">{data.onTimeRateCreators}%</p>
                    <p className="text-sm text-muted-foreground">Entregas a Tiempo</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-3xl font-bold text-primary">{data.totalCreatorPoints.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">UP Totales</p>
                  </div>
                  <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                    <p className="text-3xl font-bold text-cyan-500">{data.avgCreatorPoints}</p>
                    <p className="text-sm text-muted-foreground">Promedio UP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent value="editors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Level Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Niveles de Editores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(['diamond', 'gold', 'silver', 'bronze'] as const).map(level => {
                  const count = data.editorLevelDistribution[level] || 0;
                  const percentage = data.totalEditors > 0 
                    ? Math.round((count / data.totalEditors) * 100) 
                    : 0;

                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize flex items-center gap-2">
                          {level === 'diamond' && '💎'}
                          {level === 'gold' && '🥇'}
                          {level === 'silver' && '🥈'}
                          {level === 'bronze' && '🥉'}
                          {level}
                        </span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted overflow-hidden">
                        <div 
                          className={cn("h-full transition-all", LEVEL_COLORS[level])}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Editors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Top Editores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topEditors.map((user, index) => (
                    <div 
                      key={user.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0 && "bg-yellow-600 text-white",
                        index === 1 && "bg-slate-400 text-white",
                        index === 2 && "bg-amber-700 text-white",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {(user.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.profiles?.full_name || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {user.current_level}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{user.total_points} UP</p>
                        <p className="text-xs text-muted-foreground">
                          {user.total_deliveries || 0} entregas
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Editor Metrics */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Métricas de Editores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                    <p className="text-3xl font-bold text-success">{data.onTimeRateEditors}%</p>
                    <p className="text-sm text-muted-foreground">Entregas a Tiempo</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <p className="text-3xl font-bold text-primary">{data.totalEditorPoints.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">UP Totales</p>
                  </div>
                  <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
                    <p className="text-3xl font-bold text-cyan-500">{data.avgEditorPoints}</p>
                    <p className="text-sm text-muted-foreground">Promedio UP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Breakdown - Common to both */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Eventos por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.eventBreakdown.slice(0, 9).map(event => (
              <div 
                key={event.type}
                className="flex items-center justify-between p-2 rounded bg-muted/30"
              >
                <span className="text-sm capitalize truncate">
                  {event.type.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{event.count}</Badge>
                  <span className={cn(
                    "text-sm font-medium",
                    event.points >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {event.points >= 0 ? '+' : ''}{event.points} UP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
