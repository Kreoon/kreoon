import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  PlatformSubscription,
  SubscriptionTier,
  BillingCycle,
  SubscribeRequest,
  CheckoutResponse,
} from '@/types/unified-finance.types';
import { PLANS } from '@/lib/finance/constants';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';

// ─── Helper: invoke subscription-service ───
function invokeSubscriptionService<T = unknown>(action: string, body?: Record<string, unknown>) {
  return invokeEdgeFunction<T>('subscription-service', action, body);
}

/**
 * Hook for managing platform subscriptions.
 * Connects to the subscription-service edge function.
 */
export function useSubscription(organizationId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // null = explicitly user-level (no org), undefined = default
  const orgId = organizationId === null ? undefined : organizationId;
  const queryKey = ['subscription', user?.id, orgId];

  // ─── Get current subscription status ───
  const {
    data: subscription,
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<PlatformSubscription | null> => {
      const res = await invokeSubscriptionService<any>('get-status', {
        organization_id: orgId,
      });
      // Edge function returns { has_subscription, subscription?: {...}, tier?, ... }
      if (res?.has_subscription && res.subscription) {
        return res.subscription as PlatformSubscription;
      }
      // No subscription → return null (free tier)
      return null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Get available plans ───
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => invokeSubscriptionService<typeof PLANS>('get-plans'),
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000,
  });

  // ─── Create Checkout Session (redirect to Stripe) ───
  const checkoutMutation = useMutation({
    mutationFn: (req: SubscribeRequest) =>
      invokeSubscriptionService<CheckoutResponse>('create-checkout', req),
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear checkout');
    },
  });

  // ─── Open Billing Portal ───
  const portalMutation = useMutation({
    mutationFn: () =>
      invokeSubscriptionService<{ portal_url: string }>('create-portal', {
        organization_id: orgId,
      }),
    onSuccess: (data) => {
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al abrir portal de facturación');
    },
  });

  // ─── Cancel Subscription ───
  const cancelMutation = useMutation({
    mutationFn: (params: { reason?: string; cancelImmediately?: boolean }) =>
      invokeSubscriptionService('cancel', {
        subscription_id: subscription?.id,
        reason: params.reason,
        cancel_immediately: params.cancelImmediately,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Suscripción cancelada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al cancelar suscripción');
    },
  });

  // ─── Resume Subscription ───
  const resumeMutation = useMutation({
    mutationFn: () =>
      invokeSubscriptionService('resume', {
        subscription_id: subscription?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Suscripción reanudada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al reanudar suscripción');
    },
  });

  // ─── Change Plan ───
  const changePlanMutation = useMutation({
    mutationFn: (params: { tier: SubscriptionTier; billingCycle: BillingCycle }) =>
      invokeSubscriptionService('change-plan', {
        tier: params.tier,
        billing_cycle: params.billingCycle,
        organization_id: orgId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Plan actualizado');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al cambiar plan');
    },
  });

  // ─── Derived state ───
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isFree = !subscription || (subscription.tier && subscription.tier.endsWith('_free')) || false;
  const isPastDue = subscription?.status === 'past_due';
  const isCancelling = subscription?.cancel_at_period_end === true;
  const currentTier = subscription?.tier || 'brand_free';
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;

  return {
    // Data
    subscription,
    plans: plans || PLANS,
    currentTier,

    // Status flags
    isLoading,
    isActive,
    isFree,
    isPastDue,
    isCancelling,
    periodEnd,

    // Actions
    createCheckout: (tier: SubscriptionTier, billingCycle: BillingCycle, referralCode?: string) =>
      checkoutMutation.mutateAsync({
        tier,
        billing_cycle: billingCycle,
        organization_id: orgId,
        referral_code: referralCode,
      }),
    isCheckingOut: checkoutMutation.isPending,

    openBillingPortal: portalMutation.mutateAsync,
    isOpeningPortal: portalMutation.isPending,

    cancelSubscription: cancelMutation.mutateAsync,
    isCancellingSubscription: cancelMutation.isPending,

    resumeSubscription: resumeMutation.mutateAsync,
    isResuming: resumeMutation.isPending,

    changePlan: changePlanMutation.mutateAsync,
    isChangingPlan: changePlanMutation.isPending,

    // Utils
    refetch,
  };
}
