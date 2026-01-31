import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use Kreoon database
const KREOON_URL = Deno.env.get("KREOON_SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
const KREOON_SERVICE_KEY = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "slug_required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[org-public-info] Fetching organization:", slug);

    // Create Kreoon admin client
    const supabaseAdmin = createClient(KREOON_URL, KREOON_SERVICE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Fetch organization - bypasses RLS with service role
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select(`
        id, 
        name, 
        slug, 
        logo_url, 
        description, 
        is_registration_open, 
        registration_require_invite, 
        default_role, 
        registration_page_config,
        is_blocked
      `)
      .eq("slug", slug)
      .single();

    if (error || !org) {
      console.error("[org-public-info] Organization not found:", error);
      return new Response(
        JSON.stringify({ error: "organization_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if organization is blocked
    if (org.is_blocked) {
      console.log("[org-public-info] Organization is blocked:", slug);
      return new Response(
        JSON.stringify({ error: "organization_blocked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[org-public-info] Found organization:", org.name, "| Registration open:", org.is_registration_open);

    // Return public organization info
    return new Response(
      JSON.stringify({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        description: org.description,
        is_registration_open: org.is_registration_open,
        registration_require_invite: org.registration_require_invite,
        default_role: org.default_role,
        registration_page_config: org.registration_page_config,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[org-public-info] Error:", error);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
