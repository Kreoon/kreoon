import { useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  WalletTransaction,
  TransactionDisplay,
  TransactionFilters,
  TransactionType,
  TransactionStatus,
  toTransactionDisplay,
} from '../types';
import type { Currency } from '../types/wallet.types';

interface UseTransactionsOptions {
  walletId: string | null;
  filters?: TransactionFilters;
  pageSize?: number;
}

export function useTransactions(options: UseTransactionsOptions) {
  const { walletId, filters, pageSize = 20 } = options;
  const queryClient = useQueryClient();

  // Query para obtener transacciones paginadas
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['transactions', walletId, filters],
    queryFn: async ({ pageParam = 0 }): Promise<{ transactions: WalletTransaction[]; nextPage: number | null }> => {
      if (!walletId) return { transactions: [], nextPage: null };

      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + pageSize - 1);

      // Aplicar filtros
      if (filters?.types && filters.types.length > 0) {
        query = query.in('transaction_type', filters.types);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters?.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }
      if (filters?.referenceType) {
        query = query.eq('reference_type', filters.referenceType);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transactions = (data || []) as WalletTransaction[];
      const nextPage = transactions.length === pageSize ? pageParam + pageSize : null;

      return { transactions, nextPage };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!walletId,
    staleTime: 30 * 1000,
  });

  // Aplanar todas las transacciones de todas las páginas
  const transactions: WalletTransaction[] = data?.pages.flatMap(page => page.transactions) || [];

  // Función para refrescar
  const refreshTransactions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
  }, [queryClient, walletId]);

  return {
    transactions,
    isLoading,
    error,
    refetch,
    refreshTransactions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

// Hook para obtener transacciones recientes (para dashboard)
export function useRecentTransactions(walletId: string | null, limit: number = 5, currency: Currency = 'USD') {
  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transactions', 'recent', walletId, limit],
    queryFn: async (): Promise<TransactionDisplay[]> => {
      if (!walletId) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(t => toTransactionDisplay(t as WalletTransaction, currency));
    },
    enabled: !!walletId,
    staleTime: 30 * 1000,
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
  };
}

// Hook para estadísticas de transacciones
export function useTransactionStats(walletId: string | null, period: 'week' | 'month' | 'year' = 'month') {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['transactions', 'stats', walletId, period],
    queryFn: async () => {
      if (!walletId) return null;

      // Calcular fecha de inicio según período
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('transaction_type, amount, status')
        .eq('wallet_id', walletId)
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const transactions = (data || []) as Array<{
        transaction_type: TransactionType;
        amount: number;
        status: TransactionStatus;
      }>;

      // Calcular estadísticas
      let totalIncome = 0;
      let totalExpense = 0;
      const byType: Record<string, number> = {};

      transactions.forEach(t => {
        byType[t.transaction_type] = (byType[t.transaction_type] || 0) + t.amount;

        if (['deposit', 'transfer_in', 'escrow_release', 'escrow_refund', 'payment_received'].includes(t.transaction_type)) {
          totalIncome += t.amount;
        } else {
          totalExpense += t.amount;
        }
      });

      return {
        totalIncome,
        totalExpense,
        netChange: totalIncome - totalExpense,
        transactionCount: transactions.length,
        byType,
        period,
      };
    },
    enabled: !!walletId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats,
    isLoading,
    error,
  };
}
