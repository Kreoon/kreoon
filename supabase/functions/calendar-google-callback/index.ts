// ============================================================================
// CALENDAR GOOGLE CALLBACK - Maneja callback OAuth2 de Google Calendar
// ============================================================================
//
// Variables de entorno requeridas:
// - GOOGLE_CLIENT_ID: Client ID de Google Cloud Console
// - GOOGLE_CLIENT_SECRET: Client Secret de Google Cloud Console
// - FRONTEND_URL: URL del frontend (ej: https://app.kreoon.com)
// - SUPABASE_URL: URL de Supabase
// - SUPABASE_SERVICE_ROLE_KEY: Service role key de Supabase
//
// Este endpoint recibe el callback de Google OAuth con el authorization code
// y lo intercambia por access_token y refresh_token.
//
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: { ...CORS_HEADERS, Location: url },
  });
}

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── Google OAuth Config ─────────────────────────────────────────────────────

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";

// ─── Result Page HTML ────────────────────────────────────────────────────────

function resultPage(frontendUrl: string, success: boolean, errorMsg?: string) {
  const fallbackUrl = success
    ? `${frontendUrl}/booking/settings?tab=integrations&success=google`
    : `${frontendUrl}/booking/settings?tab=integrations&error=${encodeURIComponent(errorMsg || "Error desconocido")}`;

  const successIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  const errorIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kreoon - ${success ? "Calendario Conectado" : "Error"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #171717;
      border: 1px solid #262626;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 400px;
      width: 90%;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #6ee7b7;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }
    .icon { margin-bottom: 16px; }
    h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${success ? "#e5e5e5" : "#f87171"};
    }
    .subtitle {
      font-size: 14px;
      color: #a3a3a3;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .countdown {
      font-size: 13px;
      color: #737373;
      margin-bottom: 16px;
    }
    .countdown span { color: #6ee7b7; font-weight: 600; }
    .btn {
      display: inline-block;
      padding: 10px 24px;
      background: ${success ? "#6ee7b7" : "#404040"};
      color: #0a0a0a;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: opacity .2s;
    }
    .btn:hover { opacity: .85; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo">KREOON</div>
  <div class="icon">${success ? successIcon : errorIcon}</div>
  <h2>${success ? "Google Calendar conectado" : "Error al conectar"}</h2>
  <p class="subtitle">${success ? "Tu calendario ha sido vinculado. Los eventos se sincronizaran automaticamente." : (errorMsg || "Ocurrio un error desconocido.")}</p>
  <p class="countdown" id="countdown">Redirigiendo en <span id="timer">3</span> segundos...</p>
  <a class="btn" href="${fallbackUrl}">Ir a Configuracion</a>
</div>
<script>
  var t = 3;
  var interval = setInterval(function() {
    t--;
    var el = document.getElementById("timer");
    if (el) el.textContent = t;
    if (t <= 0) {
      clearInterval(interval);
      window.location.href = "${fallbackUrl}";
    }
  }, 1000);
</script>
</body>
</html>`;

  return htmlResponse(html);
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://app.kreoon.com";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Si Google devolvió un error
    if (error) {
      console.error(`[calendar-google-callback] Google OAuth error: ${error}`);
      return resultPage(frontendUrl, false, `Google denegó el acceso: ${error}`);
    }

    // Validar parámetros requeridos
    if (!code || !state) {
      console.error("[calendar-google-callback] Faltan code o state");
      return resultPage(frontendUrl, false, "Parámetros de autorización inválidos");
    }

    // Decodificar y validar state
    let statePayload: { userId: string; timestamp: number; nonce: string };
    try {
      statePayload = JSON.parse(atob(state));
    } catch {
      console.error("[calendar-google-callback] State inválido");
      return resultPage(frontendUrl, false, "Estado de autorización inválido");
    }

    // Verificar que el state no haya expirado (10 minutos)
    const stateAge = Date.now() - statePayload.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error("[calendar-google-callback] State expirado");
      return resultPage(frontendUrl, false, "La autorización ha expirado. Intenta de nuevo.");
    }

    const userId = statePayload.userId;
    console.log(`[calendar-google-callback] Procesando callback para usuario ${userId}`);

    // Obtener configuración
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!clientId || !clientSecret) {
      console.error("[calendar-google-callback] Credenciales de Google no configuradas");
      return resultPage(frontendUrl, false, "Error de configuración del servidor");
    }

    const redirectUri = `${supabaseUrl}/functions/v1/calendar-google-callback`;

    // Intercambiar code por tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[calendar-google-callback] Error intercambiando tokens: ${errorText}`);
      return resultPage(frontendUrl, false, "Error al obtener tokens de Google");
    }

    const tokens = await tokenResponse.json();
    console.log("[calendar-google-callback] Tokens obtenidos correctamente");

    // Calcular fecha de expiración del access_token
    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // Obtener lista de calendarios para seleccionar el primario
    let calendarId = "primary";
    let calendarName = "Calendario principal";

    try {
      const calendarListResponse = await fetch(`${GOOGLE_CALENDAR_LIST_URL}?minAccessRole=owner`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (calendarListResponse.ok) {
        const calendarList = await calendarListResponse.json();
        // Buscar el calendario primario
        const primaryCalendar = calendarList.items?.find((cal: { primary?: boolean }) => cal.primary);
        if (primaryCalendar) {
          calendarId = primaryCalendar.id;
          calendarName = primaryCalendar.summary || "Calendario principal";
        }
      }
    } catch (err) {
      console.warn("[calendar-google-callback] No se pudo obtener lista de calendarios:", err);
      // Continuamos con el calendario "primary" por defecto
    }

    // Guardar tokens en base de datos
    const supabase = getServiceClient();
    const { error: upsertError } = await supabase
      .from("calendar_integrations")
      .upsert(
        {
          user_id: userId,
          provider: "google",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: tokenExpiresAt.toISOString(),
          calendar_id: calendarId,
          calendar_name: calendarName,
          sync_enabled: true,
          check_conflicts: true,
          create_events: true,
          sync_errors: null, // Limpiar errores anteriores
          last_sync_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("[calendar-google-callback] Error guardando integración:", upsertError);
      return resultPage(frontendUrl, false, "Error al guardar la integración");
    }

    console.log(`[calendar-google-callback] Integración guardada para usuario ${userId}`);

    // Mostrar página de éxito
    return resultPage(frontendUrl, true);
  } catch (error) {
    console.error("[calendar-google-callback] Error inesperado:", error);
    return resultPage(
      frontendUrl,
      false,
      error instanceof Error ? error.message : "Error interno del servidor"
    );
  }
});
