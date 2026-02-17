import { useCallback } from 'react';
import { useAnalyticsContext } from '../context';
import { BILLING_EVENTS } from '../constants';
import type {
  PlanViewedProps,
  CheckoutProps,
  PaymentProps,
  SubscriptionProps,
  TrialProps,
} from '../types';

export function useBillingAnalytics() {
  const { track, trackConversion } = useAnalyticsContext();

  // ===== PLANS =====

  const trackPricingPageViewed = useCallback(() => {
    track({
      event_name: BILLING_EVENTS.PRICING_PAGE_VIEWED,
      event_category: 'billing',
      properties: {},
    });
  }, [track]);

  const trackPlanViewed = useCallback((props: PlanViewedProps) => {
    track({
      event_name: BILLING_EVENTS.PLAN_VIEWED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  const trackPlanCompared = useCallback((planIds: string[]) => {
    track({
      event_name: BILLING_EVENTS.PLAN_COMPARED,
      event_category: 'billing',
      properties: { plan_ids: planIds, plans_count: planIds.length },
    });
  }, [track]);

  const trackPlanSelected = useCallback((props: PlanViewedProps) => {
    track({
      event_name: BILLING_EVENTS.PLAN_SELECTED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  // ===== CHECKOUT =====

  const trackCheckoutStarted = useCallback((props: CheckoutProps) => {
    track({
      event_name: BILLING_EVENTS.CHECKOUT_STARTED,
      event_category: 'billing',
      properties: { ...props, step_number: 1 },
    });
  }, [track]);

  const trackCheckoutStepCompleted = useCallback((
    props: CheckoutProps & { stepNumber: number; stepName: string }
  ) => {
    track({
      event_name: BILLING_EVENTS.CHECKOUT_STEP_COMPLETED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  const trackCheckoutAbandoned = useCallback((
    props: CheckoutProps & { lastStep: number; abandonReason?: string }
  ) => {
    track({
      event_name: BILLING_EVENTS.CHECKOUT_ABANDONED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  // ===== PAYMENT =====

  const trackPaymentMethodAdded = useCallback((method: string) => {
    track({
      event_name: BILLING_EVENTS.PAYMENT_METHOD_ADDED,
      event_category: 'billing',
      properties: { payment_method: method },
    });
  }, [track]);

  const trackPaymentInitiated = useCallback((props: PaymentProps) => {
    track({
      event_name: BILLING_EVENTS.PAYMENT_INITIATED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  const trackPaymentCompleted = useCallback((props: PaymentProps) => {
    // Track as conversion (high-value event for ads)
    trackConversion({
      type: 'subscription',
      value_usd: props.amount_usd,
      properties: props,
    });

    track({
      event_name: BILLING_EVENTS.PAYMENT_COMPLETED,
      event_category: 'billing',
      properties: props,
    });
  }, [track, trackConversion]);

  const trackPaymentFailed = useCallback((props: PaymentProps & { failureReason: string }) => {
    track({
      event_name: BILLING_EVENTS.PAYMENT_FAILED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  // ===== SUBSCRIPTION =====

  const trackSubscriptionCreated = useCallback((props: SubscriptionProps) => {
    track({
      event_name: BILLING_EVENTS.SUBSCRIPTION_CREATED,
      event_category: 'billing',
      properties: { ...props, action: 'created' },
    });
  }, [track]);

  const trackSubscriptionUpgraded = useCallback((props: SubscriptionProps) => {
    track({
      event_name: BILLING_EVENTS.SUBSCRIPTION_UPGRADED,
      event_category: 'billing',
      properties: { ...props, action: 'upgraded' },
    });
  }, [track]);

  const trackSubscriptionDowngraded = useCallback((props: SubscriptionProps) => {
    track({
      event_name: BILLING_EVENTS.SUBSCRIPTION_DOWNGRADED,
      event_category: 'billing',
      properties: { ...props, action: 'downgraded' },
    });
  }, [track]);

  const trackSubscriptionCancelled = useCallback((
    props: SubscriptionProps & { cancellationReason: string }
  ) => {
    track({
      event_name: BILLING_EVENTS.SUBSCRIPTION_CANCELLED,
      event_category: 'billing',
      properties: { ...props, action: 'cancelled' },
    });
  }, [track]);

  const trackSubscriptionReactivated = useCallback((props: SubscriptionProps) => {
    track({
      event_name: BILLING_EVENTS.SUBSCRIPTION_REACTIVATED,
      event_category: 'billing',
      properties: { ...props, action: 'reactivated' },
    });
  }, [track]);

  // ===== TRIAL =====

  const trackTrialStarted = useCallback((props: TrialProps) => {
    // Track as conversion
    trackConversion({
      type: 'trial_start',
      properties: props,
    });

    track({
      event_name: BILLING_EVENTS.TRIAL_STARTED,
      event_category: 'billing',
      properties: props,
    });
  }, [track, trackConversion]);

  const trackTrialExtended = useCallback((props: TrialProps & { extensionDays: number }) => {
    track({
      event_name: BILLING_EVENTS.TRIAL_EXTENDED,
      event_category: 'billing',
      properties: props,
    });
  }, [track]);

  const trackTrialConverted = useCallback((props: TrialProps) => {
    track({
      event_name: BILLING_EVENTS.TRIAL_CONVERTED,
      event_category: 'billing',
      properties: { ...props, converted: true },
    });
  }, [track]);

  const trackTrialExpired = useCallback((props: TrialProps) => {
    track({
      event_name: BILLING_EVENTS.TRIAL_EXPIRED,
      event_category: 'billing',
      properties: { ...props, converted: false },
    });
  }, [track]);

  // ===== INVOICES =====

  const trackInvoiceViewed = useCallback((invoiceId: string, amountUsd: number) => {
    track({
      event_name: BILLING_EVENTS.INVOICE_VIEWED,
      event_category: 'billing',
      properties: { invoice_id: invoiceId, amount_usd: amountUsd },
    });
  }, [track]);

  const trackInvoiceDownloaded = useCallback((invoiceId: string) => {
    track({
      event_name: BILLING_EVENTS.INVOICE_DOWNLOADED,
      event_category: 'billing',
      properties: { invoice_id: invoiceId },
    });
  }, [track]);

  // ===== USAGE =====

  const trackUsageLimitWarning = useCallback((
    limitType: string,
    usagePercent: number
  ) => {
    track({
      event_name: BILLING_EVENTS.USAGE_LIMIT_WARNING,
      event_category: 'billing',
      properties: { limit_type: limitType, usage_percent: usagePercent },
    });
  }, [track]);

  const trackUsageLimitReached = useCallback((limitType: string) => {
    track({
      event_name: BILLING_EVENTS.USAGE_LIMIT_REACHED,
      event_category: 'billing',
      properties: { limit_type: limitType },
    });
  }, [track]);

  return {
    // Plans
    trackPricingPageViewed,
    trackPlanViewed,
    trackPlanCompared,
    trackPlanSelected,

    // Checkout
    trackCheckoutStarted,
    trackCheckoutStepCompleted,
    trackCheckoutAbandoned,

    // Payment
    trackPaymentMethodAdded,
    trackPaymentInitiated,
    trackPaymentCompleted,
    trackPaymentFailed,

    // Subscription
    trackSubscriptionCreated,
    trackSubscriptionUpgraded,
    trackSubscriptionDowngraded,
    trackSubscriptionCancelled,
    trackSubscriptionReactivated,

    // Trial
    trackTrialStarted,
    trackTrialExtended,
    trackTrialConverted,
    trackTrialExpired,

    // Invoices
    trackInvoiceViewed,
    trackInvoiceDownloaded,

    // Usage
    trackUsageLimitWarning,
    trackUsageLimitReached,
  };
}
