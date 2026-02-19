import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SocialAccount } from '../types/social.types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecentMediaItem {
  id: string;
  caption: string | null;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  impressions: number;
  reach: number;
  shares: number;
  saves: number;
  video_views: number;
  engagement: number;
}

export interface AccountFullMetrics {
  followers_count: number;
  following_count: number;
  posts_count: number;
  profile_picture_url?: string;
  username?: string;
  biography?: string;
  impressions: number;
  reach: number;
  profile_views: number;
  accounts_engaged: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  video_views: number;
  followers_gained: number;
  followers_lost: number;
  audience_demographics: Record<string, unknown>;
  recent_media: RecentMediaItem[];
}

export interface AccountSnapshot {
  account_id: string;
  platform: string;
  platform_username: string | null;
  platform_display_name: string | null;
  snapshot_date: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  impressions: number;
  reach: number;
  profile_views: number;
  accounts_engaged: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_saves: number;
  video_views: number;
  followers_gained: number;
  followers_lost: number;
  audience_demographics: Record<string, unknown>;
}

export interface AccountMetricsSummary {
  account: SocialAccount;
  metrics: AccountFullMetrics | null;
  isLoading: boolean;
}

// ── Hook: Sync all metrics ─────────────────────────────────────────────────

export function useSyncMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountIds?: string[]) => {
      if (accountIds && accountIds.length > 0) {
        const { data, error } = await supabase.functions.invoke(
          'social-metrics/sync',
          { body: { accountIds } }
        );
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase.functions.invoke(
        'social-metrics/sync-all',
        { body: {} }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['social-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });
}

// ── Hook: Fetch snapshots for org (historical data for charts) ─────────────

export function useOrgSnapshots(days = 30) {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  return useQuery({
    queryKey: ['social-snapshots', orgId, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_account_snapshots', {
        p_org_id: orgId!,
        p_days: days,
      });
      if (error) throw error;
      return (data || []) as AccountSnapshot[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Hook: Full metrics hook (backward-compatible + enhanced) ───────────────

export function useSocialMetrics() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  // Fetch latest snapshots as summaries (one per account for today or most recent)
  const {
    data: snapshotSummaries = [],
    isLoading: summariesLoading,
  } = useQuery({
    queryKey: ['social-metrics', 'summaries', orgId],
    queryFn: async () => {
      // Get recent snapshots (last 1 day to get the latest per account)
      const { data, error } = await supabase.rpc('get_org_account_snapshots', {
        p_org_id: orgId!,
        p_days: 1,
      });
      if (error) throw error;
      return (data || []) as AccountSnapshot[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Also fetch accounts for display info
  const {
    data: accounts = [],
    isLoading: accountsLoading,
  } = useQuery({
    queryKey: ['social-accounts-for-metrics', orgId],
    queryFn: async () => {
      if (orgId) {
        const { data, error } = await supabase.rpc('get_org_social_accounts', {
          p_org_id: orgId,
        });
        if (error) throw error;
        return (data || []) as unknown as SocialAccount[];
      }
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as unknown as SocialAccount[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Build per-account summaries from snapshots
  const accountSummaries = accounts.map(account => {
    const snapshot = snapshotSummaries.find(s => s.account_id === account.id);
    return {
      account,
      totalPosts: snapshot?.posts_count ?? 0,
      totalImpressions: Number(snapshot?.impressions ?? 0),
      totalReach: Number(snapshot?.reach ?? 0),
      totalEngagement: Number((snapshot?.total_likes ?? 0)) + Number((snapshot?.total_comments ?? 0)) + Number((snapshot?.total_shares ?? 0)),
      totalLikes: Number(snapshot?.total_likes ?? 0),
      totalComments: Number(snapshot?.total_comments ?? 0),
      totalShares: Number(snapshot?.total_shares ?? 0),
      totalVideoViews: Number(snapshot?.video_views ?? 0),
      followersCount: snapshot?.followers_count ?? 0,
      followersGrowth: snapshot?.followers_gained ?? 0,
      engagementRate: Number(snapshot?.impressions ?? 0) > 0
        ? ((Number(snapshot?.total_likes ?? 0) + Number(snapshot?.total_comments ?? 0) + Number(snapshot?.total_shares ?? 0)) / Number(snapshot?.impressions ?? 1)) * 100
        : 0,
      bestPostingHour: null,
      topPost: null,
    };
  });

  // Aggregate totals
  const totals = accountSummaries.reduce(
    (acc, s) => ({
      impressions: acc.impressions + s.totalImpressions,
      reach: acc.reach + s.totalReach,
      engagement: acc.engagement + s.totalEngagement,
      likes: acc.likes + s.totalLikes,
      comments: acc.comments + s.totalComments,
      shares: acc.shares + s.totalShares,
      videoViews: acc.videoViews + s.totalVideoViews,
      followers: acc.followers + s.followersCount,
      followersGrowth: acc.followersGrowth + s.followersGrowth,
    }),
    { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, videoViews: 0, followers: 0, followersGrowth: 0 }
  );

  // Sync mutation
  const syncMetrics = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'social-metrics/sync-all',
        { body: {} }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['social-snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  // Legacy: fetch post-level metrics
  const fetchPostMetrics = useMutation({
    mutationFn: async ({ postId, accountId }: { postId: string; accountId: string }) => {
      const { data, error } = await supabase.functions.invoke(
        'social-metrics/fetch-post-metrics',
        { body: { post_id: postId, account_id: accountId } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-metrics'] });
    },
  });

  return {
    metrics: [],
    accountSummaries,
    totals,
    isLoading: summariesLoading || accountsLoading,
    error: null,
    syncMetrics,
    fetchPostMetrics,
  };
}
