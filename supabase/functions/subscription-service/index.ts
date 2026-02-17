// ============================================================================
// KREOON SUBSCRIPTION SERVICE
// Edge Function para gestionar suscripciones con Stripe
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeo de tiers a Stripe Price IDs (configurar en variables de entorno)
const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  brand_starter: {
    monthly: Deno.env.get("STRIPE_PRICE_BRAND_STARTER_MONTHLY") || "price_brand_starter_monthly",
    annual: Deno.env.get("STRIPE_PRICE_BRAND_STARTER_ANNUAL") || "price_brand_starter_annual",
  },
  brand_pro: {
    monthly: Deno.env.get("STRIPE_PRICE_BRAND_PRO_MONTHLY") || "price_brand_pro_monthly",
    annual: Deno.env.get("STRIPE_PRICE_BRAND_PRO_ANNUAL") || "price_brand_pro_annual",
  },
  brand_business: {
    monthly: Deno.env.get("STRIPE_PRICE_BRAND_BUSINESS_MONTHLY") || "price_brand_business_monthly",
    annual: Deno.env.get("STRIPE_PRICE_BRAND_BUSINESS_ANNUAL") || "price_brand_business_annual",
  },
  creator_pro: {
    monthly: Deno.env.get("STRIPE_PRICE_CREATOR_PRO_MONTHLY") || "price_creator_pro_monthly",
    annual: Deno.env.get("STRIPE_PRICE_CREATOR_PRO_ANNUAL") || "price_creator_pro_annual",
  },
  org_starter: {
    monthly: Deno.env.get("STRIPE_PRICE_ORG_STARTER_MONTHLY") || "price_org_starter_monthly",
    annual: Deno.env.get("STRIPE_PRICE_ORG_STARTER_ANNUAL") || "price_org_starter_annual",
  },
  org_pro: {
    monthly: Deno.env.get("STRIPE_PRICE_ORG_PRO_MONTHLY") || "price_org_pro_monthly",
    annual: Deno.env.get("STRIPE_PRICE_ORG_PRO_ANNUAL") || "price_org_pro_annual",
  },
};

interface SubscribeRequest {
  tier: string;
  billing_cycle: "monthly" | "annual";
  organization_id?: string;
  referral_code?: string;
}

interface CancelRequest {
  subscription_id: string;
  reason?: string;
  cancel_immediately?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const body = await req.json();

    let result;

    switch (action) {
      case "create-checkout":
        result = await createCheckoutSession(supabase, user.id, body as SubscribeRequest);
        break;
      case "create-portal":
        result = await createPortalSession(supabase, user.id, body.organization_id);
        break;
      case "cancel":
        result = await cancelSubscription(supabase, user.id, body as CancelRequest);
        break;
      case "resume":
        result = await resumeSubscription(supabase, user.id, body.subscription_id);
        break;
      case "change-plan":
        result = await changePlan(supabase, user.id, body);
        break;
      case "get-plans":
        result = await getPlans(supabase);
        break;
      case "get-status":
        result = await getSubscriptionStatus(supabase, user.id, body.organization_id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Subscription error:", error?.message, error?.stack);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack?.split("\n").slice(0, 3).join(" | ") }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// CREAR CHECKOUT SESSION
// ============================================================================

async function createCheckoutSession(supabase: any, userId: string, request: SubscribeRequest) {
  const { tier, billing_cycle, organization_id, referral_code } = request;

  // Validar tier
  if (!PRICE_IDS[tier]) {
    throw new Error(`Invalid tier: ${tier}`);
  }

  const priceId = PRICE_IDS[tier][billing_cycle];
  if (!priceId) {
    throw new Error(`Price not found for ${tier} ${billing_cycle}`);
  }

  // Obtener o crear wallet
  const walletQuery = organization_id 
    ? { organization_id } 
    : { user_id: userId };

  let { data: wallet } = await supabase
    .from("unified_wallets")
    .select("id, stripe_customer_id")
    .match(walletQuery)
    .single();

  if (!wallet) {
    // Crear wallet
    const walletType = tier.startsWith("brand_") 
      ? "brand" 
      : tier.startsWith("creator_") 
        ? "creator" 
        : "organization";

    const { data: newWallet, error } = await supabase
      .from("unified_wallets")
      .insert({
        ...walletQuery,
        wallet_type: walletType,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create wallet: ${error.message}`);
    wallet = newWallet;
  }

  // Obtener datos del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  // Crear o obtener Stripe customer
  let customerId = wallet.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email,
      name: profile?.full_name,
      metadata: {
        user_id: userId,
        organization_id: organization_id || "",
        wallet_id: wallet.id,
      },
    });

    customerId = customer.id;

    await supabase
      .from("unified_wallets")
      .update({ stripe_customer_id: customerId })
      .eq("id", wallet.id);
  }

  // Verificar referido
  let referralRelationshipId = null;
  if (referral_code) {
    const { data: referralCode } = await supabase
      .from("referral_codes")
      .select("user_id, is_active")
      .eq("code", referral_code)
      .eq("is_active", true)
      .single();

    if (referralCode && referralCode.user_id !== userId) {
      // Crear relación de referido si no existe
      const { data: existingRelation } = await supabase
        .from("referral_relationships")
        .select("id")
        .eq("referred_id", userId)
        .single();

      if (!existingRelation) {
        const { data: referrerWallet } = await supabase
          .from("unified_wallets")
          .select("id")
          .eq("user_id", referralCode.user_id)
          .single();

        const { data: newRelation } = await supabase
          .from("referral_relationships")
          .insert({
            referrer_id: referralCode.user_id,
            referrer_wallet_id: referrerWallet?.id,
            referred_id: userId,
            referred_wallet_id: wallet.id,
            referral_code: referral_code,
            referred_type: tier.startsWith("brand_") ? "brand" : tier.startsWith("creator_") ? "creator" : "organization",
          })
          .select()
          .single();

        referralRelationshipId = newRelation?.id;

        // Incrementar conversiones del código atómicamente
        const { data: refCodeRow } = await supabase
          .from("referral_codes")
          .select("id")
          .eq("code", referral_code)
          .single();

        if (refCodeRow) {
          await supabase.rpc("increment_column", {
            p_table: "referral_codes",
            p_column: "registrations",
            p_amount: 1,
            p_id: refCodeRow.id,
          });
        }
      }
    }
  }

  // URL base para redirecciones
  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  // Crear Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: tier.includes("free") ? 0 : 14, // 14 días de trial
      metadata: {
        tier,
        user_id: userId,
        organization_id: organization_id || "",
        wallet_id: wallet.id,
        referral_relationship_id: referralRelationshipId || "",
      },
    },
    success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/subscription/cancel`,
    metadata: {
      tier,
      billing_cycle,
    },
    allow_promotion_codes: true,
  });

  return {
    success: true,
    checkout_url: session.url,
    session_id: session.id,
  };
}

// ============================================================================
// CREAR PORTAL SESSION (Para gestionar suscripción)
// ============================================================================

async function createPortalSession(supabase: any, userId: string, organizationId?: string) {
  // Look up Stripe customer by org wallet first, then user wallet
  let walletQuery = supabase
    .from("unified_wallets")
    .select("stripe_customer_id");

  if (organizationId) {
    walletQuery = walletQuery.eq("organization_id", organizationId);
  } else {
    walletQuery = walletQuery.eq("user_id", userId);
  }

  const { data: wallet } = await walletQuery.limit(1).single();

  if (!wallet?.stripe_customer_id) {
    throw new Error("No Stripe customer found");
  }

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: wallet.stripe_customer_id,
    return_url: `${baseUrl}/settings/billing`,
  });

  return {
    success: true,
    portal_url: session.url,
  };
}

// ============================================================================
// CANCELAR SUSCRIPCIÓN
// ============================================================================

async function cancelSubscription(supabase: any, userId: string, request: CancelRequest) {
  const { subscription_id, reason, cancel_immediately } = request;

  // Verificar que la suscripción pertenece al usuario
  const { data: subscription } = await supabase
    .from("platform_subscriptions")
    .select("stripe_subscription_id, user_id, organization_id")
    .eq("id", subscription_id)
    .single();

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // TODO: Verificar permisos si es organización

  if (cancel_immediately) {
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } else {
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
      metadata: {
        cancellation_reason: reason || "User requested",
      },
    });
  }

  // El webhook actualizará el estado

  return {
    success: true,
    message: cancel_immediately 
      ? "Subscription cancelled immediately" 
      : "Subscription will cancel at end of billing period",
  };
}

// ============================================================================
// REANUDAR SUSCRIPCIÓN
// ============================================================================

async function resumeSubscription(supabase: any, userId: string, subscriptionId: string) {
  const { data: subscription } = await supabase
    .from("platform_subscriptions")
    .select("stripe_subscription_id")
    .eq("id", subscriptionId)
    .single();

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  return {
    success: true,
    message: "Subscription resumed",
  };
}

// ============================================================================
// CAMBIAR PLAN
// ============================================================================

async function changePlan(supabase: any, userId: string, body: any) {
  // Accept both naming conventions from frontend hook
  const tier = body.new_tier || body.tier;
  const billingCycle = body.new_billing_cycle || body.billing_cycle;
  const { subscription_id, organization_id } = body;

  // Look up subscription by ID or by org/user
  let subscriptionQuery = supabase
    .from("platform_subscriptions")
    .select("id, stripe_subscription_id")
    .eq("status", "active");

  if (subscription_id) {
    subscriptionQuery = subscriptionQuery.eq("id", subscription_id);
  } else if (organization_id) {
    subscriptionQuery = subscriptionQuery.eq("organization_id", organization_id);
  } else {
    subscriptionQuery = subscriptionQuery.eq("user_id", userId);
  }

  const { data: subscription } = await subscriptionQuery.limit(1).single();

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const newPriceId = PRICE_IDS[tier]?.[billingCycle];
  if (!newPriceId) {
    throw new Error(`Invalid plan: ${tier} ${billingCycle}`);
  }

  // Obtener suscripción actual de Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
  const currentItemId = stripeSubscription.items.data[0].id;

  // Actualizar suscripción
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    items: [
      {
        id: currentItemId,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations", // Proratear el cambio
    metadata: {
      tier: tier,
    },
  });

  return {
    success: true,
    message: `Plan changed to ${tier}`,
    proration: true,
  };
}

// ============================================================================
// OBTENER PLANES DISPONIBLES
// ============================================================================

async function getPlans(supabase: any) {
  const { data: configs } = await supabase
    .from("pricing_configuration")
    .select("config_key, config_value")
    .in("config_key", ["plans_brand", "plans_creator", "plans_organization"]);

  const plans: Record<string, any> = {};

  for (const config of configs || []) {
    const category = config.config_key.replace("plans_", "");
    plans[category] = config.config_value;
  }

  return {
    success: true,
    plans,
  };
}

// ============================================================================
// OBTENER ESTADO DE SUSCRIPCIÓN
// ============================================================================

async function getSubscriptionStatus(supabase: any, userId: string, organizationId?: string) {
  const query = organizationId 
    ? { organization_id: organizationId }
    : { user_id: userId };

  const { data: subscription } = await supabase
    .from("platform_subscriptions")
    .select(`
      *,
      wallet:unified_wallets(balance_available, stripe_connect_status)
    `)
    .match(query)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!subscription) {
    // Sin suscripción = plan free
    return {
      success: true,
      has_subscription: false,
      tier: userId ? "creator_free" : "brand_free",
      status: "active",
      features: ["browse_marketplace", "basic_ai"],
    };
  }

  // Obtener tokens disponibles
  const tokenQuery = organizationId 
    ? { organization_id: organizationId }
    : { user_id: userId };

  const { data: tokens } = await supabase
    .from("ai_token_balances")
    .select("balance_total, monthly_allowance")
    .match(tokenQuery)
    .single();

  return {
    success: true,
    has_subscription: true,
    subscription: {
      id: subscription.id,
      tier: subscription.tier,
      status: subscription.status,
      billing_cycle: subscription.billing_cycle,
      current_price: subscription.current_price,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_ends_at: subscription.trial_ends_at,
    },
    limits: subscription.plan_limits,
    tokens: {
      available: tokens?.balance_total || 0,
      monthly: tokens?.monthly_allowance || 0,
    },
    wallet: subscription.wallet,
  };
}
