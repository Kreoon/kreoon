import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MarketingAdAccount, AdPlatform } from '../types/marketing.types';

export function useAdAccounts() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const orgId = profile?.current_organization_id;

  const {
    data: accounts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['marketing-ad-accounts', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_ad_accounts')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MarketingAdAccount[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const connect = useMutation({
    mutationFn: async (platform: AdPlatform) => {
      const { data, error } = await supabase.functions.invoke('marketing-auth/connect', {
        body: { platform, organization_id: orgId },
      });
      if (error) throw error;
      return data as { auth_url: string };
    },
  });

  const handleCallback = useMutation({
    mutationFn: async (params: { platform: AdPlatform; code: string; state?: string }) => {
      const { data, error } = await supabase.functions.invoke('marketing-auth/callback', {
        body: { ...params, organization_id: orgId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ad-accounts', orgId] });
    },
  });

  const disconnect = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-auth/disconnect', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ad-accounts', orgId] });
    },
  });

  const refresh = useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-auth/refresh', {
        body: { account_id: accountId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-ad-accounts', orgId] });
    },
  });

  const accountsByPlatform = accounts.reduce<Record<AdPlatform, MarketingAdAccount[]>>(
    (acc, account) => {
      if (!acc[account.platform]) acc[account.platform] = [];
      acc[account.platform].push(account);
      return acc;
    },
    {} as Record<AdPlatform, MarketingAdAccount[]>
  );

  return {
    accounts,
    accountsByPlatform,
    isLoading,
    error: error as Error | null,
    refetch,
    connect,
    handleCallback,
    disconnect,
    refresh,
  };
}
