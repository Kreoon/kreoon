import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecruitmentRequest {
  creator_user_id: string;
  proposed_role: string;
  message?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  creator: "Creador de Contenido",
  editor: "Productor Audio-Visual",
  strategist: "Estratega",
  trafficker: "Trafficker",
  team_leader: "Líder de Equipo",
  client: "Cliente",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Database credentials not configured");
    }

    // Service role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // User client to identify the inviter
    const supabaseUser = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the calling user
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("No autorizado");

    const { creator_user_id, proposed_role, message }: RecruitmentRequest =
      await req.json();

    if (!creator_user_id || !proposed_role) {
      throw new Error("creator_user_id y proposed_role son requeridos");
    }

    // Get inviter's profile and organization
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, current_organization_id")
      .eq("id", user.id)
      .single();

    if (!inviterProfile?.current_organization_id) {
      throw new Error("No perteneces a ninguna organización");
    }

    const orgId = inviterProfile.current_organization_id;

    // Verify inviter has appropriate role in the org
    const { data: memberRow } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    const allowedRoles = ["admin", "team_leader", "strategist"];
    if (!memberRow || !allowedRoles.includes(memberRow.role)) {
      throw new Error(
        "No tienes permisos para reclutar. Se requiere rol de admin, líder de equipo o estratega."
      );
    }

    // Get organization info
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, logo_url")
      .eq("id", orgId)
      .single();

    const orgName = org?.name || "la organización";

    // Insert the invitation (partial unique index will prevent duplicates)
    const { data: invitation, error: insertError } = await (
      supabaseAdmin as any
    )
      .from("marketplace_org_invitations")
      .insert({
        organization_id: orgId,
        creator_user_id,
        invited_by: user.id,
        proposed_role,
        message: message || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        throw new Error(
          "Ya existe una invitación pendiente para este creador"
        );
      }
      console.error("Insert error:", insertError);
      throw new Error("Error al crear la invitación");
    }

    const invitationId = invitation.id;

    // Insert in-app notification for KIRO
    await supabaseAdmin.from("user_notifications").insert({
      user_id: creator_user_id,
      organization_id: orgId,
      type: "recruitment_request",
      title: `Invitación de ${orgName}`,
      message: `${inviterProfile.full_name || "Un reclutador"} te invita a unirte como ${ROLE_LABELS[proposed_role] || proposed_role}`,
      entity_type: "recruitment",
      entity_id: invitationId,
    });

    // Get creator's email for the email notification
    const { data: creatorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", creator_user_id)
      .single();

    const { data: creatorAuth } =
      await supabaseAdmin.auth.admin.getUserById(creator_user_id);
    const creatorEmail = creatorAuth?.user?.email;

    // Send email notification
    if (creatorEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        const roleLabel = ROLE_LABELS[proposed_role] || proposed_role;
        const inviterName = inviterProfile.full_name || "Un miembro del equipo";
        const invitationsLink = "https://kreoon.com/marketplace/invitations";

        await resend.emails.send({
          from: "KREOON <noreply@kreoon.com>",
          to: [creatorEmail],
          subject: `${orgName} quiere reclutarte - KREOON`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px; }
                .container { max-width: 560px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #222; }
                .logo { font-size: 24px; font-weight: bold; color: #a855f7; margin-bottom: 24px; }
                h1 { font-size: 28px; margin: 0 0 16px 0; color: #ffffff; }
                p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
                .role-badge { display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500; }
                .org-name { color: #a855f7; font-weight: 600; }
                .message-box { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 16px; margin: 16px 0; font-style: italic; color: #d4d4d8; }
                .button { display: inline-block; background: linear-gradient(135deg, #a855f7, #ec4899); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
                .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 14px; color: #71717a; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">KREOON</div>
                <h1>Te quieren reclutar</h1>
                <p><strong>${inviterName}</strong> de <span class="org-name">${orgName}</span> te invita a unirte a su equipo como <span class="role-badge">${roleLabel}</span></p>
                ${message ? `<div class="message-box">"${message}"</div>` : ""}
                <p>Revisa la invitaci&oacute;n y acepta o rechaza desde tu panel de KREOON.</p>
                <a href="${invitationsLink}" class="button">Ver Invitaci&oacute;n</a>
                <div class="footer">
                  <p>Si no esperabas esta invitaci&oacute;n, puedes ignorarla.</p>
                  <p>&copy; 2026 KREOON. Todos los derechos reservados.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
      }
    }

    // GHL/CRM sync if configured
    const ghlWebhookUrl = Deno.env.get("GHL_WEBHOOK_URL");
    if (ghlWebhookUrl) {
      try {
        await fetch(ghlWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "custom",
            type: "recruitment_sent",
            data: {
              invitation_id: invitationId,
              organization_name: orgName,
              creator_name: creatorProfile?.full_name || "Creador",
              creator_email: creatorEmail || "",
              proposed_role,
              inviter_name: inviterProfile.full_name,
            },
          }),
        });
      } catch (ghlErr) {
        console.warn("GHL webhook failed (non-blocking):", ghlErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitationId,
        message: "Invitación de reclutamiento enviada",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-recruitment:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Error desconocido",
      }),
      {
        status: error instanceof Error && error.message.includes("No autorizado") ? 401 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
