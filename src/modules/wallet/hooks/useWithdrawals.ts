import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  WithdrawalRequest,
  WithdrawalDisplay,
  WithdrawalStatus,
  CreateWithdrawalInput,
  ProcessWithdrawalInput,
  toWithdrawalDisplay,
  calculateWithdrawalFee,
} from '../types';

interface UseWithdrawalsOptions {
  walletId?: string;
  status?: WithdrawalStatus[];
  limit?: number;
}

export function useWithdrawals(options: UseWithdrawalsOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { walletId, status, limit = 50 } = options;

  const {
    data: withdrawals,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['withdrawals', user?.id, walletId, status],
    queryFn: async (): Promise<WithdrawalDisplay[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (walletId) {
        query = query.eq('wallet_id', walletId);
      }
      if (status && status.length > 0) {
        query = query.in('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(w => toWithdrawalDisplay(w as WithdrawalRequest));
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const refreshWithdrawals = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['withdrawals', user?.id] });
  }, [queryClient, user?.id]);

  return {
    withdrawals: withdrawals || [],
    isLoading,
    error,
    refetch,
    refreshWithdrawals,
  };
}

// Hook para una solicitud de retiro específica
export function useWithdrawal(withdrawalId: string | null) {
  const {
    data: withdrawal,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['withdrawal', withdrawalId],
    queryFn: async (): Promise<WithdrawalDisplay | null> => {
      if (!withdrawalId) return null;

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          processor:processed_by (
            id,
            full_name,
            email
          )
        `)
        .eq('id', withdrawalId)
        .single();

      if (error) throw error;
      return data ? toWithdrawalDisplay(data as WithdrawalRequest) : null;
    },
    enabled: !!withdrawalId,
    staleTime: 30 * 1000,
  });

  return {
    withdrawal,
    isLoading,
    error,
    refetch,
  };
}

// Mutations para gestión de retiros
export function useWithdrawalMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Crear solicitud de retiro
  const createWithdrawalMutation = useMutation({
    mutationFn: async (input: CreateWithdrawalInput): Promise<string> => {
      if (!user?.id) throw new Error('User not authenticated');

      const fee = calculateWithdrawalFee(input.payment_method, input.amount);

      const { data, error } = await supabase.rpc('create_withdrawal_request', {
        p_wallet_id: input.wallet_id,
        p_user_id: user.id,
        p_amount: input.amount,
        p_payment_method: input.payment_method,
        p_payment_details: input.payment_details,
        p_fee: fee,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Solicitud de retiro creada');
    },
    onError: (error: Error) => {
      console.error('Error creating withdrawal:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Cancelar solicitud de retiro
  const cancelWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string): Promise<boolean> => {
      if (!user?.id) throw new Error('User not authenticated');

      // Primero obtener el retiro para verificar propiedad y estado
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('id', withdrawalId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !withdrawal) {
        throw new Error('No se puede cancelar esta solicitud');
      }

      // Devolver fondos al wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          available_balance: supabase.rpc('increment_balance', {
            wallet_id: withdrawal.wallet_id,
            amount: withdrawal.amount
          }),
          pending_balance: supabase.rpc('decrement_balance', {
            wallet_id: withdrawal.wallet_id,
            amount: withdrawal.amount
          }),
        })
        .eq('id', withdrawal.wallet_id);

      // Alternativa más simple: actualizar directamente
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({ status: 'cancelled' })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // La actualización del wallet se maneja via trigger o edge function
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Solicitud cancelada');
    },
    onError: (error: Error) => {
      console.error('Error cancelling withdrawal:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  return {
    createWithdrawal: createWithdrawalMutation.mutate,
    createWithdrawalAsync: createWithdrawalMutation.mutateAsync,
    isCreating: createWithdrawalMutation.isPending,

    cancelWithdrawal: cancelWithdrawalMutation.mutate,
    isCancelling: cancelWithdrawalMutation.isPending,
  };
}

// Hook para admin - todas las solicitudes pendientes
export function useAdminWithdrawals(options: { status?: WithdrawalStatus[]; limit?: number } = {}) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { status = ['pending', 'processing'], limit = 100 } = options;

  const {
    data: withdrawals,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['withdrawals', 'admin', status],
    queryFn: async (): Promise<WithdrawalDisplay[]> => {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          ),
          wallets:wallet_id (
            id,
            wallet_type,
            available_balance,
            pending_balance
          )
        `)
        .in('status', status)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []).map(w => toWithdrawalDisplay(w as WithdrawalRequest));
    },
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  // Procesar retiro (admin)
  const processWithdrawalMutation = useMutation({
    mutationFn: async (input: ProcessWithdrawalInput): Promise<boolean> => {
      const { data, error } = await supabase.functions.invoke('wallet-process-withdrawal', {
        body: input,
      });

      if (error) throw error;
      return data.success;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success(
        variables.status === 'completed'
          ? 'Retiro procesado exitosamente'
          : 'Retiro rechazado'
      );
    },
    onError: (error: Error) => {
      console.error('Error processing withdrawal:', error);
      toast.error(`Error: ${error.message}`);
    },
  });

  const refreshWithdrawals = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['withdrawals', 'admin'] });
  }, [queryClient]);

  return {
    withdrawals: withdrawals || [],
    isLoading,
    error,
    refetch,
    refreshWithdrawals,
    processWithdrawal: processWithdrawalMutation.mutate,
    isProcessing: processWithdrawalMutation.isPending,
  };
}

// Hook para verificar si hay retiro pendiente
export function usePendingWithdrawal(walletId: string | null) {
  const { user } = useAuth();

  const {
    data: hasPending,
    isLoading,
  } = useQuery({
    queryKey: ['withdrawals', 'pending', walletId],
    queryFn: async (): Promise<boolean> => {
      if (!walletId || !user?.id) return false;

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('id')
        .eq('wallet_id', walletId)
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing'])
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    },
    enabled: !!walletId && !!user?.id,
    staleTime: 30 * 1000,
  });

  return {
    hasPendingWithdrawal: hasPending || false,
    isLoading,
  };
}
