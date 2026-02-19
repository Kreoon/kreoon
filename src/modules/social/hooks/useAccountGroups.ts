import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AccountGroup, AccountGroupMember } from '../types/social.types';

export function useAccountGroups() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['social-account-groups', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_account_groups')
        .select(`
          *,
          social_account_group_members(
            id,
            account_id,
            sort_order,
            social_accounts(id, platform, platform_username, platform_display_name, platform_avatar_url, platform_page_name)
          )
        `)
        .eq('organization_id', orgId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((g: any) => ({
        ...g,
        members: (g.social_account_group_members || []).map((m: any) => ({
          id: m.id,
          group_id: g.id,
          account_id: m.account_id,
          sort_order: m.sort_order,
          account: m.social_accounts,
        })),
        account_count: (g.social_account_group_members || []).length,
      })) as AccountGroup[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const createGroup = useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string; icon?: string }) => {
      const { data, error } = await supabase
        .from('social_account_groups')
        .insert({
          organization_id: orgId!,
          name: input.name,
          description: input.description || null,
          color: input.color || '#6366f1',
          icon: input.icon || 'folder',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AccountGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-groups'] });
    },
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccountGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('social_account_groups')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AccountGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-groups'] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('social_account_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-groups'] });
    },
  });

  const addAccountToGroup = useMutation({
    mutationFn: async ({ groupId, accountId }: { groupId: string; accountId: string }) => {
      const { data, error } = await supabase
        .from('social_account_group_members')
        .insert({ group_id: groupId, account_id: accountId } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as AccountGroupMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-groups'] });
    },
  });

  const removeAccountFromGroup = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('social_account_group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-account-groups'] });
    },
  });

  return {
    groups,
    isLoading,
    error: error as Error | null,
    refetch,
    createGroup,
    updateGroup,
    deleteGroup,
    addAccountToGroup,
    removeAccountFromGroup,
  };
}
