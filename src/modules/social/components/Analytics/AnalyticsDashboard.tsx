import { useState, useMemo } from 'react';
import {
  RefreshCw, ArrowUp, ArrowDown,
  Heart, MessageCircle, Share2, Play,
  Eye, Users, TrendingUp, MousePointerClick, UserCheck,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSocialMetrics, useOrgSnapshots, type AccountSnapshot } from '../../hooks/useSocialMetrics';
import { useScheduledPosts } from '../../hooks/useScheduledPosts';
import { useBatchPostMetrics } from '../../hooks/useBatchPostMetrics';
import { PlatformIcon } from '../common/PlatformIcon';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', youtube: '▶️',
  twitter: '🐦', linkedin: '💼', threads: '🧵', pinterest: '📌',
};

const DATE_RANGES = [
  { label: '7d', value: '7' },
  { label: '14d', value: '14' },
  { label: '30d', value: '30' },
  { label: '60d', value: '60' },
  { label: '90d', value: '90' },
];

// ── BigKPICard ────────────────────────────────────────────────────────────────

function BigKPICard({
  emoji, label, value, trend, bg,
}: {
  emoji: string; label: string; value: string; trend?: number; bg: string;
}) {
  return (
    <div className={cn('rounded-2xl p-4 border-2 border-transparent', bg)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-3xl">{emoji}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
            trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          )}>
            {trend > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ── Mini Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ data, color = 'bg-primary' }: { data: number[]; color?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-10 w-full">
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

// ── Account Card ──────────────────────────────────────────────────────────────

interface MiniMetric {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  isBig?: boolean;
  suffix?: string;
  growth?: number;
}

interface EngagementBar {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}

function getInstagramMetrics(summary: ReturnType<typeof useSocialMetrics>['accountSummaries'][number]) {
  return {
    kpis: [
      { icon: Users, label: 'Seguidores', value: summary.followersCount, isBig: true, growth: summary.followersGrowth },
      { icon: Eye, label: 'Alcance', value: summary.totalReach, isBig: true },
      { icon: MousePointerClick, label: 'Interacciones', value: summary.totalInteractions },
      { icon: UserCheck, label: 'Visitas al Perfil', value: summary.profileViews },
      { icon: Users, label: 'Cuentas Alcanzadas', value: summary.accountsEngaged },
      { icon: TrendingUp, label: 'Engagement', value: 0, suffix: `${summary.engagementRate.toFixed(2)}%` },
    ] as MiniMetric[],
    bars: [
      { icon: Heart, label: 'Likes', value: summary.totalLikes, color: 'text-red-400' },
      { icon: MessageCircle, label: 'Comentarios', value: summary.totalComments, color: 'text-blue-400' },
    ] as EngagementBar[],
    sparklineKey: 'reach' as const,
    sparklineLabel: 'Alcance',
  };
}

function getFacebookMetrics(summary: ReturnType<typeof useSocialMetrics>['accountSummaries'][number]) {
  return {
    kpis: [
      { icon: Users, label: 'Seguidores', value: summary.followersCount, isBig: true },
      { icon: ImageIcon, label: 'Publicaciones', value: summary.totalPosts, isBig: true },
      { icon: Eye, label: 'Vistas de Página', value: summary.profileViews },
      { icon: Play, label: 'Video Views', value: summary.totalVideoViews },
      { icon: Heart, label: 'Reacciones', value: summary.totalLikes },
      { icon: UserCheck, label: 'Interacciones', value: summary.accountsEngaged },
    ] as MiniMetric[],
    bars: [
      { icon: Heart, label: 'Reacciones', value: summary.totalLikes, color: 'text-red-400' },
      { icon: MessageCircle, label: 'Comentarios', value: summary.totalComments, color: 'text-blue-400' },
      { icon: Share2, label: 'Compartidos', value: summary.totalShares, color: 'text-green-400' },
    ] as EngagementBar[],
    sparklineKey: 'reach' as const,
    sparklineLabel: 'Vistas de Página',
  };
}

function getGenericMetrics(summary: ReturnType<typeof useSocialMetrics>['accountSummaries'][number]) {
  return {
    kpis: [
      { icon: Users, label: 'Seguidores', value: summary.followersCount, isBig: true, growth: summary.followersGrowth },
      { icon: TrendingUp, label: 'Engagement', value: 0, isBig: true, suffix: `${summary.engagementRate.toFixed(2)}%` },
      { icon: Eye, label: 'Alcance', value: summary.totalReach },
      { icon: Play, label: 'Views', value: summary.totalVideoViews },
      { icon: Heart, label: 'Likes', value: summary.totalLikes },
      { icon: MessageCircle, label: 'Comentarios', value: summary.totalComments },
    ] as MiniMetric[],
    bars: [
      { icon: Heart, label: 'Likes', value: summary.totalLikes, color: 'text-red-400' },
      { icon: MessageCircle, label: 'Comentarios', value: summary.totalComments, color: 'text-blue-400' },
      { icon: Share2, label: 'Compartidos', value: summary.totalShares, color: 'text-green-400' },
    ] as EngagementBar[],
    sparklineKey: 'reach' as const,
    sparklineLabel: 'Alcance',
  };
}

function AccountCard({
  summary,
  snapshots,
}: {
  summary: ReturnType<typeof useSocialMetrics>['accountSummaries'][number];
  snapshots: AccountSnapshot[];
}) {
  const platform = summary.account.platform;
  const config = platform === 'instagram'
    ? getInstagramMetrics(summary)
    : platform === 'facebook'
    ? getFacebookMetrics(summary)
    : getGenericMetrics(summary);

  const visibleKpis = config.kpis.filter(k => k.value > 0 || k.suffix);
  const visibleBars = config.bars.filter(b => b.value > 0);
  const maxBar = Math.max(...visibleBars.map(b => b.value), 1);
  const followerHistory = snapshots.map(s => s.followers_count);
  const trendHistory = platform === 'facebook'
    ? snapshots.map(s => s.profile_views)
    : snapshots.map(s => Number(s.reach));

  return (
    <div className="rounded-2xl border-2 border-border/50 bg-card/30 overflow-hidden">
      {/* Account header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <div className="relative shrink-0">
          <PlatformIcon platform={platform} size="md" showBg />
          <span className="absolute -bottom-1 -right-1 text-base leading-none">
            {PLATFORM_EMOJI[platform] || '📱'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {summary.account.platform_display_name || summary.account.platform_username}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.account.platform_page_name || `@${summary.account.platform_username}`}
          </p>
        </div>
        {summary.account.last_synced_at && (
          <span className="text-[10px] text-muted-foreground shrink-0">
            🔄 {new Date(summary.account.last_synced_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>

      {/* KPI grid */}
      <div className="p-4 space-y-4">
        {visibleKpis.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {visibleKpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <div key={i}>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                    <Icon className="w-3 h-3" /> {kpi.label}
                  </p>
                  <p className={kpi.isBig ? 'text-lg font-bold' : 'text-sm font-semibold'}>
                    {kpi.suffix || formatNumber(kpi.value)}
                  </p>
                  {kpi.growth != null && kpi.growth > 0 && (
                    <p className="text-[10px] text-green-400 flex items-center gap-0.5">
                      <ArrowUp className="w-2.5 h-2.5" />+{kpi.growth} hoy
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sparklines */}
        {followerHistory.length > 1 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">👥 Seguidores (tendencia)</p>
            <Sparkline data={followerHistory} color="bg-purple-500" />
          </div>
        )}
        {trendHistory.length > 1 && trendHistory.some(v => v > 0) && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">👁️ {config.sparklineLabel} (tendencia)</p>
            <Sparkline data={trendHistory} color="bg-blue-500" />
          </div>
        )}

        {/* Engagement bars */}
        {visibleBars.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground font-medium">❤️ Engagement</p>
            <div className="space-y-1.5">
              {visibleBars.map((bar, i) => {
                const Icon = bar.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className={cn('w-3 h-3 shrink-0', bar.color)} />
                    <div className="flex-1">
                      <Progress value={(bar.value / maxBar) * 100} className="h-1.5" />
                    </div>
                    <span className="text-xs w-12 text-right">{formatNumber(bar.value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Follower Growth Chart ─────────────────────────────────────────────────────

function FollowerGrowthChart({ snapshots }: { snapshots: AccountSnapshot[] }) {
  const byDate = new Map<string, number>();
  for (const s of snapshots) {
    byDate.set(s.snapshot_date, (byDate.get(s.snapshot_date) || 0) + s.followers_count);
  }

  const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (dates.length < 2) return null;

  const values = dates.map(d => d[1]);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  return (
    <div className="rounded-2xl border-2 border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📈</span>
        <p className="font-semibold">Crecimiento de Seguidores</p>
      </div>
      <div className="flex items-end gap-1 h-28">
        {dates.map(([date, val]) => (
          <div key={date} className="flex-1 group relative">
            <div
              className="w-full bg-purple-500/70 rounded-t-lg hover:bg-purple-400 transition-colors cursor-default"
              style={{ height: `${Math.max(((val - minVal) / range) * 100, 4)}%` }}
            />
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none">
              {formatDate(date)}: {formatNumber(val)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{formatDate(dates[0][0])}</span>
        <span>{formatDate(dates[dates.length - 1][0])}</span>
      </div>
    </div>
  );
}

// ── Reach & Interactions Chart ────────────────────────────────────────────────

function ReachInteractionsChart({ snapshots }: { snapshots: AccountSnapshot[] }) {
  const byDate = new Map<string, { interactions: number; reach: number }>();
  for (const s of snapshots) {
    const cur = byDate.get(s.snapshot_date) || { interactions: 0, reach: 0 };
    byDate.set(s.snapshot_date, {
      interactions: cur.interactions + Number(s.impressions),
      reach: cur.reach + Number(s.reach),
    });
  }

  const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (dates.length < 2) return null;

  const maxVal = Math.max(...dates.map(d => Math.max(d[1].interactions, d[1].reach)), 1);

  return (
    <div className="rounded-2xl border-2 border-border/50 bg-card/30 p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">👁️</span>
          <p className="font-semibold">Alcance e Interacciones</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 shrink-0" /> Alcance</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Interacciones</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-28">
        {dates.map(([date, val]) => (
          <div key={date} className="flex-1 flex flex-col-reverse items-center gap-px group relative">
            <div
              className="w-full bg-green-500/60 rounded-t-lg"
              style={{ height: `${Math.max((val.reach / maxVal) * 100, 2)}%` }}
            />
            <div
              className="w-full bg-blue-500/60 rounded-t-lg"
              style={{ height: `${Math.max((val.interactions / maxVal) * 100, 2)}%` }}
            />
            <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-1.5 py-0.5 rounded-lg shadow-lg whitespace-nowrap z-10 pointer-events-none">
              {formatDate(date)}: {formatNumber(val.reach)} alc / {formatNumber(val.interactions)} int
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{formatDate(dates[0][0])}</span>
        <span>{formatDate(dates[dates.length - 1][0])}</span>
      </div>
    </div>
  );
}

// ── Top Posts ─────────────────────────────────────────────────────────────────

function TopPostsSection() {
  const { posts } = useScheduledPosts();

  const publishedPostIds = useMemo(
    () => posts.filter(p => p.status === 'published' || p.status === 'partially_published').map(p => p.id),
    [posts]
  );

  const { data: metricsMapData } = useBatchPostMetrics(publishedPostIds);
  const metricsMap = metricsMapData ?? new Map<string, any[]>();

  const topPosts = useMemo(() => {
    return posts
      .filter(p => p.status === 'published' || p.status === 'partially_published')
      .map(p => {
        const metrics = metricsMap.get(p.id) || [];
        const totalEngagement = metrics.reduce(
          (sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0),
          0
        );
        const totalReach = metrics.reduce((sum, m) => sum + (m.reach || m.impressions || 0), 0);
        return { post: p, totalEngagement, totalReach, metrics };
      })
      .filter(item => item.totalEngagement > 0 || item.totalReach > 0)
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 4);
  }, [posts, metricsMap]);

  if (topPosts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🏆</span>
        <h3 className="font-bold">Tus Mejores Posts</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {topPosts.map(({ post, totalEngagement, totalReach }) => {
          const platforms = (post.target_accounts || []).map((t: any) => t.platform);
          const mediaSrc = post.thumbnail_url || (post.media_urls?.[0] || null);
          const isBlobUrl = mediaSrc?.startsWith('blob:');

          return (
            <div key={post.id} className="rounded-2xl border-2 border-border/50 bg-card/30 overflow-hidden flex gap-3 p-3">
              {/* Thumbnail */}
              {mediaSrc && !isBlobUrl ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0">
                  <img src={mediaSrc} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted/40 flex items-center justify-center text-2xl shrink-0">
                  {PLATFORM_EMOJI[platforms[0]] || '📄'}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-medium truncate">
                  {post.caption?.slice(0, 40) || 'Sin caption'}
                </p>
                <div className="flex items-center gap-0.5">
                  {platforms.slice(0, 3).map(p => (
                    <PlatformIcon key={p} platform={p} size="xs" />
                  ))}
                </div>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>❤️ {formatNumber(totalEngagement)}</span>
                  <span>👁️ {formatNumber(totalReach)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<string>('30');
  const days = parseInt(dateRange, 10);

  const { accountSummaries, totals, isLoading, syncMetrics, visibleAccountIds } = useSocialMetrics();
  const { data: snapshots = [] } = useOrgSnapshots(days, visibleAccountIds);

  const snapshotsByAccount = useMemo(() => {
    const map = new Map<string, AccountSnapshot[]>();
    for (const s of snapshots) {
      if (!map.has(s.account_id)) map.set(s.account_id, []);
      map.get(s.account_id)!.push(s);
    }
    return map;
  }, [snapshots]);

  const periodGrowth = useMemo(() => {
    if (snapshots.length < 2) return { followers: 0, interactions: 0, reach: 0 };
    const byDate = new Map<string, { followers: number; interactions: number; reach: number }>();
    for (const s of snapshots) {
      const cur = byDate.get(s.snapshot_date) || { followers: 0, interactions: 0, reach: 0 };
      byDate.set(s.snapshot_date, {
        followers: cur.followers + s.followers_count,
        interactions: cur.interactions + Number(s.impressions),
        reach: cur.reach + Number(s.reach),
      });
    }
    const dates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const first = dates[0]?.[1];
    const last = dates[dates.length - 1]?.[1];
    if (!first || !last) return { followers: 0, interactions: 0, reach: 0 };
    return {
      followers: first.followers > 0 ? ((last.followers - first.followers) / first.followers) * 100 : 0,
      interactions: first.interactions > 0 ? ((last.interactions - first.interactions) / first.interactions) * 100 : 0,
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

  // Empty state
  if (accountSummaries.length === 0 && !isLoading) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-12 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">📊</span>
        <p className="font-semibold">¡Sin datos todavía!</p>
        <p className="text-sm text-muted-foreground">
          Conecta tus redes y sincroniza para ver tus métricas aquí
        </p>
        <Button size="sm" className="rounded-xl mt-2" onClick={handleSync} disabled={syncMetrics.isPending}>
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMetrics.isPending && 'animate-spin')} />
          Sincronizar ahora
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          <h2 className="text-xl font-bold">¿Cómo vas?</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range pills */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1">
            {DATE_RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                  dateRange === r.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button
            size="sm" variant="outline" className="rounded-xl"
            onClick={handleSync} disabled={syncMetrics.isPending}
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMetrics.isPending && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* BigKPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigKPICard emoji="👁️" label="Alcance" value={formatNumber(totals.reach)} trend={periodGrowth.reach} bg="bg-blue-500/10" />
        <BigKPICard emoji="💬" label="Interacciones" value={formatNumber(totals.interactions)} trend={periodGrowth.interactions} bg="bg-purple-500/10" />
        <BigKPICard emoji="❤️" label="Engagement" value={formatNumber(totals.engagement)} bg="bg-pink-500/10" />
        <BigKPICard emoji="👥" label="Seguidores" value={formatNumber(totals.followers)} trend={periodGrowth.followers} bg="bg-green-500/10" />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { emoji: '❤️', label: 'Likes', value: totals.likes },
          { emoji: '💬', label: 'Comentarios', value: totals.comments },
          { emoji: '🔗', label: 'Visitas al Perfil', value: totals.profileViews },
          { emoji: '▶️', label: 'Video Views', value: totals.videoViews },
        ].map(m => (
          <div key={m.label} className="rounded-2xl border-2 border-border/30 bg-card/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">{m.emoji} {m.label}</p>
            <p className="text-lg font-bold">{formatNumber(m.value)}</p>
          </div>
        ))}
      </div>

      {/* Top posts */}
      <TopPostsSection />

      {/* Trend charts */}
      {snapshots.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📉</span>
            <h3 className="font-bold">Tendencias</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <FollowerGrowthChart snapshots={snapshots} />
            <ReachInteractionsChart snapshots={snapshots} />
          </div>
        </div>
      )}

      {/* Per-account breakdown */}
      {accountSummaries.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <h3 className="font-bold">Por Cuenta</h3>
          </div>
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
    </div>
  );
}
