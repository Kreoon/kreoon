/**
 * Public Login API - Login desde ugccolombia.co
 *
 * Permite a usuarios registrados en KREOON iniciar sesión
 * desde sitios externos como ugccolombia.co/login
 *
 * ENDPOINTS:
 * - POST /public-login { email, password }
 *
 * Retorna un magic link que autentica automáticamente al usuario
 * y lo redirige a /welcome/ugc-colombia
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://ugccolombia.co",
  "https://www.ugccolombia.co",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowedOrigin = "https://ugccolombia.co";

  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
      allowedOrigin = origin;
    } else if (origin.endsWith(".vercel.app")) {
      allowedOrigin = origin;
    }
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const data: LoginRequest = await req.json();

    // Validate required fields
    if (!data.email || !data.password) {
      return new Response(
        JSON.stringify({ error: "Email y contraseña son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_SERVICE_KEY) {
      console.error("[public-login] Missing SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Error de configuración del servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Verify credentials by attempting to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (signInError || !signInData.user) {
      console.error("[public-login] Sign in error:", signInError);
      return new Response(
        JSON.stringify({ error: "Email o contraseña incorrectos" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if user is from UGC Colombia community
    const { data: profile } = await supabase
      .from("profiles")
      .select("registration_source, full_name")
      .eq("id", signInData.user.id)
      .single();

    // Determine redirect URL based on registration source
    const isUgcColombia = profile?.registration_source === "ugccolombia.co";
    const redirectUrl = isUgcColombia
      ? "https://kreoon.com/welcome/ugc-colombia"
      : "https://kreoon.com/marketplace";

    // 3. Generate magic link for seamless redirect
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: data.email.toLowerCase(),
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[public-login] Magic link error:", linkError);
      // Fallback: return success without magic link, user will need to login manually
      return new Response(
        JSON.stringify({
          success: true,
          message: "Credenciales válidas",
          redirect_url: "https://kreoon.com/auth",
          requires_manual_login: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Return the magic link for redirect
    console.log("[public-login] Login successful for:", data.email, "Redirecting to:", redirectUrl);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login exitoso",
        login_url: linkData.properties.action_link,
        redirect_url: redirectUrl,
        user_name: profile?.full_name || signInData.user.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[public-login] Error:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
