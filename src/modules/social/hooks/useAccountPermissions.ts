import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AccountPermission } from '../types/social.types';

export function useAccountPermissions(accountId?: string) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  // Get permissions for a specific account
  const {
    data: permissions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['social-account-permissions', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_account_permissions')
        .select('*')
        .eq('account_id', accountId!);

      if (error) throw error;
      return (data || []) as unknown as AccountPermission[];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });

  // Get current user's permissions for a specific account
  const {
    data: myPermission,
  } = useQuery({
    queryKey: ['social-my-permission', accountId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_account_permissions')
        .select('*')
        .eq('account_id', accountId!)
        .eq('user_id', user!.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as AccountPermission | null;
    },
    enabled: !!accountId && !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const grantPermission = useMutation({
    mutationFn: async (input: {
      account_id: string;
      user_id: string;
      can_view?: boolean;
      can_post?: boolean;
      can_schedule?: boolean;
      can_analytics?: boolean;
      can_manage?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('social_account_permissions')
        .upsert({
          account_id: input.account_id,
          user_id: input.user_id,
          organization_id: orgId!,
          can_view: input.can_view ?? true,
          can_post: input.can_post ?? false,
          can_schedule: input.can_schedule ?? false,
          can_analytics: input.can_analytics ?? false,
          can_manage: input.can_manage ?? false,
          granted_by: user!.id,
        } as any, { onConflict: 'account_id,user_id' })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AccountPermission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['social-my-permission'] });
    },
  });

  const revokePermission = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from('social_account_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['social-my-permission'] });
    },
  });

  // Helper: check if current user can do something
  const canView = myPermission?.can_view ?? false;
  const canPost = myPermission?.can_post ?? false;
  const canSchedule = myPermission?.can_schedule ?? false;
  const canAnalytics = myPermission?.can_analytics ?? false;
  const canManage = myPermission?.can_manage ?? false;

  return {
    permissions,
    myPermission,
    isLoading,
    error: error as Error | null,
    grantPermission,
    revokePermission,
    canView,
    canPost,
    canSchedule,
    canAnalytics,
    canManage,
  };
}
