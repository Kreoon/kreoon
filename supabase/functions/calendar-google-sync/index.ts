// ============================================================================
// CALENDAR GOOGLE SYNC - Sincroniza eventos de Google Calendar
// ============================================================================
//
// Variables de entorno requeridas:
// - GOOGLE_CLIENT_ID: Client ID de Google Cloud Console
// - GOOGLE_CLIENT_SECRET: Client Secret de Google Cloud Console
// - SUPABASE_URL: URL de Supabase
// - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
//
// Este endpoint sincroniza eventos del calendario de Google del usuario
// y los guarda como blocked_events para bloquear disponibilidad.
//
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  console.error(`[calendar-google-sync] Error: ${message}`);
  return jsonResponse({ error: message }, status);
}

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getAnonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const client = getAnonClient();
  const {
    data: { user },
  } = await client.auth.getUser(authHeader.replace("Bearer ", ""));
  return user;
}

// ─── Google Calendar Config ──────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendarIntegration {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  sync_enabled: boolean;
  check_conflicts: boolean;
  create_events: boolean;
  last_sync_at: string | null;
  sync_errors: Record<string, unknown> | null;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  transparency?: string;
}

interface GoogleCalendarResponse {
  items?: GoogleEvent[];
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
  };
}

// ─── Token Refresh ───────────────────────────────────────────────────────────

async function refreshAccessToken(
  refreshToken: string,
  supabase: ReturnType<typeof getServiceClient>,
  integrationId: string
): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("[calendar-google-sync] Credenciales de Google no configuradas");
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[calendar-google-sync] Error refreshing token: ${errorText}`);

      // Si el refresh token es inválido, marcar la integración con error
      if (response.status === 400 || response.status === 401) {
        await supabase
          .from("calendar_integrations")
          .update({
            sync_errors: {
              error: "invalid_refresh_token",
              message: "El token de acceso ha expirado. Por favor reconecta tu calendario.",
              timestamp: new Date().toISOString(),
            },
            sync_enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", integrationId);
      }

      return null;
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // Actualizar tokens en la base de datos
    await supabase
      .from("calendar_integrations")
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        // El refresh_token solo se actualiza si Google envía uno nuevo
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integrationId);

    console.log("[calendar-google-sync] Token refrescado correctamente");
    return tokens.access_token;
  } catch (error) {
    console.error("[calendar-google-sync] Error en refresh:", error);
    return null;
  }
}

// ─── Fetch Events from Google ────────────────────────────────────────────────

async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string
): Promise<GoogleEvent[]> {
  const now = new Date();
  // Sincronizar eventos de los próximos 90 días
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(calendarId)}/events?${params}${pageToken ? `&pageToken=${pageToken}` : ""}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error fetching events: ${response.status} - ${errorText}`);
    }

    const data: GoogleCalendarResponse = await response.json();

    if (data.error) {
      throw new Error(`Google API error: ${data.error.message}`);
    }

    // Filtrar eventos que no bloquean tiempo (cancelled o transparent)
    const validEvents = (data.items || []).filter(
      (event) =>
        event.status !== "cancelled" &&
        event.transparency !== "transparent"
    );

    events.push(...validEvents);
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Verificar autenticación
    const user = await getUserFromRequest(req);
    if (!user) {
      return errorResponse("No autorizado. Debes iniciar sesión.", 401);
    }

    // Parsear body
    const body = await req.json().catch(() => ({}));
    const integrationId = body.integrationId;

    const supabase = getServiceClient();

    // Obtener integración
    let query = supabase
      .from("calendar_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (integrationId) {
      query = query.eq("id", integrationId);
    }

    const { data: integrations, error: fetchError } = await query;

    if (fetchError) {
      console.error("[calendar-google-sync] Error obteniendo integración:", fetchError);
      return errorResponse("Error al obtener la integración", 500);
    }

    if (!integrations || integrations.length === 0) {
      return errorResponse("No se encontró una integración de Google Calendar", 404);
    }

    const integration = integrations[0] as CalendarIntegration;

    if (!integration.sync_enabled) {
      return jsonResponse({
        message: "La sincronización está deshabilitada para esta integración",
        synced: false,
      });
    }

    if (!integration.access_token) {
      return errorResponse("No hay token de acceso. Por favor reconecta tu calendario.", 400);
    }

    let accessToken = integration.access_token;

    // Verificar si el token ha expirado
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at);
      const now = new Date();
      // Refrescar si expira en menos de 5 minutos
      if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
        console.log("[calendar-google-sync] Token expirado o por expirar, refrescando...");

        if (!integration.refresh_token) {
          return errorResponse(
            "El token ha expirado y no hay refresh token. Por favor reconecta tu calendario.",
            400
          );
        }

        const newToken = await refreshAccessToken(
          integration.refresh_token,
          supabase,
          integration.id
        );

        if (!newToken) {
          return errorResponse(
            "No se pudo refrescar el token. Por favor reconecta tu calendario.",
            401
          );
        }

        accessToken = newToken;
      }
    }

    // Obtener eventos de Google Calendar
    const calendarId = integration.calendar_id || "primary";
    console.log(`[calendar-google-sync] Sincronizando calendario ${calendarId}`);

    let events: GoogleEvent[];
    try {
      events = await fetchGoogleEvents(accessToken, calendarId);
    } catch (fetchError) {
      console.error("[calendar-google-sync] Error obteniendo eventos:", fetchError);

      // Actualizar sync_errors
      await supabase
        .from("calendar_integrations")
        .update({
          sync_errors: {
            error: "fetch_failed",
            message: fetchError instanceof Error ? fetchError.message : "Error desconocido",
            timestamp: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);

      return errorResponse(
        `Error al obtener eventos: ${fetchError instanceof Error ? fetchError.message : "Error desconocido"}`,
        500
      );
    }

    console.log(`[calendar-google-sync] ${events.length} eventos encontrados`);

    // Procesar eventos y crear/actualizar blocked_events
    const blockedEvents = events
      .map((event) => {
        // Manejar eventos de todo el día vs eventos con hora específica
        let startTime: string;
        let endTime: string;
        let isAllDay = false;

        if (event.start.date && event.end.date) {
          // Evento de todo el día
          isAllDay = true;
          startTime = new Date(event.start.date).toISOString();
          endTime = new Date(event.end.date).toISOString();
        } else if (event.start.dateTime && event.end.dateTime) {
          // Evento con hora específica
          startTime = new Date(event.start.dateTime).toISOString();
          endTime = new Date(event.end.dateTime).toISOString();
        } else {
          // Evento inválido, saltar
          return null;
        }

        return {
          integration_id: integration.id,
          external_event_id: event.id,
          title: event.summary || "(Sin título)",
          start_time: startTime,
          end_time: endTime,
          is_all_day: isAllDay,
          last_synced_at: new Date().toISOString(),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    // Eliminar eventos antiguos que ya no existen en Google
    const externalIds = blockedEvents.map((e) => e.external_event_id);

    if (externalIds.length > 0) {
      // Eliminar eventos que ya no están en Google
      await supabase
        .from("calendar_blocked_events")
        .delete()
        .eq("integration_id", integration.id)
        .not("external_event_id", "in", `(${externalIds.map(id => `'${id}'`).join(",")})`);
    } else {
      // Si no hay eventos, eliminar todos los bloqueados de esta integración
      await supabase
        .from("calendar_blocked_events")
        .delete()
        .eq("integration_id", integration.id);
    }

    // Upsert eventos bloqueados
    if (blockedEvents.length > 0) {
      const { error: upsertError } = await supabase
        .from("calendar_blocked_events")
        .upsert(blockedEvents, { onConflict: "integration_id,external_event_id" });

      if (upsertError) {
        console.error("[calendar-google-sync] Error guardando eventos bloqueados:", upsertError);
        return errorResponse("Error al guardar eventos sincronizados", 500);
      }
    }

    // Actualizar last_sync_at y limpiar errores
    await supabase
      .from("calendar_integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_errors: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    console.log(`[calendar-google-sync] Sincronización completada: ${blockedEvents.length} eventos`);

    return jsonResponse({
      success: true,
      message: `Sincronización completada`,
      events_synced: blockedEvents.length,
      calendar_name: integration.calendar_name,
      last_sync_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[calendar-google-sync] Error inesperado:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Error interno del servidor",
      500
    );
  }
});
