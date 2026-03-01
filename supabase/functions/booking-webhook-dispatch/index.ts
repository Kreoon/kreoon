// booking-webhook-dispatch: Disparar webhooks a URLs configuradas cuando hay eventos de booking
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BookingEvent =
  | "booking.created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.rescheduled"
  | "booking.completed"
  | "booking.no_show";

interface WebhookDispatchRequest {
  event: BookingEvent;
  bookingId: string;
  hostUserId: string;
}

interface WebhookConfig {
  id: string;
  url: string;
  secret: string | null;
  events: BookingEvent[];
  headers: Record<string, string> | null;
  active: boolean;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${signatureHex}`;
}

async function sendWebhook(
  webhook: WebhookConfig,
  event: BookingEvent,
  bookingData: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; status: number | null; responseTime: number }> {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data: bookingData,
  };

  const payloadStr = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Kreoon-Event": event,
    "X-Kreoon-Webhook-Id": webhook.id,
    ...(webhook.headers || {}),
  };

  // Add HMAC signature if secret is set
  if (webhook.secret) {
    headers["X-Kreoon-Signature"] = await signPayload(payloadStr, webhook.secret);
  }

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadStr,
    });

    responseStatus = response.status;
    responseBody = await response.text();
    success = responseStatus >= 200 && responseStatus < 300;
  } catch (fetchError) {
    responseBody = fetchError instanceof Error ? fetchError.message : "Connection error";
  }

  const responseTime = Date.now() - startTime;

  // Log the webhook call
  await supabase.from("booking_webhook_logs").insert({
    webhook_id: webhook.id,
    booking_id: bookingData.id as string,
    event_type: event,
    payload,
    response_status: responseStatus,
    response_body: responseBody?.substring(0, 1000),
    response_time_ms: responseTime,
    attempt_number: 1,
    sent_at: new Date().toISOString(),
  });

  return { success, status: responseStatus, responseTime };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, bookingId, hostUserId }: WebhookDispatchRequest = await req.json();

    if (!event || !bookingId || !hostUserId) {
      throw new Error("event, bookingId, and hostUserId are required");
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get booking data with related info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        event_type:booking_event_types(id, title, duration_minutes, color),
        host:profiles!bookings_host_user_id_fkey(id, full_name, email)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // Transform booking data for webhook payload
    const bookingPayload = {
      id: booking.id,
      event_type: booking.event_type,
      guest: {
        name: booking.guest_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
      },
      host: booking.host,
      start_time: booking.start_time,
      end_time: booking.end_time,
      timezone: booking.timezone,
      status: booking.status,
      location_type: booking.location_type,
      meeting_url: booking.meeting_url,
      notes: booking.notes,
      cancelled_at: booking.cancelled_at,
      cancellation_reason: booking.cancellation_reason,
      rescheduled_at: booking.rescheduled_at,
      original_start_time: booking.original_start_time,
    };

    // Get active webhooks for this user that listen to this event
    const { data: webhooks, error: webhooksError } = await supabase
      .from("booking_webhooks")
      .select("*")
      .eq("user_id", hostUserId)
      .eq("active", true);

    if (webhooksError) {
      throw new Error(`Error fetching webhooks: ${webhooksError.message}`);
    }

    // Filter webhooks that listen to this event
    const matchingWebhooks = (webhooks || []).filter((wh: WebhookConfig) =>
      wh.events && wh.events.includes(event)
    );

    if (matchingWebhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active webhooks configured for this event",
          webhooks_called: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send webhooks in parallel
    const results = await Promise.allSettled(
      matchingWebhooks.map((webhook: WebhookConfig) =>
        sendWebhook(webhook, event, bookingPayload, supabase)
      )
    );

    const successCount = results.filter(
      r => r.status === "fulfilled" && r.value.success
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Dispatched ${matchingWebhooks.length} webhooks, ${successCount} successful`,
        webhooks_called: matchingWebhooks.length,
        webhooks_success: successCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in booking-webhook-dispatch:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
