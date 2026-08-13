// ============================================================================
// client-onboarding-submit — escritura publica del formulario de onboarding
// ============================================================================
//
// verify_jwt = false: el cliente que llena el formulario NO tiene cuenta.
// La unica credencial es el token del link.
//
// Dos modos:
//   { token, section, data }  -> guarda/mergea esa seccion, status in_progress
//   { token, final: true }    -> valida obligatorios, marca submitted, notifica
//                                 y arranca pipeline-orchestrator (accion
//                                 "start") en la PRIMERA transicion a submitted.
//
// El submit final NO toca la tabla `clients`. El volcado de los datos a
// clients/products es un paso manual posterior del admin (status -> processed).
//
// Arranque del pipeline: acá no hay sesion de usuario (formulario publico sin
// login), asi que se invoca con el service role -- `start` ya lo acepta como
// `esServiceRole`. Es fire-and-forget dentro de un try/catch: si el pipeline
// falla, el submit YA se guardo arriba y no se revierte por esto.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { getClientIp } from "../_shared/rate-limiter.ts";
import {
  checkOnboardingRateLimit,
  FAILURE_MESSAGES,
  findMissingRequiredFields,
  isWellFormedToken,
  loadFormByToken,
  MAX_PAYLOAD_BYTES,
  sanitizeDeep,
  VALID_SECTIONS,
} from "../_shared/client-onboarding.ts";

/** Limite de escrituras por token+IP: 60 cada 10 min (hay autosave por seccion). */
const RL_MAX_ATTEMPTS = 60;
const RL_WINDOW_MINUTES = 10;
const RL_BLOCK_MINUTES = 10;

/**
 * Roles de la organizacion que reciben la notificacion de "onboarding enviado".
 * Incluye los nombres legacy y los canonicos actuales por la misma razon que la
 * politica RLS de la migracion: en produccion no existe ninguna fila con
 * 'team_leader' ni 'strategist', los estrategas reales son digital_strategist
 * y creative_strategist.
 */
const NOTIFY_ROLES = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/**
 * type de user_notifications. Se reusa 'content_update' A PROPOSITO:
 * la columna es TEXT libre en la BD, pero el frontend indexa
 * PLATFORM_NOTIFICATION_MAP[type] SIN fallback (KiroNotificationBridge.ts).
 * Un type no mapeado da `undefined` y revienta con TypeError; en el fetch por
 * lote, una sola fila mala tumba las 50 notificaciones de esa carga. Por eso
 * NO se inventa un type nuevo aqui. `entity_type` es quien discrimina.
 */
const NOTIFICATION_TYPE = "content_update";
const NOTIFICATION_ENTITY_TYPE = "client_onboarding";

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
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

/** Inserta una notificacion in-app por cada admin/estratega de la organizacion. */
async function notifyOrgStaff(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  organizationId: string,
  formId: string,
  clientName: string | null,
): Promise<void> {
  const { data: members, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .in("role", NOTIFY_ROLES);

  if (error) {
    console.error("[client-onboarding-submit] error listando staff:", error.message);
    return;
  }

  const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
  if (userIds.length === 0) {
    console.warn(
      "[client-onboarding-submit] sin staff a notificar en org:",
      organizationId,
    );
    return;
  }

  const nombre = clientName ?? "Un cliente";
  const rows = userIds.map((userId) => ({
    user_id: userId,
    organization_id: organizationId,
    type: NOTIFICATION_TYPE,
    title: "Onboarding completado",
    message: `${nombre} terminó de llenar su formulario de onboarding.`,
    entity_type: NOTIFICATION_ENTITY_TYPE,
    entity_id: formId,
  }));

  const { error: insertError } = await supabase
    .from("user_notifications")
    .insert(rows);

  if (insertError) {
    // No se revierte el submit por esto: el cliente ya cumplio su parte.
    console.error(
      "[client-onboarding-submit] error insertando notificaciones:",
      insertError.message,
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);

  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return jsonResponse(req, { error: "payload_too_large" }, 413);
  }

  // Segundo corte: content-length puede mentir o venir ausente.
  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).length > MAX_PAYLOAD_BYTES) {
    return jsonResponse(req, { error: "payload_too_large" }, 413);
  }

  let body: { token?: unknown; section?: unknown; data?: unknown; final?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse(req, { error: "invalid_json" }, 400);
  }

  const token = body?.token;
  if (!isWellFormedToken(token)) {
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
    "onboarding_submit",
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

  // ── Modo 2: envio final ────────────────────────────────────────────────
  if (body.final === true) {
    const missing = findMissingRequiredFields(form.form_data);
    if (missing.length > 0) {
      return jsonResponse(
        req,
        {
          error: "missing_required_fields",
          message: "Faltan datos obligatorios por llenar.",
          missing_fields: missing,
        },
        422,
      );
    }

    // Reenvio idempotente: se conserva el submitted_at original.
    const isFirstSubmission = form.submitted_at === null;

    const { error: updateError } = await supabase
      .from("client_onboarding_forms")
      .update({
        status: "submitted",
        submitted_at: form.submitted_at ?? new Date().toISOString(),
      })
      .eq("id", form.id);

    if (updateError) {
      console.error("[client-onboarding-submit] error en submit final:", updateError.message);
      return jsonResponse(req, { error: "update_failed" }, 500);
    }

    // Solo se notifica en la PRIMERA transicion a submitted, para que un
    // reenvio no genere una avalancha de notificaciones repetidas.
    if (isFirstSubmission) {
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", form.client_id)
        .maybeSingle();

      await notifyOrgStaff(supabase, form.organization_id, form.id, client?.name ?? null);

      // Arranca el pipeline autonomo del cliente. Mismo patron que el paso 4
      // de client-onboarding-process (commit c27e144f): fire-and-forget, un
      // fallo acá NO tumba el submit que ya se guardo arriba.
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const pipelineRes = await fetch(
          `${supabaseUrl}/functions/v1/pipeline-orchestrator`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Sin sesion de usuario en este formulario publico: el service
              // role es la unica credencial disponible. `start` la acepta
              // como `esServiceRole` y no exige ser staff en ese caso.
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              action: "start",
              client_id: form.client_id,
              organization_id: form.organization_id,
              onboarding_form_id: form.id,
            }),
          },
        );
        if (!pipelineRes.ok) {
          const payload = await pipelineRes.json().catch(() => ({}));
          console.error(
            "[client-onboarding-submit] pipeline-orchestrator respondio con error:",
            payload.message ?? payload.error ?? `HTTP ${pipelineRes.status}`,
          );
        }
      } catch (e) {
        console.error(
          "[client-onboarding-submit] no se pudo arrancar el pipeline:",
          (e as Error).message,
        );
      }
    }

    return jsonResponse(req, { ok: true, status: "submitted" });
  }

  // ── Modo 1: guardado por seccion ───────────────────────────────────────
  const section = body.section;
  if (
    typeof section !== "string" ||
    !(VALID_SECTIONS as readonly string[]).includes(section)
  ) {
    return jsonResponse(
      req,
      {
        error: "invalid_section",
        message: "Sección no válida.",
        valid_sections: VALID_SECTIONS,
      },
      400,
    );
  }

  if (
    body.data === null ||
    typeof body.data !== "object" ||
    Array.isArray(body.data)
  ) {
    return jsonResponse(
      req,
      { error: "invalid_data", message: "El contenido de la sección debe ser un objeto." },
      400,
    );
  }

  const sanitized = sanitizeDeep(body.data) as Record<string, unknown>;
  const previous = (form.form_data ?? {}) as Record<string, unknown>;
  const previousSection = (previous[section] ?? {}) as Record<string, unknown>;

  const nextFormData = {
    ...previous,
    [section]: { ...previousSection, ...sanitized },
  };

  const { error: updateError } = await supabase
    .from("client_onboarding_forms")
    .update({
      form_data: nextFormData,
      // Solo avanza pending -> in_progress. Si ya estaba submitted, se respeta
      // (el cliente puede seguir corrigiendo hasta que el admin lo procese).
      status: form.status === "pending" ? "in_progress" : form.status,
    })
    .eq("id", form.id);

  if (updateError) {
    console.error("[client-onboarding-submit] error guardando seccion:", updateError.message);
    return jsonResponse(req, { error: "update_failed" }, 500);
  }

  return jsonResponse(req, {
    ok: true,
    section,
    status: form.status === "pending" ? "in_progress" : form.status,
  });
});
