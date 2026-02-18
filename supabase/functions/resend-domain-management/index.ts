/**
 * Resend Domain Management — Enterprise White-Label
 *
 * Manages custom email sending domains via Resend API.
 * Only org owners on enterprise plans can manage domains.
 *
 * POST /resend-domain-management
 * Body: { organization_id, action: "add-domain"|"get-dns-records"|"verify-domain"|"remove-domain", domain?: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_BASE = "https://api.resend.com";

async function resendFetch(path: string, options: RequestInit = {}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch(`${RESEND_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, action, domain } = await req.json();

    if (!organization_id || !action) {
      return new Response(JSON.stringify({ error: "organization_id and action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is org owner
    const { data: member } = await adminClient
      .from("organization_members")
      .select("is_owner")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];
    if (!member?.is_owner && !ROOT_EMAILS.includes(user.email || "")) {
      return new Response(JSON.stringify({ error: "Only org owners can manage email domains" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify enterprise plan
    const { data: org } = await adminClient
      .from("organizations")
      .select("selected_plan, resend_domain_id, resend_domain_verified, sender_email")
      .eq("id", organization_id)
      .single();

    if (!org || org.selected_plan !== "enterprise") {
      return new Response(JSON.stringify({ error: "Custom email domains require enterprise plan" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    switch (action) {
      case "add-domain": {
        if (!domain) return json({ error: "domain required" }, 400);

        const result = await resendFetch("/domains", {
          method: "POST",
          body: JSON.stringify({ name: domain }),
        });

        // Save domain ID
        await adminClient
          .from("organizations")
          .update({
            resend_domain_id: result.id,
            resend_domain_verified: false,
            sender_email: `noreply@${domain}`,
          })
          .eq("id", organization_id);

        return json({
          success: true,
          domain_id: result.id,
          status: result.status,
          records: result.records || [],
        });
      }

      case "get-dns-records": {
        if (!org.resend_domain_id) {
          return json({ error: "No domain configured. Add a domain first." }, 404);
        }

        const result = await resendFetch(`/domains/${org.resend_domain_id}`);

        return json({
          domain: result.name,
          status: result.status,
          records: result.records || [],
          created_at: result.created_at,
        });
      }

      case "verify-domain": {
        if (!org.resend_domain_id) {
          return json({ error: "No domain configured" }, 404);
        }

        const result = await resendFetch(`/domains/${org.resend_domain_id}/verify`, {
          method: "POST",
        });

        // Re-fetch to check status
        const domainInfo = await resendFetch(`/domains/${org.resend_domain_id}`);
        const verified = domainInfo.status === "verified";

        if (verified) {
          await adminClient
            .from("organizations")
            .update({ resend_domain_verified: true })
            .eq("id", organization_id);
        }

        return json({
          verified,
          status: domainInfo.status,
          domain: domainInfo.name,
        });
      }

      case "remove-domain": {
        if (org.resend_domain_id) {
          try {
            await resendFetch(`/domains/${org.resend_domain_id}`, { method: "DELETE" });
          } catch (e) {
            console.warn("[resend-domain-management] Delete from Resend failed (may already be removed):", e);
          }
        }

        await adminClient
          .from("organizations")
          .update({
            resend_domain_id: null,
            resend_domain_verified: false,
            sender_email: null,
          })
          .eq("id", organization_id);

        return json({ success: true, message: "Domain removed" });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }

  } catch (err) {
    console.error("[resend-domain-management] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
