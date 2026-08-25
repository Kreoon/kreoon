// ============================================================================
// client-onboarding-get — lectura publica del formulario de onboarding
// ============================================================================
//
// verify_jwt = false: el cliente que llena el formulario NO tiene cuenta ni
// sesion. La unica credencial es el token del link.
//
// NO existe fallback a un SELECT directo con la anon key (el anti-patron que
// tiene org-public-info): la tabla client_onboarding_forms no expone NINGUNA
// politica a anon, asi que este endpoint con service role es la unica puerta.
//
// Devuelve el minimo necesario para pintar el formulario:
// nombre del cliente, branding de la organizacion, form_data guardado
// (para reanudar) y status. Nada de ids internos.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { getClientIp } from "../_shared/rate-limiter.ts";
import {
  checkOnboardingRateLimit,
  correoPortalDelFormulario,
  FAILURE_MESSAGES,
  isWellFormedToken,
  listRegistrationDocuments,
  loadFormByToken,
  MAX_PAYLOAD_BYTES,
  nombreContactoDelFormulario,
} from "../_shared/client-onboarding.ts";

/** Limite de lecturas por token+IP: 30 cada 10 min, bloqueo de 10 min. */
const RL_MAX_ATTEMPTS = 30;
const RL_WINDOW_MINUTES = 10;
const RL_BLOCK_MINUTES = 10;

function jsonResponse(
  req: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      // El payload lleva datos del cliente: que no quede en caches intermedias.
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  // Corte por tamano antes de leer el body.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return jsonResponse(req, { error: "payload_too_large" }, 413);
  }

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, { error: "invalid_json" }, 400);
  }

  const token = body?.token;
  if (!isWellFormedToken(token)) {
    // Mismo mensaje que un token inexistente: no se distingue "mal formado"
    // de "no existe" para no dar senal util a quien pruebe tokens.
    return jsonResponse(
      req,
      { error: "invalid_token", message: FAILURE_MESSAGES.invalid_token },
      404,
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = getClientIp(req);
  const rl = await checkOnboardingRateLimit(
    supabase,
    `${token}:${ip}`,
    "onboarding_get",
    RL_MAX_ATTEMPTS,
    RL_WINDOW_MINUTES,
    RL_BLOCK_MINUTES,
  );
  if (!rl.allowed) {
    return jsonResponse(
      req,
      {
        error: "rate_limit_exceeded",
        message: `Demasiados intentos. Espera ${rl.retryAfterSeconds} segundos.`,
        retry_after_seconds: rl.retryAfterSeconds,
      },
      429,
      { "Retry-After": String(rl.retryAfterSeconds) },
    );
  }

  const result = await loadFormByToken(supabase, token);
  if (!result.ok) {
    return jsonResponse(
      req,
      { error: result.code, message: FAILURE_MESSAGES[result.code] },
      result.status,
    );
  }

  const { form } = result;

  // Branding: nombre del cliente + identidad de la organizacion. Los
  // documentos legales solo hacen falta si el link aun no tiene cuenta.
  const [clientRes, orgRes, documentos] = await Promise.all([
    supabase
      .from("clients")
      .select("name, contact_email, main_contact")
      .eq("id", form.client_id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("name, logo_url")
      .eq("id", form.organization_id)
      .maybeSingle(),
    form.claimed_user_id
      ? Promise.resolve([])
      : listRegistrationDocuments(supabase, "client"),
  ]);

  // Precarga del paso 0 ("Tu acceso"): lo que el admin ya registro.
  const formData = (form.form_data ?? {}) as Record<string, unknown>;
  const emailPrecargado = correoPortalDelFormulario(formData) ??
    (clientRes.data?.contact_email
      ? String(clientRes.data.contact_email).trim().toLowerCase()
      : null);
  const nombrePrecargado = nombreContactoDelFormulario(formData) ??
    (clientRes.data?.main_contact ? String(clientRes.data.main_contact) : null);

  return jsonResponse(req, {
    client: { name: clientRes.data?.name ?? null },
    organization: {
      name: orgRes.data?.name ?? null,
      logo_url: orgRes.data?.logo_url ?? null,
    },
    status: form.status,
    form_data: formData,
    expires_at: form.expires_at,
    account: {
      claimed: !!form.claimed_user_id,
      email: emailPrecargado,
      full_name: nombrePrecargado,
    },
    legal_documents: documentos,
  });
});
