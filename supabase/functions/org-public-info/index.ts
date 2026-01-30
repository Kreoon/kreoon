import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OrgPublicInfo = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  is_registration_open: boolean;
  registration_require_invite: boolean;
  default_role: string;
  registration_page_config: unknown | null;
};

function getAdminClient() {
  // Prefer external Kreoon backend if configured, otherwise fall back to current project
  const url = Deno.env.get("KREOON_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing backend service credentials");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = getAdminClient();

    const { data, error } = await admin
      .from("organizations")
      .select(
        "id, name, slug, logo_url, description, is_registration_open, registration_require_invite, default_role, registration_page_config"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("org-public-info: query_error", { slug, error });
      return new Response(JSON.stringify({ error: "query_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return only the fields needed for the public registration page
    const payload: OrgPublicInfo = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url,
      description: data.description,
      is_registration_open: data.is_registration_open,
      registration_require_invite: data.registration_require_invite,
      default_role: data.default_role,
      registration_page_config: (data as any).registration_page_config ?? null,
    };

    return new Response(JSON.stringify({ organization: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("org-public-info: unexpected_error", err);
    return new Response(JSON.stringify({ error: "unexpected" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
