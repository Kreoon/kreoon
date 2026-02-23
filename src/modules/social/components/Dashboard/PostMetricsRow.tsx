import { useMemo } from 'react';
import { Eye, Heart, MessageCircle, Share2, Bookmark, MousePointerClick, PlayCircle, BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PlatformIcon } from '../common/PlatformIcon';
import type { PostMetrics, SocialPlatform } from '../../types/social.types';

interface PublishResult {
  account_id: string;
  platform: string;
  platform_post_id?: string;
  status: string;
}

interface PostMetricsRowProps {
  metrics: PostMetrics[];
  publishResults: PublishResult[];
  onRefresh?: (accountId: string) => void;
  isRefreshing?: boolean;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface PlatformMetricsSummary {
  platform: SocialPlatform;
  accountId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  videoViews: number;
  hasData: boolean;
}

export function PostMetricsRow({ metrics, publishResults, onRefresh, isRefreshing }: PostMetricsRowProps) {
  const platformMetrics = useMemo(() => {
    // Map account_id → platform from publish_results
    const accountPlatformMap = new Map<string, string>();
    for (const pr of publishResults) {
      if (pr.account_id && pr.platform) {
        accountPlatformMap.set(pr.account_id, pr.platform);
      }
    }

    // Group metrics by platform
    const summaries: PlatformMetricsSummary[] = [];
    const seenPlatforms = new Set<string>();

    // First, add metrics we have data for
    for (const m of metrics) {
      const platform = accountPlatformMap.get(m.social_account_id) || 'unknown';
      if (seenPlatforms.has(platform)) continue;
      seenPlatforms.add(platform);

      const hasData = m.impressions > 0 || m.reach > 0 || m.likes > 0 || m.comments > 0 || m.shares > 0 || m.video_views > 0;

      summaries.push({
        platform: platform as SocialPlatform,
        accountId: m.social_account_id,
        impressions: m.impressions,
        reach: m.reach,
        likes: m.likes,
        comments: m.comments,
        shares: m.shares,
        saves: m.saves,
        clicks: m.clicks,
        videoViews: m.video_views,
        hasData,
      });
    }

    // Add platforms from publish_results that have no metrics yet
    for (const pr of publishResults) {
      if (pr.status === 'success' && pr.platform && !seenPlatforms.has(pr.platform)) {
        seenPlatforms.add(pr.platform);
        summaries.push({
          platform: pr.platform as SocialPlatform,
          accountId: pr.account_id,
          impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, videoViews: 0,
          hasData: false,
        });
      }
    }

    return summaries;
  }, [metrics, publishResults]);

  // Totals
  const totals = useMemo(() => {
    return platformMetrics.reduce((acc, m) => ({
      impressions: acc.impressions + m.impressions,
      reach: acc.reach + m.reach,
      likes: acc.likes + m.likes,
      comments: acc.comments + m.comments,
      shares: acc.shares + m.shares,
      saves: acc.saves + m.saves,
      videoViews: acc.videoViews + m.videoViews,
    }), { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, videoViews: 0 });
  }, [platformMetrics]);

  const hasAnyData = platformMetrics.some(m => m.hasData);

  if (platformMetrics.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Totals row */}
      {hasAnyData && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          {totals.impressions > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatNumber(totals.impressions)}</span>
            </TooltipTrigger><TooltipContent>Impresiones</TooltipContent></Tooltip>
          )}
          {totals.reach > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><BarChart3 className="h-3 w-3" />{formatNumber(totals.reach)}</span>
            </TooltipTrigger><TooltipContent>Alcance</TooltipContent></Tooltip>
          )}
          {totals.likes > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{formatNumber(totals.likes)}</span>
            </TooltipTrigger><TooltipContent>Me gusta</TooltipContent></Tooltip>
          )}
          {totals.comments > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{formatNumber(totals.comments)}</span>
            </TooltipTrigger><TooltipContent>Comentarios</TooltipContent></Tooltip>
          )}
          {totals.shares > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><Share2 className="h-3 w-3" />{formatNumber(totals.shares)}</span>
            </TooltipTrigger><TooltipContent>Compartidos</TooltipContent></Tooltip>
          )}
          {totals.saves > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><Bookmark className="h-3 w-3" />{formatNumber(totals.saves)}</span>
            </TooltipTrigger><TooltipContent>Guardados</TooltipContent></Tooltip>
          )}
          {totals.videoViews > 0 && (
            <Tooltip><TooltipTrigger asChild>
              <span className="flex items-center gap-0.5"><PlayCircle className="h-3 w-3" />{formatNumber(totals.videoViews)}</span>
            </TooltipTrigger><TooltipContent>Reproducciones</TooltipContent></Tooltip>
          )}
        </div>
      )}

      {/* Per-platform breakdown */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {platformMetrics.map((pm) => (
          <div key={pm.platform} className="flex items-center gap-1.5 text-[10px]">
            <PlatformIcon platform={pm.platform} size="xs" />
            {pm.hasData ? (
              <span className="text-muted-foreground">
                {pm.impressions > 0 && <span className="mr-1.5">{formatNumber(pm.impressions)} imp</span>}
                {pm.likes > 0 && <span className="mr-1.5">{formatNumber(pm.likes)} <Heart className="inline h-2.5 w-2.5" /></span>}
                {pm.comments > 0 && <span className="mr-1.5">{formatNumber(pm.comments)} <MessageCircle className="inline h-2.5 w-2.5" /></span>}
                {pm.shares > 0 && <span className="mr-1.5">{formatNumber(pm.shares)} <Share2 className="inline h-2.5 w-2.5" /></span>}
                {pm.videoViews > 0 && <span>{formatNumber(pm.videoViews)} <PlayCircle className="inline h-2.5 w-2.5" /></span>}
                {pm.impressions === 0 && pm.likes === 0 && pm.comments === 0 && pm.shares === 0 && pm.videoViews === 0 && (
                  <span>sin datos aun</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground/50 italic">sin metricas</span>
            )}
            {onRefresh && (
              <button
                onClick={() => onRefresh(pm.accountId)}
                className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-foreground transition-colors"
                title="Actualizar metricas"
              >
                {isRefreshing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RefreshCw className="h-2.5 w-2.5" />}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
