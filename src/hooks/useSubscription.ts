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
import { supabase } from '@/integrations/supabase/client';

// ─── Helper: invoke subscription-service ───
function invokeSubscriptionService<T = unknown>(action: string, body?: Record<string, unknown>) {
  return invokeEdgeFunction<T>('subscription-service', action, body);
}

// ─── Fallback: query subscription directly from DB ───
async function getSubscriptionFallback(userId: string, organizationId?: string): Promise<PlatformSubscription | null> {
  try {
    let query = supabase
      .from('platform_subscriptions')
      .select('*')
      .in('status', ['active', 'trialing']);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', userId).is('organization_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (error) {
      console.error('[useSubscription] Fallback query error:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      tier: data.tier,
      status: data.status,
      billing_cycle: data.billing_cycle,
      current_price: data.current_price,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end,
      trial_ends_at: data.trial_ends_at,
    } as PlatformSubscription;
  } catch (err) {
    console.error('[useSubscription] Fallback error:', err);
    return null;
  }
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
      try {
        const res = await invokeSubscriptionService<any>('get-status', {
          organization_id: orgId,
        });
        // Edge function returns { has_subscription, subscription?: {...}, tier?, ... }
        if (res?.has_subscription && res.subscription) {
          return res.subscription as PlatformSubscription;
        }
      } catch (err) {
        console.warn('[useSubscription] Edge function failed, using fallback:', err);
      }

      // Fallback: query DB directly if edge function fails or returns no data
      if (user?.id) {
        const fallbackSub = await getSubscriptionFallback(user.id, orgId);
        if (fallbackSub) {
          console.log('[useSubscription] Using fallback subscription:', fallbackSub.tier);
          return fallbackSub;
        }
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

  // ─── Activate Community Starter (free trial for community members) ───
  const activateCommunityStarterMutation = useMutation({
    mutationFn: () =>
      invokeSubscriptionService<{
        success: boolean;
        already_active?: boolean;
        subscription?: any;
        free_months?: number;
        message?: string;
      }>('activate-community-starter', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      if (data.already_active) {
        // Already had subscription, no toast needed
      } else {
        toast.success(data.message || 'Plan Starter activado');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al activar plan de comunidad');
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

    activateCommunityStarter: activateCommunityStarterMutation.mutateAsync,
    isActivatingCommunity: activateCommunityStarterMutation.isPending,

    // Utils
    refetch,
  };
}
