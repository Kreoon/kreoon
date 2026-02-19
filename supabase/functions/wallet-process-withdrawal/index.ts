// ============================================================================
// WALLET PROCESS WITHDRAWAL — Admin processes withdrawal requests
// Supports: Stripe Connect transfer, Mercury Bank wire, manual processing
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
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin role
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { withdrawal_id, status: targetStatus, external_reference, payment_proof_url, rejection_reason } = body;

    // Get withdrawal with wallet info
    const { data: withdrawal, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select(`
        *,
        unified_wallets:wallet_id (
          id, user_id, stripe_connect_account_id, stripe_connect_status
        )
      `)
      .eq("id", withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      return new Response(
        JSON.stringify({ error: "Withdrawal not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["pending", "processing"].includes(withdrawal.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot process withdrawal in status: ${withdrawal.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wallet = withdrawal.unified_wallets;

    // REJECT
    if (targetStatus === "rejected") {
      // Return funds to wallet
      await supabase.rpc("update_wallet_balance", {
        p_wallet_id: wallet.id,
        p_available_delta: withdrawal.amount,
        p_pending_delta: -withdrawal.amount,
      });

      await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          rejection_reason: rejection_reason || "Rechazado por administrador",
          updated_at: new Date().toISOString(),
        })
        .eq("id", withdrawal_id);

      return new Response(
        JSON.stringify({ success: true, status: "rejected" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // APPROVE — try Stripe Connect first
    if (targetStatus === "completed") {
      let transferResult: { method: string; reference: string } | null = null;

      // Option 1: Stripe Connect transfer
      if (wallet.stripe_connect_account_id && wallet.stripe_connect_status === "active") {
        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round(withdrawal.net_amount * 100), // cents
            currency: "usd",
            destination: wallet.stripe_connect_account_id,
            metadata: {
              withdrawal_id,
              kreoon_wallet_id: wallet.id,
            },
          });

          transferResult = {
            method: "stripe_connect",
            reference: transfer.id,
          };
        } catch (stripeErr) {
          console.error("Stripe transfer failed:", stripeErr);
          // Fall through to Mercury or manual
        }
      }

      // Option 2: Mercury Bank (if configured and Stripe failed)
      if (!transferResult) {
        const mercuryToken = Deno.env.get("MERCURY_API_TOKEN");
        const mercuryAccountId = Deno.env.get("MERCURY_ACCOUNT_ID");

        if (mercuryToken && mercuryAccountId && withdrawal.payment_details) {
          try {
            const mercuryResult = await processMercuryPayout(
              mercuryToken,
              mercuryAccountId,
              withdrawal
            );
            if (mercuryResult) {
              transferResult = {
                method: "mercury",
                reference: mercuryResult.id,
              };
            }
          } catch (mercuryErr) {
            console.error("Mercury payout failed:", mercuryErr);
          }
        }
      }

      // Update withdrawal
      const updateData: Record<string, unknown> = {
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (transferResult) {
        // Auto-completed via Stripe or Mercury
        updateData.status = "completed";
        updateData.external_reference = transferResult.reference;
        updateData.payment_proof_url = payment_proof_url || null;

        // Clear pending balance
        await supabase.rpc("update_wallet_balance", {
          p_wallet_id: wallet.id,
          p_pending_delta: -withdrawal.amount,
        });

        // Record transaction
        await supabase.from("unified_transactions").insert({
          wallet_id: wallet.id,
          transaction_type: "withdrawal",
          status: "completed",
          amount: -withdrawal.amount,
          fee_amount: withdrawal.fee,
          description: `Retiro procesado via ${transferResult.method}`,
          external_reference: transferResult.reference,
          processed_at: new Date().toISOString(),
        });
      } else {
        // Mark as processing for manual transfer
        updateData.status = "processing";
        if (external_reference) updateData.external_reference = external_reference;
        if (payment_proof_url) updateData.payment_proof_url = payment_proof_url;
      }

      await supabase
        .from("withdrawal_requests")
        .update(updateData)
        .eq("id", withdrawal_id);

      return new Response(
        JSON.stringify({
          success: true,
          status: updateData.status,
          method: transferResult?.method || "manual",
          reference: transferResult?.reference || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Invalid status: ${targetStatus}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("wallet-process-withdrawal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================================================
// Mercury Bank Payout Helper
// ============================================================================

async function processMercuryPayout(
  apiToken: string,
  accountId: string,
  withdrawal: any
): Promise<{ id: string } | null> {
  const details = withdrawal.payment_details;
  if (!details) return null;

  // Build recipient payload
  const recipientPayload: Record<string, unknown> = {
    name: details.holder_name || "Kreoon Recipient",
    emails: [],
    paymentMethod: "ach",
  };

  if (details.routing_number && details.account_number) {
    recipientPayload.electronicRoutingInfo = {
      accountNumber: details.account_number,
      routingNumber: details.routing_number,
      bankName: details.bank_name || "",
      electronicAccountType: "checking",
    };
  } else if (details.swift_code) {
    recipientPayload.paymentMethod = "wire";
    recipientPayload.domesticWireRoutingInfo = null;
    recipientPayload.internationalWireRoutingInfo = {
      swiftCode: details.swift_code,
      iban: details.iban || "",
      correspondentInfo: null,
    };
    recipientPayload.address = {
      address1: details.holder_address || "",
      city: "",
      region: "",
      postalCode: "",
      country: details.country || "",
    };
  } else {
    // No valid bank details for Mercury
    return null;
  }

  // Create or find recipient
  const recipientRes = await fetch(`https://api.mercury.com/api/v1/recipients`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(recipientPayload),
  });

  if (!recipientRes.ok) {
    const errBody = await recipientRes.text();
    console.error("Mercury recipient creation failed:", errBody);
    return null;
  }

  const recipient = await recipientRes.json();

  // Create transaction
  const txRes = await fetch(
    `https://api.mercury.com/api/v1/account/${accountId}/transactions`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientId: recipient.id,
        amount: withdrawal.net_amount,
        paymentMethod: recipientPayload.paymentMethod,
        idempotencyKey: `kreoon-wd-${withdrawal.id}`,
        note: `Kreoon withdrawal #${withdrawal.id.slice(0, 8)}`,
      }),
    }
  );

  if (!txRes.ok) {
    const errBody = await txRes.text();
    console.error("Mercury transaction failed:", errBody);
    return null;
  }

  return await txRes.json();
}
