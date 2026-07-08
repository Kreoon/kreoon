import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface InvitationRequest {
  email: string;
  role: "admin" | "creator" | "editor" | "client";
  client_id?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  creator: "Creador de Contenido",
  editor: "Productor Audio-Visual",
  client: "Cliente",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, role, client_id }: InvitationRequest = await req.json();

    if (!email || !role) {
      throw new Error("Email y rol son requeridos");
    }

    // Use Kreoon as the primary database
    const kreoonUrl = Deno.env.get("KREOON_SUPABASE_URL");
    const kreoonServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY");

    if (!kreoonUrl || !kreoonServiceKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(kreoonUrl, kreoonServiceKey);

    // FASE 1: validar quién llama (antes: sin auth alguna, cualquiera
    // podía invitar con role:"admin" y client_id arbitrario).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) throw new Error("No autorizado");

    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name, current_organization_id")
      .eq("id", user.id)
      .single();

    if (!inviterProfile?.current_organization_id) {
      throw new Error("No perteneces a ninguna organización");
    }

    const orgId = inviterProfile.current_organization_id;
    const inviterName = inviterProfile.full_name || "Un miembro del equipo";

    const { data: memberRow } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    const allowedInviterRoles = ["admin", "team_leader"];
    if (!memberRow || !allowedInviterRoles.includes(memberRow.role)) {
      throw new Error("No tienes permisos para invitar usuarios. Se requiere rol de admin o líder de equipo.");
    }

    // Solo un admin puede invitar a otro como admin.
    if (role === "admin" && memberRow.role !== "admin") {
      throw new Error("Solo un administrador puede invitar con rol de administrador.");
    }

    // Si se invita para representar a un cliente, ese cliente debe ser de la misma org.
    if (client_id) {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("id")
        .eq("id", client_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!clientRow) {
        throw new Error("El cliente indicado no pertenece a tu organización.");
      }
    }

    // Generate magic link for signup - redirect to kreoon.com
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `https://kreoon.com/auth?role=${role}${client_id ? `&client_id=${client_id}` : ''}`,
      },
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      throw new Error("No se pudo generar el enlace de invitación");
    }

    const inviteLink = linkData.properties?.action_link || `https://kreoon.com/auth`;

    // Send email with Resend
    const emailResponse = await resend.emails.send({
      from: "KREOON <noreply@kreoon.com>",
      to: [email],
      subject: `Invitación a KREOON - ${ROLE_LABELS[role]}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px; }
            .container { max-width: 560px; margin: 0 auto; background: #111111; border-radius: 12px; padding: 40px; border: 1px solid #222; }
            .logo { font-size: 24px; font-weight: bold; color: #22c55e; margin-bottom: 24px; }
            h1 { font-size: 28px; margin: 0 0 16px 0; color: #ffffff; }
            p { font-size: 16px; line-height: 1.6; color: #a1a1aa; margin: 16px 0; }
            .role-badge { display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 500; }
            .button { display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 24px 0; }
            .button:hover { opacity: 0.9; }
            .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 14px; color: #71717a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🎬 KREOON</div>
            <h1>¡Has sido invitado!</h1>
            <p><strong>${inviterName}</strong> te ha invitado a unirte a KREOON como <span class="role-badge">${ROLE_LABELS[role]}</span></p>
            <p>KREOON es una plataforma profesional para la gestión de contenido de video, donde podrás colaborar con creadores y editores en proyectos de alto impacto.</p>
            <a href="${inviteLink}" class="button">Aceptar Invitación</a>
            <p style="font-size: 14px;">O copia este enlace: <br/><code style="background: #1a1a1a; padding: 8px 12px; border-radius: 4px; display: block; margin-top: 8px; word-break: break-all;">${inviteLink}</code></p>
            <div class="footer">
              <p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
              <p>© 2026 KREOON. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    // Store invitation record
    const { error: inviteDbError } = await supabase
      .from("invitations")
      .insert({
        email,
        role,
        invited_by: inviterName,
        client_id,
        status: "pending",
      });

    if (inviteDbError) {
      console.log("Could not store invitation (table may not exist):", inviteDbError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitación enviada correctamente" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
