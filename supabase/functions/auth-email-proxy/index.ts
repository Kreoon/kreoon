import { escapeHtml } from "../_shared/escapeHtml.ts";
/**
 * Auth Email Proxy — Enterprise White-Label
 *
 * Bypasses Supabase Auth's built-in email sending for enterprise orgs
 * with verified custom email domains. Generates auth links server-side
 * and sends branded emails via Resend from the org's domain.
 *
 * POST /auth-email-proxy
 * Body: {
 *   type: "signup" | "recovery" | "magiclink" | "invite",
 *   email: string,
 *   organization_id: string,
 *   redirect_to?: string,
 *   inviter_name?: string,
 *   user_name?: string,
 * }
 *
 * Only works for enterprise orgs with resend_domain_verified = true.
 * Falls back to error if org is not eligible (caller should use standard auth).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getResend } from "../_shared/resend-client.ts";
import {
  buildConfirmationEmail,
  buildRecoveryEmail,
  buildMagicLinkEmail,
  buildInviteEmail,
  type AuthEmailConfig,
} from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AuthEmailType = "signup" | "recovery" | "magiclink" | "invite";

// Map our types to Supabase admin.generateLink types
const LINK_TYPE_MAP: Record<AuthEmailType, string> = {
  signup: "signup",
  recovery: "recovery",
  magiclink: "magiclink",
  invite: "invite",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      type,
      email,
      organization_id,
      redirect_to,
      inviter_name,
      user_name,
    } = await req.json();

    // Autorización: solo un admin/owner de ESA organización puede disparar correos de marca. Antes la
    // función aceptaba cualquier JWT (y generateLink crea el usuario si no existe).
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: callerData } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
    const caller = callerData?.user;
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (organization_id) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role, is_owner")
        .eq("organization_id", organization_id)
        .eq("user_id", caller.id)
        .is("deleted_at", null)
        .maybeSingle();
      const isOrgAdmin = !!membership && (membership.is_owner === true || ["admin", "team_leader"].includes(String(membership.role)));
      if (!isOrgAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate required fields
    if (!type || !email || !organization_id) {
      return new Response(
        JSON.stringify({ error: "type, email, and organization_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LINK_TYPE_MAP[type as AuthEmailType]) {
      return new Response(
        JSON.stringify({ error: `Invalid type: ${type}. Must be signup, recovery, magiclink, or invite` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch org details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, logo_url, primary_color, selected_plan, sender_email, sender_name, support_email, resend_domain_verified, custom_domain")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify enterprise + domain verified
    if (org.selected_plan !== "enterprise" || !org.resend_domain_verified || !org.sender_email) {
      return new Response(
        JSON.stringify({
          error: "Organization is not eligible for custom auth emails. Use standard Supabase auth.",
          eligible: false,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate auth link server-side
    // redirect_to solo puede apuntar a la plataforma o al dominio verificado de la organización
    // (evita que un enlace de marca lleve a un sitio externo).
    const defaultRedirect = org.custom_domain ? `https://${org.custom_domain}/` : "https://kreoon.com/";
    const allowedPrefixes = ["https://kreoon.com/", "https://www.kreoon.com/", defaultRedirect];
    const redirectTo = typeof redirect_to === "string" && allowedPrefixes.some((p) => redirect_to.startsWith(p))
      ? redirect_to
      : defaultRedirect;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: type as any,
      email,
      options: {
        redirectTo,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("[auth-email-proxy] generateLink error:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate auth link", details: linkError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData.properties.action_link;

    // Build branded email
    const emailConfig: AuthEmailConfig = {
      orgName: org.name || "Platform",
      logoUrl: org.logo_url || undefined,
      primaryColor: org.primary_color || "#8B5CF6",
      supportEmail: org.support_email || "soporte@kreoon.com",
    };

    let html: string;
    let subject: string;

    switch (type as AuthEmailType) {
      case "signup":
        html = buildConfirmationEmail(emailConfig, actionLink, user_name === undefined ? undefined : escapeHtml(user_name));
        subject = `${org.name} — Confirma tu correo electrónico`;
        break;
      case "recovery":
        html = buildRecoveryEmail(emailConfig, actionLink);
        subject = `${org.name} — Restablecer contraseña`;
        break;
      case "magiclink":
        html = buildMagicLinkEmail(emailConfig, actionLink);
        subject = `${org.name} — Tu enlace de acceso`;
        break;
      case "invite":
        html = buildInviteEmail(emailConfig, actionLink, inviter_name === undefined ? undefined : escapeHtml(inviter_name));
        subject = `${org.name} — Has sido invitado`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown email type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Send via Resend from org's verified domain
    const senderName = org.sender_name || org.name;
    const from = `${senderName} <${org.sender_email}>`;

    const resend = getResend();
    const { data: sendData, error: sendError } = await resend.emails.send({
      from,
      to: [email],
      subject,
      html,
    });

    if (sendError) {
      console.error("[auth-email-proxy] Resend error:", sendError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: sendError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: sendData?.id,
        type,
        to: email,
        from,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[auth-email-proxy] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
