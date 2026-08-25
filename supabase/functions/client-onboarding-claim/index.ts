// ============================================================================
// client-onboarding-claim — paso 0 del link: el cliente crea su cuenta
// ============================================================================
//
// verify_jwt = false: quien llama NO tiene cuenta todavia. La unica credencial
// es el token del link (64 hex), igual que client-onboarding-get / -submit.
//
// Recibe { token, email, password, full_name, accepted_document_ids[] } y:
//   1. Valida token (existe, no vencido, no procesado) y rate limit.
//   2. Rechaza si el link ya fue reclamado (409 already_claimed) o si el correo
//      ya tiene cuenta (409 email_exists — se vincula desde el panel, no aca:
//      sin login no hay forma de probar que el correo es suyo).
//   3. Exige la aceptacion de TODOS los documentos legales de registro del
//      tipo de cuenta 'client' (RPC list_registration_documents).
//   4. Crea el usuario en auth (email confirmado: el link llego al correo del
//      contacto que el admin registro), lo vincula a la org (rol client) y a la
//      empresa (client_users owner) ANTES de marcar el perfil completo — asi el
//      trigger auto_create_client_from_profile encuentra client_users y NO le
//      crea una segunda empresa con su nombre de persona.
//   5. Marca profiles.onboarding_completed = true (y profile/legal completed):
//      el representante de una empresa NO pasa por el gate Nova de datos
//      personales (fecha de nacimiento, cedula, IG personal...).
//   6. Registra los consentimientos en user_legal_consents con IP y user agent.
//   7. Guarda claimed_user_id en el formulario y precarga equipo.correo_portal.
//
// Devuelve { ok, user_id, email }. El frontend hace signInWithPassword con las
// mismas credenciales para quedar con sesion y seguir el wizard.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { getClientIp } from "../_shared/rate-limiter.ts";
import {
  checkOnboardingRateLimit,
  FAILURE_MESSAGES,
  isWellFormedToken,
  listRegistrationDocuments,
  loadFormByToken,
  MAX_PAYLOAD_BYTES,
  nombreContactoDelFormulario,
} from "../_shared/client-onboarding.ts";

/** Limite por token+IP: 10 intentos cada 10 min, bloqueo de 15 min. */
const RL_MAX_ATTEMPTS = 10;
const RL_WINDOW_MINUTES = 10;
const RL_BLOCK_MINUTES = 15;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "method_not_allowed" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return jsonResponse(req, { error: "payload_too_large" }, 413);
  }

  let body: {
    token?: unknown;
    email?: unknown;
    password?: unknown;
    full_name?: unknown;
    accepted_document_ids?: unknown;
  };
  try {
    body = await req.json();
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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ip = getClientIp(req);
  const rl = await checkOnboardingRateLimit(
    admin,
    `${token}:${ip}`,
    "onboarding_claim",
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

  const result = await loadFormByToken(admin, token);
  if (!result.ok) {
    return jsonResponse(
      req,
      { error: result.code, message: FAILURE_MESSAGES[result.code] },
      result.status,
    );
  }
  const { form } = result;

  if (form.claimed_user_id) {
    return jsonResponse(
      req,
      {
        error: "already_claimed",
        message:
          "Este enlace ya tiene una cuenta creada. Inicia sesión con ese correo para continuar.",
      },
      409,
    );
  }

  // ── Validacion de campos ─────────────────────────────────────────────────
  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.full_name === "string"
    ? body.full_name.replace(/<[^>]*>/g, "").trim().slice(0, 120)
    : "";
  const acceptedIds = Array.isArray(body.accepted_document_ids)
    ? (body.accepted_document_ids as unknown[]).filter((v) =>
      typeof v === "string"
    ) as string[]
    : [];

  const camposInvalidos: string[] = [];
  if (!EMAIL_RE.test(email) || email.length > 254) camposInvalidos.push("email");
  if (password.length < MIN_PASSWORD || password.length > 72) {
    camposInvalidos.push("password");
  }
  if (fullName.length < 2) camposInvalidos.push("full_name");
  if (camposInvalidos.length > 0) {
    return jsonResponse(
      req,
      {
        error: "invalid_fields",
        message: "Revisa los datos: correo válido, contraseña de mínimo 8 caracteres y tu nombre.",
        fields: camposInvalidos,
      },
      400,
    );
  }

  // ── Consentimientos legales obligatorios ─────────────────────────────────
  const documentos = await listRegistrationDocuments(admin, "client");
  const faltantes = documentos
    .filter((d) => !acceptedIds.includes(d.id))
    .map((d) => d.id);
  if (faltantes.length > 0) {
    return jsonResponse(
      req,
      {
        error: "missing_consents",
        message: "Debes aceptar todos los documentos para continuar.",
        missing_document_ids: faltantes,
      },
      422,
    );
  }

  // ── El correo no puede tener cuenta ya ───────────────────────────────────
  const { data: perfilExistente } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (perfilExistente?.id) {
    return jsonResponse(
      req,
      {
        error: "email_exists",
        message:
          "Ese correo ya tiene cuenta en Kreoon. Inicia sesión y pídele al equipo que te vincule a la empresa.",
      },
      409,
    );
  }

  // ── Crear usuario ────────────────────────────────────────────────────────
  const { data: creado, error: createError } = await admin.auth.admin
    .createUser({
      email,
      password,
      // El link llego al correo que el admin registro para la empresa: no se
      // pide una segunda confirmacion por email.
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        user_type: "client",
        pending_org_id: form.organization_id,
        pending_org_role: "client",
        pending_client_id: form.client_id,
      },
    });

  if (createError || !creado?.user?.id) {
    const msg = createError?.message ?? "sin id";
    if (/already|registered|exists/i.test(msg)) {
      return jsonResponse(
        req,
        {
          error: "email_exists",
          message:
            "Ese correo ya tiene cuenta en Kreoon. Inicia sesión y pídele al equipo que te vincule a la empresa.",
        },
        409,
      );
    }
    console.error("[client-onboarding-claim] createUser fallo:", msg);
    return jsonResponse(
      req,
      { error: "create_failed", message: "No pudimos crear tu cuenta. Intenta de nuevo." },
      500,
    );
  }

  const userId = creado.user.id;
  const ahora = new Date().toISOString();

  // ── Vinculos (ANTES de marcar el perfil completo, ver cabecera) ──────────
  // NO se usa register_user_to_organization: exige auth.uid() = p_user_id y
  // aca corremos con service role (auth.uid() NULL). Mismo patron que
  // client-portal-invite.
  await admin.from("organization_members").upsert(
    {
      organization_id: form.organization_id,
      user_id: userId,
      role: "client",
      is_owner: false,
    },
    { onConflict: "organization_id,user_id", ignoreDuplicates: true },
  );
  await admin.from("organization_member_roles").upsert(
    { organization_id: form.organization_id, user_id: userId, role: "client" },
    { onConflict: "organization_id,user_id,role", ignoreDuplicates: true },
  );
  const { error: cuError } = await admin.from("client_users").upsert(
    {
      client_id: form.client_id,
      user_id: userId,
      role: "owner",
      created_by: userId,
    },
    { onConflict: "client_id,user_id", ignoreDuplicates: true },
  );
  if (cuError) {
    console.error("[client-onboarding-claim] client_users fallo:", cuError.message);
  }

  // ── Perfil: completo de una vez (sin gate Nova) ──────────────────────────
  const equipo = (form.form_data.equipo ?? {}) as Record<string, unknown>;
  const aprobador = (equipo.aprobador ?? {}) as Record<string, unknown>;
  const celular = typeof aprobador.celular === "string"
    ? aprobador.celular.trim()
    : null;

  const { error: perfilError } = await admin.from("profiles").update({
    email,
    full_name: fullName,
    phone: celular || null,
    user_type: "client",
    active_role: "client",
    current_organization_id: form.organization_id,
    organization_status: "active",
    is_active: true,
    profile_completed: true,
    profile_completed_at: ahora,
    legal_consents_completed: true,
    legal_consents_completed_at: ahora,
    onboarding_completed: true,
    onboarding_completed_at: ahora,
    platform_access_unlocked: true,
    updated_at: ahora,
  }).eq("id", userId);
  if (perfilError) {
    console.error("[client-onboarding-claim] profiles fallo:", perfilError.message);
  }

  // ── Consentimientos ──────────────────────────────────────────────────────
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);
  const filasConsent = documentos.map((d) => ({
    user_id: userId,
    document_id: d.id,
    document_type: d.document_type,
    document_version: d.version,
    accepted: true,
    accepted_at: ahora,
    ip_address: ip && ip !== "unknown" ? ip : null,
    user_agent: userAgent || null,
    consent_method: "clickwrap",
    is_current: true,
  }));
  if (filasConsent.length > 0) {
    const { error: consentError } = await admin
      .from("user_legal_consents")
      .upsert(filasConsent, { onConflict: "user_id,document_id" });
    if (consentError) {
      console.error(
        "[client-onboarding-claim] user_legal_consents fallo:",
        consentError.message,
      );
    }
  }

  // ── Formulario: reclamado + correo del portal precargado ─────────────────
  const nombreContacto = nombreContactoDelFormulario(form.form_data);
  const nuevoEquipo = {
    ...equipo,
    correo_portal: email,
    aprobador: {
      ...aprobador,
      ...(nombreContacto ? {} : { nombre: fullName }),
      ...(typeof aprobador.correo === "string" && aprobador.correo.trim()
        ? {}
        : { correo: email }),
    },
  };
  await admin.from("client_onboarding_forms").update({
    claimed_user_id: userId,
    claimed_at: ahora,
    form_data: { ...form.form_data, equipo: nuevoEquipo },
    status: form.status === "pending" ? "in_progress" : form.status,
    portal_invite: {
      estado: "cuenta_creada",
      correo: email,
      user_id: userId,
      invitado_en: ahora,
      detalle: "El cliente creó su cuenta desde el link de onboarding.",
    },
  }).eq("id", form.id);

  return jsonResponse(req, { ok: true, user_id: userId, email });
});
