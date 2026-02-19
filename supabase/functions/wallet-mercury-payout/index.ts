// ============================================================================
// WALLET MERCURY PAYOUT — Direct Mercury Bank wire transfers
// Internal/admin-only function for processing bank payouts
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const mercuryToken = Deno.env.get("MERCURY_API_TOKEN") || "";
const mercuryAccountId = Deno.env.get("MERCURY_ACCOUNT_ID") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MERCURY_API = "https://api.mercury.com/api/v1";

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

    // Verify admin
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

    if (!mercuryToken || !mercuryAccountId) {
      return new Response(
        JSON.stringify({ error: "Mercury Bank not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "get-balance": {
        const res = await fetch(`${MERCURY_API}/account/${mercuryAccountId}`, {
          headers: { Authorization: `Bearer ${mercuryToken}` },
        });
        if (!res.ok) throw new Error(`Mercury API error: ${res.status}`);
        const account = await res.json();
        return new Response(
          JSON.stringify({
            available_balance: account.availableBalance,
            current_balance: account.currentBalance,
            account_number: account.accountNumber?.slice(-4),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send-ach": {
        const { recipient_name, account_number, routing_number, amount, note, idempotency_key } = body;

        // Create recipient
        const recipientRes = await fetch(`${MERCURY_API}/recipients`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mercuryToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: recipient_name,
            emails: [],
            paymentMethod: "ach",
            electronicRoutingInfo: {
              accountNumber: account_number,
              routingNumber: routing_number,
              electronicAccountType: "checking",
            },
          }),
        });

        if (!recipientRes.ok) {
          const err = await recipientRes.text();
          throw new Error(`Recipient creation failed: ${err}`);
        }
        const recipient = await recipientRes.json();

        // Send ACH
        const txRes = await fetch(`${MERCURY_API}/account/${mercuryAccountId}/transactions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mercuryToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientId: recipient.id,
            amount,
            paymentMethod: "ach",
            idempotencyKey: idempotency_key,
            note: note || "Kreoon payout",
          }),
        });

        if (!txRes.ok) {
          const err = await txRes.text();
          throw new Error(`ACH transfer failed: ${err}`);
        }
        const tx = await txRes.json();

        return new Response(
          JSON.stringify({ success: true, transaction_id: tx.id, status: tx.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send-wire": {
        const { recipient_name, swift_code, iban, amount, address, note, idempotency_key } = body;

        const recipientRes = await fetch(`${MERCURY_API}/recipients`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mercuryToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: recipient_name,
            emails: [],
            paymentMethod: "wire",
            internationalWireRoutingInfo: {
              swiftCode: swift_code,
              iban: iban || "",
            },
            address: address || {},
          }),
        });

        if (!recipientRes.ok) {
          const err = await recipientRes.text();
          throw new Error(`Recipient creation failed: ${err}`);
        }
        const recipient = await recipientRes.json();

        const txRes = await fetch(`${MERCURY_API}/account/${mercuryAccountId}/transactions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mercuryToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientId: recipient.id,
            amount,
            paymentMethod: "wire",
            idempotencyKey: idempotency_key,
            note: note || "Kreoon international payout",
          }),
        });

        if (!txRes.ok) {
          const err = await txRes.text();
          throw new Error(`Wire transfer failed: ${err}`);
        }
        const tx = await txRes.json();

        return new Response(
          JSON.stringify({ success: true, transaction_id: tx.id, status: tx.status }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-transactions": {
        const { limit = 25, offset = 0 } = body;
        const res = await fetch(
          `${MERCURY_API}/account/${mercuryAccountId}/transactions?limit=${limit}&offset=${offset}`,
          { headers: { Authorization: `Bearer ${mercuryToken}` } }
        );
        if (!res.ok) throw new Error(`Mercury API error: ${res.status}`);
        const data = await res.json();
        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (err) {
    console.error("wallet-mercury-payout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
