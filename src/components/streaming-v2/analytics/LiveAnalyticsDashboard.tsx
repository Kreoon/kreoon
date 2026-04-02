/**
 * LiveAnalyticsDashboard - Dashboard de métricas en tiempo real
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  LazyAreaChart,
  LazyPieChart,
  LazyChartContainer,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell,
} from '@/components/ui/lazy-charts';
import {
  Eye,
  Users,
  MessageSquare,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  Heart,
} from 'lucide-react';
import { PlatformIcon } from '../shared/PlatformIcon';
import type { StreamingAnalytics, StreamingPlatform } from '@/types/streaming.types';

interface LiveAnalyticsDashboardProps {
  analytics: StreamingAnalytics[];
  currentViewers?: number;
  peakViewers?: number;
  totalMessages?: number;
  totalRevenue?: number;
  platformBreakdown?: Record<StreamingPlatform, number>;
  engagementRate?: number;
  averageWatchTime?: number;
  className?: string;
}

// Colores de plataforma - estos son colores de marca que deben mantenerse
// pero se pueden usar CSS variables para el fallback
const PLATFORM_COLORS: Record<StreamingPlatform, string> = {
  youtube: '#FF0000',
  tiktok: '#00F2EA',
  instagram: '#E4405F',
  facebook: '#1877F2',
  twitch: '#9146FF',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  custom_rtmp: 'var(--nova-text-muted)',
};

export function LiveAnalyticsDashboard({
  analytics,
  currentViewers = 0,
  peakViewers = 0,
  totalMessages = 0,
  totalRevenue = 0,
  platformBreakdown = {},
  engagementRate = 0,
  averageWatchTime = 0,
  className,
}: LiveAnalyticsDashboardProps) {
  // Prepare chart data
  const viewerChartData = useMemo(() => {
    return analytics
      .slice(-30) // Last 30 data points
      .map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString('es', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        viewers: point.concurrent_viewers || 0,
        messages: point.messages_count || 0,
      }));
  }, [analytics]);

  // Platform pie chart data
  const platformChartData = useMemo(() => {
    return Object.entries(platformBreakdown).map(([platform, viewers]) => ({
      name: platform,
      value: viewers,
      color: PLATFORM_COLORS[platform as StreamingPlatform],
    }));
  }, [platformBreakdown]);

  // Calculate viewer trend
  const viewerTrend = useMemo(() => {
    if (analytics.length < 2) return 0;
    const recent = analytics.slice(-5);
    const older = analytics.slice(-10, -5);
    const recentAvg =
      recent.reduce((sum, p) => sum + (p.concurrent_viewers || 0), 0) / recent.length;
    const olderAvg =
      older.reduce((sum, p) => sum + (p.concurrent_viewers || 0), 0) / (older.length || 1);
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }, [analytics]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Viewers Actuales"
          value={currentViewers}
          icon={Eye}
          trend={viewerTrend}
          color="blue"
        />
        <StatCard
          title="Pico de Viewers"
          value={peakViewers}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Mensajes"
          value={totalMessages}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          title="Ventas"
          value={`$${totalRevenue.toFixed(0)}`}
          icon={ShoppingBag}
          color="yellow"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Viewer chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Viewers en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LazyChartContainer height={200}>
              <ResponsiveContainer width="100%" height="100%">
                <LazyAreaChart data={viewerChartData}>
                  <defs>
                    <linearGradient id="viewerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="viewers"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="url(#viewerGradient)"
                  />
                </LazyAreaChart>
              </ResponsiveContainer>
            </LazyChartContainer>
          </CardContent>
        </Card>

        {/* Platform breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            {platformChartData.length > 0 ? (
              <>
                <LazyChartContainer height={120}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LazyPieChart>
                      <Pie
                        data={platformChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {platformChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                      />
                    </LazyPieChart>
                  </ResponsiveContainer>
                </LazyChartContainer>
                <div className="space-y-2 mt-2">
                  {platformChartData.map((platform) => (
                    <div
                      key={platform.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <PlatformIcon
                          platform={platform.name as StreamingPlatform}
                          size="sm"
                        />
                        <span className="capitalize">{platform.name}</span>
                      </div>
                      <span className="font-medium">{platform.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Eye className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Sin datos de plataformas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-400" />
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{engagementRate.toFixed(1)}%</span>
              <span className="text-sm text-muted-foreground">
                (mensajes / viewers)
              </span>
            </div>
            <Progress value={Math.min(engagementRate, 100)} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {engagementRate > 10
                ? '¡Excelente interacción!'
                : engagementRate > 5
                ? 'Buena interacción'
                : 'Considera hacer más preguntas a la audiencia'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Tiempo Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {Math.floor(averageWatchTime / 60)}
              </span>
              <span className="text-xl">min</span>
              <span className="text-lg text-muted-foreground">
                {averageWatchTime % 60}s
              </span>
            </div>
            <Progress
              value={(averageWatchTime / 600) * 100}
              className="mt-3"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tiempo promedio de visualización
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-400" />
              Revenue por Viewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                ${peakViewers > 0 ? (totalRevenue / peakViewers).toFixed(2) : '0.00'}
              </span>
              <span className="text-sm text-muted-foreground">USD/viewer</span>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total ventas</span>
                <span className="font-medium">${totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peak viewers</span>
                <span className="font-medium">{peakViewers}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'red';
}

function StatCard({ title, value, icon: Icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn('rounded-sm p-2', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined && (
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                trend >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveAnalyticsDashboard;
