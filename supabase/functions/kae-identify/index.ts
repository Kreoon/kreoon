// ============================================================
// KAE IDENTIFY - Identity Resolution
// ============================================================
//
// Called on signup/login to merge anonymous_id → user_id.
// - Updates kae_visitors with user_id + converted_at
// - Backfills user_id on kae_sessions, kae_events, kae_conversions
// - Stores optional traits as identify event
//
// JWT: verify_jwt = true (only authenticated users)

import { getKreoonClient } from "../_shared/kreoon-client.ts";

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
    const supabase = getKreoonClient();

    const { user_id, anonymous_id, traits } = await req.json();

    // 1. Actualizar visitor con user_id
    await supabase
      .from("kae_visitors")
      .update({
        user_id,
        converted_at: new Date().toISOString(),
      })
      .eq("anonymous_id", anonymous_id);

    // 2. Actualizar todas las sesiones del anonymous_id
    await supabase
      .from("kae_sessions")
      .update({ user_id })
      .eq("anonymous_id", anonymous_id);

    // 3. Actualizar todos los eventos del anonymous_id
    await supabase
      .from("kae_events")
      .update({ user_id })
      .eq("anonymous_id", anonymous_id);

    // 4. Actualizar conversiones
    await supabase
      .from("kae_conversions")
      .update({ user_id })
      .eq("anonymous_id", anonymous_id);

    // 5. Guardar traits del usuario si se proporcionan
    if (traits && Object.keys(traits).length > 0) {
      await supabase
        .from("kae_events")
        .insert({
          anonymous_id,
          user_id,
          event_name: "identify",
          event_category: "system",
          properties: traits,
        });
    }

    return new Response(
      JSON.stringify({ success: true, merged: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in kae-identify:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
