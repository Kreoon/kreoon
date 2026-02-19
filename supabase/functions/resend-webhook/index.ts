import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getKreoonClient } from "../_shared/kreoon-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

/**
 * Resend Webhook Handler
 *
 * Receives email lifecycle events from Resend and stores them in email_events.
 * Also updates campaign metrics and drip enrollment statuses.
 *
 * Events: email.sent, email.delivered, email.opened, email.clicked,
 *         email.bounced, email.complained, email.failed
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const eventType = payload.type;
    const eventData = payload.data || {};

    if (!eventType) {
      return new Response(JSON.stringify({ error: "Missing event type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Resend event type to our simplified type
    const metricMap: Record<string, string> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
    };

    const metric = metricMap[eventType];
    if (!metric) {
      // Not an event we track (e.g. email.failed, domain events)
      console.log(`[resend-webhook] Ignoring event type: ${eventType}`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getKreoonClient();

    const resendEmailId = eventData.email_id || null;
    const recipientEmail = Array.isArray(eventData.to) ? eventData.to[0] : eventData.to || null;
    const broadcastId = eventData.broadcast_id || null;

    // Extract tags for drip sequence tracking
    const tags = eventData.tags || {};
    const dripEnrollmentId = tags.drip_enrollment_id || null;

    // Build metadata
    const metadata: Record<string, unknown> = {};
    if (eventType === "email.clicked" && eventData.click) {
      metadata.click_url = eventData.click.url;
    }
    if (eventType === "email.bounced" && eventData.bounce) {
      metadata.bounce_type = eventData.bounce.type;
      metadata.bounce_message = eventData.bounce.message;
    }
    if (eventType === "email.complained") {
      metadata.complaint = true;
    }

    // ─── Find campaign_id from broadcast_id ───
    let campaignId: string | null = null;
    if (broadcastId) {
      const { data: campaign } = await supabase
        .from("email_campaigns")
        .select("id")
        .eq("resend_broadcast_id", broadcastId)
        .limit(1)
        .maybeSingle();
      campaignId = campaign?.id || null;
    }

    // ─── Insert event ───
    const { error: insertError } = await supabase
      .from("email_events")
      .insert({
        campaign_id: campaignId,
        enrollment_id: dripEnrollmentId,
        resend_email_id: resendEmailId,
        event_type: metric,
        recipient_email: recipientEmail,
        metadata,
      });

    if (insertError) {
      console.error("[resend-webhook] Insert error:", insertError);
    }

    // ─── Update campaign metrics ───
    if (campaignId) {
      const { error: rpcError } = await supabase.rpc("increment_campaign_metric", {
        p_campaign_id: campaignId,
        p_metric: metric,
        p_amount: 1,
      });
      if (rpcError) {
        console.error("[resend-webhook] Metric update error:", rpcError);
      }

      // Mark campaign as "sent" on first delivery
      if (metric === "sent") {
        await supabase
          .from("email_campaigns")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", campaignId)
          .eq("status", "sending");
      }
    }

    // ─── Update drip enrollment on bounce/complaint ───
    if (dripEnrollmentId && (metric === "bounced" || metric === "complained")) {
      const newStatus = metric === "bounced" ? "bounced" : "unsubscribed";
      await supabase
        .from("email_drip_enrollments")
        .update({ status: newStatus })
        .eq("id", dripEnrollmentId)
        .in("status", ["active"]);
    }

    console.log(`[resend-webhook] Processed ${eventType} for ${recipientEmail} (campaign=${campaignId}, drip=${dripEnrollmentId})`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[resend-webhook] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
