// ============================================================================
// HANDLERS DE PAGOS ÚNICOS
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";
import { resetMonthlyTokens } from "./_subscription-helpers.ts";

export async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  // Registrar transacción
  const { data: subscription } = await supabase
    .from("platform_subscriptions")
    .select("wallet_id, tier, current_period_end")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (subscription) {
    await supabase.from("unified_transactions").insert({
      wallet_id: subscription.wallet_id,
      transaction_type: "subscription_payment",
      status: "completed",
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      stripe_payment_intent_id: invoice.payment_intent as string,
      description: `Subscription payment: ${subscription.tier}`,
      processed_at: new Date().toISOString(),
    });

    // Renovar tokens mensuales usando la fecha del próximo ciclo de Stripe
    // current_period_end se actualizó en handleSubscriptionChange al procesar el webhook
    const nextResetDate = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : undefined;
    await resetMonthlyTokens(supabase, subscription.wallet_id, nextResetDate);
  }
}

export async function handleInvoiceFailed(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  await supabase
    .from("platform_subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
}

export async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;

  // Simplificación 2026: los pagos de campañas (metadata.type = "campaign_*")
  // ya no existen; el módulo de campañas del marketplace se eliminó.

  // Determinar tipo de pago por metadata
  if (metadata.type === "escrow") {
    await handleEscrowFunded(supabase, paymentIntent);
  } else if (metadata.type === "tokens") {
    await handleTokenPurchase(supabase, paymentIntent);
  }
}

export async function handleEscrowFunded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const escrowId = paymentIntent.metadata.escrow_id;

  const { error } = await supabase
    .from("escrow_holds")
    .update({
      status: "funded",
      stripe_payment_intent_id: paymentIntent.id,
      stripe_payment_status: "succeeded",
      funded_at: new Date().toISOString(),
    })
    .eq("id", escrowId);

  if (error) {
    console.error("Error updating escrow:", error);
    return;
  }

  // Registrar transacción
  const { data: escrow } = await supabase
    .from("escrow_holds")
    .select("client_wallet_id, total_amount, project_title")
    .eq("id", escrowId)
    .single();

  if (escrow) {
    await supabase.from("unified_transactions").insert({
      wallet_id: escrow.client_wallet_id,
      transaction_type: "escrow_hold",
      status: "completed",
      amount: escrow.total_amount,
      escrow_id: escrowId,
      stripe_payment_intent_id: paymentIntent.id,
      description: `Escrow funded: ${escrow.project_title}`,
      processed_at: new Date().toISOString(),
    });
  }

  console.log(`Escrow ${escrowId} funded successfully`);
}

export async function handleTokenPurchase(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata.user_id;
  const orgId = paymentIntent.metadata.organization_id;
  const tokens = parseInt(paymentIntent.metadata.tokens);
  const packageId = paymentIntent.metadata.package_id;

  // Obtener balance
  const { data: balance } = await supabase
    .from("ai_token_balances")
    .select("id, balance_purchased")
    .eq(orgId ? "organization_id" : "user_id", orgId || userId)
    .single();

  if (!balance) {
    console.error("Token balance not found");
    return;
  }

  // Acreditar tokens atómicamente via RPC
  const { error } = await supabase.rpc("credit_purchased_tokens", {
    p_balance_id: balance.id,
    p_tokens: tokens,
  });

  if (error) {
    console.error("Error crediting tokens:", error);
    return;
  }

  // Registrar transacción de tokens
  await supabase.from("ai_token_transactions").insert({
    balance_id: balance.id,
    transaction_type: "purchase",
    tokens: tokens,
    balance_after: balance.balance_purchased + tokens,
    purchase_amount: paymentIntent.amount / 100,
    stripe_payment_id: paymentIntent.id,
    executed_by: userId,
  });

  console.log(`${tokens} tokens credited to balance ${balance.id}`);
}

export async function handlePaymentIntentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;

  if (metadata.type === "escrow") {
    await supabase
      .from("escrow_holds")
      .update({
        stripe_payment_status: "failed",
      })
      .eq("id", metadata.escrow_id);
  }
}
