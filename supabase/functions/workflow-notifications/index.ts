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
 *
 * Clients get a DAILY DIGEST (via daily-reminders cron), NOT real-time.
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
    | "application_approved"
    | "project_created";
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
    case "application_approved":
      return notifyApplicationApproved(supabase, payload.record);
    case "project_created":
      return notifyProjectCreated(supabase, payload.record);
    default:
      console.log(`[workflow-notifications] Unknown type: ${payload.type}`);
      return { sent: false };
  }
}

// ─── Helpers ──────────────────────────────────────────────

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();
  return data;
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
  // Send email
  try {
    await resend.emails.send({ from: senderFrom || FROM, to: [email], subject, html: htmlBody });
  } catch (err) {
    console.error(`[workflow-notifications] Email to ${email} failed:`, err);
  }

  // In-app notification
  await insertNotification(supabase, userId, notifType, notifTitle, notifMessage, link);

  return { sent: true, to: email };
}

// ─── Email Template Builders ─────────────────────────────

/** Build logo HTML: org logo if available, else fallback to org initial */
function buildLogoHtml(branding: OrgBranding): string {
  if (branding.logo_url) {
    return `<img src="${branding.logo_url}" alt="${branding.name}" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px;object-fit:cover" />`;
  }
  // Fallback: colored circle with initial
  const initial = branding.name.charAt(0).toUpperCase();
  const color = branding.primary_color || "#8b5cf6";
  return `<div style="width:48px;height:48px;border-radius:12px;background:${color};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#fff;font-size:24px;font-weight:700;line-height:48px;text-align:center">${initial}</div>`;
}

/** Wrap email body with org branding (for internal workflow) */
function wrapOrgEmail(title: string, body: string, branding: OrgBranding): string {
  const color = branding.primary_color || "#8b5cf6";
  const gradientEnd = adjustColor(color, -20); // Slightly darker for gradient
  const logo = buildLogoHtml(branding);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:32px">${logo}<h1 style="color:#fff;font-size:22px;margin:0">${title}</h1></div>${body}<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:20px;text-align:center"><p style="color:#64748b;font-size:12px;margin:0">${branding.name}</p><p style="color:#475569;font-size:11px;margin:8px 0 0">Este es un mensaje automático. No respondas a este correo.</p></div></div></div></body></html>`;
}

/** Wrap email body with KREOON branding (for marketplace/platform) */
function wrapKreoonEmail(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)"><div style="text-align:center;margin-bottom:32px">${KREOON_LOGO}<h1 style="color:#fff;font-size:22px;margin:0">${title}</h1></div>${body}<div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:20px;text-align:center"><p style="color:#64748b;font-size:12px;margin:0">KREOON - Tu sistema operativo para creadores</p><p style="color:#475569;font-size:11px;margin:8px 0 0">Este es un mensaje automático. No respondas a este correo.</p></div></div></div></body></html>`;
}

/** CTA button using org or kreoon color */
function ctaButton(text: string, href: string, color?: string): string {
  const bg = color || "#8b5cf6";
  return `<div style="text-align:center;margin:28px 0"><a href="${href}" style="background:${bg};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${text}</a></div>`;
}

/** Simple color adjustment (darken) for gradient fallback */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ─── INTERNAL WORKFLOW — Org Branding ────────────────────

/**
 * Creator gets notified when content is assigned to them
 * → ORG BRANDING
 */
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

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || "Creador"}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Se te ha asignado un nuevo contenido para grabar:</p><div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${color}"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${title}</p><p style="color:#94a3b8;font-size:13px;margin:0">Cliente: ${clientName}</p></div>${ctaButton("Ver en Tablero", "https://kreoon.com/board", color)}`;

  const html = wrapOrgEmail("Nuevo contenido asignado", body, orgBranding);

  // Get org email config for dynamic sender
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

/**
 * Editor gets notified when content is recorded and ready for editing
 * → ORG BRANDING
 */
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

  // Get creator name for context
  let creatorName = "el creador";
  if (record.creator_id) {
    const creatorProfile = await getProfile(supabase, record.creator_id);
    if (creatorProfile?.full_name) creatorName = creatorProfile.full_name;
  }

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

/**
 * Creator gets notified when their content is approved
 * → ORG BRANDING
 */
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

/**
 * When content has an issue, notify the person responsible
 * → ORG BRANDING
 */
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

// ─── MARKETPLACE — KREOON Branding ──────────────────────

/**
 * Creator gets notified when their campaign application is approved
 * → KREOON BRANDING (marketplace)
 */
async function notifyApplicationApproved(
  supabase: any,
  record: Record<string, any>
): Promise<{ sent: boolean; to?: string }> {
  // campaign_applications.creator_id → creator_profiles.id
  const { data: creatorProfile } = await supabase
    .from("creator_profiles")
    .select("user_id, display_name")
    .eq("id", record.creator_id)
    .single();

  if (!creatorProfile?.user_id) return { sent: false };

  const profile = await getProfile(supabase, creatorProfile.user_id);
  if (!profile?.email) return { sent: false };

  // Get campaign info
  const { data: campaign } = await supabase
    .from("marketplace_campaigns")
    .select("title, brand_id")
    .eq("id", record.campaign_id)
    .single();

  const campaignTitle = campaign?.title || "Campaña";
  let brandName = "una marca";
  if (campaign?.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("name")
      .eq("id", campaign.brand_id)
      .single();
    if (brand?.name) brandName = brand.name;
  }

  const body = `<p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${profile.full_name || creatorProfile.display_name || "Creador"}</strong>,</p><p style="color:#94a3b8;font-size:15px;line-height:1.6">Tu aplicación a una campaña del marketplace ha sido aprobada:</p><div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:8px;padding:16px;margin:16px 0"><p style="color:#e2e8f0;font-size:16px;margin:0 0 4px;font-weight:600">${campaignTitle}</p><p style="color:#94a3b8;font-size:13px;margin:0">Marca: ${brandName}</p><p style="color:#22c55e;font-size:14px;margin:8px 0 0;font-weight:500">Aplicación aprobada</p></div>${ctaButton("Ver en Marketplace", "https://kreoon.com/marketplace")}`;

  const html = wrapKreoonEmail("Aprobado en campaña", body);

  return sendAndNotify(
    supabase, creatorProfile.user_id, profile.email,
    `KREOON Marketplace — Aprobado: ${campaignTitle}`,
    html,
    "application_approved",
    "Aplicación aprobada",
    `Fuiste aprobado en la campaña "${campaignTitle}" de ${brandName}`,
    "/marketplace"
  );
}

/**
 * Creator gets notified when a marketplace project is created (hired)
 * → KREOON BRANDING (marketplace)
 */
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
