// ============================================================================
// HANDLERS DE MARKETPLACE (compra de plan agencia, paquete cliente,
// campaña gestionada, contratación de creador)
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";
import { getPlanConfig, updateTokenAllowance } from "./_subscription-helpers.ts";

// ============================================================================
// HANDLER: COMPRA DE PLAN AGENCIA (pago único, no recurrente)
// ============================================================================

export async function handleOrgAccessPurchase(supabase: any, session: Stripe.Checkout.Session) {
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
// HANDLER: PAGO DE PAQUETE CLIENTE
// ============================================================================

export async function handleClientPackagePaymentCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata || {};

  // Soporte para pago múltiple (package_ids) y simple (package_id)
  const packageIdsRaw = metadata.package_ids || metadata.package_id || "";
  const amountsRaw = metadata.amounts || metadata.amount || "";

  const packageIds = packageIdsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
  const amounts = amountsRaw.split(",").map((s: string) => Number(s.trim()));

  if (packageIds.length === 0) {
    console.error("[stripe-webhook] client_package_payment: missing package_ids");
    return;
  }

  console.log(`[stripe-webhook] Processing client package payment: ${packageIds.length} packages`);

  for (let i = 0; i < packageIds.length; i++) {
    const packageId = packageIds[i];
    const paidAmount = amounts[i] || 0;

    if (!packageId || paidAmount <= 0) continue;

    const { data: pkg, error } = await supabase
      .from("client_packages")
      .select("id, total_value, paid_amount")
      .eq("id", packageId)
      .single();

    if (error || !pkg) {
      console.error(`[stripe-webhook] Package not found: ${packageId}`, error);
      continue;
    }

    const newPaidAmount = Number(pkg.paid_amount) + paidAmount;
    const totalValue = Number(pkg.total_value);
    const newStatus = newPaidAmount >= totalValue ? "paid" : newPaidAmount > 0 ? "partial" : "pending";

    const { error: updateError } = await supabase
      .from("client_packages")
      .update({
        paid_amount: newPaidAmount,
        payment_status: newStatus,
        ...(newStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", packageId);

    if (updateError) {
      console.error(`[stripe-webhook] Error updating package ${packageId}:`, updateError);
    } else {
      console.log(`[stripe-webhook] Package ${packageId}: paid_amount=${newPaidAmount}, status=${newStatus}`);
    }
  }
}

// ============================================================================
// HANDLER: CONTRATACIÓN DE CREADOR
// ============================================================================

export async function handleCreatorHirePaymentCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const meta = session.metadata || {};
  const { service_id, creator_id, buyer_id, brief_title } = meta;

  console.log(`[stripe-webhook] Creator hire payment: service=${service_id} · creator=${creator_id} · buyer=${buyer_id} · session=${session.id}`);

  // Idempotencia: un reintento de Stripe no debe duplicar el proyecto.
  const { data: existingProject } = await supabase
    .from("marketplace_projects")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingProject) {
    console.log(`[stripe-webhook] Hire ya procesado para session ${session.id}, se omite`);
    return;
  }

  if (!service_id) {
    throw new Error(`[stripe-webhook] Creator hire sin service_id en session ${session.id}`);
  }

  // Precio/título del proyecto se toman del servicio real, no del metadata.
  const { data: service, error: svcError } = await supabase
    .from("creator_services")
    .select("id, title, revisions_included")
    .eq("id", service_id)
    .single();

  if (svcError || !service) {
    throw new Error(`[stripe-webhook] Servicio ${service_id} no encontrado para session ${session.id}: ${svcError?.message}`);
  }

  // Monto/moneda autoritativos: los que Stripe efectivamente cobró, no el metadata.
  const totalPrice = (session.amount_total ?? 0) / 100;
  const currency = (session.currency || "usd").toUpperCase();

  const projectData: Record<string, unknown> = {
    title: brief_title || service.title,
    creator_id,
    client_user_id: buyer_id,
    service_id,
    status: "pending",
    payment_status: "paid",
    payment_method: "payment",
    total_price: totalPrice,
    currency,
    revisions_limit: service.revisions_included ?? 2,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string,
    creation_mode: "direct_hire",
    brief: {},
  };

  const { error: insertError } = await supabase.from("marketplace_projects").insert(projectData);
  if (insertError) {
    throw new Error(`[stripe-webhook] Error insertando marketplace_project para session ${session.id}: ${insertError.message}`);
  }

  console.log(`[stripe-webhook] Marketplace project created: title="${projectData.title}" buyer=${buyer_id}`);

  try {
    await supabase.rpc("increment_column", {
      p_table: "creator_services",
      p_column: "orders_count",
      p_amount: 1,
      p_id: service_id,
    });
  } catch {
    // RPC puede no existir
  }
}
