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
import { supabase } from '@/integrations/supabase/client';

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

// ─── Fallback: query directa a la DB si edge function falla ───
async function getBalanceFallback(userId: string, organizationId?: string) {
  try {
    let query = supabase.from('ai_token_balances').select('*');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.warn('[useUnifiedTokens] Fallback query error:', error.message);
      return null;
    }

    if (!data) {
      console.warn('[useUnifiedTokens] No balance found in fallback');
      return null;
    }

    return {
      ...data,
      subscription_tokens: data.balance_subscription ?? 0,
      purchased_tokens: data.balance_purchased ?? 0,
      bonus_tokens: data.balance_bonus ?? 0,
    };
  } catch (err) {
    console.error('[useUnifiedTokens] Fallback error:', err);
    return null;
  }
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
      // Usar fallback directo para evitar errores de token durante refresh de sesión
      // La edge function requiere token válido que puede no estar disponible inmediatamente
      return await getBalanceFallback(user!.id, organizationId);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 min
    retry: false, // No reintentar para evitar spam de errores
  });

  // ─── Get action costs (usar constantes locales para evitar errores de red) ───
  const actionCosts = AI_TOKEN_COSTS;

  // ─── Get purchasable packages (usar constantes locales) ───
  const packages = TOKEN_PACKAGES;

  // ─── Get transaction history (query directa a DB via balance_id) ───
  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['unified-token-history', user?.id, organizationId],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        // Primero obtener el balance_id del usuario
        let balanceQuery = supabase.from('ai_token_balances').select('id');
        if (organizationId) {
          balanceQuery = balanceQuery.eq('organization_id', organizationId);
        } else {
          balanceQuery = balanceQuery.eq('user_id', user.id).is('organization_id', null);
        }
        const { data: balanceData } = await balanceQuery.limit(1).maybeSingle();

        if (!balanceData?.id) return [];

        // Ahora obtener transacciones usando balance_id
        const { data, error } = await supabase
          .from('ai_token_transactions')
          .select('*')
          .eq('balance_id', balanceData.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.warn('[useUnifiedTokens] History query error:', error.message);
          return [];
        }
        return (data || []) as AITokenTransaction[];
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    retry: false,
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
