import { useState, useMemo } from 'react';
import {
  DollarSign, Eye, MousePointerClick, Target, TrendingUp,
  RefreshCw, Sparkles, BarChart3, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAdMetrics } from '../../hooks/useAdMetrics';
import { useAdCampaigns } from '../../hooks/useAdCampaigns';
import { MetricCard } from '../common/MetricCard';
import { AdPlatformIcon } from '../common/AdPlatformIcon';
import { CampaignStatusBadge } from '../common/CampaignStatusBadge';
import { CAMPAIGN_STATUS_LABELS } from '../../config';
import type { AdPlatform } from '../../types/marketing.types';
import { toast } from 'sonner';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function MarketingDashboard() {
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { dashboard, insights, isDashboardLoading, syncAllMetrics, generateInsights } = useAdMetrics({ from: dateFrom, to: dateTo });
  const { campaigns } = useAdCampaigns();

  const handleSync = async () => {
    try {
      await syncAllMetrics.mutateAsync();
      toast.success('Métricas sincronizadas');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAIInsights = async () => {
    try {
      await generateInsights.mutateAsync();
      toast.success('Insights generados con IA');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isDashboardLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse bg-muted/20"><CardContent className="h-24" /></Card>
          ))}
        </div>
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-36 text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAIInsights} disabled={generateInsights.isPending}>
            <Sparkles className={cn('w-3.5 h-3.5 mr-1', generateInsights.isPending && 'animate-spin')} />
            AI Insights
          </Button>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncAllMetrics.isPending}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncAllMetrics.isPending && 'animate-spin')} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard label="Gasto total" value={dashboard?.total_spend || 0} format="currency" icon={DollarSign} />
        <MetricCard label="Impresiones" value={dashboard?.total_impressions || 0} format="number" icon={Eye} />
        <MetricCard label="Clics" value={dashboard?.total_clicks || 0} format="number" icon={MousePointerClick} />
        <MetricCard label="CTR" value={dashboard?.avg_ctr || 0} format="percentage" />
        <MetricCard label="CPC Prom." value={dashboard?.avg_cpc || 0} format="currency" />
        <MetricCard label="Conversiones" value={dashboard?.total_conversions || 0} format="number" icon={Target} />
        <MetricCard label="ROAS" value={dashboard?.avg_roas || 0} format="decimal" icon={TrendingUp} />
      </div>

      {/* Platform breakdown */}
      {dashboard?.per_platform && dashboard.per_platform.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Por plataforma
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dashboard.per_platform.map(p => (
              <Card key={p.platform} className="bg-card/50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 mb-3">
                    <AdPlatformIcon platform={p.platform} size="md" withBg />
                    <div>
                      <p className="text-sm font-medium capitalize">{p.platform} Ads</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtCurrency(p.spend)} gastado
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-bold">{fmt(p.impressions)}</p>
                      <p className="text-[9px] text-muted-foreground">Impresiones</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{fmt(p.clicks)}</p>
                      <p className="text-[9px] text-muted-foreground">Clics</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{p.roas?.toFixed(2) || '0'}x</p>
                      <p className="text-[9px] text-muted-foreground">ROAS</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Daily spend chart placeholder */}
      {dashboard?.daily_series && dashboard.daily_series.length > 0 && (
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <BarChart3 className="w-4 h-4" /> Gasto diario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-0.5">
              {dashboard.daily_series.map((day, i) => {
                const maxSpend = Math.max(...dashboard.daily_series.map(d => d.spend), 1);
                const height = (day.spend / maxSpend) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/60 rounded-t-sm transition-all hover:bg-primary"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${fmtCurrency(day.spend)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-muted-foreground">{dashboard.daily_series[0]?.date}</span>
              <span className="text-[9px] text-muted-foreground">{dashboard.daily_series[dashboard.daily_series.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Top campaigns */}
      {dashboard?.top_campaigns && dashboard.top_campaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Top campañas por gasto
          </h3>
          <div className="space-y-2">
            {dashboard.top_campaigns.map((c, i) => (
              <Card key={c.id} className="bg-card/50">
                <CardContent className="flex items-center gap-4 py-3">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                  <AdPlatformIcon platform={c.platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{fmt(c.impressions)} impr.</span>
                      <span className="text-[10px] text-muted-foreground">{fmt(c.clicks)} clics</span>
                      <span className="text-[10px] text-muted-foreground">{c.conversions} conv.</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{fmtCurrency(c.spend)}</p>
                    <p className="text-[10px] text-muted-foreground">ROAS {c.roas?.toFixed(2) || '0'}x</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Insights
          </h3>
          <div className="space-y-2">
            {insights.slice(0, 5).map(insight => (
              <Card key={insight.id} className={cn(
                'bg-card/50',
                !insight.is_read && 'border-primary/30'
              )}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Badge className={cn(
                      'text-[9px] shrink-0',
                      insight.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      insight.severity === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      insight.severity === 'opportunity' ? 'bg-green-500/20 text-green-400' :
                      'bg-blue-500/20 text-blue-400'
                    )}>
                      {insight.insight_type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active campaigns quick view */}
      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Campañas activas ({activeCampaigns.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeCampaigns.slice(0, 6).map(campaign => (
              <Card key={campaign.id} className="bg-card/50">
                <CardContent className="flex items-center gap-3 py-3">
                  <AdPlatformIcon platform={campaign.platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{campaign.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {fmtCurrency(campaign.total_spend)} · {campaign.objective}
                    </p>
                  </div>
                  <CampaignStatusBadge status={campaign.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!dashboard && !isDashboardLoading && (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <BarChart3 className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No hay datos de marketing aún.
              <br />
              Conecta una cuenta de ads para empezar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
