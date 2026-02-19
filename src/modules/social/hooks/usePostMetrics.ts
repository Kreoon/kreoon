import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { PostMetrics } from '../types/social.types';

export function usePostMetrics(postId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: metrics = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['post-metrics', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_metrics')
        .select('*')
        .eq('scheduled_post_id', postId!)
        .order('fetched_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PostMetrics[];
    },
    enabled: !!postId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const refreshPostMetrics = useMutation({
    mutationFn: async ({ postId, accountId }: { postId: string; accountId: string }) => {
      const { data, error } = await supabase.functions.invoke(
        'social-metrics/fetch-post-metrics',
        { body: { post_id: postId, account_id: accountId } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-metrics'] });
    },
  });

  // Aggregate totals across all accounts for this post
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      reach: acc.reach + m.reach,
      engagement: acc.engagement + m.engagement,
      likes: acc.likes + m.likes,
      comments: acc.comments + m.comments,
      shares: acc.shares + m.shares,
      saves: acc.saves + m.saves,
      clicks: acc.clicks + m.clicks,
      videoViews: acc.videoViews + m.video_views,
    }),
    { impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, videoViews: 0 }
  );

  return {
    metrics,
    totals,
    isLoading,
    error: error as Error | null,
    refreshPostMetrics,
  };
}
