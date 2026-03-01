// booking-webhook-test: Enviar evento de prueba a un webhook
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookTestRequest {
  webhookId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookId }: WebhookTestRequest = await req.json();

    if (!webhookId) {
      throw new Error("webhookId es requerido");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get webhook details
    const { data: webhook, error: webhookError } = await supabase
      .from("booking_webhooks")
      .select("*")
      .eq("id", webhookId)
      .single();

    if (webhookError || !webhook) {
      throw new Error("Webhook no encontrado");
    }

    // Generate test payload
    const testPayload = {
      event: "booking.test",
      timestamp: new Date().toISOString(),
      data: {
        id: "test-booking-id-" + Date.now(),
        event_type: {
          id: "test-event-type-id",
          title: "Evento de prueba",
          duration_minutes: 30,
        },
        guest: {
          name: "Usuario de Prueba",
          email: "prueba@ejemplo.com",
          phone: null,
        },
        host: {
          id: webhook.user_id,
          name: "Host de Prueba",
        },
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        timezone: "America/Bogota",
        status: "confirmed",
        location_type: "google_meet",
      },
    };

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Kreoon-Event": "booking.test",
      "X-Kreoon-Webhook-Id": webhookId,
      ...(webhook.headers || {}),
    };

    // Add signature if secret is set
    if (webhook.secret) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(testPayload));
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhook.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, data);
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      headers["X-Kreoon-Signature"] = `sha256=${signatureHex}`;
    }

    // Send webhook
    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
      });

      responseStatus = response.status;
      responseBody = await response.text();
    } catch (fetchError) {
      responseBody = fetchError instanceof Error ? fetchError.message : "Error de conexión";
    }

    const responseTime = Date.now() - startTime;

    // Log the webhook call
    await supabase.from("booking_webhook_logs").insert({
      webhook_id: webhookId,
      booking_id: null,
      event_type: "booking.test",
      payload: testPayload,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 1000), // Limitar tamaño
      response_time_ms: responseTime,
      attempt_number: 1,
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: responseStatus !== null && responseStatus >= 200 && responseStatus < 300,
        status: responseStatus,
        response_time_ms: responseTime,
        message: responseStatus === null
          ? "Error de conexión"
          : responseStatus >= 200 && responseStatus < 300
            ? "Webhook enviado correctamente"
            : `Webhook respondió con código ${responseStatus}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in booking-webhook-test:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
