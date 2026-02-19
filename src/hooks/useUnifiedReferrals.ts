import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  ReferralCode,
  ReferralRelationship,
  ReferralEarning,
  ReferralDashboard,
} from '@/types/unified-finance.types';

// ─── Helper: invoke edge function with auth ───
async function invokeReferralService<T = any>(
  action: string,
  body?: Record<string, any>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data, error } = await supabase.functions.invoke(`referral-service/${action}`, {
    body: body || {},
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw new Error(error.message || `Error en ${action}`);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/**
 * Hook for managing the perpetual referral program.
 * Connects to the referral-service edge function.
 */
export function useUnifiedReferrals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ─── Full Dashboard (codes + referrals + earnings + metrics) ───
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ['unified-referral-dashboard', user?.id],
    queryFn: () => invokeReferralService<ReferralDashboard>('get-dashboard'),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── My Referral Codes ───
  const {
    data: codes = [],
    isLoading: codesLoading,
    refetch: refetchCodes,
  } = useQuery({
    queryKey: ['unified-referral-codes', user?.id],
    queryFn: async () => {
      const res = await invokeReferralService<{ codes: ReferralCode[] }>('get-my-codes');
      return res?.codes || [];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  // ─── My Referrals ───
  const {
    data: referrals = [],
    isLoading: referralsLoading,
  } = useQuery({
    queryKey: ['unified-referrals-list', user?.id],
    queryFn: async () => {
      const res = await invokeReferralService<{ referrals: ReferralRelationship[] }>('get-my-referrals');
      return res?.referrals || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── My Earnings ───
  const {
    data: earnings = [],
    isLoading: earningsLoading,
  } = useQuery({
    queryKey: ['unified-referral-earnings', user?.id],
    queryFn: async () => {
      const res = await invokeReferralService<{ earnings: ReferralEarning[] }>('get-my-earnings');
      return res?.earnings || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Generate Code ───
  const generateCodeMutation = useMutation({
    mutationFn: (params?: { targetType?: string }) =>
      invokeReferralService<ReferralCode>('generate-code', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-referral-codes'] });
      queryClient.invalidateQueries({ queryKey: ['unified-referral-dashboard'] });
      toast.success('Código de referido generado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al generar código');
    },
  });

  // ─── Validate Code ───
  const validateCodeMutation = useMutation({
    mutationFn: (code: string) =>
      invokeReferralService<{ valid: boolean; code?: ReferralCode }>('validate-code', { code }),
  });

  // ─── Apply Code ───
  const applyCodeMutation = useMutation({
    mutationFn: (code: string) =>
      invokeReferralService<{ success: boolean }>('apply-code', { code }),
    onSuccess: () => {
      toast.success('Código de referido aplicado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al aplicar código');
    },
  });

  // ─── Track Click ───
  const trackClickMutation = useMutation({
    mutationFn: (code: string) =>
      invokeReferralService('track-click', { code }),
  });

  // ─── Update Slug ───
  const updateSlugMutation = useMutation({
    mutationFn: (params: { code_id: string; new_slug: string }) =>
      invokeReferralService<{ success: boolean; code: string; referral_url: string }>('update-slug', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-referral-codes'] });
      queryClient.invalidateQueries({ queryKey: ['unified-referral-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['referral-gate-status'] });
      toast.success('Slug de referido actualizado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar slug');
    },
  });

  // ─── Withdraw Earnings ───
  const withdrawMutation = useMutation({
    mutationFn: (params: { amount: number; method: string }) =>
      invokeReferralService('withdraw-earnings', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-referral-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['unified-referral-earnings'] });
      toast.success('Solicitud de retiro creada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al solicitar retiro');
    },
  });

  // ─── Derived metrics from dashboard ───
  const metrics = dashboard?.metrics || {
    total_clicks: 0,
    total_registrations: 0,
    conversion_rate: '0%',
    total_referrals: 0,
    active_referrals: 0,
    total_earned: 0,
    this_month_earned: 0,
    available_for_withdrawal: 0,
    by_type: { brand: 0, creator: 0, organization: 0 },
    earnings_by_source: { subscriptions: 0, transactions: 0 },
  };

  return {
    // Data
    dashboard,
    codes,
    referrals,
    earnings,
    metrics,

    // Loading states
    dashboardLoading,
    codesLoading,
    referralsLoading,
    earningsLoading,

    // Actions
    generateCode: generateCodeMutation.mutateAsync,
    isGenerating: generateCodeMutation.isPending,

    validateCode: validateCodeMutation.mutateAsync,
    isValidating: validateCodeMutation.isPending,

    applyCode: applyCodeMutation.mutateAsync,
    isApplying: applyCodeMutation.isPending,

    trackClick: trackClickMutation.mutate,

    updateSlug: updateSlugMutation.mutateAsync,
    isUpdatingSlug: updateSlugMutation.isPending,

    withdrawEarnings: withdrawMutation.mutateAsync,
    isWithdrawing: withdrawMutation.isPending,

    // Utils
    refetchDashboard,
    refetchCodes,
  };
}
