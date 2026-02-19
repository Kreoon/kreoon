import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type ConnectStatus = 'not_connected' | 'pending' | 'active' | 'restricted';

interface StripeConnectState {
  status: ConnectStatus;
  accountId: string | null;
}

export function useStripeConnect(walletId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connectState, isLoading } = useQuery({
    queryKey: ['stripe-connect', walletId],
    queryFn: async (): Promise<StripeConnectState> => {
      if (!walletId) return { status: 'not_connected', accountId: null };

      const { data, error } = await supabase
        .from('unified_wallets')
        .select('stripe_connect_account_id, stripe_connect_status')
        .eq('id', walletId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useStripeConnect] Error:', error);
        return { status: 'not_connected' as ConnectStatus, accountId: null };
      }

      return {
        status: (data?.stripe_connect_status as ConnectStatus) || 'not_connected',
        accountId: data?.stripe_connect_account_id || null,
      };
    },
    enabled: !!walletId,
    staleTime: 60 * 1000,
  });

  const startOnboardingMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('wallet-connect', {
        body: {
          action: 'create-account',
          wallet_id: walletId,
        },
      });

      if (error) {
        // Extract actual error message from FunctionsHttpError context
        let msg = error.message;
        try {
          if ('context' in error && (error as any).context?.body) {
            const body = await new Response((error as any).context.body).json();
            msg = body?.error || msg;
          }
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
      }
      if (!data?.url) throw new Error('No onboarding URL returned');
      return data.url as string;
    },
    onSuccess: (url) => {
      queryClient.invalidateQueries({ queryKey: ['stripe-connect', walletId] });
      window.open(url, '_blank');
    },
    onError: (error: Error) => {
      console.error('Stripe Connect onboarding error:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  const getLoginLinkMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('wallet-connect', {
        body: {
          action: 'get-login-link',
          wallet_id: walletId,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No login URL returned');
      return data.url as string;
    },
    onSuccess: (url) => {
      window.open(url, '_blank');
    },
    onError: (error: Error) => {
      console.error('Stripe login link error:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  const refreshOnboardingMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('wallet-connect', {
        body: {
          action: 'refresh-onboarding',
          wallet_id: walletId,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No onboarding URL returned');
      return data.url as string;
    },
    onSuccess: (url) => {
      window.open(url, '_blank');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const refreshStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['stripe-connect', walletId] });
  }, [queryClient, walletId]);

  return {
    connectStatus: connectState?.status || 'not_connected',
    accountId: connectState?.accountId || null,
    isLoading,
    startOnboarding: startOnboardingMutation.mutate,
    isStartingOnboarding: startOnboardingMutation.isPending,
    getLoginLink: getLoginLinkMutation.mutate,
    isGettingLoginLink: getLoginLinkMutation.isPending,
    refreshOnboarding: refreshOnboardingMutation.mutate,
    refreshStatus,
  };
}
