// calendar-oauth-start: Iniciar flujo OAuth para conectar calendario externo
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OAuthStartRequest {
  provider: "google" | "outlook" | "apple";
}

// OAuth configuration by provider
const OAUTH_CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    scopes: [
      "Calendars.ReadWrite",
      "offline_access",
    ],
  },
  apple: {
    authUrl: "https://appleid.apple.com/auth/authorize",
    scopes: ["calendar"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider }: OAuthStartRequest = await req.json();

    if (!provider || !["google", "outlook", "apple"].includes(provider)) {
      throw new Error("Provider inválido. Use: google, outlook o apple");
    }

    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://kreoon.com";
    const config = OAUTH_CONFIG[provider];

    // Get credentials from environment
    let clientId: string | undefined;
    let redirectUri: string;

    switch (provider) {
      case "google":
        clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
        redirectUri = `${frontendUrl}/booking/oauth/google/callback`;
        break;
      case "outlook":
        clientId = Deno.env.get("MICROSOFT_CLIENT_ID");
        redirectUri = `${frontendUrl}/booking/oauth/outlook/callback`;
        break;
      case "apple":
        clientId = Deno.env.get("APPLE_CLIENT_ID");
        redirectUri = `${frontendUrl}/booking/oauth/apple/callback`;
        break;
    }

    if (!clientId) {
      // Return message that integration is not configured
      return new Response(
        JSON.stringify({
          success: false,
          error: `Integración con ${provider} no configurada`,
          message: `Para habilitar la integración con ${provider}, configura las credenciales OAuth en las variables de entorno.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate state for CSRF protection (should include user ID)
    const state = crypto.randomUUID();

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });

    const oauthUrl = `${config.authUrl}?${params.toString()}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: oauthUrl,
        state,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in calendar-oauth-start:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
