/**
 * cloudflare-live-webhook - Recibe webhooks de Cloudflare Stream Notifications
 * Actualiza estado de streams cuando conectan/desconectan
 *
 * Formato del payload de Cloudflare Notifications:
 * {
 *   "name": "Notification Name",
 *   "text": "...",
 *   "data": {
 *     "notification_name": "Stream Live Input",
 *     "input_id": "abc123...",
 *     "event_type": "live_input.connected|disconnected|errored",
 *     "updated_at": "2024-01-01T00:00:00.000Z"
 *   },
 *   "ts": 1234567890
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cf-webhook-auth",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLOUDFLARE_WEBHOOK_SECRET = Deno.env.get("CLOUDFLARE_WEBHOOK_SECRET") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Cloudflare webhook received:", JSON.stringify(body, null, 2));

    // Formato de Cloudflare Notifications
    const { data, ts } = body;

    if (!data) {
      // Intentar formato legacy (por si acaso)
      const { event, liveInput, video } = body;
      if (event && liveInput?.uid) {
        return handleLegacyFormat(supabase, event, liveInput, video);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Ignored - missing data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { input_id, event_type, updated_at, live_input_errored } = data;

    if (!input_id || !event_type) {
      return new Response(
        JSON.stringify({ success: true, message: "Ignored - missing input_id or event_type" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar el stream en nuestra BD
    const { data: stream, error: fetchError } = await supabase
      .from("creator_live_streams")
      .select("*")
      .eq("cf_live_input_id", input_id)
      .maybeSingle();

    if (fetchError || !stream) {
      console.log("Stream not found for live input:", input_id);
      return new Response(
        JSON.stringify({ success: true, message: "Stream not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, unknown> = {};

    switch (event_type) {
      // Stream conectado y transmitiendo
      case "live_input.connected":
        console.log(`Stream ${stream.id} connected`);
        updateData = {
          status: "live",
          started_at: stream.started_at || new Date().toISOString(),
        };
        break;

      // Stream desconectado
      case "live_input.disconnected":
        console.log(`Stream ${stream.id} disconnected`);
        // Solo marcar como ended si estaba live
        if (stream.status === "live" || stream.status === "connecting") {
          const startedAt = stream.started_at ? new Date(stream.started_at) : new Date();
          const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

          updateData = {
            status: "ended",
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
            current_viewers: 0,
          };

          // Marcar todos los viewers como salidos
          await supabase
            .from("live_stream_viewers")
            .update({ left_at: new Date().toISOString() })
            .eq("stream_id", stream.id)
            .is("left_at", null);
        }
        break;

      // Error en el stream
      case "live_input.errored":
        console.error(`Stream ${stream.id} errored:`, live_input_errored);
        updateData = {
          status: "ended",
          ended_at: new Date().toISOString(),
          current_viewers: 0,
          metadata: {
            ...stream.metadata,
            last_error: live_input_errored || "Unknown error",
            error_at: new Date().toISOString(),
          },
        };
        break;

      default:
        console.log(`Unhandled event type: ${event_type}`);
    }

    // Aplicar actualización si hay cambios
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("creator_live_streams")
        .update(updateData)
        .eq("id", stream.id);

      if (updateError) {
        console.error("Error updating stream:", updateError);
      } else {
        console.log(`Stream ${stream.id} updated:`, updateData);
      }
    }

    return new Response(
      JSON.stringify({ success: true, event_type, streamId: stream.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cloudflare webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Manejar formato legacy (por compatibilidad)
async function handleLegacyFormat(
  supabase: ReturnType<typeof createClient>,
  event: string,
  liveInput: { uid: string; status?: { current?: { state?: string } } },
  video?: { uid?: string; thumbnail?: string }
) {
  const liveInputId = liveInput.uid;

  const { data: stream, error: fetchError } = await supabase
    .from("creator_live_streams")
    .select("*")
    .eq("cf_live_input_id", liveInputId)
    .maybeSingle();

  if (fetchError || !stream) {
    console.log("Stream not found for live input:", liveInputId);
    return new Response(
      JSON.stringify({ success: true, message: "Stream not found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let updateData: Record<string, unknown> = {};

  switch (event) {
    case "live_input.connected":
      updateData = {
        status: "live",
        started_at: stream.started_at || new Date().toISOString(),
      };
      break;

    case "live_input.disconnected":
      if (stream.status === "live" || stream.status === "connecting") {
        const startedAt = stream.started_at ? new Date(stream.started_at) : new Date();
        const durationSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);

        updateData = {
          status: "ended",
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          current_viewers: 0,
        };

        await supabase
          .from("live_stream_viewers")
          .update({ left_at: new Date().toISOString() })
          .eq("stream_id", stream.id)
          .is("left_at", null);
      }
      break;

    case "stream.ready":
      if (video?.uid) {
        updateData = {
          cf_recording_uid: video.uid,
          cf_thumbnail_url: video.thumbnail || null,
        };
      }
      break;

    case "live_input.state_changed":
      const state = liveInput.status?.current?.state;
      if (state === "connected") {
        updateData = { status: "live" };
      } else if (state === "disconnected" && stream.status === "live") {
        updateData = {
          status: "ended",
          ended_at: new Date().toISOString(),
          current_viewers: 0,
        };
      }
      break;
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from("creator_live_streams")
      .update(updateData)
      .eq("id", stream.id);

    if (updateError) {
      console.error("Error updating stream:", updateError);
    }
  }

  return new Response(
    JSON.stringify({ success: true, event, streamId: stream.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
