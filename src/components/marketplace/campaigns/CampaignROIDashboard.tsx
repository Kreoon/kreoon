import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Video,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCampaignROI, ROIData, CreatorPerformance } from '@/hooks/useCampaignROI';

interface CampaignROIDashboardProps {
  campaignId: string;
  brandId?: string;
}

// Benchmark data (industry averages for LATAM UGC)
const BENCHMARKS = {
  cpv: { low: 0.5, avg: 1.2, high: 2.5 }, // USD
  cpe: { low: 0.02, avg: 0.05, high: 0.1 }, // Cost per engagement
  engagement_rate: { low: 2, avg: 4.5, high: 8 }, // %
  views_per_video: { low: 5000, avg: 15000, high: 50000 },
  roi_multiplier: { low: 1.5, avg: 3, high: 6 },
};

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function getPerformanceColor(value: number, benchmark: { low: number; avg: number; high: number }, inverse = false): string {
  // For inverse metrics (like CPV), lower is better
  if (inverse) {
    if (value <= benchmark.low) return 'text-green-500';
    if (value <= benchmark.avg) return 'text-amber-500';
    return 'text-red-500';
  }
  // For normal metrics, higher is better
  if (value >= benchmark.high) return 'text-green-500';
  if (value >= benchmark.avg) return 'text-amber-500';
  return 'text-red-500';
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  benchmark,
  benchmarkLabel,
  inverse = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof TrendingUp;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  benchmark?: { low: number; avg: number; high: number };
  benchmarkLabel?: string;
  inverse?: boolean;
}) {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
  const performanceColor = benchmark ? getPerformanceColor(numValue, benchmark, inverse) : 'text-foreground';

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {title}
              {benchmarkLabel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{benchmarkLabel}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </p>
            <p className={cn("text-2xl font-bold mt-1", performanceColor)}>
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="p-2 rounded-lg bg-muted/50">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {trend && trendValue && (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreatorPerformanceRow({ creator, rank }: { creator: CreatorPerformance; rank: number }) {
  const roiColor = creator.roi_multiplier >= 3 ? 'text-green-500' : creator.roi_multiplier >= 1.5 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 text-sm font-bold">
        {rank}
      </div>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creator.display_name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{creator.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {creator.videos_delivered} videos entregados
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right text-sm">
        <div>
          <p className="font-medium">{formatNumber(creator.total_views)}</p>
          <p className="text-xs text-muted-foreground">Vistas</p>
        </div>
        <div>
          <p className="font-medium">{creator.engagement_rate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Engagement</p>
        </div>
        <div>
          <p className="font-medium">{formatCurrency(creator.cost_per_video)}</p>
          <p className="text-xs text-muted-foreground">CPV</p>
        </div>
        <div>
          <p className={cn("font-bold", roiColor)}>{creator.roi_multiplier.toFixed(1)}x</p>
          <p className="text-xs text-muted-foreground">ROI</p>
        </div>
      </div>
    </div>
  );
}

function ROISkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card/50">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card/50">
        <CardContent className="p-6">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export function CampaignROIDashboard({ campaignId, brandId }: CampaignROIDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const { data: roiData, isLoading, error, refetch } = useCampaignROI(campaignId, timeRange);

  if (isLoading) {
    return <ROISkeleton />;
  }

  if (error || !roiData) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Sin datos de ROI</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Los datos de ROI estaran disponibles cuando la campana tenga contenido publicado.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const {
    investment,
    estimated_value,
    roi_multiplier,
    total_videos,
    total_views,
    total_likes,
    total_comments,
    total_shares,
    avg_engagement_rate,
    cost_per_video,
    cost_per_view,
    cost_per_engagement,
    creator_performances,
    trend_vs_previous,
  } = roiData;

  const totalEngagements = total_likes + total_comments + total_shares;
  const roiPercentage = ((estimated_value - investment) / investment) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dashboard de ROI
          </h2>
          <p className="text-sm text-muted-foreground">
            Analisis de retorno de inversion de la campana
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main ROI Card */}
      <Card className={cn(
        "border-2",
        roi_multiplier >= 3 ? "border-green-500/50 bg-green-500/5" :
        roi_multiplier >= 1.5 ? "border-amber-500/50 bg-amber-500/5" :
        "border-red-500/50 bg-red-500/5"
      )}>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Investment */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Inversion total</p>
              <p className="text-3xl font-bold">{formatCurrency(investment)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {total_videos} videos / {formatCurrency(cost_per_video)} CPV
              </p>
            </div>

            {/* ROI Multiplier */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">ROI Multiplicador</p>
              <p className={cn(
                "text-5xl font-bold",
                roi_multiplier >= 3 ? "text-green-500" :
                roi_multiplier >= 1.5 ? "text-amber-500" :
                "text-red-500"
              )}>
                {roi_multiplier.toFixed(1)}x
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {roi_multiplier >= BENCHMARKS.roi_multiplier.avg ? (
                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Sobre benchmark
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Bajo benchmark
                  </Badge>
                )}
              </div>
            </div>

            {/* Estimated Value */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Valor estimado generado</p>
              <p className="text-3xl font-bold text-green-500">{formatCurrency(estimated_value)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {roiPercentage > 0 ? '+' : ''}{roiPercentage.toFixed(0)}% retorno
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Cost per Video (CPV)"
          value={formatCurrency(cost_per_video)}
          icon={Video}
          benchmark={BENCHMARKS.cpv}
          benchmarkLabel={`Benchmark: ${formatCurrency(BENCHMARKS.cpv.avg)}`}
          inverse
          trend={trend_vs_previous?.cpv_trend}
          trendValue={trend_vs_previous?.cpv_change}
        />
        <KPICard
          title="Cost per View (CPM)"
          value={formatCurrency(cost_per_view * 1000)}
          subtitle="Por cada 1,000 vistas"
          icon={Eye}
          trend={trend_vs_previous?.cpm_trend}
          trendValue={trend_vs_previous?.cpm_change}
        />
        <KPICard
          title="Cost per Engagement"
          value={formatCurrency(cost_per_engagement)}
          icon={Heart}
          benchmark={BENCHMARKS.cpe}
          benchmarkLabel={`Benchmark: ${formatCurrency(BENCHMARKS.cpe.avg)}`}
          inverse
        />
        <KPICard
          title="Engagement Rate"
          value={`${avg_engagement_rate.toFixed(1)}%`}
          icon={Target}
          benchmark={BENCHMARKS.engagement_rate}
          benchmarkLabel={`Benchmark: ${BENCHMARKS.engagement_rate.avg}%`}
          trend={trend_vs_previous?.engagement_trend}
          trendValue={trend_vs_previous?.engagement_change}
        />
      </div>

      {/* Engagement Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Desglose de Engagement</CardTitle>
            <CardDescription>Total: {formatNumber(totalEngagements)} interacciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted/30">
                <Heart className="h-5 w-5 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">{formatNumber(total_likes)}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <MessageCircle className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{formatNumber(total_comments)}</p>
                <p className="text-xs text-muted-foreground">Comentarios</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <Share2 className="h-5 w-5 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{formatNumber(total_shares)}</p>
                <p className="text-xs text-muted-foreground">Compartidos</p>
              </div>
            </div>

            {/* Engagement distribution bar */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Distribucion de engagement</p>
              <div className="h-4 rounded-full overflow-hidden flex">
                <div
                  className="bg-red-500 h-full"
                  style={{ width: `${(total_likes / totalEngagements) * 100}%` }}
                />
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${(total_comments / totalEngagements) * 100}%` }}
                />
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(total_shares / totalEngagements) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{((total_likes / totalEngagements) * 100).toFixed(0)}% likes</span>
                <span>{((total_comments / totalEngagements) * 100).toFixed(0)}% comentarios</span>
                <span>{((total_shares / totalEngagements) * 100).toFixed(0)}% compartidos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alcance y Vistas</CardTitle>
            <CardDescription>Performance de contenido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <Eye className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{formatNumber(total_views)}</p>
                <p className="text-xs text-muted-foreground">Total de vistas</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <Video className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{formatNumber(total_views / total_videos)}</p>
                <p className="text-xs text-muted-foreground">Vistas/Video</p>
              </div>
            </div>

            {/* Comparison with benchmark */}
            <div className="p-4 rounded-lg bg-muted/20 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Tu promedio</span>
                <span className="font-bold">{formatNumber(total_views / total_videos)} vistas</span>
              </div>
              <Progress
                value={Math.min(((total_views / total_videos) / BENCHMARKS.views_per_video.high) * 100, 100)}
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Bajo ({formatNumber(BENCHMARKS.views_per_video.low)})</span>
                <span>Promedio ({formatNumber(BENCHMARKS.views_per_video.avg)})</span>
                <span>Alto ({formatNumber(BENCHMARKS.views_per_video.high)})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creator Performance Table */}
      {creator_performances && creator_performances.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Performance por Creador</CardTitle>
                <CardDescription>
                  Ranking de creadores por ROI generado
                </CardDescription>
              </div>
              <Badge variant="outline">
                {creator_performances.length} creadores
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {creator_performances
                .sort((a, b) => b.roi_multiplier - a.roi_multiplier)
                .map((creator, index) => (
                  <CreatorPerformanceRow
                    key={creator.creator_id}
                    creator={creator}
                    rank={index + 1}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights & Recommendations */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Insights y Recomendaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roi_multiplier >= 3 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10">
                <CheckMark className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-500">Excelente ROI</p>
                  <p className="text-sm text-muted-foreground">
                    Tu campana esta generando un retorno excepcional. Considera escalar la inversion con los mismos creadores.
                  </p>
                </div>
              </div>
            )}

            {avg_engagement_rate < BENCHMARKS.engagement_rate.avg && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">Engagement bajo el promedio</p>
                  <p className="text-sm text-muted-foreground">
                    Considera ajustar el brief o trabajar con creadores que tengan mejor engagement rate historico.
                  </p>
                </div>
              </div>
            )}

            {cost_per_video > BENCHMARKS.cpv.high && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10">
                <DollarSign className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">CPV alto</p>
                  <p className="text-sm text-muted-foreground">
                    Tu costo por video es superior al benchmark. Explora nano/micro influencers para mejor eficiencia.
                  </p>
                </div>
              </div>
            )}

            {creator_performances && creator_performances.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-500">Top performer</p>
                  <p className="text-sm text-muted-foreground">
                    {creator_performances[0].display_name} genera el mejor ROI ({creator_performances[0].roi_multiplier.toFixed(1)}x).
                    Considera aumentar su participacion en futuras campanas.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper icons
function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
