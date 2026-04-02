/**
 * ============================================================
 * Content Analytics Dashboard
 * ============================================================
 *
 * Dashboard para analytics de contenido:
 * - Views por contenido
 * - Engagement rate
 * - Conversion tracking
 * - Top performing content
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LazyBarChart,
  LazyLineChart,
  LazyPieChart,
  LazyAreaChart,
  LazyChartContainer,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from '@/components/ui/lazy-charts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Eye,
  Heart,
  TrendingUp,
  Video,
  BarChart3,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Clock,
  Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ── Types ──

interface ContentMetrics {
  id: string;
  title: string;
  views_count: number;
  likes_count: number;
  status: string;
  content_type: string;
  created_at: string;
  approved_at: string | null;
  thumbnail_url: string | null;
  creator_name?: string;
  client_name?: string;
}

interface DailyTrend {
  date: string;
  views: number;
  likes: number;
  content_created: number;
}

interface ContentTypeDistribution {
  type: string;
  count: number;
  views: number;
  engagement_rate: number;
}

interface TopPerformer {
  id: string;
  title: string;
  views: number;
  likes: number;
  engagement_rate: number;
  thumbnail_url: string | null;
}

type DateRange = '7d' | '14d' | '30d' | '90d';

// ── Constants ──

// CSS variables para dark/light mode
const CHART_COLORS = {
  primary: 'var(--nova-accent-primary)',
  secondary: 'var(--nova-accent-secondary)',
  success: 'var(--nova-success)',
  warning: 'var(--nova-warning)',
  danger: 'var(--nova-error)',
  muted: 'var(--nova-text-muted)',
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  video: 'var(--nova-accent-primary)',
  image: 'var(--nova-accent-secondary)',
  carousel: 'var(--nova-success)',
  story: 'var(--nova-warning)',
  reel: 'var(--nova-aurora-2)',
  other: 'var(--nova-text-muted)',
};

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Ultimos 7 dias' },
  { value: '14d', label: 'Ultimos 14 dias' },
  { value: '30d', label: 'Ultimos 30 dias' },
  { value: '90d', label: 'Ultimos 90 dias' },
];

// ── Main Component ──

export function ContentAnalyticsDashboard() {
  const { organizationId } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  const daysBack = parseInt(dateRange.replace('d', ''));
  const startDate = startOfDay(subDays(new Date(), daysBack));
  const endDate = endOfDay(new Date());

  // ── Fetch Content Metrics ──

  const { data: contentData, isLoading: loadingContent, refetch } = useQuery({
    queryKey: ['content-analytics', organizationId, dateRange],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          views_count,
          likes_count,
          status,
          content_type,
          created_at,
          approved_at,
          thumbnail_url,
          creator:profiles!content_creator_id_fkey(full_name),
          client:clients!content_client_id_fkey(name)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .is('deleted_at', null)
        .order('views_count', { ascending: false });

      if (error) {
        console.error('[ContentAnalytics] Error fetching content:', error);
        return [];
      }

      return (data || []).map((item) => ({
        ...item,
        creator_name: (item.creator as { full_name?: string })?.full_name || 'Sin asignar',
        client_name: (item.client as { name?: string })?.name || 'Sin cliente',
      })) as ContentMetrics[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Computed Metrics ──

  const metrics = useMemo(() => {
    if (!contentData?.length) {
      return {
        totalViews: 0,
        totalLikes: 0,
        totalContent: 0,
        avgEngagement: 0,
        topPerformers: [],
        typeDistribution: [],
        dailyTrends: [],
        viewsGrowth: 0,
        contentGrowth: 0,
      };
    }

    const totalViews = contentData.reduce((sum, c) => sum + (c.views_count || 0), 0);
    const totalLikes = contentData.reduce((sum, c) => sum + (c.likes_count || 0), 0);
    const avgEngagement = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

    // Top performers
    const topPerformers: TopPerformer[] = contentData
      .filter((c) => c.views_count > 0)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title || 'Sin titulo',
        views: c.views_count || 0,
        likes: c.likes_count || 0,
        engagement_rate: c.views_count > 0 ? (c.likes_count / c.views_count) * 100 : 0,
        thumbnail_url: c.thumbnail_url,
      }));

    // Type distribution
    const typeMap = new Map<string, { count: number; views: number; likes: number }>();
    contentData.forEach((c) => {
      const type = c.content_type || 'other';
      const existing = typeMap.get(type) || { count: 0, views: 0, likes: 0 };
      typeMap.set(type, {
        count: existing.count + 1,
        views: existing.views + (c.views_count || 0),
        likes: existing.likes + (c.likes_count || 0),
      });
    });

    const typeDistribution: ContentTypeDistribution[] = Array.from(typeMap.entries()).map(
      ([type, data]) => ({
        type,
        count: data.count,
        views: data.views,
        engagement_rate: data.views > 0 ? (data.likes / data.views) * 100 : 0,
      })
    );

    // Daily trends
    const dailyMap = new Map<string, { views: number; likes: number; created: number }>();
    for (let i = 0; i < daysBack; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyMap.set(date, { views: 0, likes: 0, created: 0 });
    }

    contentData.forEach((c) => {
      const date = format(new Date(c.created_at), 'yyyy-MM-dd');
      const existing = dailyMap.get(date);
      if (existing) {
        dailyMap.set(date, {
          views: existing.views + (c.views_count || 0),
          likes: existing.likes + (c.likes_count || 0),
          created: existing.created + 1,
        });
      }
    });

    const dailyTrends: DailyTrend[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        views: data.views,
        likes: data.likes,
        content_created: data.created,
      }))
      .reverse();

    // Growth calculations (compare first half vs second half)
    const midpoint = Math.floor(dailyTrends.length / 2);
    const firstHalfViews = dailyTrends.slice(0, midpoint).reduce((s, d) => s + d.views, 0);
    const secondHalfViews = dailyTrends.slice(midpoint).reduce((s, d) => s + d.views, 0);
    const viewsGrowth = firstHalfViews > 0 ? ((secondHalfViews - firstHalfViews) / firstHalfViews) * 100 : 0;

    const firstHalfContent = dailyTrends.slice(0, midpoint).reduce((s, d) => s + d.content_created, 0);
    const secondHalfContent = dailyTrends.slice(midpoint).reduce((s, d) => s + d.content_created, 0);
    const contentGrowth = firstHalfContent > 0 ? ((secondHalfContent - firstHalfContent) / firstHalfContent) * 100 : 0;

    return {
      totalViews,
      totalLikes,
      totalContent: contentData.length,
      avgEngagement,
      topPerformers,
      typeDistribution,
      dailyTrends,
      viewsGrowth,
      contentGrowth,
    };
  }, [contentData, daysBack]);

  // ── Render Loading State ──

  if (loadingContent) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-400" />
            Analytics de Contenido
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Metricas de rendimiento y engagement de tu contenido
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-44 bg-gray-800/50 border-gray-700">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="bg-gray-800/50 border-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Views"
          value={metrics.totalViews.toLocaleString()}
          icon={Eye}
          color="purple"
          change={metrics.viewsGrowth}
        />
        <KPICard
          title="Total Likes"
          value={metrics.totalLikes.toLocaleString()}
          icon={Heart}
          color="pink"
        />
        <KPICard
          title="Contenido Creado"
          value={metrics.totalContent.toString()}
          icon={Video}
          color="cyan"
          change={metrics.contentGrowth}
        />
        <KPICard
          title="Engagement Rate"
          value={`${metrics.avgEngagement.toFixed(2)}%`}
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-gray-800/50 border border-gray-700">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="top">Top Content</TabsTrigger>
          <TabsTrigger value="types">Por Tipo</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Views Trend Chart */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Views por Dia</CardTitle>
                <CardDescription>Tendencia de visualizaciones</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.dailyTrends.length > 0 ? (
                  <LazyChartContainer height={280}>
                    <ResponsiveContainer width="100%" height={280}>
                      <LazyAreaChart data={metrics.dailyTrends}>
                        <defs>
                          <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="date"
                          stroke="#6b7280"
                          fontSize={11}
                          tickFormatter={(v) => format(new Date(v), 'dd MMM', { locale: es })}
                        />
                        <YAxis stroke="#6b7280" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: '#fff' }}
                          labelFormatter={(v) => format(new Date(v as string), 'dd MMMM yyyy', { locale: es })}
                        />
                        <Area
                          type="monotone"
                          dataKey="views"
                          stroke={CHART_COLORS.primary}
                          fillOpacity={1}
                          fill="url(#viewsGradient)"
                          name="Views"
                        />
                      </LazyAreaChart>
                    </ResponsiveContainer>
                  </LazyChartContainer>
                ) : (
                  <EmptyState message="Sin datos de views en este periodo" />
                )}
              </CardContent>
            </Card>

            {/* Content Type Distribution */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Distribucion por Tipo</CardTitle>
                <CardDescription>Contenido por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.typeDistribution.length > 0 ? (
                  <LazyChartContainer height={280}>
                    <ResponsiveContainer width="100%" height={280}>
                      <LazyPieChart>
                        <Pie
                          data={metrics.typeDistribution}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {metrics.typeDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CONTENT_TYPE_COLORS[entry.type] || CHART_COLORS.muted}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                          }}
                        />
                      </LazyPieChart>
                    </ResponsiveContainer>
                  </LazyChartContainer>
                ) : (
                  <EmptyState message="Sin datos de tipos de contenido" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Tendencias de Engagement</CardTitle>
              <CardDescription>Views vs Likes a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.dailyTrends.length > 0 ? (
                <LazyChartContainer height={400}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LazyLineChart data={metrics.dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        fontSize={11}
                        tickFormatter={(v) => format(new Date(v), 'dd MMM', { locale: es })}
                      />
                      <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} />
                      <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="views"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={false}
                        name="Views"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="likes"
                        stroke={CHART_COLORS.secondary}
                        strokeWidth={2}
                        dot={false}
                        name="Likes"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="content_created"
                        stroke={CHART_COLORS.success}
                        strokeWidth={2}
                        dot={false}
                        name="Contenido Creado"
                      />
                    </LazyLineChart>
                  </ResponsiveContainer>
                </LazyChartContainer>
              ) : (
                <EmptyState message="Sin datos de tendencias" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Content Tab */}
        <TabsContent value="top" className="mt-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Top Performing Content</CardTitle>
              <CardDescription>Contenido con mejor rendimiento</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.topPerformers.length > 0 ? (
                <div className="space-y-4">
                  {metrics.topPerformers.map((content, index) => (
                    <div
                      key={content.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm">
                        {index + 1}
                      </div>

                      {content.thumbnail_url ? (
                        <img
                          src={content.thumbnail_url}
                          alt={content.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center">
                          <Video className="h-6 w-6 text-gray-500" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{content.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {content.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {content.likes.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`${
                          content.engagement_rate > 5
                            ? 'border-green-500/50 text-green-400'
                            : content.engagement_rate > 2
                              ? 'border-amber-500/50 text-amber-400'
                              : 'border-gray-500/50 text-gray-400'
                        }`}
                      >
                        {content.engagement_rate.toFixed(1)}% engagement
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="Sin contenido con views en este periodo" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Types Tab */}
        <TabsContent value="types" className="mt-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Rendimiento por Tipo</CardTitle>
              <CardDescription>Comparativa de engagement por tipo de contenido</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.typeDistribution.length > 0 ? (
                <LazyChartContainer height={400}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LazyBarChart data={metrics.typeDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#6b7280" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="type"
                        stroke="#6b7280"
                        fontSize={11}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="views" fill={CHART_COLORS.primary} name="Views" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="count" fill={CHART_COLORS.secondary} name="Cantidad" radius={[0, 4, 4, 0]} />
                    </LazyBarChart>
                  </ResponsiveContainer>
                </LazyChartContainer>
              ) : (
                <EmptyState message="Sin datos de tipos de contenido" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'purple' | 'pink' | 'cyan' | 'amber' | 'green';
  change?: number;
}

function KPICard({ title, value, icon: Icon, color, change }: KPICardProps) {
  const colorClasses = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {change !== undefined && (
              <div
                className={`flex items-center gap-1 mt-2 text-xs ${
                  change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{Math.abs(change).toFixed(1)}% vs periodo anterior</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
      <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default ContentAnalyticsDashboard;
