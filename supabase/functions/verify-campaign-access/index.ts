import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VerifyAccessPayload {
  action: "create_campaign" | "view_limits";
  // user_id is NOT accepted from body — extracted from JWT to prevent spoofing
}

interface PlanLimits {
  max_campaigns_per_month: number;
  max_active_campaigns: number;
  max_creators_per_campaign: number;
  commission_discount_pct: number;
  plan_type: string;
  plan_name: string;
}

interface UsageData {
  active_campaigns: number;
  month_campaigns: number;
}

// ---------------------------------------------------------------------------
// Defaults matching migration get_campaign_limits() IF NOT FOUND clause:
// No subscription = no restriction (backwards compatible)
// ---------------------------------------------------------------------------
const NO_SUBSCRIPTION_DEFAULTS: PlanLimits = {
  max_campaigns_per_month: 999,
  max_active_campaigns: 50,
  max_creators_per_campaign: 100,
  commission_discount_pct: 0,
  plan_type: "none",
  plan_name: "Sin plan",
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // -------------------------------------------------------------------
    // 1. Authenticate: extract user_id from JWT (never trust request body)
    // -------------------------------------------------------------------

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // -------------------------------------------------------------------
    // 2. Parse action from body
    // -------------------------------------------------------------------

    const body = await req.json().catch(() => ({}));
    const action: string = body.action || "view_limits";

    // -------------------------------------------------------------------
    // 3. Check subscription (service-role client to bypass RLS)
    // -------------------------------------------------------------------

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: canCreate, error: canCreateError } = await supabase.rpc(
      "can_create_campaigns",
      { p_user_id: userId }
    );

    if (canCreateError) {
      console.error("Error checking can_create_campaigns:", canCreateError);
      // Don't block user if the check fails — backwards compatible
    }

    // can_create_campaigns returns true when no subscriptions exist (safe default)
    const hasPaidSubscription = canCreate ?? true;

    // -------------------------------------------------------------------
    // 4. Get plan limits
    // -------------------------------------------------------------------

    const { data: limitsRows, error: limitsError } = await supabase.rpc(
      "get_campaign_limits",
      { p_user_id: userId }
    );

    if (limitsError) {
      console.error("Error getting campaign limits:", limitsError);
    }

    // get_campaign_limits returns generous defaults if no subscription
    const planLimits: PlanLimits = limitsRows?.[0] || NO_SUBSCRIPTION_DEFAULTS;

    // -------------------------------------------------------------------
    // 5. Get current usage (always, for both actions)
    // -------------------------------------------------------------------

    const usage = await getCampaignUsage(supabase, userId);

    // -------------------------------------------------------------------
    // 6. Build response
    // -------------------------------------------------------------------

    if (action === "create_campaign") {
      const withinActiveLimit =
        usage.active_campaigns < planLimits.max_active_campaigns;
      const withinMonthLimit =
        usage.month_campaigns < planLimits.max_campaigns_per_month;
      const canCreateMore = withinActiveLimit && withinMonthLimit;

      let blockedReason: string | null = null;
      if (!hasPaidSubscription) {
        blockedReason = "no_paid_subscription";
      } else if (!withinActiveLimit) {
        blockedReason = "max_active_campaigns_reached";
      } else if (!withinMonthLimit) {
        blockedReason = "max_monthly_campaigns_reached";
      }

      return jsonResponse({
        can_create: hasPaidSubscription && canCreateMore,
        has_paid_subscription: hasPaidSubscription,
        limits: planLimits,
        usage,
        blocked_reason: blockedReason,
      });
    }

    // action === 'view_limits'
    return jsonResponse({
      can_create: hasPaidSubscription,
      has_paid_subscription: hasPaidSubscription,
      limits: planLimits,
      usage,
    });
  } catch (error) {
    console.error("Error in verify-campaign-access:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count active campaigns and campaigns created this month for a user */
async function getCampaignUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<UsageData> {
  // Active campaigns
  const { count: activeCampaigns } = await supabase
    .from("marketplace_campaigns")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .in("status", ["active", "in_progress"]);

  // Month campaigns (UTC first day of current month)
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();

  const { count: monthCampaigns } = await supabase
    .from("marketplace_campaigns")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", startOfMonth);

  return {
    active_campaigns: activeCampaigns || 0,
    month_campaigns: monthCampaigns || 0,
  };
}

/** Convenience wrapper for JSON responses with CORS headers */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
