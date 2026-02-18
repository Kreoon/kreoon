/**
 * verify-custom-domain Edge Function
 *
 * Verifies DNS resolution for a custom domain (CNAME to kreoon.com)
 * and updates the organization's custom_domain field.
 *
 * POST /verify-custom-domain
 * Body: { organization_id, domain, action: "verify" | "remove" }
 *
 * Only org owners or platform admins can manage custom domains.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get calling user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { organization_id, domain, action } = await req.json();

    if (!organization_id) {
      return new Response(JSON.stringify({ error: "organization_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is org owner or platform root
    const { data: member } = await adminClient
      .from("organization_members")
      .select("is_owner")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];
    const isRoot = ROOT_EMAILS.includes(user.email || "");

    if (!member?.is_owner && !isRoot) {
      return new Response(JSON.stringify({ error: "Only org owners can manage custom domains" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify org is on enterprise plan
    const { data: org } = await adminClient
      .from("organizations")
      .select("selected_plan")
      .eq("id", organization_id)
      .single();

    if (!org || org.selected_plan !== "enterprise") {
      return new Response(JSON.stringify({ error: "Custom domains require an enterprise plan" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle remove action
    if (action === "remove") {
      const { error: updateErr } = await adminClient
        .from("organizations")
        .update({ custom_domain: null })
        .eq("id", organization_id);

      if (updateErr) throw updateErr;

      return new Response(JSON.stringify({ success: true, message: "Custom domain removed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify action: check DNS
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "domain required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanDomain = domain.toLowerCase().trim();

    // Validate domain format
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(cleanDomain)) {
      return new Response(JSON.stringify({ error: "Invalid domain format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent using kreoon.com subdomains as custom domains
    if (cleanDomain.endsWith(".kreoon.com") || cleanDomain === "kreoon.com") {
      return new Response(JSON.stringify({ error: "Cannot use kreoon.com as a custom domain" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check CNAME resolution using DNS-over-HTTPS
    let dnsVerified = false;
    let dnsError = "";
    try {
      const dnsRes = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=CNAME`,
        { headers: { Accept: "application/json" } }
      );
      const dnsData = await dnsRes.json();

      if (dnsData.Answer) {
        const cnameRecord = dnsData.Answer.find(
          (r: any) => r.type === 5 && r.data?.replace(/\.$/, "").toLowerCase() === "kreoon.com"
        );
        dnsVerified = !!cnameRecord;
        if (!dnsVerified) {
          dnsError = `CNAME found but points to ${dnsData.Answer[0]?.data || "unknown"} instead of kreoon.com`;
        }
      } else {
        dnsError = "No CNAME record found. Add a CNAME record pointing to kreoon.com";
      }
    } catch (e) {
      dnsError = `DNS lookup failed: ${e instanceof Error ? e.message : "unknown error"}`;
    }

    if (!dnsVerified) {
      return new Response(JSON.stringify({
        success: false,
        verified: false,
        error: dnsError,
        instructions: {
          type: "CNAME",
          host: cleanDomain,
          value: "kreoon.com",
          note: "Add this DNS record at your domain registrar, then try again. DNS propagation can take up to 48 hours.",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DNS verified — save custom domain
    const { error: updateErr } = await adminClient
      .from("organizations")
      .update({ custom_domain: cleanDomain })
      .eq("id", organization_id);

    if (updateErr) {
      if (updateErr.code === "23505") {
        return new Response(JSON.stringify({ error: "This domain is already in use by another organization" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw updateErr;
    }

    return new Response(JSON.stringify({
      success: true,
      verified: true,
      domain: cleanDomain,
      message: "Custom domain verified and saved. Note: you may also need to add this domain in Vercel for SSL/routing.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[verify-custom-domain] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
