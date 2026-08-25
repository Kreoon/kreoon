// ============================================================================
// client-onboarding-send — envia el link de onboarding por correo (Resend)
// ============================================================================
//
// verify_jwt = true: la llama un admin/estratega desde el panel. Ademas del
// JWT se valida server-side que el caller sea staff de la organizacion DEL
// FORMULARIO (mismo patron que client-portal-invite).
//
// Recibe { form_id }. Destinatario = clients.contact_email (lo que el admin
// registro al crear la empresa). Devuelve { ok, sent_to }.
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const ROLES_HABILITADOS = [
  "admin",
  "team_leader",
  "strategist",
  "digital_strategist",
  "creative_strategist",
];

/** Dominio del front, hardcodeado como en send-invitation y client-portal-invite. */
const APP_URL = "https://kreoon.com";

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return json(req, { error: "sin_resend", message: "RESEND_API_KEY no configurada." }, 500);
  }

  const admin = createClient(url, serviceKey);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(req, { error: "unauthorized" }, 401);
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } = { user: null } } = await userClient.auth.getUser();
  if (!caller) return json(req, { error: "unauthorized" }, 401);

  let body: { form_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "invalid_json" }, 400);
  }
  const formId = body?.form_id;
  if (typeof formId !== "string" || !formId) {
    return json(req, { error: "form_id es requerido" }, 400);
  }

  const { data: form } = await admin
    .from("client_onboarding_forms")
    .select("id, organization_id, client_id, token, status, expires_at, claimed_at")
    .eq("id", formId)
    .maybeSingle();
  if (!form) return json(req, { error: "form_not_found" }, 404);

  const [memberRes, rolesRes] = await Promise.all([
    admin.from("organization_members").select("role")
      .eq("organization_id", form.organization_id).eq("user_id", caller.id).maybeSingle(),
    admin.from("organization_member_roles").select("role")
      .eq("organization_id", form.organization_id).eq("user_id", caller.id),
  ]);
  const roles = [
    memberRes.data?.role,
    ...((rolesRes.data ?? []) as { role: string }[]).map((r) => r.role),
  ].filter(Boolean) as string[];
  if (!roles.some((r) => ROLES_HABILITADOS.includes(r))) {
    return json(req, { error: "forbidden" }, 403);
  }

  if (form.status === "processed") {
    return json(req, { error: "ya_procesado", message: "Este formulario ya fue procesado." }, 409);
  }
  if (new Date(form.expires_at).getTime() <= Date.now()) {
    return json(req, { error: "vencido", message: "El link venció. Regenéralo primero." }, 409);
  }

  const [{ data: client }, { data: org }] = await Promise.all([
    admin.from("clients").select("name, contact_email, main_contact").eq("id", form.client_id).maybeSingle(),
    admin.from("organizations").select("name").eq("id", form.organization_id).maybeSingle(),
  ]);
  const destinatario = (client?.contact_email ?? "").trim().toLowerCase();
  if (!destinatario) {
    return json(
      req,
      { error: "sin_correo", message: "La empresa no tiene correo de contacto registrado." },
      422,
    );
  }

  const link = `${APP_URL}/onboarding/${form.token}`;
  const empresa = client?.name ?? "tu marca";
  const orgName = org?.name ?? "KREOON";
  const saludo = client?.main_contact ? `Hola ${escapeHtml(client.main_contact)},` : "Hola,";
  const yaTieneCuenta = !!form.claimed_at;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="color:#6d28d9;margin-bottom:8px">${escapeHtml(orgName)}</h2>
      <p>${saludo}</p>
      <p>Para arrancar con el contenido de <strong>${escapeHtml(empresa)}</strong> te dejamos tu link de Kreoon.
      ${yaTieneCuenta
        ? "Ahí continúas contándonos de tu marca y tu producto."
        : "Ahí creas tu acceso (toma 1 minuto) y nos cuentas de tu marca y tu producto."}
      Se guarda solo: puedes cerrarlo y seguir después sin perder nada.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#6d28d9;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">Abrir mi onboarding</a>
      </p>
      <p style="font-size:12px;color:#666">Si el botón no funciona, copia este enlace: <br><a href="${link}">${link}</a></p>
      <p style="font-size:12px;color:#666">El link vence el ${new Date(form.expires_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}.</p>
    </div>`;

  const resend = new Resend(resendKey);
  const { error: sendError } = await resend.emails.send({
    from: "KREOON <noreply@kreoon.com>",
    to: destinatario,
    subject: `${empresa}: tu acceso a Kreoon y el formulario de tu marca`,
    html,
  });
  if (sendError) {
    console.error("[client-onboarding-send] resend fallo:", sendError);
    return json(req, { error: "envio_fallo", message: "No se pudo enviar el correo." }, 500);
  }

  // Trazabilidad sin columna nueva: se anota en processing.envios (jsonb libre).
  const { data: actual } = await admin
    .from("client_onboarding_forms").select("processing").eq("id", form.id).maybeSingle();
  const processing = (actual?.processing ?? {}) as Record<string, unknown>;
  const envios = Array.isArray(processing.envios) ? processing.envios as unknown[] : [];
  await admin.from("client_onboarding_forms").update({
    processing: {
      ...processing,
      envios: [...envios, { canal: "email", a: destinatario, por: caller.id, en: new Date().toISOString() }].slice(-20),
    },
  }).eq("id", form.id);

  return json(req, { ok: true, sent_to: destinatario });
});
