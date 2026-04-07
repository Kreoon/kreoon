import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { getOrgEmailConfig } from "../_shared/resend-client.ts";

/**
 * Daily Reminders — Workflow Digest
 *
 * Runs Mon-Fri via pg_cron. Sends a single daily email per user.
 *
 * BRANDING:
 *   - Clients & internal workers (creators/editors):
 *     → Organization branding (logo, name, color)
 *   - One email per org per user (grouped by organization)
 *
 * CLIENTS: Combined digest with three sections:
 *   1. Guiones para revisar (script_approved status)
 *   2. Contenido para aprobar (delivered/review status)
 *   3. Contenido corregido (corrected status)
 *
 * CREATORS: Content pending recording (assigned, script_approved, recording)
 * EDITORS:  Content pending editing (recorded, editing, issue)
 */

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrgBranding {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface ClientDigest {
  email: string;
  name: string;
  userId: string;
  orgId: string;
  scriptsToReview: string[];
  contentToApprove: string[];
  contentCorrected: string[];
}

interface WorkerDigest {
  email: string;
  name: string;
  userId: string;
  orgId: string;
  role: "creator" | "editor";
  titles: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily reminders job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Close expired UP seasons automatically ─────────
    try {
      const { data: seasonResult } = await supabase.rpc("close_expired_seasons");
      if (seasonResult?.seasons_closed > 0) {
        console.log(`Closed ${seasonResult.seasons_closed} expired season(s)`);
      }
    } catch (err) {
      console.error("Error closing expired seasons:", err);
    }

    // ─── Reset expired AI tokens for free users ─────────
    // Los tokens se resetean mensualmente basado en la fecha de registro
    // Esta función solo afecta usuarios sin suscripción activa (free tier)
    try {
      const { data: tokensReset, error: tokensErr } = await supabase.rpc("reset_expired_token_balances");
      if (tokensErr) {
        console.error("Error resetting expired tokens:", tokensErr.message);
      } else if (tokensReset && tokensReset > 0) {
        console.log(`Reset AI tokens for ${tokensReset} user(s) with expired balances`);
      }
    } catch (err) {
      console.error("Error in token reset job:", err);
    }

    // ─── Fetch all relevant content ──────────────────────
    const { data: allContent, error: contentErr } = await supabase
      .from("content")
      .select(`
        id, title, status, creator_id, editor_id, client_id, organization_id,
        clients!content_client_id_fkey ( id, name, user_id )
      `)
      .in("status", [
        "script_approved", "assigned", "recording",
        "recorded", "editing", "issue",
        "delivered", "review", "corrected",
      ]);

    if (contentErr) {
      console.error("Error fetching content:", contentErr);
      throw new Error(contentErr.message);
    }

    if (!allContent || allContent.length === 0) {
      console.log("No pending content found.");
      return jsonResponse({ success: true, sent: 0, total: 0, message: "No pending content" });
    }

    // ─── Collect unique org IDs and fetch branding ────────
    const orgIds = new Set<string>();
    for (const c of allContent) {
      if (c.organization_id) orgIds.add(c.organization_id);
    }

    const orgBrandingMap = new Map<string, OrgBranding>();
    for (const orgId of orgIds) {
      const { data } = await supabase
        .from("organizations")
        .select("name, logo_url, primary_color")
        .eq("id", orgId)
        .single();

      orgBrandingMap.set(orgId, {
        name: data?.name || "Tu organización",
        logo_url: data?.logo_url || null,
        primary_color: data?.primary_color || "#8b5cf6",
      });
    }

    // ─── Build client digests (grouped by userId + orgId) ─
    const clientDigestMap = new Map<string, ClientDigest>();

    for (const c of allContent) {
      const client = c.clients as any;
      if (!client?.user_id || !c.organization_id) continue;

      const key = `${client.user_id}:${c.organization_id}`;
      if (!clientDigestMap.has(key)) {
        clientDigestMap.set(key, {
          email: "",
          name: client.name || "Cliente",
          userId: client.user_id,
          orgId: c.organization_id,
          scriptsToReview: [],
          contentToApprove: [],
          contentCorrected: [],
        });
      }

      const digest = clientDigestMap.get(key)!;
      const title = c.title || "Sin título";

      switch (c.status) {
        case "script_approved":
          digest.scriptsToReview.push(title);
          break;
        case "delivered":
        case "review":
          digest.contentToApprove.push(title);
          break;
        case "corrected":
          digest.contentCorrected.push(title);
          break;
      }
    }

    // Remove clients with nothing pending
    for (const [key, digest] of clientDigestMap) {
      if (
        digest.scriptsToReview.length === 0 &&
        digest.contentToApprove.length === 0 &&
        digest.contentCorrected.length === 0
      ) {
        clientDigestMap.delete(key);
      }
    }

    // ─── Build creator digests (grouped by userId + orgId) ─
    const creatorDigestMap = new Map<string, WorkerDigest>();
    for (const c of allContent) {
      if (
        c.creator_id &&
        c.organization_id &&
        ["assigned", "script_approved", "recording"].includes(c.status)
      ) {
        const key = `${c.creator_id}:${c.organization_id}`;
        if (!creatorDigestMap.has(key)) {
          creatorDigestMap.set(key, {
            email: "", name: "", userId: c.creator_id, orgId: c.organization_id,
            role: "creator", titles: [],
          });
        }
        creatorDigestMap.get(key)!.titles.push(c.title || "Sin título");
      }
    }

    // ─── Build editor digests (grouped by userId + orgId) ──
    const editorDigestMap = new Map<string, WorkerDigest>();
    for (const c of allContent) {
      if (
        c.editor_id &&
        c.organization_id &&
        ["recorded", "editing", "issue"].includes(c.status)
      ) {
        const key = `${c.editor_id}:${c.organization_id}`;
        if (!editorDigestMap.has(key)) {
          editorDigestMap.set(key, {
            email: "", name: "", userId: c.editor_id, orgId: c.organization_id,
            role: "editor", titles: [],
          });
        }
        editorDigestMap.get(key)!.titles.push(c.title || "Sin título");
      }
    }

    // ─── Resolve emails for all users ────────────────────
    const allUserIds = new Set<string>();
    for (const d of clientDigestMap.values()) allUserIds.add(d.userId);
    for (const d of creatorDigestMap.values()) allUserIds.add(d.userId);
    for (const d of editorDigestMap.values()) allUserIds.add(d.userId);

    const profileMap = new Map<string, { email: string; full_name: string }>();
    const userIdArray = Array.from(allUserIds);

    for (let i = 0; i < userIdArray.length; i += 80) {
      const chunk = userIdArray.slice(i, i + 80);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", chunk);

      if (profiles) {
        for (const p of profiles) {
          if (p.email) profileMap.set(p.id, { email: p.email, full_name: p.full_name || "" });
        }
      }
    }

    // ─── Send emails ─────────────────────────────────────
    const results: { email: string; type: string; success: boolean; error?: string }[] = [];

    // Client digests
    for (const [, digest] of clientDigestMap) {
      const profile = profileMap.get(digest.userId);
      if (!profile) continue;

      const branding = orgBrandingMap.get(digest.orgId) || defaultBranding();

      try {
        const totalItems =
          digest.scriptsToReview.length +
          digest.contentToApprove.length +
          digest.contentCorrected.length;

        const html = generateClientDigestHtml(profile.full_name || digest.name, digest, branding);
        const emailConfig = await getOrgEmailConfig(supabase, digest.orgId);

        await resend.emails.send({
          from: emailConfig.from,
          to: [profile.email],
          subject: `${branding.name} — ${totalItems} elemento(s) pendientes`,
          html,
        });

        results.push({ email: profile.email, type: "client", success: true });
      } catch (err: any) {
        console.error(`Error sending client digest to ${profile.email}:`, err);
        results.push({ email: profile.email, type: "client", success: false, error: err.message });
      }
    }

    // Creator reminders
    for (const [, digest] of creatorDigestMap) {
      const profile = profileMap.get(digest.userId);
      if (!profile) continue;

      const branding = orgBrandingMap.get(digest.orgId) || defaultBranding();

      try {
        const emailConfig = await getOrgEmailConfig(supabase, digest.orgId);
        await resend.emails.send({
          from: emailConfig.from,
          to: [profile.email],
          subject: `${branding.name} — ${digest.titles.length} contenido(s) por grabar`,
          html: generateWorkerHtml(profile.full_name, "creator", digest.titles, branding),
        });
        results.push({ email: profile.email, type: "creator", success: true });
      } catch (err: any) {
        results.push({ email: profile.email, type: "creator", success: false, error: err.message });
      }
    }

    // Editor reminders
    for (const [, digest] of editorDigestMap) {
      const profile = profileMap.get(digest.userId);
      if (!profile) continue;

      const branding = orgBrandingMap.get(digest.orgId) || defaultBranding();

      try {
        const emailConfig = await getOrgEmailConfig(supabase, digest.orgId);
        await resend.emails.send({
          from: emailConfig.from,
          to: [profile.email],
          subject: `${branding.name} — ${digest.titles.length} contenido(s) por editar`,
          html: generateWorkerHtml(profile.full_name, "editor", digest.titles, branding),
        });
        results.push({ email: profile.email, type: "editor", success: true });
      } catch (err: any) {
        results.push({ email: profile.email, type: "editor", success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Daily reminders completed: ${successCount}/${results.length} emails sent`);

    return jsonResponse({
      success: true,
      sent: successCount,
      total: results.length,
      breakdown: {
        clients: results.filter((r) => r.type === "client").length,
        creators: results.filter((r) => r.type === "creator").length,
        editors: results.filter((r) => r.type === "editor").length,
      },
      details: results,
    });
  } catch (error: any) {
    console.error("Error in daily-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

// ─── Utilities ───────────────────────────────────────────

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function defaultBranding(): OrgBranding {
  return { name: "Tu organización", logo_url: null, primary_color: "#8b5cf6" };
}

function buildLogoHtml(branding: OrgBranding): string {
  if (branding.logo_url) {
    return `<img src="${branding.logo_url}" alt="${branding.name}" width="48" height="48" style="display:block;margin:0 auto 16px;border-radius:12px;object-fit:cover" />`;
  }
  const initial = branding.name.charAt(0).toUpperCase();
  const color = branding.primary_color || "#8b5cf6";
  return `<div style="width:48px;height:48px;border-radius:12px;background:${color};display:block;margin:0 auto 16px;color:#fff;font-size:24px;font-weight:700;line-height:48px;text-align:center">${initial}</div>`;
}

// ─── Email HTML Generators ───────────────────────────────

function generateClientDigestHtml(
  name: string,
  digest: ClientDigest,
  branding: OrgBranding
): string {
  const color = branding.primary_color || "#8b5cf6";
  const logo = buildLogoHtml(branding);
  let sections = "";

  if (digest.scriptsToReview.length > 0) {
    sections += buildSection("Guiones para Revisar", "#8b5cf6", "Estos guiones están listos y necesitan tu revisión antes de grabación:", digest.scriptsToReview);
  }
  if (digest.contentToApprove.length > 0) {
    sections += buildSection("Contenido para Aprobar", "#06b6d4", "Este contenido fue entregado y está esperando tu aprobación:", digest.contentToApprove);
  }
  if (digest.contentCorrected.length > 0) {
    sections += buildSection("Contenido Corregido", "#22c55e", "Las novedades fueron corregidas. Revisa el contenido actualizado:", digest.contentCorrected);
  }

  const total = digest.scriptsToReview.length + digest.contentToApprove.length + digest.contentCorrected.length;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)">
    <div style="text-align:center;margin-bottom:32px">
      ${logo}
      <h1 style="color:#fff;font-size:22px;margin:0">Resumen del Día</h1>
      <p style="color:#94a3b8;font-size:14px;margin:8px 0 0">${total} elemento(s) pendientes</p>
    </div>

    <p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin-bottom:24px">Aquí tienes un resumen de los elementos que necesitan tu atención:</p>

    ${sections}

    <div style="text-align:center;margin:32px 0">
      <a href="https://kreoon.com/board" style="background:${color};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Ver Tablero</a>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:20px;text-align:center">
      <p style="color:#64748b;font-size:12px;margin:0">${branding.name}</p>
      <p style="color:#475569;font-size:11px;margin:8px 0 0">Recibes este correo porque tienes elementos pendientes. Se envía máximo una vez al día (L-V).</p>
    </div>
  </div>
</div></body></html>`;
}

function buildSection(title: string, color: string, description: string, items: string[]): string {
  const itemsHtml = items
    .slice(0, 10)
    .map((t) => `<li style="margin:6px 0;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:6px;color:#e2e8f0;border:1px solid rgba(255,255,255,0.06);font-size:14px">${t}</li>`)
    .join("");

  const moreText = items.length > 10
    ? `<p style="color:#64748b;font-size:13px;text-align:center;margin:8px 0 0">...y ${items.length - 10} más</p>`
    : "";

  return `<div style="margin-bottom:24px"><h2 style="color:${color};font-size:16px;margin:0 0 8px;font-weight:600">${title} <span style="color:#64748b;font-size:13px;font-weight:400">(${items.length})</span></h2><p style="color:#94a3b8;font-size:13px;margin:0 0 12px;line-height:1.4">${description}</p><ul style="list-style:none;padding:0;margin:0">${itemsHtml}</ul>${moreText}</div>`;
}

function generateWorkerHtml(
  name: string,
  role: "creator" | "editor",
  titles: string[],
  branding: OrgBranding
): string {
  const color = branding.primary_color || "#8b5cf6";
  const logo = buildLogoHtml(branding);
  const config = {
    creator: {
      title: "Contenido Pendiente de Grabación",
      description: "Los siguientes contenidos están asignados a ti para grabar:",
      action: "grabar",
    },
    editor: {
      title: "Contenido Pendiente de Edición",
      description: "Los siguientes contenidos están listos para que inicies edición:",
      action: "editar",
    },
  };

  const msg = config[role];
  const contentList = titles
    .slice(0, 15)
    .map((t) => `<li style="margin:6px 0;padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:6px;color:#e2e8f0;border:1px solid rgba(255,255,255,0.06);font-size:14px">${t}</li>`)
    .join("");

  const moreText = titles.length > 15
    ? `<p style="color:#64748b;font-size:13px;text-align:center;margin:8px 0 0">...y ${titles.length - 15} más</p>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.1)">
    <div style="text-align:center;margin-bottom:32px">
      ${logo}
      <h1 style="color:#fff;font-size:22px;margin:0">${msg.title}</h1>
    </div>

    <p style="color:#e2e8f0;font-size:16px;line-height:1.6">Hola <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6">${msg.description}</p>

    <ul style="list-style:none;padding:0;margin:20px 0">${contentList}</ul>
    ${moreText}

    <p style="color:#94a3b8;font-size:14px;margin-top:16px">
      Tienes <strong style="color:#e2e8f0">${titles.length}</strong> contenido(s) pendiente(s) por ${msg.action}.
    </p>

    <div style="text-align:center;margin:28px 0">
      <a href="https://kreoon.com/board" style="background:${color};color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">Ver Tablero</a>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:32px;padding-top:20px;text-align:center">
      <p style="color:#64748b;font-size:12px;margin:0">${branding.name}</p>
      <p style="color:#475569;font-size:11px;margin:8px 0 0">Recibes este correo porque tienes elementos pendientes. Se envía máximo una vez al día (L-V).</p>
    </div>
  </div>
</div></body></html>`;
}

serve(handler);
