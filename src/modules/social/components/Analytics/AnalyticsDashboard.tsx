import { useState } from 'react';
import {
  BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle,
  Share2, Play, RefreshCw, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSocialMetrics } from '../../hooks/useSocialMetrics';
import { PlatformIcon } from '../common/PlatformIcon';
import type { AccountMetricsSummary } from '../../types/social.types';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

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

function AccountCard({ summary }: { summary: AccountMetricsSummary }) {
  const maxEngagement = Math.max(summary.totalLikes, summary.totalComments, summary.totalShares, 1);

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
          <Badge variant="outline" className="text-[10px]">
            {summary.totalPosts} posts
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Seguidores
            </p>
            <p className="text-lg font-bold">{formatNumber(summary.followersCount)}</p>
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

export function AnalyticsDashboard() {
  const { accountSummaries, totals, isLoading, syncMetrics } = useSocialMetrics();

  return (
    <div className="space-y-6">
      {/* Sync button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Resumen General
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncMetrics.mutate()}
          disabled={syncMetrics.isPending}
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', syncMetrics.isPending && 'animate-spin')} />
          Sincronizar
        </Button>
      </div>

      {/* Global metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Eye} label="Impresiones" value={formatNumber(totals.impressions)} color="bg-blue-500/10" />
        <MetricCard icon={Users} label="Alcance" value={formatNumber(totals.reach)} color="bg-green-500/10" />
        <MetricCard icon={Heart} label="Engagement" value={formatNumber(totals.engagement)} color="bg-red-500/10" />
        <MetricCard icon={Users} label="Seguidores" value={formatNumber(totals.followers)} trend={totals.followersGrowth > 0 ? (totals.followersGrowth / Math.max(totals.followers, 1)) * 100 : 0} color="bg-purple-500/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Heart} label="Likes" value={formatNumber(totals.likes)} color="bg-red-500/10" />
        <MetricCard icon={MessageCircle} label="Comentarios" value={formatNumber(totals.comments)} color="bg-blue-500/10" />
        <MetricCard icon={Share2} label="Compartidos" value={formatNumber(totals.shares)} color="bg-green-500/10" />
        <MetricCard icon={Play} label="Video Views" value={formatNumber(totals.videoViews)} color="bg-yellow-500/10" />
      </div>

      {/* Per-account breakdowns */}
      {accountSummaries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Por Cuenta
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {accountSummaries.map(summary => (
              <AccountCard key={summary.account.id} summary={summary} />
            ))}
          </div>
        </div>
      )}

      {accountSummaries.length === 0 && !isLoading && (
        <Card className="bg-muted/20">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <BarChart3 className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Conecta tus redes sociales para ver métricas.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
