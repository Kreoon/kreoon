// calendar-sync: Sincronizar eventos entre Kreoon y calendario externo
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  integrationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId }: SyncRequest = await req.json();

    if (!integrationId) {
      throw new Error("integrationId es requerido");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from("calendar_integrations")
      .select("*")
      .eq("id", integrationId)
      .single();

    if (integrationError || !integration) {
      throw new Error("Integración no encontrada");
    }

    if (!integration.access_token) {
      throw new Error("Integración no tiene token de acceso válido");
    }

    // Check if token needs refresh
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      // Token expired - would need to refresh here
      // For now, return error
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token expirado",
          message: "La integración necesita ser reconectada",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let syncedEvents = 0;
    const blockedEvents: Array<{ title: string; start: string; end: string }> = [];

    // Sync based on provider
    switch (integration.provider) {
      case "google": {
        // Fetch events from Google Calendar
        const calendarId = integration.calendar_id || "primary";
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const googleResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: oneWeekFromNow.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
          }),
          {
            headers: {
              Authorization: `Bearer ${integration.access_token}`,
            },
          }
        );

        if (!googleResponse.ok) {
          const errorText = await googleResponse.text();
          console.error("Google Calendar API error:", errorText);
          throw new Error("Error al obtener eventos de Google Calendar");
        }

        const googleData = await googleResponse.json();
        const events = googleData.items || [];

        // Store blocked events (events that would conflict with bookings)
        for (const event of events) {
          if (event.start?.dateTime && event.end?.dateTime) {
            blockedEvents.push({
              title: event.summary || "Evento",
              start: event.start.dateTime,
              end: event.end.dateTime,
            });

            // Upsert to calendar_blocked_events
            await supabase.from("calendar_blocked_events").upsert({
              integration_id: integrationId,
              external_event_id: event.id,
              title: event.summary || null,
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              is_all_day: false,
              last_synced_at: new Date().toISOString(),
            }, {
              onConflict: "integration_id,external_event_id",
            });

            syncedEvents++;
          }
        }
        break;
      }

      case "outlook": {
        // Fetch events from Microsoft Graph API
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const outlookResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/calendar/events?` +
          new URLSearchParams({
            $filter: `start/dateTime ge '${now.toISOString()}' and end/dateTime le '${oneWeekFromNow.toISOString()}'`,
            $orderby: "start/dateTime",
            $select: "id,subject,start,end",
          }),
          {
            headers: {
              Authorization: `Bearer ${integration.access_token}`,
            },
          }
        );

        if (!outlookResponse.ok) {
          const errorText = await outlookResponse.text();
          console.error("Microsoft Graph API error:", errorText);
          throw new Error("Error al obtener eventos de Outlook");
        }

        const outlookData = await outlookResponse.json();
        const events = outlookData.value || [];

        for (const event of events) {
          if (event.start?.dateTime && event.end?.dateTime) {
            blockedEvents.push({
              title: event.subject || "Evento",
              start: event.start.dateTime,
              end: event.end.dateTime,
            });

            await supabase.from("calendar_blocked_events").upsert({
              integration_id: integrationId,
              external_event_id: event.id,
              title: event.subject || null,
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              is_all_day: false,
              last_synced_at: new Date().toISOString(),
            }, {
              onConflict: "integration_id,external_event_id",
            });

            syncedEvents++;
          }
        }
        break;
      }

      default:
        throw new Error(`Provider ${integration.provider} no soportado para sincronización`);
    }

    // Update integration last_sync_at
    await supabase
      .from("calendar_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_errors: null,
      })
      .eq("id", integrationId);

    return new Response(
      JSON.stringify({
        success: true,
        synced_events: syncedEvents,
        blocked_events: blockedEvents.length,
        message: `Sincronizados ${syncedEvents} eventos`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calendar-sync:", error);

    // Try to update sync_errors
    try {
      const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseServiceKey) {
        const { integrationId } = await req.json().catch(() => ({}));
        if (integrationId) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from("calendar_integrations")
            .update({
              sync_errors: { message: error instanceof Error ? error.message : "Error desconocido", timestamp: new Date().toISOString() },
            })
            .eq("id", integrationId);
        }
      }
    } catch {}

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
