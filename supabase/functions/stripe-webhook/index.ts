// ============================================================================
// KREOON STRIPE WEBHOOK HANDLER
// Edge Function para procesar eventos de Stripe
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Missing signature or webhook secret" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      // ========================================
      // SUSCRIPCIONES
      // ========================================
      
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await handleInvoicePaid(supabase, invoice);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(supabase, invoice);
        break;
      }

      // ========================================
      // PAGOS ÚNICOS (Escrow, Tokens)
      // ========================================

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(supabase, paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(supabase, paymentIntent);
        break;
      }

      // ========================================
      // STRIPE CONNECT (Payouts)
      // ========================================

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleConnectAccountUpdated(supabase, account);
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutCompleted(supabase, payout);
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutFailed(supabase, payout);
        break;
      }

      // ========================================
      // REFUNDS
      // ========================================

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(supabase, charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// HANDLERS DE SUSCRIPCIONES
// ============================================================================

async function handleSubscriptionChange(supabase: any, subscription: Stripe.Subscription) {
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
  await updateTokenAllowance(supabase, wallet, planConfig.ai_tokens_monthly, tierMapping.tier);

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

async function handleSubscriptionCancelled(supabase: any, subscription: Stripe.Subscription) {
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
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  // Registrar transacción
  const { data: subscription } = await supabase
    .from("platform_subscriptions")
    .select("wallet_id, tier")
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

    // Renovar tokens mensuales
    await resetMonthlyTokens(supabase, subscription.wallet_id);
  }
}

async function handleInvoiceFailed(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  
  await supabase
    .from("platform_subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);
}

// ============================================================================
// HANDLERS DE PAGOS ÚNICOS
// ============================================================================

async function handlePaymentIntentSucceeded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;
  
  // Determinar tipo de pago por metadata
  if (metadata.type === "escrow") {
    await handleEscrowFunded(supabase, paymentIntent);
  } else if (metadata.type === "tokens") {
    await handleTokenPurchase(supabase, paymentIntent);
  }
}

async function handleEscrowFunded(supabase: any, paymentIntent: Stripe.PaymentIntent) {
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

async function handleTokenPurchase(supabase: any, paymentIntent: Stripe.PaymentIntent) {
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

async function handlePaymentIntentFailed(supabase: any, paymentIntent: Stripe.PaymentIntent) {
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

// ============================================================================
// HANDLERS DE STRIPE CONNECT
// ============================================================================

async function handleConnectAccountUpdated(supabase: any, account: Stripe.Account) {
  const status = account.charges_enabled && account.payouts_enabled 
    ? "active" 
    : account.details_submitted 
      ? "pending" 
      : "restricted";

  await supabase
    .from("unified_wallets")
    .update({
      stripe_connect_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_connect_account_id", account.id);
}

async function handlePayoutCompleted(supabase: any, payout: Stripe.Payout) {
  await supabase
    .from("withdrawal_requests")
    .update({
      status: "completed",
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_payout_id", payout.id);
}

async function handlePayoutFailed(supabase: any, payout: Stripe.Payout) {
  const failureMessage = payout.failure_message || "Payout failed";
  
  await supabase
    .from("withdrawal_requests")
    .update({
      status: "failed",
      rejection_reason: failureMessage,
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_payout_id", payout.id);
}

// ============================================================================
// HANDLERS DE REFUNDS
// ============================================================================

async function handleRefund(supabase: any, charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string;
  
  // Buscar transacción original
  const { data: transaction } = await supabase
    .from("unified_transactions")
    .select("id, wallet_id, amount, escrow_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .single();

  if (transaction) {
    // Registrar refund
    await supabase.from("unified_transactions").insert({
      wallet_id: transaction.wallet_id,
      transaction_type: "refunded",
      status: "completed",
      amount: -transaction.amount,
      escrow_id: transaction.escrow_id,
      related_transaction_id: transaction.id,
      stripe_charge_id: charge.id,
      description: "Refund processed",
      processed_at: new Date().toISOString(),
    });

    // Si es escrow, actualizar estado
    if (transaction.escrow_id) {
      await supabase
        .from("escrow_holds")
        .update({ status: "refunded" })
        .eq("id", transaction.escrow_id);
    }
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function mapStripeStatus(status: string): string {
  const mapping: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "trialing",
    incomplete_expired: "expired",
    paused: "paused",
  };
  return mapping[status] || "active";
}

async function getPriceTierMapping(supabase: any, priceId: string) {
  // Real Stripe Price IDs → tier mapping
  const tierMapping: Record<string, string> = {
    // Marcas Starter ($39/mo, $390/yr)
    [Deno.env.get("STRIPE_PRICE_BRAND_STARTER_MONTHLY") || ""]: "brand_starter",
    [Deno.env.get("STRIPE_PRICE_BRAND_STARTER_ANNUAL") || ""]: "brand_starter",
    // Marcas Pro ($129/mo, $1290/yr)
    [Deno.env.get("STRIPE_PRICE_BRAND_PRO_MONTHLY") || ""]: "brand_pro",
    [Deno.env.get("STRIPE_PRICE_BRAND_PRO_ANNUAL") || ""]: "brand_pro",
    // Marcas Business ($349/mo, $3490/yr)
    [Deno.env.get("STRIPE_PRICE_BRAND_BUSINESS_MONTHLY") || ""]: "brand_business",
    [Deno.env.get("STRIPE_PRICE_BRAND_BUSINESS_ANNUAL") || ""]: "brand_business",
    // Creator Pro ($24/mo, $240/yr)
    [Deno.env.get("STRIPE_PRICE_CREATOR_PRO_MONTHLY") || ""]: "creator_pro",
    [Deno.env.get("STRIPE_PRICE_CREATOR_PRO_ANNUAL") || ""]: "creator_pro",
    // Agency Starter ($249/mo, $2490/yr)
    [Deno.env.get("STRIPE_PRICE_ORG_STARTER_MONTHLY") || ""]: "org_starter",
    [Deno.env.get("STRIPE_PRICE_ORG_STARTER_ANNUAL") || ""]: "org_starter",
    // Agency Pro ($599/mo, $5990/yr)
    [Deno.env.get("STRIPE_PRICE_ORG_PRO_MONTHLY") || ""]: "org_pro",
    [Deno.env.get("STRIPE_PRICE_ORG_PRO_ANNUAL") || ""]: "org_pro",
  };

  // Remove empty key from mapping (if env var is missing)
  delete tierMapping[""];

  // Also check subscription metadata as fallback
  if (!tierMapping[priceId]) {
    console.warn(`Unknown price ID: ${priceId}, falling back to brand_free`);
  }

  return { tier: tierMapping[priceId] || "brand_free" };
}

async function getPlanConfig(supabase: any, tier: string) {
  const { data } = await supabase
    .from("pricing_configuration")
    .select("config_value")
    .in("config_key", ["plans_brand", "plans_creator", "plans_organization"]);

  for (const config of data || []) {
    if (config.config_value[tier]) {
      const plan = config.config_value[tier];
      return {
        price_monthly: plan.price_monthly,
        price_annual: plan.price_annual,
        ai_tokens_monthly: plan.ai_tokens_monthly,
        limits: {
          max_users: plan.max_users,
          max_content_per_month: plan.max_content_per_month,
          ai_tokens_monthly: plan.ai_tokens_monthly,
          storage_gb: plan.storage_gb,
          features: plan.features,
        },
      };
    }
  }

  // Default
  return {
    price_monthly: 0,
    price_annual: 0,
    ai_tokens_monthly: 800,
    limits: { features: [] },
  };
}

async function updateTokenAllowance(supabase: any, wallet: any, monthlyTokens: number, tier: string) {
  const query = wallet.user_id 
    ? { user_id: wallet.user_id }
    : { organization_id: wallet.organization_id };

  await supabase
    .from("ai_token_balances")
    .update({
      subscription_tier: tier,
      monthly_allowance: monthlyTokens,
      balance_subscription: monthlyTokens,
      last_reset_at: new Date().toISOString(),
      next_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .match(query);
}

async function resetMonthlyTokens(supabase: any, walletId: string) {
  const { data: wallet } = await supabase
    .from("unified_wallets")
    .select("user_id, organization_id")
    .eq("id", walletId)
    .single();

  if (!wallet) return;

  const query = wallet.user_id 
    ? { user_id: wallet.user_id }
    : { organization_id: wallet.organization_id };

  const { data: balance } = await supabase
    .from("ai_token_balances")
    .select("id, monthly_allowance, balance_subscription")
    .match(query)
    .single();

  if (balance) {
    // Cumulative: ADD monthly allowance to remaining balance (not replace)
    await supabase
      .from("ai_token_balances")
      .update({
        balance_subscription: (balance.balance_subscription || 0) + balance.monthly_allowance,
        last_reset_at: new Date().toISOString(),
        next_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", balance.id);

    // Registrar reset
    await supabase.from("ai_token_transactions").insert({
      balance_id: balance.id,
      transaction_type: "reset",
      tokens: balance.monthly_allowance,
      balance_after: balance.monthly_allowance,
    });
  }
}

async function processReferralSubscriptionCommission(supabase: any, wallet: any, subscription: any) {
  const referredId = wallet.user_id || wallet.organization_id;
  if (!referredId) return;

  const { data: referral } = await supabase
    .from("referral_relationships")
    .select("id, referrer_id, referrer_wallet_id, subscription_rate, status")
    .eq("referred_id", referredId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!referral) return;

  // Deduplicación: clave única por periodo de facturación (mes/año)
  const now = new Date();
  const periodKey = `${subscription.stripe_subscription_id}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: existingEarning } = await supabase
    .from("referral_earnings")
    .select("id")
    .eq("relationship_id", referral.id)
    .eq("source_type", "subscription")
    .eq("source_id", periodKey)
    .limit(1)
    .maybeSingle();

  if (existingEarning) {
    console.log(`Referral commission already exists for period ${periodKey}, skipping`);
    return;
  }

  // Use tier-based subscription_rate (kept in sync by DB trigger update_user_referral_tier)
  const rate = referral.subscription_rate || 0.20;
  const commissionAmount = subscription.current_price * rate;
  if (commissionAmount <= 0) return;

  // Registrar ganancia con source_id que incluye periodo
  await supabase
    .from("referral_earnings")
    .insert({
      relationship_id: referral.id,
      referrer_id: referral.referrer_id,
      referrer_wallet_id: referral.referrer_wallet_id,
      source_type: "subscription",
      source_id: periodKey,
      gross_amount: subscription.current_price,
      commission_rate: referral.subscription_rate,
      commission_amount: commissionAmount,
      status: "credited",
      credited_at: now.toISOString(),
    });

  // Acreditar al wallet del referidor
  if (referral.referrer_wallet_id) {
    await supabase.rpc("update_wallet_balance", {
      p_wallet_id: referral.referrer_wallet_id,
      p_available_delta: commissionAmount,
      p_earned_delta: commissionAmount,
    });

    // Registrar transacción en wallet del referidor
    await supabase.from("unified_transactions").insert({
      wallet_id: referral.referrer_wallet_id,
      transaction_type: "referral_commission",
      status: "completed",
      amount: commissionAmount,
      referral_id: referral.id,
      description: `Comisión referido: suscripción ${subscription.tier}`,
      processed_at: now.toISOString(),
    });

    // Registrar débito en wallet de plataforma
    const { data: platformWallet } = await supabase
      .from("unified_wallets")
      .select("id")
      .eq("wallet_type", "platform")
      .limit(1)
      .maybeSingle();

    if (platformWallet) {
      await supabase.from("unified_transactions").insert({
        wallet_id: platformWallet.id,
        transaction_type: "referral_commission",
        status: "completed",
        amount: -commissionAmount,
        referral_id: referral.id,
        description: `Pago comisión referido: suscripción ${subscription.tier}`,
        processed_at: now.toISOString(),
      });
    }
  }

  // Actualizar totales atómicamente
  await supabase.rpc("increment_column", {
    p_table: "referral_relationships",
    p_column: "total_subscription_earned",
    p_amount: commissionAmount,
    p_id: referral.id,
  });

  console.log(`Referral commission $${commissionAmount} credited to ${referral.referrer_id} for period ${periodKey}`);
}
