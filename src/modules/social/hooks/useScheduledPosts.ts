import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
import type { ScheduledPost, ComposerFormData, ScheduledPostStatus } from '../types/social.types';

export function useScheduledPosts(filters?: {
  status?: ScheduledPostStatus;
  from?: string;
  to?: string;
}) {
  const { user, profile, activeRole } = useAuth();
  const queryClient = useQueryClient();
  const permissionGroup = activeRole ? getPermissionGroup(activeRole) : null;
  const isManagerRole = permissionGroup === 'admin' || permissionGroup === 'team_leader';

  // For client users, fetch their visible account IDs
  const { data: clientAccountIds } = useQuery({
    queryKey: ['client-social-account-ids', user?.id],
    queryFn: async () => {
      // Get client associations
      const { data: associations } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', user!.id);
      const clientIds = associations?.map(a => a.client_id) || [];
      if (clientIds.length === 0) return [];

      // Get social accounts for those clients
      const { data: accounts } = await supabase
        .from('social_accounts')
        .select('id')
        .in('client_id', clientIds)
        .eq('is_active', true);
      return accounts?.map(a => a.id) || [];
    },
    enabled: !!user?.id && permissionGroup === 'client',
    staleTime: 10 * 60 * 1000,
  });

  // For talent users, fetch all org account IDs so they see posts from teammates on shared accounts
  const orgId = profile?.current_organization_id;
  const { data: talentAccountIds } = useQuery({
    queryKey: ['talent-social-account-ids', user?.id, orgId],
    queryFn: async () => {
      const ids = new Set<string>();

      // 1. Accounts the user owns directly
      const { data: ownedAccounts } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user!.id)
        .eq('is_active', true);
      ownedAccounts?.forEach(a => ids.add(a.id));

      // 2. Accounts with explicit permissions (can_view)
      const { data: permAccounts } = await supabase
        .from('social_account_permissions')
        .select('account_id')
        .eq('user_id', user!.id)
        .eq('can_view', true);
      permAccounts?.forEach(p => ids.add(p.account_id));

      // 3. All active org accounts (any org member can see posts for org accounts)
      if (orgId) {
        const { data: orgAccounts } = await supabase
          .from('social_accounts')
          .select('id')
          .eq('organization_id', orgId)
          .eq('is_active', true);
        orgAccounts?.forEach(a => ids.add(a.id));
      }

      return Array.from(ids);
    },
    enabled: !!user?.id && !isManagerRole && permissionGroup !== 'client',
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: posts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scheduled-posts', user?.id, orgId, filters, permissionGroup, talentAccountIds],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

      // Always filter by current organization (multi-tenant isolation)
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      // Talent with no specific account access: only their own posts
      // Talent with account access: see all posts (filtered client-side by accounts)
      if (!isManagerRole && permissionGroup !== 'client') {
        if (!talentAccountIds || talentAccountIds.length === 0) {
          // No specific account access — show only own posts
          query = query.eq('user_id', user!.id);
        }
        // If they have account access, don't filter by user_id — we'll filter client-side
      }

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
      let result = (data || []) as unknown as ScheduledPost[];

      // Client: filter to posts targeting their company's accounts
      if (!isManagerRole && permissionGroup === 'client' && clientAccountIds) {
        const ids = new Set(clientAccountIds);
        result = result.filter(post =>
          post.target_accounts?.some((ta: any) => ids.has(ta.account_id))
        );
      }

      // Talent: filter to own posts + posts targeting accounts they have access to
      if (!isManagerRole && permissionGroup !== 'client' && talentAccountIds && talentAccountIds.length > 0) {
        const accessibleIds = new Set(talentAccountIds);
        result = result.filter(post =>
          post.user_id === user!.id ||
          post.target_accounts?.some((ta: any) => accessibleIds.has(ta.account_id))
        );
      }

      return result;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const createPost = useMutation({
    mutationFn: async (form: ComposerFormData) => {
      const insertData: Record<string, unknown> = {
        user_id: user!.id,
        organization_id: orgId || null,
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
