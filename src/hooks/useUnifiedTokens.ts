import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  AITokenBalance,
  AITokenTransaction,
  ConsumeTokensRequest,
  ConsumeTokensResponse,
} from '@/types/unified-finance.types';
import { AI_TOKEN_COSTS, TOKEN_PACKAGES } from '@/lib/finance/constants';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';

// ─── Helper: invoke ai-tokens-service ───
function invokeTokenService<T = unknown>(action: string, body?: Record<string, unknown>) {
  return invokeEdgeFunction<T>('ai-tokens-service', action, body);
}

/**
 * Hook for AI token balance, consumption, and purchase.
 * Connects to the ai-tokens-service edge function.
 */
export function useUnifiedTokens(organizationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['unified-tokens', user?.id, organizationId];

  // ─── Get balance ───
  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey,
    queryFn: () =>
      invokeTokenService<AITokenBalance>('get-balance', {
        organization_id: organizationId,
      }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // ─── Get action costs ───
  const { data: actionCosts } = useQuery({
    queryKey: ['unified-token-costs'],
    queryFn: () => invokeTokenService<Record<string, number>>('get-action-costs'),
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000, // 1 hour — costs rarely change
  });

  // ─── Get purchasable packages ───
  const { data: packages } = useQuery({
    queryKey: ['unified-token-packages'],
    queryFn: () => invokeTokenService<typeof TOKEN_PACKAGES>('get-packages'),
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000,
  });

  // ─── Get transaction history ───
  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['unified-token-history', user?.id, organizationId],
    queryFn: () =>
      invokeTokenService<AITokenTransaction[]>('get-history', {
        organization_id: organizationId,
        limit: 50,
      }),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // ─── Consume tokens ───
  const consumeMutation = useMutation({
    mutationFn: (req: ConsumeTokensRequest) =>
      invokeTokenService<ConsumeTokensResponse>('consume', req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al consumir tokens');
    },
  });

  // ─── Check if user can consume ───
  const checkCanConsume = async (
    actionType: string,
    orgId?: string
  ): Promise<boolean> => {
    try {
      const result = await invokeTokenService<ConsumeTokensResponse>(
        'check-can-consume',
        { action_type: actionType, organization_id: orgId || organizationId }
      );
      return result.success;
    } catch {
      return false;
    }
  };

  // ─── Purchase tokens ───
  const purchaseMutation = useMutation({
    mutationFn: (packageId: string) =>
      invokeTokenService<{ success: boolean; checkout_url?: string; client_secret?: string }>(
        'purchase',
        { package_id: packageId, organization_id: organizationId }
      ),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        queryClient.invalidateQueries({ queryKey });
        toast.success('Tokens comprados exitosamente');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al comprar tokens');
    },
  });

  // ─── Add bonus (admin only) ───
  const addBonusMutation = useMutation({
    mutationFn: (params: { userId?: string; organizationId?: string; amount: number; reason: string }) =>
      invokeTokenService('add-bonus', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Bonus de tokens agregado');
    },
  });

  return {
    // Data
    balance,
    actionCosts: actionCosts || AI_TOKEN_COSTS,
    packages: packages || TOKEN_PACKAGES,
    history: history || [],

    // Loading states
    balanceLoading,
    historyLoading,

    // Actions
    consumeTokens: consumeMutation.mutateAsync,
    isConsuming: consumeMutation.isPending,
    checkCanConsume,
    purchaseTokens: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    addBonus: addBonusMutation.mutateAsync,

    // Utils
    refetchBalance,
    refetchHistory,
    getTokenCost: (action: string) =>
      (actionCosts || AI_TOKEN_COSTS)[action as keyof typeof AI_TOKEN_COSTS] || 40,
  };
}
