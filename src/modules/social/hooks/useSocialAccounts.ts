import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SocialAccount, SocialPlatform, SocialAccountOwnerType } from '../types/social.types';

interface UseSocialAccountsOptions {
  ownerType?: SocialAccountOwnerType;
  brandId?: string;
  groupId?: string;
}

export function useSocialAccounts(options?: UseSocialAccountsOptions) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: accounts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['social-accounts', user?.id, orgId, options?.ownerType, options?.brandId, options?.groupId],
    queryFn: async () => {
      // If orgId exists, use the v2 RPC for enriched data
      if (orgId) {
        const { data, error } = await supabase.rpc('get_org_social_accounts', {
          p_org_id: orgId,
        });

        if (error) throw error;

        let result = (data || []) as unknown as SocialAccount[];

        // Apply client-side filters
        if (options?.ownerType) {
          result = result.filter(a => a.owner_type === options.ownerType);
        }
        if (options?.brandId) {
          result = result.filter(a => a.brand_id === options.brandId);
        }
        if (options?.groupId) {
          result = result.filter(a =>
            a.groups?.some(g => g.group_id === options.groupId)
          );
        }

        return result;
      }

      // Fallback: personal accounts only
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('is_active', true)
        .order('platform', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SocialAccount[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const connectAccount = useMutation({
    mutationFn: async (input: {
      platform: SocialPlatform;
      owner_type?: SocialAccountOwnerType;
      brand_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('social-auth/connect', {
        body: {
          platform: input.platform,
          organization_id: orgId,
          owner_type: input.owner_type || 'user',
          brand_id: input.brand_id || null,
        },
      });
      if (error) throw error;
      return data as { url: string };
    },
  });

  const disconnectAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('social-auth/disconnect', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  const refreshToken = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('social-auth/refresh', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  // Group accounts by platform
  const accountsByPlatform = accounts.reduce<Record<string, SocialAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = [];
    acc[a.platform].push(a);
    return acc;
  }, {});

  // Group accounts by owner type
  const accountsByOwner = accounts.reduce<Record<string, SocialAccount[]>>((acc, a) => {
    const key = a.owner_type || 'user';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  // Check if token is expired or expiring soon (within 24h)
  const isTokenExpiring = (account: SocialAccount) => {
    if (!account.token_expires_at) return false;
    const expiresAt = new Date(account.token_expires_at).getTime();
    const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
    return expiresAt < oneDayFromNow;
  };

  // Personal accounts (owned by current user directly)
  const personalAccounts = accounts.filter(a => a.owner_type === 'user' && a.user_id === user?.id);
  // Brand accounts
  const brandAccounts = accounts.filter(a => a.owner_type === 'brand');
  // Org-level accounts
  const orgAccounts = accounts.filter(a => a.owner_type === 'organization');

  return {
    accounts,
    accountsByPlatform,
    accountsByOwner,
    personalAccounts,
    brandAccounts,
    orgAccounts,
    isLoading,
    error: error as Error | null,
    refetch,
    connectAccount,
    disconnectAccount,
    refreshToken,
    isTokenExpiring,
  };
}
