// ============================================================================
// KREOON STRIPE WEBHOOK HANDLER
// Edge Function para procesar eventos de Stripe
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fail-loud al arrancar si falta alguno de estos. Sin ellos, los RPCs
// SECURITY DEFINER fallarán con 401 unauthorized (caller_secret check)
// pero retornaríamos 200 al webhook, dejando la BD desincronizada sin
// que nadie se entere. Mejor que el container no arranque.
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const stripeSyncSecret = Deno.env.get("STRIPE_SYNC_SECRET");
if (!supabaseAnonKey) {
  throw new Error("[stripe-webhook] SUPABASE_ANON_KEY env var is required");
}
if (!stripeSyncSecret) {
  throw new Error("[stripe-webhook] STRIPE_SYNC_SECRET env var is required");
}

// Helper para llamar RPCs SECURITY DEFINER. Sortea el bug del SR key
// inyectado erráticamente en edge functions: con anon key + caller secret
// el escrito siempre llega a la BD.
//
// IMPORTANTE: tira excepción ante cualquier error. Los callers DEBEN dejar
// propagar el throw para que el webhook responda 5xx → Stripe reintenta
// con backoff. Tragar errores aquí causaría que la BD quede desincronizada
// silenciosamente mientras Stripe cree que todo está OK.
async function callAcademyRpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[webhook_rpc] ${name} failed ${res.status}`, text.slice(0, 300));
    throw new Error(`webhook_rpc_failed:${name}:${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = { ...getCorsHeaders(req), "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature" };

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
        // Si es suscripción a una academia: además de crear la
        // membresía si falta, sincronizamos su estado activo según
        // el status real de Stripe (past_due, paused, etc → inactivo).
        if ((subscription.metadata as any)?.type === "academy_membership_subscription") {
          await handleAcademyMembershipFromSubscription(supabase, subscription);
          await syncAcademyMembershipStatus(supabase, subscription);
        }
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
        await handleAcademyInvoiceFailed(supabase, invoice);
        break;
      }

      // ========================================
      // PAGOS ÚNICOS (Escrow, Tokens)
      // ========================================

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[checkout.session.completed]', {
          session_id: session.id,
          mode: session.mode,
          payment_status: session.payment_status,
          metadata: session.metadata,
          customer: session.customer,
          subscription: session.subscription,
          amount_total: session.amount_total,
        });
        if (session.metadata?.type?.startsWith("campaign_")) {
          await handleCampaignCheckoutCompleted(supabase, session);
        } else if (session.metadata?.type === "academy_course_purchase") {
          await handleAcademyCoursePurchase(supabase, session);
        } else if (session.metadata?.type === "academy_membership_subscription") {
          await handleAcademyMembershipPurchase(supabase, session);
        } else if (session.metadata?.type === "org_access_purchase") {
          await handleOrgAccessPurchase(supabase, session);
        } else {
          console.warn('[checkout.session.completed] unhandled metadata.type', session.metadata?.type);
        }
        break;
      }

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
        await handleAcademyChargeRefunded(supabase, charge);
        break;
      }

      // Owner desautoriza su cuenta Connect desde Stripe Dashboard.
      // Limpiamos el mapping para que el código caiga a "modo central".
      case "account.application.deauthorized": {
        const account = event.data.object as Stripe.Account;
        await handleConnectAccountDeauthorized(supabase, account);
        break;
      }

      // Customer eliminado en Stripe (caso raro, solo si lo borran
      // a mano). Limpiamos referencias en academy_memberships.
      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleAcademyCustomerDeleted(supabase, customer);
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

  // Desactivar membresía de academia si la subscripción era de tipo academia.
  if ((subscription.metadata as any)?.type === "academy_membership_subscription") {
    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscription.id,
    });
    console.log(`[academy_membership] Deactivated by subscription ${subscription.id}`);
  }
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
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

  // Campaign payments are handled in checkout.session.completed
  if (metadata.type?.startsWith("campaign_")) return;

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
// HELPER: registrar deuda al owner cuando el cobro fue en modo central
// (sin Stripe Connect). KREOON liquida manualmente y marca como pagado
// en pending_owner_payouts vía el panel admin.
// ============================================================================

async function recordOwnerPayoutDebtIfCentral(
  session: Stripe.Checkout.Session,
  invoiceId: string | null,
  sourceType: 'academy_membership_subscription' | 'academy_course_purchase',
  sourceId: string | null,
  ownerUserIdFallback: string | null,
  spaceIdFallback: string | null,
): Promise<void> {
  if (session.metadata?.collection_mode !== 'central') {
    return; // Modo destination → ya hay transfer_data, KREOON solo cobra la fee.
  }

  const ownerUserId = session.metadata?.owner_user_id || ownerUserIdFallback;
  const spaceId = session.metadata?.space_id || spaceIdFallback;
  const feePercent = Number(session.metadata?.platform_fee_percent ?? 10);
  const grossUsd = (session.amount_total ?? 0) / 100;
  const chargeId = session.metadata?.stripe_charge_id ?? null;
  const sessionId = session.id ?? null;
  const currency = (session.currency ?? 'usd').toLowerCase();

  if (!ownerUserId || grossUsd <= 0) {
    console.warn('[record_owner_payout] missing owner or amount', { sessionId, ownerUserId, grossUsd });
    return;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const callerSecret = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';
  if (!supabaseUrl || !anonKey || !callerSecret) {
    console.warn('[record_owner_payout] missing env (url/anon/secret)');
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_owner_payout`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_caller_secret: callerSecret,
        p_owner_user_id: ownerUserId,
        p_space_id: spaceId,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_stripe_session_id: sessionId,
        p_stripe_charge_id: chargeId,
        p_stripe_invoice_id: invoiceId,
        p_gross_amount_usd: grossUsd,
        p_platform_fee_percent: feePercent,
        p_currency: currency,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[record_owner_payout] RPC failed', res.status, txt.slice(0, 300));
    } else {
      console.log(`[record_owner_payout] ✓ registered ${sourceType} for owner ${ownerUserId} (gross $${grossUsd})`);
    }
  } catch (e) {
    console.error('[record_owner_payout] error', e);
  }
}

// ============================================================================
// HANDLERS DE ACADEMY (compra de cursos)
// ============================================================================

async function handleAcademyCoursePurchase(supabase: any, session: Stripe.Checkout.Session) {
  const courseId = session.metadata?.course_id;
  const userId = session.metadata?.user_id;
  const amount = (session.amount_total ?? 0) / 100;

  if (!courseId || !userId) {
    console.warn('[academy_course_purchase] Missing metadata', session.id);
    return;
  }

  // Crear inscripción si no existe
  const { data: existing } = await supabase
    .from('academy_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    console.log(`[academy_course_purchase] User ${userId} already enrolled in ${courseId}`);
    return;
  }

  await supabase.from('academy_enrollments').insert({
    course_id: courseId,
    user_id: userId,
    enrolled_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    amount_paid_usd: amount,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  });

  // Incrementar contador de inscritos (read+write, suficiente para pocos eventos por minuto)
  try {
    const { data: courseRow } = await supabase
      .from('academy_courses')
      .select('enrolled_count')
      .eq('id', courseId)
      .single();
    if (courseRow) {
      await supabase
        .from('academy_courses')
        .update({ enrolled_count: (courseRow.enrolled_count ?? 0) + 1 })
        .eq('id', courseId);
    }
  } catch (e) {
    console.warn('[academy_course_purchase] Could not increment enrolled_count', e);
  }

  console.log(`[academy_course_purchase] ✓ Enrolled user ${userId} in course ${courseId} ($${amount})`);

  // Si fue cobro central, registrar deuda al owner.
  await recordOwnerPayoutDebtIfCentral(
    session,
    null,                              // sin invoice (es one-time)
    'academy_course_purchase',
    courseId,
    null,                              // owner_user_id viene de metadata
    null,                              // space_id viene de metadata
  );
}

// ============================================================================
// HANDLER: crea/activa membresía desde un evento de suscripción
// (cuando checkout.session.completed no llega o no procesa).
// Idempotente — usa stripe_subscription_id como clave.
// ============================================================================

async function handleAcademyMembershipFromSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
) {
  const md = (subscription.metadata as any) ?? {};
  const userId = md.user_id;
  const spaceId = md.space_id;
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

  if (!userId || !spaceId) {
    console.warn("[academy_membership_from_sub] missing metadata", subscription.id, md);
    return;
  }

  const result = await callAcademyRpc('webhook_upsert_academy_membership', {
    p_caller_secret: stripeSyncSecret,
    p_space_id: spaceId,
    p_user_id: userId,
    p_subscription_id: subscriptionId,
    p_customer_id: customerId,
    p_should_be_active: true,
  });
  console.log(`[academy_membership_from_sub] ✓ user=${userId} space=${spaceId} sub=${subscriptionId} action=${result?.action ?? 'unknown'}`);
}

// ============================================================================
// HANDLER: SUSCRIPCIÓN A ACADEMIA DE PAGO (recurrente)
// Crea/activa academy_memberships con role='student' y guarda stripe_subscription_id.
// ============================================================================

async function handleAcademyMembershipPurchase(supabase: any, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const spaceId = session.metadata?.space_id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!userId || !spaceId) {
    console.warn("[academy_membership_subscription] Missing metadata", session.id);
    return;
  }

  const result = await callAcademyRpc('webhook_upsert_academy_membership', {
    p_caller_secret: stripeSyncSecret,
    p_space_id: spaceId,
    p_user_id: userId,
    p_subscription_id: subscriptionId,
    p_customer_id: customerId,
    p_should_be_active: true,
  });
  console.log(`[academy_membership_subscription] ✓ user=${userId} space=${spaceId} sub=${subscriptionId} action=${result?.action ?? 'unknown'}`);

  // Si fue cobro central (sin Connect del owner), registrar deuda
  // del primer cobro. Las renovaciones posteriores también deberían
  // registrar deuda — eso lo manejamos en invoice.payment_succeeded más adelante.
  await recordOwnerPayoutDebtIfCentral(
    session,
    typeof session.invoice === 'string' ? session.invoice : null,
    'academy_membership_subscription',
    subscriptionId,
    null,
    spaceId,
  );

  // Si llegó con cupón gestionado por KREOON, registrar la redención.
  await recordCouponRedemptionIfPresent(
    session.metadata?.kreoon_coupon_id ?? null,
    userId,
    spaceId,
    (session.metadata?.plan as 'monthly' | 'yearly' | undefined) ?? 'monthly',
    subscriptionId,
  );
}

// ============================================================================
// HANDLERS: sincronización del estado activo según ciclo de Stripe.
// Cubrir todos los casos en que la suscripción ya no debería dar acceso:
//   - subscription.updated con status past_due / paused / unpaid / canceled
//   - invoice.payment_failed
//   - charge.refunded total
//   - account.application.deauthorized (cuenta Connect del owner)
//   - customer.deleted (cliente Stripe)
// ============================================================================

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

/**
 * Refleja el estado real de la suscripción en academy_memberships.
 * Si Stripe dice past_due / paused / unpaid → desactivamos.
 * Si vuelve a active → reactivamos.
 */
async function syncAcademyMembershipStatus(_supabase: any, subscription: Stripe.Subscription) {
  const shouldBeActive = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  const md = (subscription.metadata as any) ?? {};
  const userId = md.user_id;
  const spaceId = md.space_id;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  if (userId && spaceId) {
    await callAcademyRpc('webhook_upsert_academy_membership', {
      p_caller_secret: stripeSyncSecret,
      p_space_id: spaceId,
      p_user_id: userId,
      p_subscription_id: subscription.id,
      p_customer_id: customerId,
      p_should_be_active: shouldBeActive,
    });
    console.log(`[academy_sub_status] sub=${subscription.id} status=${subscription.status} → is_active=${shouldBeActive}`);
    return;
  }

  // Sin metadata no podemos resolver la membresía para activarla. Si la
  // suscripción ya no está activa, podemos al menos desactivar por sub_id.
  // Si debería estar activa pero no tenemos metadata, logueamos warning
  // (probablemente sub legacy creada antes de poblar metadata).
  if (!shouldBeActive) {
    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscription.id,
    });
    console.log(`[academy_sub_status] sub=${subscription.id} status=${subscription.status} → deactivated by sub_id (no metadata)`);
  } else {
    console.warn(`[academy_sub_status] sub=${subscription.id} active but missing user_id/space_id metadata — cannot reconcile`);
  }
}

/**
 * Pago fallido de una factura de academia → desactivar.
 * El user puede actualizar tarjeta desde el portal; cuando se cobre,
 * `invoice.payment_succeeded` reactivará si la suscripción vuelve a active.
 */
async function handleAcademyInvoiceFailed(_supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if ((subscription.metadata as any)?.type !== 'academy_membership_subscription') return;

    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscriptionId,
    });
    console.log(`[academy_invoice_failed] Deactivated membership for sub ${subscriptionId}`);
  } catch (e) {
    console.error('[academy_invoice_failed] error', e);
  }
}

/**
 * Refund total de un charge de academia → desactivar la membresía
 * y opcionalmente cancelar la subscription para que no siga cobrando.
 */
async function handleAcademyChargeRefunded(supabase: any, charge: Stripe.Charge) {
  // Reembolso parcial: no desactivamos (el user pagó algo todavía).
  const fullyRefunded = charge.refunded || (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);
  if (!fullyRefunded) return;

  const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : null;
  if (!invoiceId) return;

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if ((subscription.metadata as any)?.type !== 'academy_membership_subscription') return;

    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscriptionId,
    });
    console.log(`[academy_refund] Deactivated membership for sub ${subscriptionId}`);

    // Cancelar la suscripción para que no siga cobrando.
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (e) {
      console.warn('[academy_refund] could not cancel subscription', e);
    }
  } catch (e) {
    console.error('[academy_refund] error', e);
  }
}

/**
 * Owner desautoriza su Connect: limpiamos el mapping para que las
 * próximas suscripciones caigan a modo central (KREOON cobra y debe
 * al owner). Las existentes siguen activas hasta que Stripe las cancele
 * por fallos de transfer.
 */
async function handleConnectAccountDeauthorized(supabase: any, account: Stripe.Account) {
  const accountId = account.id;
  const { error } = await supabase
    .from('stripe_connected_accounts')
    .delete()
    .eq('stripe_account_id', accountId);
  if (error) {
    console.error('[connect_deauth] delete failed', error);
  } else {
    console.log(`[connect_deauth] Removed mapping for ${accountId}`);
  }
}

/**
 * Customer eliminado en Stripe → limpiar referencias y desactivar
 * cualquier membresía con ese customer_id.
 */
async function handleAcademyCustomerDeleted(_supabase: any, customer: Stripe.Customer) {
  const customerId = customer.id;
  await callAcademyRpc('webhook_clear_by_customer', {
    p_caller_secret: stripeSyncSecret,
    p_customer_id: customerId,
  });
  console.log(`[customer_deleted] Cleaned memberships for customer ${customerId}`);
}

// ============================================================================
// HELPER: registrar redención de cupón si la sesión llegó con uno.
// ============================================================================

async function recordCouponRedemptionIfPresent(
  couponId: string | null,
  userId: string | null,
  spaceId: string | null,
  plan: 'monthly' | 'yearly',
  subscriptionId: string | null,
): Promise<void> {
  if (!couponId || !userId || !spaceId) return;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const callerSecret = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';
  if (!supabaseUrl || !anonKey || !callerSecret) return;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_coupon_redemption`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_caller_secret: callerSecret,
        p_coupon_id: couponId,
        p_user_id: userId,
        p_space_id: spaceId,
        p_plan: plan,
        p_stripe_subscription_id: subscriptionId,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn('[coupon_redemption] RPC failed', res.status, txt.slice(0, 200));
    }
  } catch (e) {
    console.warn('[coupon_redemption] error', e);
  }
}

// ============================================================================
// HANDLER: COMPRA DE PLAN AGENCIA (pago único, no recurrente)
// ============================================================================

async function handleOrgAccessPurchase(supabase: any, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const tier = metadata.tier;
  const userId = metadata.user_id || null;
  const organizationId = metadata.organization_id || null;
  const walletId = metadata.wallet_id;
  const amount = (session.amount_total ?? 0) / 100;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!tier || !walletId || (!userId && !organizationId)) {
    console.warn("[org_access_purchase] Missing metadata (tier/wallet/owner)", session.id);
    return;
  }

  // Idempotencia: si ya procesamos este payment_intent, salir
  if (paymentIntentId) {
    const { data: existingTx } = await supabase
      .from("unified_transactions")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .eq("transaction_type", "subscription_payment")
      .limit(1)
      .maybeSingle();
    if (existingTx) {
      console.log(`[org_access_purchase] Payment ${paymentIntentId} already processed, skipping`);
      return;
    }
  }

  const planConfig = await getPlanConfig(supabase, tier);
  const now = new Date();
  // Pago único = acceso permanente (sin renovación)
  const accessEnd = new Date("2099-12-31T23:59:59Z");

  // Buscar suscripción existente del mismo dueño (org o usuario personal)
  let existingQuery = supabase
    .from("platform_subscriptions")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);
  if (organizationId) {
    existingQuery = existingQuery.eq("organization_id", organizationId);
  } else {
    existingQuery = existingQuery.eq("user_id", userId).is("organization_id", null);
  }
  const { data: existingSub } = await existingQuery.maybeSingle();

  const subscriptionData = {
    user_id: organizationId ? null : userId,
    organization_id: organizationId,
    wallet_id: walletId,
    tier,
    status: "active",
    stripe_subscription_id: null,
    stripe_price_id: null,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
    billing_cycle: "one_time",
    current_price: amount,
    price_monthly: planConfig.price_monthly,
    price_annual: planConfig.price_annual,
    current_period_start: now.toISOString(),
    current_period_end: accessEnd.toISOString(),
    trial_ends_at: null,
    cancel_at_period_end: false,
    plan_limits: planConfig.limits,
    metadata: {
      source: "one_time_purchase",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      purchased_at: now.toISOString(),
    },
    updated_at: now.toISOString(),
  };

  if (existingSub) {
    const { error } = await supabase
      .from("platform_subscriptions")
      .update(subscriptionData)
      .eq("id", existingSub.id);
    if (error) {
      console.error("[org_access_purchase] Error updating subscription:", error);
      return;
    }
  } else {
    const { error } = await supabase
      .from("platform_subscriptions")
      .insert(subscriptionData);
    if (error) {
      console.error("[org_access_purchase] Error inserting subscription:", error);
      return;
    }
  }

  // Tokens IA: la asignación mensual se renueva vía cron (reset_expired_token_balances)
  // usando next_reset_at — anclar el primer reset a +30 días
  const nextResetUnix = Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60;
  await updateTokenAllowance(
    supabase,
    { user_id: organizationId ? null : userId, organization_id: organizationId },
    planConfig.ai_tokens_monthly,
    tier,
    nextResetUnix
  );

  // Registrar transacción
  await supabase.from("unified_transactions").insert({
    wallet_id: walletId,
    transaction_type: "subscription_payment",
    status: "completed",
    amount,
    currency: (session.currency || "usd").toUpperCase(),
    stripe_payment_intent_id: paymentIntentId,
    description: `Compra única plan agencia: ${tier}`,
    processed_at: now.toISOString(),
  });

  // Sync organizations (backward compat)
  if (organizationId) {
    await supabase
      .from("organizations")
      .update({
        trial_active: false,
        subscription_status: "active",
        selected_plan: tier,
      })
      .eq("id", organizationId);
  }

  // Comisión de referido: una sola vez (no hay renovaciones)
  await processReferralOneTimeCommission(supabase, {
    user_id: organizationId ? null : userId,
    organization_id: organizationId,
  }, {
    tier,
    amount,
    session_id: session.id,
  });

  console.log(`[org_access_purchase] ✓ Plan ${tier} activado (pago único $${amount}) para ${organizationId || userId}`);
}

async function processReferralOneTimeCommission(
  supabase: any,
  wallet: { user_id: string | null; organization_id: string | null },
  purchase: { tier: string; amount: number; session_id: string }
) {
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

  // Deduplicación por sesión de checkout (la compra es única)
  const sourceKey = `onetime_${purchase.session_id}`;
  const { data: existingEarning } = await supabase
    .from("referral_earnings")
    .select("id")
    .eq("relationship_id", referral.id)
    .eq("source_type", "subscription")
    .eq("source_id", sourceKey)
    .limit(1)
    .maybeSingle();

  if (existingEarning) return;

  const rate = referral.subscription_rate || 0.20;
  const commissionAmount = purchase.amount * rate;
  if (commissionAmount <= 0) return;

  const now = new Date();

  await supabase.from("referral_earnings").insert({
    relationship_id: referral.id,
    referrer_id: referral.referrer_id,
    referrer_wallet_id: referral.referrer_wallet_id,
    source_type: "subscription",
    source_id: sourceKey,
    gross_amount: purchase.amount,
    commission_rate: referral.subscription_rate,
    commission_amount: commissionAmount,
    status: "credited",
    credited_at: now.toISOString(),
  });

  if (referral.referrer_wallet_id) {
    await supabase.rpc("update_wallet_balance", {
      p_wallet_id: referral.referrer_wallet_id,
      p_available_delta: commissionAmount,
      p_earned_delta: commissionAmount,
    });

    await supabase.from("unified_transactions").insert({
      wallet_id: referral.referrer_wallet_id,
      transaction_type: "referral_commission",
      status: "completed",
      amount: commissionAmount,
      referral_id: referral.id,
      description: `Comisión referido: compra única plan ${purchase.tier}`,
      processed_at: now.toISOString(),
    });
  }

  await supabase.rpc("increment_column", {
    p_table: "referral_relationships",
    p_column: "total_subscription_earned",
    p_amount: commissionAmount,
    p_id: referral.id,
  });

  console.log(`[org_access_purchase] Comisión referido $${commissionAmount} acreditada a ${referral.referrer_id}`);
}

// ============================================================================
// HANDLERS DE CAMPAIGN CHECKOUT
// ============================================================================

async function handleCampaignCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {};
  const campaignId = metadata.campaign_id;
  const walletId = metadata.wallet_id;
  const userId = metadata.user_id;
  const commissionRate = Number(metadata.commission_rate) || 30;
  const totalCreatorPayment = Number(metadata.total_creator_payment) || 0;
  const platformFee = Number(metadata.platform_fee) || 0;
  const totalAmount = totalCreatorPayment + platformFee;
  const paymentIntentId = session.payment_intent as string;

  if (!campaignId || !walletId) {
    console.error("Missing campaign_id or wallet_id in session metadata");
    return;
  }

  if (metadata.type === "campaign_publish") {
    // ── Fixed price: activate campaign ──
    // Create escrow hold
    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_holds")
      .insert({
        client_wallet_id: walletId,
        total_amount: totalAmount,
        creator_amount: totalCreatorPayment,
        platform_fee: platformFee,
        commission_rate: commissionRate,
        status: "funded",
        funded_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "succeeded",
        project_title: `Campaign payment`,
        hold_type: "marketplace",
      })
      .select("id")
      .single();

    if (escrowErr) {
      console.error("Error creating escrow:", escrowErr);
      return;
    }

    // Update campaign: activate
    await supabase
      .from("marketplace_campaigns")
      .update({
        status: "active",
        payment_status: "in_escrow",
        escrow_hold_id: escrow.id,
        stripe_payment_intent_id: paymentIntentId,
        activated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Record transaction
    await supabase.from("unified_transactions").insert({
      wallet_id: walletId,
      transaction_type: "escrow_hold",
      status: "completed",
      amount: totalAmount,
      escrow_id: escrow.id,
      stripe_payment_intent_id: paymentIntentId,
      description: `Campaign escrow funded (publish)`,
      processed_at: new Date().toISOString(),
    });

    console.log(`Campaign ${campaignId} activated after publish checkout`);

  } else if (metadata.type === "campaign_bid_payment") {
    // ── Auction/Range: move campaign to in_progress ──
    const { data: escrow, error: escrowErr } = await supabase
      .from("escrow_holds")
      .insert({
        client_wallet_id: walletId,
        total_amount: totalAmount,
        creator_amount: totalCreatorPayment,
        platform_fee: platformFee,
        commission_rate: commissionRate,
        status: "funded",
        funded_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        stripe_payment_status: "succeeded",
        project_title: `Campaign bid payment`,
        hold_type: "marketplace",
      })
      .select("id")
      .single();

    if (escrowErr) {
      console.error("Error creating escrow:", escrowErr);
      return;
    }

    // Update campaign: in_progress
    await supabase
      .from("marketplace_campaigns")
      .update({
        status: "in_progress",
        payment_status: "in_escrow",
        escrow_hold_id: escrow.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", campaignId);

    // Record transaction
    await supabase.from("unified_transactions").insert({
      wallet_id: walletId,
      transaction_type: "escrow_hold",
      status: "completed",
      amount: totalAmount,
      escrow_id: escrow.id,
      stripe_payment_intent_id: paymentIntentId,
      description: `Campaign escrow funded (bid payment)`,
      processed_at: new Date().toISOString(),
    });

    console.log(`Campaign ${campaignId} moved to in_progress after bid checkout`);
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

async function updateTokenAllowance(
  supabase: any,
  wallet: any,
  monthlyTokens: number,
  tier: string,
  currentPeriodEnd?: number // Unix timestamp from Stripe subscription
) {
  const query = wallet.user_id
    ? { user_id: wallet.user_id }
    : { organization_id: wallet.organization_id };

  // Usar current_period_end de Stripe como fecha de próximo reset
  // Esto ancla el ciclo de tokens al ciclo de facturación
  const nextReset = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from("ai_token_balances")
    .update({
      subscription_tier: tier,
      monthly_allowance: monthlyTokens,
      balance_subscription: monthlyTokens,
      last_reset_at: new Date().toISOString(),
      next_reset_at: nextReset.toISOString(),
    })
    .match(query);
}

async function resetMonthlyTokens(supabase: any, walletId: string, nextResetDate?: Date) {
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
    // CORREGIDO: Resetear a monthly_allowance, NO acumular
    // Los tokens del plan se renuevan cada mes, no se acumulan
    const nextReset = nextResetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await supabase
      .from("ai_token_balances")
      .update({
        balance_subscription: balance.monthly_allowance, // Solo el allowance mensual (NO acumulativo)
        last_reset_at: new Date().toISOString(),
        next_reset_at: nextReset.toISOString(),
      })
      .eq("id", balance.id);

    // Registrar reset con el nuevo balance (reseteado, no acumulado)
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
