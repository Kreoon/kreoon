import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CampaignSocialMetricsData } from '../types/social.types';

export function useCampaignSocialMetrics(campaignId: string | null) {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['campaign-social-metrics', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_campaign_social_metrics', { p_campaign_id: campaignId! });

      if (error) throw error;
      return data as unknown as CampaignSocialMetricsData;
    },
    enabled: !!campaignId,
    staleTime: 5 * 60 * 1000,
  });

  const verifyPost = useMutation({
    mutationFn: async ({
      postId,
      brandMentioned,
      brandTagged,
      collabActive,
      hashtagsUsed,
    }: {
      postId: string;
      brandMentioned: boolean;
      brandTagged: boolean;
      collabActive: boolean;
      hashtagsUsed: string[];
    }) => {
      const { error } = await supabase.rpc('verify_campaign_post', {
        p_post_id: postId,
        p_brand_mentioned: brandMentioned,
        p_brand_tagged: brandTagged,
        p_collab_active: collabActive,
        p_hashtags_used: hashtagsUsed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-social-metrics', campaignId] });
    },
  });

  // Sync all metrics for campaign posts
  const syncCampaignMetrics = useMutation({
    mutationFn: async () => {
      if (!data?.posts) return;

      const publishedPosts = data.posts.filter(p => p.status === 'published' && p.publish_results?.length > 0);

      const promises = publishedPosts.flatMap(post =>
        post.publish_results
          .filter(r => r.status === 'success' && r.platform_post_id)
          .map(r => {
            const account = post.target_accounts.find(t => t.account_id === r.account_id);
            if (!account) return null;
            return supabase.functions.invoke('social-metrics/fetch-post-metrics', {
              body: { post_id: post.id, account_id: r.account_id },
            });
          })
          .filter(Boolean)
      );

      await Promise.allSettled(promises as Promise<any>[]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-social-metrics', campaignId] });
    },
  });

  return {
    data,
    summary: data?.summary || null,
    creators: data?.creators || [],
    posts: data?.posts || [],
    isLoading,
    error: error as Error | null,
    refetch,
    verifyPost,
    syncCampaignMetrics,
  };
}
