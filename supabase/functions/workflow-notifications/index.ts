import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getOrgEmailConfig } from "../_shared/resend-client.ts";

/**
 * Workflow Notifications
 *
 * Called by DB triggers (via pg_net) when workflow events happen.
 *
 * BRANDING RULES:
 *   - Internal workflow (content assigned/recorded/approved/issue):
 *     → Organization branding (logo, name, colors)
 *   - Marketplace events (application approved, project created):
 *     → KREOON platform branding
 *
 * Notifications:
 *   Creator: content assigned, content approved, application approved, project created
 *   Editor:  content recorded (ready for editing)
 *   Issues:  notify responsible party
 *   Client:  script_pending, content_delivered, content_corrected (WhatsApp real-time)
 */

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const KREOON_LOGO = '<img src="https://kreoon.com/favicon.png" alt="KREOON" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px" />';
const FROM = "KREOON <noreply@kreoon.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrgBranding {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface NotificationPayload {
  type:
    | "content_assigned"
    | "content_recorded"
    | "content_approved"
    | "content_issue"
    | "project_created"
    | "script_pending"
    | "content_delivered"
    | "content_corrected";
  record: Record<string, any>;
  old_record?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log(`[workflow-notifications] type=${payload.type}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const result = await handleNotification(supabase, payload);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[workflow-notifications] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleNotification(
  supabase: any,
  payload: NotificationPayload
): Promise<{ sent: boolean; to?: string }> {
  switch (payload.type) {
    case "content_assigned":
      return notifyContentAssigned(supabase, payload.record);
    case "content_recorded":
      return notifyContentRecorded(supabase, payload.record);
    case "content_approved":
      return notifyContentApproved(supabase, payload.record);
    case "content_issue":
      return notifyContentIssue(supabase, payload.record, payload.old_record);
    case "project_created":
      return notifyProjectCreated(supabase, payload.record);
    case "script_pending":
      return notifyScriptPending(supabase, payload.record);
    case "content_delivered":
      return notifyContentDelivered(supabase, payload.record);
    case "content_corrected":
      return notifyContentCorrected(supabase, payload.record);
    default:
      console.log(`[workflow-notifications] Unknown type: ${(payload as any).type}`);
      return { sent: false };
  }
}

// ─── Helpers ──────────────────────────────────────────────

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name, phone, whatsapp_phone, whatsapp_enabled")
    .eq("id", userId)
    .single();
  if (!data) return null;
  // phone es el WhatsApp del usuario (campo unificado); whatsapp_phone puede sobreescribir
  return {
    ...data,
    whatsapp_phone: data.whatsapp_phone || data.phone,
  };
}

async function getOrgBranding(supabase: any, orgId: string): Promise<OrgBranding> {
  const { data } = await supabase
    .from("organizations")
    .select("name, logo_url, primary_color")
    .eq("id", orgId)
    .single();

  return {
    name: data?.name || "Tu organización",
    logo_url: data?.logo_url || null,
    primary_color: data?.primary_color || "#8b5cf6",
  };
}

async function getClientName(supabase: any, clientId: string) {
  const { data } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();
  return data?.name || "Cliente";
}

/**
 * Retorna todos los números WhatsApp de miembros del cliente que tienen whatsapp_notify=true.
 * Respeta el master switch whatsapp_enabled de cada perfil.
 * Fallback: si ninguno está configurado, usa el teléfono directo del cliente.
 */
async function getClientWhatsAppRecipients(
  supabase: any,
  clientId: string
): Promise<string[]> {
  // 1. Buscar miembros con whatsapp_notify activo
  const { data: notifyUsers } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId)
    .eq("whatsapp_notify", true);

  if (notifyUsers && notifyUsers.length > 0) {
    const userIds = notifyUsers.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("whatsapp_phone, whatsapp_enabled, phone")
      .in("id", userIds);

    const phones = (profiles || [])
      .filter((p: any) => p.whatsapp_enabled !== false)
      .map((p: any) => p.whatsapp_phone || p.phone)
      .filter(Boolean);

    if (phones.length > 0) return phones;
  }

  // 2. Fallback: teléfono directo del cliente (comportamiento anterior)
  const { data: client } = await supabase
    .from("clients")
    .select("contact_phone, whatsapp_phone, whatsapp_enabled, user_id")
    .eq("id", clientId)
    .single();

  const clientPhone = client?.whatsapp_phone || client?.contact_phone;
  if (clientPhone && client?.whatsapp_enabled !== false) {
    return [clientPhone];
  }

  // 3. Fallback final: primer usuario del cliente
  const { data: firstUser } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId)
    .limit(1)
    .single();

  const fallbackId = firstUser?.user_id || client?.user_id;
  if (!fallbackId) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("whatsapp_phone, whatsapp_enabled, phone")
    .eq("id", fallbackId)
    .single();

  const fallbackPhone = profile?.whatsapp_phone || profile?.phone;
  if (fallbackPhone && profile?.whatsapp_enabled !== false) {
    return [fallbackPhone];
  }

  return [];
}

/** Envía un mensaje WhatsApp usando plantilla Meta aprobada */
async function sendWhatsApp(
  phone: string | null | undefined,
  variables: string[],
  event_type: string,
  entity_id?: string
): Promise<void> {
  if (!phone) return;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    await fetch(`${supabaseUrl}/functions/v1/whatsapp-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ phone, variables, event_type, entity_id }),
    });
  } catch (err) {
    console.error(`[workflow-notifications] WhatsApp send error (${event_type}):`, err);
  }
}

async function insertNotification(
  supabase: any,
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link,
  });
}

async function sendAndNotify(
  supabase: any,
  userId: string,
  email: string,
  subject: string,
  htmlBody: string,
  notifType: string,
  notifTitle: string,
  notifMessage: string,
  link?: string,
  senderFrom?: string
): Promise<{ sent: boolean; to: string }> {
  try {
    await resend.emails.send({ from: senderFrom || FROM, to: [email], subject, html: htmlBody });
  } catch (err) {
    console.error(`[workflow-notifications] Email to ${email} failed:`, err);
  }

  await insertNotification(supabase, userId, notifType, notifTitle, notifMessage, link);

  return { sent: true, to: email };
}

// ─── Email Template Builders ─────────────────────────────

function buildLogoHtml(branding: OrgBranding): string {
  if (branding.logo_url) {
    return `<img src="${branding.logo_url}" alt="${branding.name}" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px;object-fit:cover" />`;
  }
  const initial = branding.name.charAt(0).toUpperCase();
  const color = branding.primary_color || "#8b5cf6";
  return `<div style="width:48px;height:48px;border-radius:12px;background:${color};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#fff;font-size:24px;font-weight:700;line-height:48px;text-align:center">${initial}</div>`;
}

function wrapOrgEmail(title: string, body: string, branding: OrgBranding): string {
  const color = branding.primary_color || "#8b5cf6";
  const gradientEnd = adjustColor(color, -20);
  const logo = buildLogoHtml(branding);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:32px">${logo}<h1 style="color:#fff;font-size:22px;margin:0">${title}</h1></div>${body}<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:20px;text-align:center"><p style="color:#64748b;font-size:12px;margin:0">${branding.name}</p><p style="color:#475569;font-size:11px;margin:8px 0 0">Este es un mensaje automático. No respondas a este correo.</p></div></div></div></body></html>`;
}

function wrapKreoonEmail(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:32px">${KREOON_LOGO}<h1 style="color:#fff;font-size:22px;margin:0">${title}</h1></div>${body}<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:20px;text-align:center"><p style="color:#64748b;font-size:12px;margin:0">KREOON - Tu sistema operativo para creadores</p><p style="color:#475569;font-size:11px;margin:8px 0 0">Este es un mensaje automático. No respondas a este correo.</p></div></div></div></body></html>`;
}

function ctaButton(text: string, href: string, color?: string): string {
  const bg = color || "#8b5cf6";
  return `<div style="text-align:center;margin:28px 0"><a href="${href}" style="background:${bg};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${text}</a></div>`;
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ─── INTERNAL WORKFLOW — Org Branding ────────────────────

async function notifyContentAssigned(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const creatorId = record.creator_id;
  if (!creatorId) return { sent: false };

  const profile = await getProfile(supabase, creatorId);
  if (!profile?.email) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";
  const clientName = record.client_id
    ? await getClientName(supabase, record.client_id)
    : "un cliente";

  const color = orgBranding.primary_color || "#8b5cf6";

  // WhatsApp — plantilla content_assigned: {{1}}=creator_name {{2}}=title {{3}}=org {{4}}=client
  await sendWhatsApp(
    profile.whatsapp_enabled ? profile.whatsapp_phone : null,
    [profile.full_name || "Creador", title, orgBranding.name, clientName],
    "content_assigned",
    record.id
  );

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || "Creador"}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Se te ha asignado un nuevo contenido para grabar:</p><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${color}"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${title}</p><p style="color:#94a3b8;font-size:13px;margin:0">Cliente: ${clientName}</p></div>${ctaButton("Ver en Tablero", "https://kreoon.com/board", color)}`;

  const html = wrapOrgEmail("Nuevo contenido asignado", body, orgBranding);
  const emailConfig = await getOrgEmailConfig(supabase, record.organization_id);

  return sendAndNotify(
    supabase, creatorId, profile.email,
    `${orgBranding.name} — Nuevo contenido: ${title}`,
    html,
    "content_assigned",
    "Contenido asignado",
    `Se te asignó "${title}" de ${clientName}`,
    "/board",
    emailConfig.from
  );
}

async function notifyContentRecorded(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const editorId = record.editor_id;
  if (!editorId) return { sent: false };

  const profile = await getProfile(supabase, editorId);
  if (!profile?.email) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";
  const color = orgBranding.primary_color || "#8b5cf6";

  let creatorName = "el creador";
  if (record.creator_id) {
    const creatorProfile = await getProfile(supabase, record.creator_id);
    if (creatorProfile?.full_name) creatorName = creatorProfile.full_name;
  }

  // WhatsApp — plantilla content_recorded: {{1}}=editor_name {{2}}=title {{3}}=org {{4}}=creator_name
  await sendWhatsApp(
    profile.whatsapp_enabled ? profile.whatsapp_phone : null,
    [profile.full_name || "Editor", title, orgBranding.name, creatorName],
    "content_recorded",
    record.id
  );

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || "Editor"}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Hay contenido grabado listo para que inicies el proceso de edición:</p><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${color}"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${title}</p><p style="color:#94a3b8;font-size:13px;margin:0">Grabado por: ${creatorName}</p></div>${ctaButton("Iniciar Edición", "https://kreoon.com/board", color)}`;

  const html = wrapOrgEmail("Contenido listo para editar", body, orgBranding);
  const emailConfig = await getOrgEmailConfig(supabase, record.organization_id);

  return sendAndNotify(
    supabase, editorId, profile.email,
    `${orgBranding.name} — Para editar: ${title}`,
    html,
    "content_recorded",
    "Contenido para editar",
    `"${title}" fue grabado por ${creatorName} y está listo para edición`,
    "/board",
    emailConfig.from
  );
}

async function notifyContentApproved(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const creatorId = record.creator_id;
  if (!creatorId) return { sent: false };

  const profile = await getProfile(supabase, creatorId);
  if (!profile?.email) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";

  // WhatsApp — plantilla content_approved: {{1}}=creator_name {{2}}=title
  await sendWhatsApp(
    profile.whatsapp_enabled ? profile.whatsapp_phone : null,
    [profile.full_name || "Creador", title],
    "content_approved",
    record.id
  );

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || "Creador"}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Tu contenido ha sido aprobado por el cliente:</p><div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:8px;padding:16px;margin:16px 0"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${title}</p><p style="color:#22c55e;font-size:14px;margin:0;font-weight:500">Aprobado</p></div>${ctaButton("Ver Detalles", "https://kreoon.com/board", orgBranding.primary_color || "#8b5cf6")}`;

  const html = wrapOrgEmail("Contenido aprobado", body, orgBranding);
  const emailConfig = await getOrgEmailConfig(supabase, record.organization_id);

  return sendAndNotify(
    supabase, creatorId, profile.email,
    `${orgBranding.name} — Contenido aprobado: ${title}`,
    html,
    "content_approved",
    "Contenido aprobado",
    `"${title}" ha sido aprobado`,
    "/board",
    emailConfig.from
  );
}

async function notifyContentIssue(
  supabase: any,
  record: Record<string, any>,
  oldRecord?: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const previousStatus = oldRecord?.status;
  let targetUserId: string | null = null;
  let role = "equipo";

  if (
    previousStatus === "delivered" ||
    previousStatus === "corrected" ||
    previousStatus === "approved"
  ) {
    targetUserId = record.editor_id;
    role = "Editor";
  } else if (previousStatus === "editing") {
    targetUserId = record.creator_id;
    role = "Creador";
  }

  if (!targetUserId) return { sent: false };

  const profile = await getProfile(supabase, targetUserId);
  if (!profile?.email) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";

  // WhatsApp — plantilla content_issue: {{1}}=user_name {{2}}=title {{3}}=org
  await sendWhatsApp(
    profile.whatsapp_enabled ? profile.whatsapp_phone : null,
    [profile.full_name || role, title, orgBranding.name],
    "content_issue",
    record.id
  );

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || role}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Se ha reportado una novedad en el siguiente contenido que requiere tu atención:</p><div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:16px;margin:16px 0"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${title}</p><p style="color:#f59e0b;font-size:14px;margin:0;font-weight:500">Novedad reportada</p></div>${ctaButton("Ver Novedad", "https://kreoon.com/board", orgBranding.primary_color || "#8b5cf6")}`;

  const html = wrapOrgEmail("Novedad en contenido", body, orgBranding);
  const emailConfig = await getOrgEmailConfig(supabase, record.organization_id);

  return sendAndNotify(
    supabase, targetUserId, profile.email,
    `${orgBranding.name} — Novedad: ${title}`,
    html,
    "content_issue",
    "Novedad en contenido",
    `"${title}" tiene una novedad que necesita tu atención`,
    "/board",
    emailConfig.from
  );
}

// ─── EVENTOS CLIENTE — WhatsApp real-time ────────────────

/**
 * Cliente recibe WhatsApp cuando el guión está listo para revisar (script_pending)
 */
async function notifyScriptPending(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const clientId = record.client_id;
  if (!clientId) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";
  const waPhones = await getClientWhatsAppRecipients(supabase, clientId);

  // WhatsApp — plantilla script_pending: {{1}}=content_title {{2}}=org_name
  for (const phone of waPhones) {
    await sendWhatsApp(phone, [title, orgBranding.name], "script_pending", record.id);
  }

  // In-app notification para el cliente
  const { data: clientUsers } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId);

  for (const cu of (clientUsers || [])) {
    await insertNotification(
      supabase,
      cu.user_id,
      "script_ready",
      "Guión listo para revisar",
      `El guión de "${title}" está listo para tu aprobación.`,
      "/dashboard"
    );
  }

  return { sent: true };
}

/**
 * Cliente recibe WhatsApp cuando el contenido es entregado (delivered)
 */
async function notifyContentDelivered(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const clientId = record.client_id;
  if (!clientId) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";
  const waPhones = await getClientWhatsAppRecipients(supabase, clientId);

  // WhatsApp — plantilla content_delivered: {{1}}=content_title {{2}}=org_name
  for (const phone of waPhones) {
    await sendWhatsApp(phone, [title, orgBranding.name], "content_delivered", record.id);
  }

  const { data: clientUsers } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId);

  for (const cu of (clientUsers || [])) {
    await insertNotification(
      supabase,
      cu.user_id,
      "content_delivered",
      "Contenido entregado",
      `"${title}" fue entregado y está listo para tu revisión.`,
      "/dashboard"
    );
  }

  return { sent: true };
}

/**
 * Cliente recibe WhatsApp cuando el contenido es corregido (corrected)
 */
async function notifyContentCorrected(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const clientId = record.client_id;
  if (!clientId) return { sent: false };

  const orgBranding = record.organization_id
    ? await getOrgBranding(supabase, record.organization_id)
    : { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };

  const title = record.title || "Sin título";
  const waPhones = await getClientWhatsAppRecipients(supabase, clientId);

  // WhatsApp — plantilla content_corrected: {{1}}=content_title {{2}}=org_name
  for (const phone of waPhones) {
    await sendWhatsApp(phone, [title, orgBranding.name], "content_corrected", record.id);
  }

  const { data: clientUsers } = await supabase
    .from("client_users")
    .select("user_id")
    .eq("client_id", clientId);

  for (const cu of (clientUsers || [])) {
    await insertNotification(
      supabase,
      cu.user_id,
      "content_corrected",
      "Contenido corregido",
      `"${title}" fue corregido y tiene una nueva versión disponible.`,
      "/dashboard"
    );
  }

  return { sent: true };
}

// ─── MARKETPLACE — KREOON Branding ──────────────────────

async function notifyProjectCreated(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  const creatorId = record.creator_id;
  if (!creatorId) return { sent: false };

  const profile = await getProfile(supabase, creatorId);
  if (!profile?.email) return { sent: false };

  let brandName = "una empresa";
  if (record.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("name")
      .eq("id", record.brand_id)
      .single();
    if (brand?.name) brandName = brand.name;
  }

  const projectTitle = record.title || "Nuevo proyecto";

  // Sin plantilla Meta para project_created — omitido por ahora

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || "Creador"}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Una empresa te ha contratado para un proyecto en el marketplace:</p><div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:8px;padding:16px;margin:16px 0"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${projectTitle}</p><p style="color:#94a3b8;font-size:13px;margin:0">Empresa: ${brandName}</p></div>${ctaButton("Ver Proyecto", "https://kreoon.com/marketplace")}`;

  const html = wrapKreoonEmail("Nuevo proyecto en Marketplace", body);

  return sendAndNotify(
    supabase, creatorId, profile.email,
    `KREOON Marketplace — Nuevo proyecto: ${projectTitle}`,
    html,
    "project_created",
    "Nuevo proyecto",
    `${brandName} te contrató para "${projectTitle}"`,
    "/marketplace"
  );
}
