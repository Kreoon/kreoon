import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScheduledPost, ComposerFormData, ScheduledPostStatus } from '../types/social.types';

export function useScheduledPosts(filters?: {
  status?: ScheduledPostStatus;
  from?: string;
  to?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: posts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scheduled-posts', user?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.from) {
        query = query.gte('scheduled_at', filters.from);
      }
      if (filters?.to) {
        query = query.lte('scheduled_at', filters.to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ScheduledPost[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const createPost = useMutation({
    mutationFn: async (form: ComposerFormData) => {
      const insertData: Record<string, unknown> = {
        user_id: user!.id,
        content_id: form.contentId || null,
        caption: form.caption,
        hashtags: form.hashtags,
        scheduled_at: form.scheduledAt?.toISOString() || null,
        status: form.scheduledAt ? 'scheduled' : 'draft',
        post_type: form.postType,
        visibility: form.visibility,
        first_comment: form.firstComment || null,
        location_name: form.locationName || null,
        media_urls: form.mediaUrls,
        thumbnail_url: form.thumbnailUrl,
        target_accounts: form.targetAccountIds.map(id => ({ account_id: id })),
      };

      if (form.campaignId) insertData.campaign_id = form.campaignId;
      if (form.projectId) insertData.project_id = form.projectId;
      if (form.brandCollaboration) insertData.brand_collaboration = form.brandCollaboration;
      if (form.campaignId) insertData.verification_status = 'pending';

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ScheduledPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledPost> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ScheduledPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });

  const publishNow = useMutation({
    mutationFn: async (postId: string) => {
      // Validate media URLs before publishing - reject blob URLs
      const { data: post } = await supabase
        .from('scheduled_posts')
        .select('media_urls')
        .eq('id', postId)
        .single();

      if (post?.media_urls?.some((url: string) => url.startsWith('blob:'))) {
        throw new Error('Los archivos de media no se subieron correctamente. Elimina el post y crea uno nuevo.');
      }

      const { data, error } = await supabase.functions.invoke(
        'social-scheduler/publish-now',
        { body: { post_id: postId } }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });

  const cancelPost = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'cancelled' } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
    },
  });

  // Stats
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const failedCount = posts.filter(p => p.status === 'failed').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  return {
    posts,
    isLoading,
    error: error as Error | null,
    refetch,
    createPost,
    updatePost,
    deletePost,
    publishNow,
    cancelPost,
    stats: { scheduledCount, publishedCount, failedCount, draftCount },
  };
}
