// calendar-check-conflicts: Verificar conflictos con calendarios externos
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConflictCheckRequest {
  userId: string;
  startTime: string;
  endTime: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, startTime, endTime }: ConflictCheckRequest = await req.json();

    if (!userId || !startTime || !endTime) {
      throw new Error("userId, startTime y endTime son requeridos");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's calendar integrations with check_conflicts enabled
    const { data: integrations, error: intError } = await supabase
      .from("calendar_integrations")
      .select("id, provider, calendar_id")
      .eq("user_id", userId)
      .eq("check_conflicts", true)
      .eq("sync_enabled", true);

    if (intError) {
      console.error("Error fetching integrations:", intError);
      throw new Error("Error al obtener integraciones de calendario");
    }

    if (!integrations || integrations.length === 0) {
      // No integrations to check, no conflicts
      return new Response(
        JSON.stringify({
          hasConflict: false,
          conflictingEvents: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const integrationIds = integrations.map(i => i.id);

    // Check for blocked events that overlap with the requested time
    const { data: blockedEvents, error: blockedError } = await supabase
      .from("calendar_blocked_events")
      .select("title, start_time, end_time")
      .in("integration_id", integrationIds)
      .lte("start_time", endTime)
      .gte("end_time", startTime);

    if (blockedError) {
      console.error("Error fetching blocked events:", blockedError);
      throw new Error("Error al verificar conflictos");
    }

    // Filter to find actual overlaps
    const requestedStart = new Date(startTime);
    const requestedEnd = new Date(endTime);

    const conflictingEvents = (blockedEvents || []).filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      // Check if there's an overlap
      return eventStart < requestedEnd && eventEnd > requestedStart;
    }).map(event => ({
      title: event.title || "Evento",
      start: event.start_time,
      end: event.end_time,
    }));

    return new Response(
      JSON.stringify({
        hasConflict: conflictingEvents.length > 0,
        conflictingEvents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calendar-check-conflicts:", error);
    return new Response(
      JSON.stringify({
        hasConflict: false,
        conflictingEvents: [],
        error: error instanceof Error ? error.message : "Error desconocido",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
