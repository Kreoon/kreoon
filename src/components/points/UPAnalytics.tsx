import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, TrendingUp, Users, Zap, Trophy, 
  CheckCircle2, XCircle, Clock, Target, Flame
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UPAnalyticsProps {
  organizationId: string;
}

interface AnalyticsData {
  totalUsers: number;
  totalPoints: number;
  avgPoints: number;
  topPerformers: any[];
  levelDistribution: Record<string, number>;
  eventBreakdown: { type: string; count: number; points: number }[];
  completionRate: number;
  onTimeRate: number;
  avgQualityScore: number;
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

  useEffect(() => {
    fetchAnalytics();
  }, [organizationId, period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch user points data
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*');

      // Fetch recent events
      const { data: eventsData } = await supabase
        .from('up_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch quality scores
      const { data: qualityData } = await supabase
        .from('up_quality_scores')
        .select('score')
        .eq('organization_id', organizationId);

      const users = pointsData || [];
      const events = eventsData || [];
      const qualityScores = qualityData || [];

      // Calculate analytics
      const totalPoints = users.reduce((sum, u) => sum + (u.total_points || 0), 0);
      const avgPoints = users.length > 0 ? Math.round(totalPoints / users.length) : 0;

      const levelDistribution = users.reduce((acc, u) => {
        const level = u.current_level || 'bronze';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topPerformers = [...users]
        .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
        .slice(0, 5);

      // Event breakdown
      const eventCounts = events.reduce((acc, e) => {
        if (!acc[e.event_type]) {
          acc[e.event_type] = { count: 0, points: 0 };
        }
        acc[e.event_type].count += 1;
        acc[e.event_type].points += e.points_awarded || 0;
        return acc;
      }, {} as Record<string, { count: number; points: number }>);

      const eventBreakdown = Object.entries(eventCounts).map(([type, data]) => ({
        type,
        ...data
      })).sort((a, b) => b.count - a.count);

      // Completion and on-time rates
      const totalCompletions = users.reduce((sum, u) => sum + (u.total_completions || 0), 0);
      const totalOnTime = users.reduce((sum, u) => sum + (u.total_on_time || 0), 0);
      const completionRate = totalCompletions > 0 ? Math.round((totalOnTime / totalCompletions) * 100) : 0;

      // Average quality score
      const avgQualityScore = qualityScores.length > 0
        ? Math.round(qualityScores.reduce((sum, q) => sum + q.score, 0) / qualityScores.length)
        : 0;

      setData({
        totalUsers: users.length,
        totalPoints,
        avgPoints,
        topPerformers,
        levelDistribution,
        eventBreakdown,
        completionRate,
        onTimeRate: completionRate,
        avgQualityScore
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
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Usuarios Activos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Zap className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalPoints.toLocaleString()}</p>
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
              <p className="text-2xl font-bold">{data.avgPoints}</p>
              <p className="text-xs text-muted-foreground">Promedio UP</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.avgQualityScore || 'N/A'}</p>
              <p className="text-xs text-muted-foreground">Quality Score Prom.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Distribución por Nivel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['diamond', 'gold', 'silver', 'bronze'] as const).map(level => {
              const count = data.levelDistribution[level] || 0;
              const percentage = data.totalUsers > 0 
                ? Math.round((count / data.totalUsers) * 100) 
                : 0;

              return (
                <div key={level} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize flex items-center gap-2">
                      {level === 'diamond' && '🏰'}
                      {level === 'gold' && '👑'}
                      {level === 'silver' && '🛡️'}
                      {level === 'bronze' && '⚔️'}
                      {level}
                    </span>
                    <span className="font-medium">{count} usuarios ({percentage}%)</span>
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

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="w-5 h-5 text-orange-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topPerformers.map((user, index) => (
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
                  <div className="flex-1">
                    <p className="font-medium text-sm">Usuario #{user.user_id?.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      Nivel: {user.current_level}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{user.total_points} UP</p>
                    <p className="text-xs text-muted-foreground">
                      {user.total_completions} completados
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Métricas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                <p className="text-3xl font-bold text-success">{data.onTimeRate}%</p>
                <p className="text-sm text-muted-foreground">Entregas a Tiempo</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
                <p className="text-3xl font-bold text-purple-500">{data.avgQualityScore}</p>
                <p className="text-sm text-muted-foreground">Quality Score Prom.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Eventos por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.eventBreakdown.slice(0, 6).map(event => (
                <div 
                  key={event.type}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                >
                  <span className="text-sm capitalize">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-3">
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
    </div>
  );
}
