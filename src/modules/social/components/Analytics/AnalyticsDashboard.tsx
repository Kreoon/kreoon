import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle,
  Share2, Play, RefreshCw, ArrowUp, ArrowDown, Bookmark,
  Calendar, ExternalLink, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSocialMetrics, useOrgSnapshots, type AccountSnapshot } from '../../hooks/useSocialMetrics';
import { PlatformIcon } from '../common/PlatformIcon';
import { toast } from 'sonner';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

// ── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  trend?: number;
  color?: string;
}) {
  return (
    <Card className="bg-card/50">
      <CardContent className="flex items-center gap-4 py-4">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg', color || 'bg-primary/10')}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn('flex items-center gap-0.5 text-xs font-medium', trend > 0 ? 'text-green-400' : 'text-red-400')}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Mini Sparkline (pure CSS bar chart) ──────────────────────────────────────

function Sparkline({ data, color = 'bg-primary' }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="flex items-end gap-px h-12 w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn('flex-1 rounded-t-sm min-w-[2px]', color)}
          style={{ height: `${Math.max((v / max) * 100, 2)}%`, opacity: 0.3 + (v / max) * 0.7 }}
        />
      ))}
    </div>
  );
}

// ── Account Card ────────────────────────────────────────────────────────────

function AccountCard({
  summary,
  snapshots,
}: {
  summary: ReturnType<typeof useSocialMetrics>['accountSummaries'][number];
  snapshots: AccountSnapshot[];
}) {
  const maxEngagement = Math.max(summary.totalLikes, summary.totalComments, summary.totalShares, 1);
  const followerHistory = snapshots.map(s => s.followers_count);
  const impressionHistory = snapshots.map(s => Number(s.impressions));

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={summary.account.platform} size="md" showBg />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">
              {summary.account.platform_display_name || summary.account.platform_username}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {summary.account.platform_page_name || `@${summary.account.platform_username}`}
            </p>
          </div>
          {summary.account.last_synced_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(summary.account.last_synced_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Seguidores
            </p>
            <p className="text-lg font-bold">{formatNumber(summary.followersCount)}</p>
            {summary.followersGrowth > 0 && (
              <p className="text-[10px] text-green-400 flex items-center gap-0.5">
                <ArrowUp className="w-2.5 h-2.5" />+{summary.followersGrowth} hoy
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Engagement
            </p>
            <p className="text-lg font-bold">{summary.engagementRate.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="w-3 h-3" /> Impresiones
            </p>
            <p className="text-sm font-medium">{formatNumber(summary.totalImpressions)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Play className="w-3 h-3" /> Views
            </p>
            <p className="text-sm font-medium">{formatNumber(summary.totalVideoViews)}</p>
          </div>
        </div>

        {/* Follower trend sparkline */}
        {followerHistory.length > 1 && (
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Seguidores (tendencia)</p>
            <Sparkline data={followerHistory} color="bg-purple-500" />
          </div>
        )}

        {/* Impressions sparkline */}
        {impressionHistory.length > 1 && impressionHistory.some(v => v > 0) && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Impresiones (tendencia)</p>
            <Sparkline data={impressionHistory} color="bg-blue-500" />
          </div>
        )}

        {/* Engagement breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Engagement</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3 text-red-400" />
              <div className="flex-1">
                <Progress value={(summary.totalLikes / maxEngagement) * 100} className="h-1.5" />
              </div>
              <span className="text-xs w-12 text-right">{formatNumber(summary.totalLikes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3 h-3 text-blue-400" />
              <div className="flex-1">
                <Progress value={(summary.totalComments / maxEngagement) * 100} className="h-1.5" />
              </div>
              <span className="text-xs w-12 text-right">{formatNumber(summary.totalComments)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Share2 className="w-3 h-3 text-green-400" />
              <div className="flex-1">
                <Progress value={(summary.totalShares / maxEngagement) * 100} className="h-1.5" />
              </div>
              <span className="text-xs w-12 text-right">{formatNumber(summary.totalShares)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Follower Growth Chart ───────────────────────────────────────────────────

function FollowerGrowthChart({ snapshots }: { snapshots: AccountSnapshot[] }) {
  // Group by date, sum followers
  const byDate = new Map<string, number>();
  for (const s of snapshots) {
    const current = byDate.get(s.snapshot_date) || 0;
    byDate.set(s.snapshot_date, current + s.followers_count);
  }

  const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (dates.length < 2) return null;

  const values = dates.map(d => d[1]);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Crecimiento de Seguidores
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {dates.map(([date, val]) => (
            <div
              key={date}
              className="flex-1 group relative"
            >
              <div
                className="w-full bg-purple-500/70 rounded-t-sm hover:bg-purple-400 transition-colors cursor-default"
                style={{ height: `${Math.max(((val - minVal) / range) * 100, 4)}%` }}
              />
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                {formatDate(date)}: {formatNumber(val)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{formatDate(dates[0][0])}</span>
          <span>{formatDate(dates[dates.length - 1][0])}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Impressions/Reach Chart ─────────────────────────────────────────────────

function ImpressionsChart({ snapshots }: { snapshots: AccountSnapshot[] }) {
  const byDate = new Map<string, { impressions: number; reach: number }>();
  for (const s of snapshots) {
    const current = byDate.get(s.snapshot_date) || { impressions: 0, reach: 0 };
    byDate.set(s.snapshot_date, {
      impressions: current.impressions + Number(s.impressions),
      reach: current.reach + Number(s.reach),
    });
  }

  const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (dates.length < 2) return null;

  const maxVal = Math.max(...dates.map(d => Math.max(d[1].impressions, d[1].reach)), 1);

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Impresiones y Alcance
          </CardTitle>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Impresiones</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Alcance</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1 h-32">
          {dates.map(([date, val]) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-px group relative">
              <div
                className="w-full bg-blue-500/60 rounded-t-sm"
                style={{ height: `${Math.max((val.impressions / maxVal) * 100, 2)}%` }}
              />
              <div
                className="w-full bg-green-500/60 rounded-t-sm"
                style={{ height: `${Math.max((val.reach / maxVal) * 100, 2)}%` }}
              />
              <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                {formatDate(date)}: {formatNumber(val.impressions)} imp / {formatNumber(val.reach)} alc
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{formatDate(dates[0][0])}</span>
          <span>{formatDate(dates[dates.length - 1][0])}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<string>('30');
  const days = parseInt(dateRange, 10);

  const { accountSummaries, totals, isLoading, syncMetrics } = useSocialMetrics();
  const { data: snapshots = [], isLoading: snapshotsLoading } = useOrgSnapshots(days);

  // Group snapshots by account_id
  const snapshotsByAccount = useMemo(() => {
    const map = new Map<string, AccountSnapshot[]>();
    for (const s of snapshots) {
      if (!map.has(s.account_id)) map.set(s.account_id, []);
      map.get(s.account_id)!.push(s);
    }
    return map;
  }, [snapshots]);

  // Compute period growth
  const periodGrowth = useMemo(() => {
    if (snapshots.length < 2) return { followers: 0, impressions: 0, reach: 0 };

    // Get first and last totals
    const byDate = new Map<string, { followers: number; impressions: number; reach: number }>();
    for (const s of snapshots) {
      const cur = byDate.get(s.snapshot_date) || { followers: 0, impressions: 0, reach: 0 };
      byDate.set(s.snapshot_date, {
        followers: cur.followers + s.followers_count,
        impressions: cur.impressions + Number(s.impressions),
        reach: cur.reach + Number(s.reach),
      });
    }

    const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const first = dates[0]?.[1];
    const last = dates[dates.length - 1]?.[1];

    if (!first || !last) return { followers: 0, impressions: 0, reach: 0 };

    return {
      followers: first.followers > 0 ? ((last.followers - first.followers) / first.followers) * 100 : 0,
      impressions: first.impressions > 0 ? ((last.impressions - first.impressions) / first.impressions) * 100 : 0,
      reach: first.reach > 0 ? ((last.reach - first.reach) / first.reach) * 100 : 0,
    };
  }, [snapshots]);

  const handleSync = () => {
    syncMetrics.mutate(undefined, {
      onSuccess: (data: any) => {
        toast.success(`Sincronizado: ${data?.synced ?? 0} cuentas${data?.failed ? `, ${data.failed} fallidas` : ''}`);
      },
      onError: (err: Error) => {
        toast.error(`Error al sincronizar: ${err.message}`);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Resumen General
        </h3>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="60">Últimos 60 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncMetrics.isPending}
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMetrics.isPending && 'animate-spin')} />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Global KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={Eye}
          label="Impresiones"
          value={formatNumber(totals.impressions)}
          trend={periodGrowth.impressions}
          color="bg-blue-500/10"
        />
        <MetricCard
          icon={Users}
          label="Alcance"
          value={formatNumber(totals.reach)}
          trend={periodGrowth.reach}
          color="bg-green-500/10"
        />
        <MetricCard
          icon={Heart}
          label="Engagement"
          value={formatNumber(totals.engagement)}
          color="bg-red-500/10"
        />
        <MetricCard
          icon={Users}
          label="Seguidores"
          value={formatNumber(totals.followers)}
          trend={periodGrowth.followers}
          color="bg-purple-500/10"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Heart} label="Likes" value={formatNumber(totals.likes)} color="bg-red-500/10" />
        <MetricCard icon={MessageCircle} label="Comentarios" value={formatNumber(totals.comments)} color="bg-blue-500/10" />
        <MetricCard icon={Share2} label="Compartidos" value={formatNumber(totals.shares)} color="bg-green-500/10" />
        <MetricCard icon={Play} label="Video Views" value={formatNumber(totals.videoViews)} color="bg-yellow-500/10" />
      </div>

      {/* Charts */}
      {snapshots.length > 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <FollowerGrowthChart snapshots={snapshots} />
          <ImpressionsChart snapshots={snapshots} />
        </div>
      )}

      {/* Per-account breakdowns */}
      {accountSummaries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Por Cuenta
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {accountSummaries.map(summary => (
              <AccountCard
                key={summary.account.id}
                summary={summary}
                snapshots={snapshotsByAccount.get(summary.account.id) || []}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {accountSummaries.length === 0 && !isLoading && (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <BarChart3 className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Conecta tus redes sociales y sincroniza para ver métricas reales.
            </p>
            <Button size="sm" onClick={handleSync} disabled={syncMetrics.isPending}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMetrics.isPending && 'animate-spin')} />
              Sincronizar ahora
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
