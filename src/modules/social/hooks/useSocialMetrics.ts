import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
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

export function useOrgSnapshots(days = 30, visibleAccountIds?: string[]) {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  return useQuery({
    queryKey: ['social-snapshots', orgId, days, visibleAccountIds],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_org_account_snapshots', {
        p_org_id: orgId!,
        p_days: days,
      });
      if (error) throw error;
      let result = (data || []) as AccountSnapshot[];

      // Filter to only visible accounts if specified
      if (visibleAccountIds) {
        const ids = new Set(visibleAccountIds);
        result = result.filter(s => ids.has(s.account_id));
      }

      return result;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Hook: Full metrics hook (backward-compatible + enhanced) ───────────────

export function useSocialMetrics() {
  const { user, profile, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;
  const permissionGroup = activeRole ? getPermissionGroup(activeRole) : null;
  const isManagerRole = permissionGroup === 'admin' || permissionGroup === 'team_leader';

  // For client users, fetch their associated client_id(s)
  const { data: userClientIds } = useQuery({
    queryKey: ['user-client-ids-metrics', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user!.id);
      return data?.map(d => d.client_id) || [];
    },
    enabled: !!user?.id && permissionGroup === 'client',
    staleTime: 10 * 60 * 1000,
  });

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

  // Also fetch accounts for display info (role-filtered)
  const {
    data: accounts = [],
    isLoading: accountsLoading,
  } = useQuery({
    queryKey: ['social-accounts-for-metrics', orgId, permissionGroup, user?.id],
    queryFn: async () => {
      if (orgId) {
        const { data, error } = await supabase.rpc('get_org_social_accounts', {
          p_org_id: orgId,
        });
        if (error) throw error;
        let result = (data || []) as unknown as SocialAccount[];

        // Role-based isolation
        if (!isManagerRole) {
          if (permissionGroup === 'client') {
            result = result.filter(a => a.client_id && userClientIds?.includes(a.client_id));
          } else {
            result = result.filter(a => a.user_id === user?.id);
          }
        }

        return result;
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

  // Filter snapshots to only visible accounts
  const visibleAccountIds = new Set(accounts.map(a => a.id));
  const filteredSnapshots = snapshotSummaries.filter(s => visibleAccountIds.has(s.account_id));

  // Build per-account summaries from snapshots
  const accountSummaries = accounts.map(account => {
    const snapshot = filteredSnapshots.find(s => s.account_id === account.id);
    const likes = Number(snapshot?.total_likes ?? 0);
    const comments = Number(snapshot?.total_comments ?? 0);
    const shares = Number(snapshot?.total_shares ?? 0);
    const reach = Number(snapshot?.reach ?? 0);
    const followers = snapshot?.followers_count ?? 0;
    const engagement = likes + comments + shares;

    // Engagement rate: prefer reach as denominator, fallback to followers
    const denominator = reach > 0 ? reach : followers > 0 ? followers : 1;
    const engagementRate = (engagement / denominator) * 100;

    return {
      account,
      totalPosts: snapshot?.posts_count ?? 0,
      totalInteractions: Number(snapshot?.impressions ?? 0), // IG: total_interactions, FB: 0
      totalReach: reach,
      totalEngagement: engagement,
      totalLikes: likes,
      totalComments: comments,
      totalShares: shares,
      totalSaves: Number(snapshot?.total_saves ?? 0),
      totalVideoViews: Number(snapshot?.video_views ?? 0),
      profileViews: snapshot?.profile_views ?? 0,
      accountsEngaged: snapshot?.accounts_engaged ?? 0,
      followersCount: followers,
      followersGrowth: snapshot?.followers_gained ?? 0,
      engagementRate,
      bestPostingHour: null,
      topPost: null,
    };
  });

  // Aggregate totals
  const totals = accountSummaries.reduce(
    (acc, s) => ({
      interactions: acc.interactions + s.totalInteractions,
      reach: acc.reach + s.totalReach,
      engagement: acc.engagement + s.totalEngagement,
      likes: acc.likes + s.totalLikes,
      comments: acc.comments + s.totalComments,
      shares: acc.shares + s.totalShares,
      videoViews: acc.videoViews + s.totalVideoViews,
      profileViews: acc.profileViews + s.profileViews,
      followers: acc.followers + s.followersCount,
      followersGrowth: acc.followersGrowth + s.followersGrowth,
    }),
    { interactions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, videoViews: 0, profileViews: 0, followers: 0, followersGrowth: 0 }
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
    visibleAccountIds: accounts.map(a => a.id),
  };
}
