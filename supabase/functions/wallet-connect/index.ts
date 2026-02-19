// ============================================================================
// WALLET CONNECT — Stripe Connect Onboarding & Management
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Config ---
    const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.kreoon.com";

    if (!STRIPE_KEY) {
      console.error("[wallet-connect] STRIPE_SECRET_KEY not set");
      return jsonResponse({ error: "Stripe no está configurado. Contacta al administrador." }, 503);
    }

    console.log("[wallet-connect] STRIPE_KEY present, length:", STRIPE_KEY.length);

    // Init Stripe lazily inside the handler to avoid module-scope errors
    let stripe: Stripe;
    try {
      stripe = new Stripe(STRIPE_KEY, { apiVersion: "2023-10-16" });
    } catch (initErr: any) {
      console.error("[wallet-connect] Stripe init failed:", initErr?.message);
      return jsonResponse({ error: "Error inicializando Stripe: " + (initErr?.message || "unknown") }, 500);
    }

    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[wallet-connect] Auth error:", authError?.message);
      return jsonResponse({ error: "Invalid auth token" }, 401);
    }
    console.log("[wallet-connect] Authenticated user:", user.id);

    // --- Parse body ---
    const body = await req.json();
    const { action, wallet_id } = body;
    console.log("[wallet-connect] Action:", action, "Wallet:", wallet_id);

    if (!wallet_id) {
      return jsonResponse({ error: "wallet_id is required" }, 400);
    }

    // --- Verify wallet ownership ---
    const { data: wallet, error: walletError } = await supabase
      .from("unified_wallets")
      .select("id, user_id, stripe_connect_account_id, stripe_connect_status")
      .eq("id", wallet_id)
      .limit(1)
      .maybeSingle();

    if (walletError) {
      console.error("[wallet-connect] Wallet query error:", walletError.message);
      return jsonResponse({ error: "Error consultando wallet: " + walletError.message }, 500);
    }
    if (!wallet) {
      console.error("[wallet-connect] Wallet not found:", wallet_id);
      return jsonResponse({ error: "Wallet not found" }, 404);
    }
    if (wallet.user_id !== user.id) {
      return jsonResponse({ error: "Not your wallet" }, 403);
    }

    console.log("[wallet-connect] Wallet found. Stripe account:", wallet.stripe_connect_account_id || "none");

    let result: Record<string, unknown>;

    switch (action) {
      case "create-account": {
        if (wallet.stripe_connect_account_id) {
          console.log("[wallet-connect] Account exists, creating onboarding link for:", wallet.stripe_connect_account_id);
          const link = await stripe.accountLinks.create({
            account: wallet.stripe_connect_account_id,
            refresh_url: `${frontendUrl}/wallet?tab=payment-methods&stripe=refresh`,
            return_url: `${frontendUrl}/wallet?tab=payment-methods&stripe=complete`,
            type: "account_onboarding",
          });
          result = { url: link.url, account_id: wallet.stripe_connect_account_id };
          break;
        }

        console.log("[wallet-connect] Creating new Stripe Express account for:", user.email);
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          metadata: {
            kreoon_wallet_id: wallet_id,
            kreoon_user_id: user.id,
          },
          capabilities: {
            transfers: { requested: true },
          },
        });
        console.log("[wallet-connect] Account created:", account.id);

        // Save account ID to wallet
        const { error: updateErr } = await supabase
          .from("unified_wallets")
          .update({
            stripe_connect_account_id: account.id,
            stripe_connect_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", wallet_id);

        if (updateErr) {
          console.error("[wallet-connect] Failed to save account to wallet:", updateErr.message);
        }

        // Create onboarding link
        console.log("[wallet-connect] Creating onboarding link for:", account.id);
        const link = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${frontendUrl}/wallet?tab=payment-methods&stripe=refresh`,
          return_url: `${frontendUrl}/wallet?tab=payment-methods&stripe=complete`,
          type: "account_onboarding",
        });

        result = { url: link.url, account_id: account.id };
        break;
      }

      case "get-status": {
        result = {
          status: wallet.stripe_connect_status || "not_connected",
          account_id: wallet.stripe_connect_account_id,
        };
        break;
      }

      case "get-login-link": {
        if (!wallet.stripe_connect_account_id) {
          return jsonResponse({ error: "No Stripe Connect account" }, 400);
        }
        const loginLink = await stripe.accounts.createLoginLink(
          wallet.stripe_connect_account_id
        );
        result = { url: loginLink.url };
        break;
      }

      case "refresh-onboarding": {
        if (!wallet.stripe_connect_account_id) {
          return jsonResponse({ error: "No Stripe Connect account" }, 400);
        }
        const refreshLink = await stripe.accountLinks.create({
          account: wallet.stripe_connect_account_id,
          refresh_url: `${frontendUrl}/wallet?tab=payment-methods&stripe=refresh`,
          return_url: `${frontendUrl}/wallet?tab=payment-methods&stripe=complete`,
          type: "account_onboarding",
        });
        result = { url: refreshLink.url };
        break;
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    console.log("[wallet-connect] Success for action:", action);
    return jsonResponse(result);

  } catch (err: any) {
    // Stripe errors have a `type` and `raw` property
    const stripeType = err?.type || "";
    const stripeCode = err?.code || "";
    const msg = err?.message || "Unknown error";
    console.error("[wallet-connect] CAUGHT ERROR:", JSON.stringify({
      message: msg,
      type: stripeType,
      code: stripeCode,
      stack: err?.stack?.substring(0, 500),
    }));
    return jsonResponse({
      error: msg,
      stripe_type: stripeType || undefined,
      stripe_code: stripeCode || undefined,
    }, 500);
  }
});
