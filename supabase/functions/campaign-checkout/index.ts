// ============================================================================
// KREOON CAMPAIGN CHECKOUT SERVICE
// Edge Function para crear Stripe Checkout Sessions para campañas del marketplace
// Handles currency conversion (COP → USD) using exchange_rates table
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
      case "create-publish-checkout":
        result = await createPublishCheckout(supabase, user.id, body);
        break;
      case "create-bid-checkout":
        result = await createBidCheckout(supabase, user.id, body);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Campaign checkout error:", error?.message, error?.stack);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// CURRENCY CONVERSION HELPER
// ============================================================================

async function convertToUsd(supabase: any, amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === "USD") return amount;

  // Query exchange_rates table directly for the rate
  const { data: rateRow, error } = await supabase
    .from("exchange_rates")
    .select("rate")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", "USD")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[campaign-checkout] Exchange rate query error:`, error.message);
    throw new Error(`No se pudo obtener la tasa de cambio ${fromCurrency} → USD.`);
  }

  if (!rateRow?.rate) {
    throw new Error(`No hay tasa de cambio activa para ${fromCurrency} → USD. Contacta al administrador.`);
  }

  const rate = Number(rateRow.rate);
  const converted = Math.round(amount * rate * 100) / 100; // Round to 2 decimals

  if (converted <= 0) {
    throw new Error(`Conversión inválida: ${amount} ${fromCurrency} × ${rate} = ${converted} USD`);
  }

  console.log(`[campaign-checkout] Converted ${amount} ${fromCurrency} × ${rate} = ${converted.toFixed(2)} USD`);
  return converted;
}

// ============================================================================
// PUBLISH CHECKOUT (Fixed Price campaigns)
// ============================================================================

async function createPublishCheckout(supabase: any, userId: string, body: { campaign_id: string }) {
  const { campaign_id } = body;
  if (!campaign_id) throw new Error("campaign_id is required");

  // Load campaign
  console.log(`[campaign-checkout] Looking up campaign: ${campaign_id} for user: ${userId}`);
  const { data: campaign, error: campErr } = await supabase
    .from("marketplace_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campErr) {
    console.error(`[campaign-checkout] DB error loading campaign ${campaign_id}:`, campErr.message, campErr.code, campErr.details);
    throw new Error(`Campaign query failed: ${campErr.message} (code: ${campErr.code})`);
  }
  if (!campaign) throw new Error("Campaign not found (null data, no error)");
  if (campaign.created_by !== userId) throw new Error("Not authorized");
  if (campaign.pricing_mode !== "fixed") throw new Error("Only fixed pricing campaigns use publish checkout");
  if (campaign.payment_status === "in_escrow") throw new Error("Campaign already paid");

  // Calculate amount in campaign currency
  const contentCount = (campaign.content_requirements || []).reduce(
    (sum: number, r: any) => sum + (r.quantity || 1), 0
  ) || 1;

  let totalCreator: number;
  if (campaign.budget_mode === "per_video" && campaign.budget_per_video) {
    totalCreator = campaign.budget_per_video * contentCount * (campaign.max_creators || 1);
  } else {
    totalCreator = campaign.total_budget || 0;
  }

  if (totalCreator <= 0) throw new Error("Invalid budget amount");

  const commissionRate = campaign.commission_rate || 30;
  const platformFee = totalCreator * commissionRate / 100;
  const chargeAmountLocal = totalCreator + platformFee;
  const campaignCurrency = (campaign.currency || "COP").toUpperCase();

  // Convert to USD for Stripe
  const chargeAmountUsd = await convertToUsd(supabase, chargeAmountLocal, campaignCurrency);
  const totalCreatorUsd = await convertToUsd(supabase, totalCreator, campaignCurrency);
  const platformFeeUsd = chargeAmountUsd - totalCreatorUsd;

  // Get or create wallet + Stripe customer
  const { customerId, walletId } = await getOrCreateCustomer(supabase, userId);

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  // Create Stripe Checkout Session (always in USD)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(chargeAmountUsd * 100),
          product_data: {
            name: `Campaña: ${campaign.title}`,
            description: campaignCurrency !== "USD"
              ? `${campaignCurrency} ${chargeAmountLocal.toLocaleString()} → USD $${chargeAmountUsd.toFixed(2)} (Creadores: $${totalCreatorUsd.toFixed(2)} + Comisión ${commissionRate}%: $${platformFeeUsd.toFixed(2)})`
              : `Creadores: $${totalCreatorUsd.toFixed(2)} + Comisión plataforma (${commissionRate}%): $${platformFeeUsd.toFixed(2)}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "campaign_publish",
      campaign_id,
      user_id: userId,
      wallet_id: walletId,
      commission_rate: String(commissionRate),
      total_creator_payment: String(totalCreatorUsd),
      platform_fee: String(platformFeeUsd),
      original_currency: campaignCurrency,
      original_amount: String(chargeAmountLocal),
    },
    success_url: `${baseUrl}/marketplace/campaign-payment/success?session_id={CHECKOUT_SESSION_ID}&campaign_id=${campaign_id}`,
    cancel_url: `${baseUrl}/marketplace/campaign-payment/cancel?campaign_id=${campaign_id}`,
  });

  // Update campaign payment status
  await supabase
    .from("marketplace_campaigns")
    .update({ payment_status: "pending_payment" })
    .eq("id", campaign_id);

  return {
    success: true,
    checkout_url: session.url,
    session_id: session.id,
  };
}

// ============================================================================
// BID CHECKOUT (Auction/Range after approving creators)
// ============================================================================

async function createBidCheckout(supabase: any, userId: string, body: { campaign_id: string }) {
  const { campaign_id } = body;
  if (!campaign_id) throw new Error("campaign_id is required");

  // Load campaign
  console.log(`[campaign-checkout] Looking up campaign (bid): ${campaign_id} for user: ${userId}`);
  const { data: campaign, error: campErr } = await supabase
    .from("marketplace_campaigns")
    .select("*")
    .eq("id", campaign_id)
    .single();

  if (campErr) {
    console.error(`[campaign-checkout] DB error loading campaign ${campaign_id}:`, campErr.message, campErr.code, campErr.details);
    throw new Error(`Campaign query failed: ${campErr.message} (code: ${campErr.code})`);
  }
  if (!campaign) throw new Error("Campaign not found (null data, no error)");
  if (campaign.created_by !== userId) throw new Error("Not authorized");
  if (!["auction", "range"].includes(campaign.pricing_mode)) {
    throw new Error("Only auction/range campaigns use bid checkout");
  }
  if (campaign.payment_status === "in_escrow") throw new Error("Campaign already paid");

  // Load approved applications
  const { data: approvedApps, error: appsErr } = await supabase
    .from("campaign_applications")
    .select("id, agreed_price, bid_amount, proposed_price")
    .eq("campaign_id", campaign_id)
    .in("status", ["approved", "assigned"]);

  if (appsErr) throw new Error("Error loading applications");
  if (!approvedApps || approvedApps.length === 0) throw new Error("No approved applications found");

  // Sum agreed prices (in campaign currency)
  const totalCreator = approvedApps.reduce((sum: number, app: any) => {
    const price = app.agreed_price ?? app.bid_amount ?? app.proposed_price ?? 0;
    return sum + Number(price);
  }, 0);

  if (totalCreator <= 0) throw new Error("Total amount must be greater than 0");

  const commissionRate = campaign.commission_rate || 30;
  const platformFee = totalCreator * commissionRate / 100;
  const chargeAmountLocal = totalCreator + platformFee;
  const campaignCurrency = (campaign.currency || "COP").toUpperCase();

  // Convert to USD for Stripe
  const chargeAmountUsd = await convertToUsd(supabase, chargeAmountLocal, campaignCurrency);
  const totalCreatorUsd = await convertToUsd(supabase, totalCreator, campaignCurrency);
  const platformFeeUsd = chargeAmountUsd - totalCreatorUsd;

  // Get or create wallet + Stripe customer
  const { customerId, walletId } = await getOrCreateCustomer(supabase, userId);

  const baseUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";

  // Create Stripe Checkout Session (always in USD)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(chargeAmountUsd * 100),
          product_data: {
            name: `Campaña: ${campaign.title}`,
            description: campaignCurrency !== "USD"
              ? `${campaignCurrency} ${chargeAmountLocal.toLocaleString()} → USD $${chargeAmountUsd.toFixed(2)} (${approvedApps.length} creadores: $${totalCreatorUsd.toFixed(2)} + Comisión ${commissionRate}%: $${platformFeeUsd.toFixed(2)})`
              : `${approvedApps.length} creadores: $${totalCreatorUsd.toFixed(2)} + Comisión (${commissionRate}%): $${platformFeeUsd.toFixed(2)}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: "campaign_bid_payment",
      campaign_id,
      user_id: userId,
      wallet_id: walletId,
      commission_rate: String(commissionRate),
      total_creator_payment: String(totalCreatorUsd),
      platform_fee: String(platformFeeUsd),
      approved_count: String(approvedApps.length),
      original_currency: campaignCurrency,
      original_amount: String(chargeAmountLocal),
    },
    success_url: `${baseUrl}/marketplace/campaign-payment/success?session_id={CHECKOUT_SESSION_ID}&campaign_id=${campaign_id}`,
    cancel_url: `${baseUrl}/marketplace/campaign-payment/cancel?campaign_id=${campaign_id}`,
  });

  // Update campaign payment status
  await supabase
    .from("marketplace_campaigns")
    .update({ payment_status: "pending_payment" })
    .eq("id", campaign_id);

  return {
    success: true,
    checkout_url: session.url,
    session_id: session.id,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function getOrCreateCustomer(
  supabase: any,
  userId: string,
): Promise<{ customerId: string; walletId: string }> {
  // Try to find existing wallet
  let { data: wallet } = await supabase
    .from("unified_wallets")
    .select("id, stripe_customer_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!wallet) {
    // Create wallet
    const { data: newWallet, error } = await supabase
      .from("unified_wallets")
      .insert({ user_id: userId, wallet_type: "brand" })
      .select()
      .single();

    if (error) throw new Error(`Failed to create wallet: ${error.message}`);
    wallet = newWallet;
  }

  // Get user profile for Stripe customer creation
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .single();

  let customerId = wallet.stripe_customer_id;

  // Verify existing customer is still valid in Stripe
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      console.warn(`Stripe customer ${customerId} not found, creating new one`);
      customerId = null;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email,
      name: profile?.full_name,
      metadata: {
        user_id: userId,
        wallet_id: wallet.id,
      },
    });

    customerId = customer.id;

    await supabase
      .from("unified_wallets")
      .update({ stripe_customer_id: customerId })
      .eq("id", wallet.id);
  }

  return { customerId, walletId: wallet.id };
}
