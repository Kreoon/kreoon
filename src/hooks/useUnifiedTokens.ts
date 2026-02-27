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

// ─── Extended balance type with legacy field aliases ───
export type ExtendedAITokenBalance = AITokenBalance & {
  subscription_tokens: number;
  purchased_tokens: number;
  bonus_tokens: number;
};

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
    queryFn: async () => {
      const res = await invokeTokenService<{ success: boolean; balance: AITokenBalance }>(
        'get-balance',
        { organization_id: organizationId }
      );
      if (!res?.success || !res.balance) {
        return null;
      }
      // Normalizar campos para compatibilidad con consumidores legacy
      const b = res.balance;
      return {
        ...b,
        // Alias legacy para ProductDetailDialog y otros consumidores
        subscription_tokens: b.balance_subscription ?? 0,
        purchased_tokens: b.balance_purchased ?? 0,
        bonus_tokens: b.balance_bonus ?? 0,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // ─── Get action costs ───
  const { data: actionCosts } = useQuery({
    queryKey: ['unified-token-costs'],
    queryFn: async () => {
      const res = await invokeTokenService<{ success: boolean; costs: Record<string, any[]>; default_cost: number }>(
        'get-action-costs'
      );
      if (!res?.success) return null;
      // Flatten grouped costs into a flat map for easy lookup
      const flatCosts: Record<string, number> = {};
      for (const category of Object.values(res.costs || {})) {
        for (const item of category) {
          if (item.action && typeof item.tokens === 'number') {
            flatCosts[item.action] = item.tokens;
          }
        }
      }
      flatCosts.default = res.default_cost ?? 40;
      return flatCosts;
    },
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000, // 1 hour — costs rarely change
  });

  // ─── Get purchasable packages ───
  const { data: packages } = useQuery({
    queryKey: ['unified-token-packages'],
    queryFn: async () => {
      const res = await invokeTokenService<{ success: boolean; packages: any[] }>('get-packages');
      return res?.success ? (res.packages || []) : [];
    },
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
    queryFn: async () => {
      const res = await invokeTokenService<{ success: boolean; transactions: AITokenTransaction[] }>(
        'get-history',
        { organization_id: organizationId, limit: 50 }
      );
      return res?.success ? (res.transactions || []) : [];
    },
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
      const result = await invokeTokenService<{ success: boolean; can_consume: boolean }>(
        'check-can-consume',
        { action_type: actionType, organization_id: orgId || organizationId }
      );
      return result?.success && result?.can_consume;
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
