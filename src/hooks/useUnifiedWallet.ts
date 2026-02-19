import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UnifiedWallet, UnifiedTransaction } from '@/types/unified-finance.types';

/**
 * Hook for accessing the unified wallet (balance, transactions).
 * Queries unified_wallets and unified_transactions tables directly.
 */
export function useUnifiedWallet(organizationId?: string) {
  const { user } = useAuth();

  // ─── Get user's wallet ───
  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['unified-wallet', user?.id, organizationId],
    queryFn: async (): Promise<UnifiedWallet | null> => {
      const query = (supabase as any)
        .from('unified_wallets')
        .select('*');

      if (organizationId) {
        query.eq('organization_id', organizationId);
      } else {
        query.eq('user_id', user!.id).is('organization_id', null);
      }

      const { data, error } = await query
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useUnifiedWallet] Error:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Get recent transactions ───
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['unified-wallet-transactions', wallet?.id],
    queryFn: async (): Promise<UnifiedTransaction[]> => {
      if (!wallet?.id) return [];

      const { data, error } = await (supabase as any)
        .from('unified_transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[useUnifiedWallet] Transactions error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!wallet?.id,
    staleTime: 2 * 60 * 1000,
  });

  // ─── Derived state ───
  const totalBalance = wallet
    ? wallet.available_balance + wallet.pending_balance
    : 0;

  return {
    wallet,
    transactions,

    walletLoading,
    transactionsLoading,

    totalBalance,
    availableBalance: wallet?.available_balance ?? 0,
    pendingBalance: wallet?.pending_balance ?? 0,
    reservedBalance: wallet?.reserved_balance ?? 0,

    refetchWallet,
    refetchTransactions,
  };
}
