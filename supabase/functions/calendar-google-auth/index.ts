// ============================================================================
// CALENDAR GOOGLE AUTH - Genera URL de autorización OAuth2 para Google Calendar
// ============================================================================
//
// Variables de entorno requeridas:
// - GOOGLE_CLIENT_ID: Client ID de Google Cloud Console
// - GOOGLE_CLIENT_SECRET: Client Secret de Google Cloud Console
// - FRONTEND_URL: URL del frontend (ej: https://app.kreoon.com)
// - SUPABASE_URL: URL de Supabase
// - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
//
// Scopes utilizados:
// - https://www.googleapis.com/auth/calendar.events: Leer/escribir eventos
// - https://www.googleapis.com/auth/calendar.readonly: Leer calendarios
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
  console.error(`[calendar-google-auth] Error: ${message}`);
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

// ─── Google OAuth Config ─────────────────────────────────────────────────────

const GOOGLE_OAUTH_CONFIG = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  scopes: [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
};

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

    // Obtener configuración
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.kreoon.com";

    if (!clientId) {
      console.error("[calendar-google-auth] GOOGLE_CLIENT_ID no configurado");
      return errorResponse("Configuración de Google Calendar incompleta", 500);
    }

    // Construir redirect URI - callback a nuestra edge function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/calendar-google-callback`;

    // Generar state con userId para verificación en callback
    // El state incluye el userId y timestamp para seguridad
    const statePayload = {
      userId: user.id,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    };
    const state = btoa(JSON.stringify(statePayload));

    // Guardar state en base de datos para verificación
    const supabase = getServiceClient();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Usamos una tabla temporal o el campo sync_errors para guardar el state
    // Por simplicidad, lo guardamos en una inserción temporal que el callback validará
    const { error: stateError } = await supabase
      .from("calendar_integrations")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          sync_errors: { pending_auth_state: state, expires_at: expiresAt.toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (stateError) {
      console.error("[calendar-google-auth] Error guardando state:", stateError);
      // Continuamos de todas formas, el callback verificará el state decodificado
    }

    // Construir URL de autorización
    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
      access_type: "offline", // Necesario para obtener refresh_token
      prompt: "consent", // Forzar pantalla de consentimiento para obtener refresh_token
      state: state,
      include_granted_scopes: "true",
    });

    const authUrl = `${GOOGLE_OAUTH_CONFIG.authUrl}?${authParams.toString()}`;

    console.log(`[calendar-google-auth] URL generada para usuario ${user.id}`);

    return jsonResponse({
      url: authUrl,
      message: "Redirige al usuario a esta URL para autorizar Google Calendar",
    });
  } catch (error) {
    console.error("[calendar-google-auth] Error inesperado:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Error interno del servidor",
      500
    );
  }
});
