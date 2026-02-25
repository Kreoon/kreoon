import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { REFERRAL_TIERS, REFERRAL_TIER_ORDER, type ReferralTierKey } from '@/lib/finance/constants';
import type {
  ReferralCode,
  ReferralRelationship,
  ReferralEarning,
  ReferralDashboard,
  ReferralTier,
  ReferralLeaderboardEntry,
  PromotionalCampaign,
  NurtureStatus,
} from '@/types/unified-finance.types';
import { invokeEdgeFunction, invokeEdgeFunctionPublic } from '@/lib/invokeEdgeFunction';

// ─── Helpers: invoke referral-service ───
function invokeReferralService<T = unknown>(action: string, body?: Record<string, unknown>) {
  return invokeEdgeFunction<T>('referral-service', action, body);
}

function invokeReferralServicePublic<T = unknown>(action: string, body?: Record<string, unknown>) {
  return invokeEdgeFunctionPublic<T>('referral-service', action, body);
}

/**
 * Hook for managing the perpetual referral program.
 * Connects to the referral-service edge function.
 */
export function useUnifiedReferrals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ─── Full Dashboard (codes + referrals + earnings + metrics + tier + promo) ───
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

  // ─── Referral Tiers (public, long cache) ───
  const {
    data: tiers = [],
  } = useQuery({
    queryKey: ['referral-tiers'],
    queryFn: async () => {
      const res = await invokeReferralServicePublic<{ tiers: ReferralTier[] }>('get-tiers');
      return res?.tiers || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // ─── Referral Leaderboard (public, moderate cache) ───
  const currentMonth = new Date().toISOString().slice(0, 7);
  const {
    data: leaderboard = [],
    isLoading: leaderboardLoading,
  } = useQuery({
    queryKey: ['referral-leaderboard', currentMonth],
    queryFn: async () => {
      const res = await invokeReferralServicePublic<{ leaderboard: ReferralLeaderboardEntry[] }>(
        'get-leaderboard', { month: currentMonth }
      );
      return res?.leaderboard || [];
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // ─── Active Promotional Campaigns (public) ───
  const {
    data: activePromos = [],
  } = useQuery({
    queryKey: ['referral-active-promos'],
    queryFn: async () => {
      const res = await invokeReferralServicePublic<{ campaigns: PromotionalCampaign[] }>('get-promo-campaigns');
      return res?.campaigns || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ─── Nurture Status (authenticated) ───
  const {
    data: nurtureStatus,
  } = useQuery({
    queryKey: ['referral-nurture-status', user?.id],
    queryFn: () => invokeReferralService<NurtureStatus>('check-nurture'),
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
      toast.success('Codigo de referido generado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al generar codigo');
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
      toast.success('Codigo de referido aplicado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al aplicar codigo');
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

  // ─── Derived tier info ───
  const currentTierKey = (dashboard?.tier?.current || 'starter') as ReferralTierKey;
  const currentTier = REFERRAL_TIERS[currentTierKey] || REFERRAL_TIERS.starter;
  const currentTierIndex = REFERRAL_TIER_ORDER.indexOf(currentTierKey);
  const nextTierKey = currentTierIndex < REFERRAL_TIER_ORDER.length - 1
    ? REFERRAL_TIER_ORDER[currentTierIndex + 1]
    : null;
  const nextTier = nextTierKey ? REFERRAL_TIERS[nextTierKey] : null;

  const effectiveRate = dashboard?.tier?.effective_rate ?? currentTier.effectiveRate;
  const activePromo = activePromos.length > 0 ? activePromos[0] : null;

  return {
    // Data
    dashboard,
    codes,
    referrals,
    earnings,
    metrics,
    tiers,
    leaderboard,
    leaderboardLoading,
    activePromos,
    activePromo,
    nurtureStatus,

    // Tier derived
    currentTierKey,
    currentTier,
    nextTierKey,
    nextTier,
    effectiveRate,

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
