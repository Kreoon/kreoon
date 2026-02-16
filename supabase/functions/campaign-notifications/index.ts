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

interface NotificationPayload {
  campaign_id: string;
  notification_type: "new_campaign" | "campaign_invitation" | "application_status";
  min_match_score?: number;
}

/** Matches the RETURN TABLE of get_eligible_creators_for_campaign() */
interface EligibleCreator {
  creator_profile_id: string;
  user_id: string;
  display_name: string;     // was "full_name" — column is display_name
  avatar_url: string | null;
  match_score: number;
  notification_enabled: boolean;
  // NOTE: bulk function does NOT return match_reasons (for performance)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format budget for notification message */
function formatBudget(campaign: Record<string, unknown>): string {
  const perVideo = campaign.budget_per_video as number | null;
  const total = campaign.total_budget as number | null;
  if (perVideo && perVideo > 0) {
    return `$${Number(perVideo).toLocaleString("es-CO")} por video`;
  }
  if (total && total > 0) {
    return `$${Number(total).toLocaleString("es-CO")} total`;
  }
  return "Canje de producto";
}

/** Resolve brand display name from campaign data */
function getBrandName(campaign: Record<string, unknown>): string {
  return (
    (campaign.brand_name_override as string) ||
    (campaign.organization_name as string) ||
    (campaign.brand_name as string) ||
    "Una marca"
  );
}

/**
 * Batch an array into chunks of `size`.
 * Used to avoid massive IN clauses (>50 UUIDs = 400 Bad Request).
 * See MEMORY.md: "Never use .in() with >50 values".
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

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

    // Service-role client: bypasses RLS for notification inserts
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // -----------------------------------------------------------------------
    // 1. Parse & validate request
    // -----------------------------------------------------------------------

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user is the campaign owner or an org/brand admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    const {
      campaign_id,
      notification_type = "new_campaign",
      min_match_score = 50,
    }: NotificationPayload = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ success: false, error: "campaign_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 2. Fetch campaign (service-role to bypass RLS)
    // -----------------------------------------------------------------------

    const { data: campaign, error: campaignError } = await supabase
      .from("marketplace_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ success: false, error: `Campaign not found: ${campaignError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 3. Authorization: only campaign owner, brand admin, or org admin
    // -----------------------------------------------------------------------

    const isOwner = campaign.created_by === user.id;

    let isBrandAdmin = false;
    if (!isOwner && campaign.brand_id) {
      const { data: bm } = await supabase
        .from("brand_members")
        .select("role")
        .eq("brand_id", campaign.brand_id)
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .maybeSingle();
      isBrandAdmin = !!bm;
    }

    let isOrgAdmin = false;
    if (!isOwner && !isBrandAdmin && campaign.organization_id) {
      const { data: om } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", campaign.organization_id)
        .eq("user_id", user.id)
        .in("role", ["admin", "team_leader"])
        .maybeSingle();
      isOrgAdmin = !!om;
    }

    if (!isOwner && !isBrandAdmin && !isOrgAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "Only campaign owners or admins can send notifications" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 4. Guard: campaign must be active and not already notified
    // -----------------------------------------------------------------------

    if (campaign.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, message: "Campaign is not active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.notifications_sent) {
      return new Response(
        JSON.stringify({ success: false, message: "Notifications already sent for this campaign" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 5. Get eligible creators via optimized RPC (set-based, no per-row fn)
    // -----------------------------------------------------------------------

    const { data: eligibleCreators, error: creatorsError } = await supabase.rpc(
      "get_eligible_creators_for_campaign",
      { p_campaign_id: campaign_id, p_min_score: min_match_score }
    );

    if (creatorsError) {
      throw new Error(`Error getting eligible creators: ${creatorsError.message}`);
    }

    const creators: EligibleCreator[] = eligibleCreators || [];

    if (creators.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No eligible creators found",
          notifications_sent: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only those with notifications enabled
    const creatorsToNotify = creators.filter((c) => c.notification_enabled);

    if (creatorsToNotify.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All eligible creators have notifications disabled",
          notifications_sent: 0,
          total_eligible: creators.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------------
    // 6. Fetch cover image via helper function (no circular FK)
    // -----------------------------------------------------------------------

    const { data: coverUrl } = await supabase.rpc("get_campaign_cover_url", {
      p_campaign_id: campaign_id,
    });

    // -----------------------------------------------------------------------
    // 7. Build notification rows
    // -----------------------------------------------------------------------

    const brandName = getBrandName(campaign);
    const budgetText = formatBudget(campaign);

    const notifications = creatorsToNotify.map((creator) => ({
      user_id: creator.user_id,
      creator_profile_id: creator.creator_profile_id,
      campaign_id,
      notification_type: notification_type as string,
      title: `Nueva campana: ${campaign.title}`,
      message: `${brandName} busca creadores como tu. ${budgetText}. Match: ${Math.round(creator.match_score)}%`,
      data: {
        campaign_title: campaign.title,
        campaign_type: campaign.campaign_type,
        brand_name: brandName,
        budget: campaign.budget_per_video || campaign.total_budget,
        cover_image: coverUrl || null,
        deadline: campaign.deadline,
      },
      match_score: creator.match_score,
      // match_reasons omitted: bulk function doesn't return them (performance)
      // Compute individually only if needed for email templates
      status: "pending",
      send_push: true,
      send_email: true,
      send_in_app: true,
    }));

    // -----------------------------------------------------------------------
    // 8. Insert notifications in batches of 50
    //    (avoids massive payloads and respects DB connection limits)
    // -----------------------------------------------------------------------

    const batches = chunk(notifications, 50);
    const allInsertedIds: string[] = [];
    let insertErrors = 0;

    for (const batch of batches) {
      const { data: inserted, error: insertError } = await supabase
        .from("campaign_notifications")
        .insert(batch)
        .select("id");

      if (insertError) {
        console.error(`Batch insert error: ${insertError.message}`);
        insertErrors++;
        continue;
      }

      if (inserted) {
        allInsertedIds.push(...inserted.map((n: { id: string }) => n.id));
      }
    }

    if (allInsertedIds.length === 0 && insertErrors > 0) {
      throw new Error("All notification batches failed to insert");
    }

    // -----------------------------------------------------------------------
    // 9. Mark campaign as notified
    // -----------------------------------------------------------------------

    await supabase
      .from("marketplace_campaigns")
      .update({
        notifications_sent: true,
        notifications_sent_at: new Date().toISOString(),
        notifications_count: allInsertedIds.length,
      })
      .eq("id", campaign_id);

    // -----------------------------------------------------------------------
    // 10. Mark notifications as sent (in batches of 50 to avoid .in() limit)
    // -----------------------------------------------------------------------

    const idBatches = chunk(allInsertedIds, 50);
    for (const idBatch of idBatches) {
      await supabase
        .from("campaign_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .in("id", idBatch);
    }

    // TODO: Integrate with push notification service (FCM, OneSignal)
    // TODO: Integrate with email service (SendGrid, Resend)
    // For now, notifications are stored in DB and visible in-app.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent to ${allInsertedIds.length} creators`,
        notifications_sent: allInsertedIds.length,
        total_eligible: creators.length,
        total_with_notif_enabled: creatorsToNotify.length,
        batch_errors: insertErrors,
        campaign_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in campaign-notifications:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
