// ============================================================================
// HANDLERS DE SUSCRIPCIONES
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";
import { callAcademyRpc, stripeSyncSecret } from "./_shared.ts";
import {
  getPriceTierMapping,
  getPlanConfig,
  mapStripeStatus,
  updateTokenAllowance,
  processReferralSubscriptionCommission,
} from "./_subscription-helpers.ts";

export async function handleSubscriptionChange(supabase: any, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  // Buscar wallet por stripe_customer_id
  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("id, user_id, organization_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!wallet) {
    console.error("Wallet not found for customer:", customerId);
    return;
  }

  // Mapear price_id a tier (configurar en Stripe Dashboard)
  const tierMapping = await getPriceTierMapping(supabase, priceId);

  // Obtener límites del plan
  const planConfig = await getPlanConfig(supabase, tierMapping.tier);

  // subscription_owner_check: must have EITHER user_id OR organization_id, not both
  const subscriptionData = {
    user_id: wallet.organization_id ? null : wallet.user_id,
    organization_id: wallet.organization_id || null,
    wallet_id: wallet.id,
    tier: tierMapping.tier,
    status: mapStripeStatus(subscription.status),
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    stripe_customer_id: customerId,
    billing_cycle: subscription.items.data[0]?.price.recurring?.interval || "monthly",
    current_price: (subscription.items.data[0]?.price.unit_amount || 0) / 100,
    price_monthly: planConfig.price_monthly,
    price_annual: planConfig.price_annual,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    plan_limits: planConfig.limits,
    updated_at: new Date().toISOString(),
  };

  // Upsert suscripción
  const { error } = await supabase
    .from("platform_subscriptions")
    .upsert(subscriptionData, {
      onConflict: "stripe_subscription_id",
    });

  if (error) {
    console.error("Error updating subscription:", error);
    return;
  }

  // Actualizar tokens mensuales si cambió el plan
  // Pasar current_period_end para sincronizar el ciclo de tokens con el ciclo de Stripe
  await updateTokenAllowance(supabase, wallet, planConfig.ai_tokens_monthly, tierMapping.tier, subscription.current_period_end);

  // Sync organizations table (backward compat with old trial system)
  if (wallet.organization_id && (subscription.status === "active" || subscription.status === "trialing")) {
    await supabase
      .from("organizations")
      .update({
        trial_active: false,
        subscription_status: "active",
        selected_plan: tierMapping.tier,
      })
      .eq("id", wallet.organization_id);
  }

  // Procesar comisión de referido si es nueva suscripción
  if (subscription.status === "active") {
    await processReferralSubscriptionCommission(supabase, wallet, subscriptionData);
  }

  console.log(`Subscription ${subscription.id} updated: ${tierMapping.tier}`);
}

export async function handleSubscriptionCancelled(supabase: any, subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from("platform_subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("Error cancelling subscription:", error);
  }

  // Desactivar membresía de academia si la subscripción era de tipo academia.
  if ((subscription.metadata as any)?.type === "academy_membership_subscription") {
    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscription.id,
    });
    console.log(`[academy_membership] Deactivated by subscription ${subscription.id}`);
  }
}
