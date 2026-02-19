import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SocialMetrics, AccountMetricsSummary, SocialAccount } from '../types/social.types';

export function useSocialMetrics(accountId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch metrics for a specific account
  const {
    data: metrics = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['social-metrics', accountId],
    queryFn: async () => {
      let query = supabase
        .from('social_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (accountId) {
        query = query.eq('social_account_id', accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SocialMetrics[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch aggregated metrics for all accounts
  const {
    data: accountSummaries = [],
    isLoading: summariesLoading,
  } = useQuery({
    queryKey: ['social-metrics-summaries', user?.id],
    queryFn: async () => {
      // Fetch accounts
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('is_active', true);

      if (!accounts || accounts.length === 0) return [];

      // Fetch latest account-level metrics
      const { data: allMetrics } = await supabase
        .from('social_metrics')
        .select('*')
        .in('social_account_id', accounts.map(a => a.id))
        .order('recorded_at', { ascending: false });

      const metricsByAccount = new Map<string, SocialMetrics[]>();
      for (const m of (allMetrics || []) as unknown as SocialMetrics[]) {
        if (!metricsByAccount.has(m.social_account_id)) {
          metricsByAccount.set(m.social_account_id, []);
        }
        metricsByAccount.get(m.social_account_id)!.push(m);
      }

      return (accounts as unknown as SocialAccount[]).map(account => {
        const acctMetrics = metricsByAccount.get(account.id) || [];
        const postMetrics = acctMetrics.filter(m => m.metric_type === 'post');
        const accountMetric = acctMetrics.find(m => m.metric_type === 'account');

        const totalImpressions = postMetrics.reduce((s, m) => s + m.impressions, 0);
        const totalReach = postMetrics.reduce((s, m) => s + m.reach, 0);
        const totalEngagement = postMetrics.reduce((s, m) => s + m.engagement, 0);
        const totalLikes = postMetrics.reduce((s, m) => s + m.likes, 0);
        const totalComments = postMetrics.reduce((s, m) => s + m.comments, 0);
        const totalShares = postMetrics.reduce((s, m) => s + m.shares, 0);
        const totalVideoViews = postMetrics.reduce((s, m) => s + m.video_views, 0);

        const summary: AccountMetricsSummary = {
          account,
          totalPosts: postMetrics.length,
          totalImpressions,
          totalReach,
          totalEngagement,
          totalLikes,
          totalComments,
          totalShares,
          totalVideoViews,
          followersCount: accountMetric?.followers_count ?? 0,
          followersGrowth: accountMetric?.followers_gained ?? 0,
          engagementRate: totalImpressions > 0
            ? (totalEngagement / totalImpressions) * 100
            : 0,
          bestPostingHour: null,
          topPost: postMetrics.sort((a, b) => b.engagement - a.engagement)[0] || null,
        };
        return summary;
      });
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  // Sync metrics for all accounts
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
      queryClient.invalidateQueries({ queryKey: ['social-metrics-summaries'] });
    },
  });

  // Fetch post-level metrics
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

  // Aggregate totals across all accounts
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

  return {
    metrics,
    accountSummaries,
    totals,
    isLoading: isLoading || summariesLoading,
    error: error as Error | null,
    syncMetrics,
    fetchPostMetrics,
  };
}
