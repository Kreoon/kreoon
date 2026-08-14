import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** `EdgeRuntime.waitUntil` lo expone el runtime de Supabase, no los tipos de
 *  Deno. Retiene los envíos que no se esperan para que no los cancele al
 *  devolver la respuesta. */
declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;
import { getOrgEmailConfig } from "../_shared/resend-client.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  creator: "Creador",
  editor: "Editor",
  client: "Cliente",
  strategist: "Estratega",
  ambassador: "Embajador",
};

interface NewMemberPayload {
  user_id: string;
  organization_id: string;
  role: string;
  user_name?: string;
  user_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Kreoon database
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
    const supabaseServiceKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: NewMemberPayload = await req.json();
    const { user_id, organization_id, role, user_name, user_email } = payload;

    console.log("Processing new member notification:", { user_id, organization_id, role });

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organization_id)
      .single();

    if (orgError) {
      console.error("Error fetching organization:", orgError);
      throw new Error("Organization not found");
    }

    // Get new user details if not provided
    let newUserName = user_name;
    let newUserEmail = user_email;

    if (!newUserName || !newUserEmail) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user_id)
        .single();

      if (!profileError && profile) {
        newUserName = newUserName || profile.full_name;
        newUserEmail = newUserEmail || profile.email;
      }
    }

    // Get all members in the organization (excluding new user)
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("user_id, is_owner")
      .eq("organization_id", organization_id)
      .neq("user_id", user_id);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      throw new Error("Failed to fetch members");
    }

    console.log(`Found ${members?.length || 0} members in organization`);

    // Get admin roles for the organization
    const { data: adminRoles, error: rolesError } = await supabase
      .from("organization_member_roles")
      .select("user_id, role")
      .eq("organization_id", organization_id)
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
    }

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    // Filter to only admins and owners
    const adminMembers = members?.filter(member => 
      member.is_owner || adminUserIds.has(member.user_id)
    ) || [];

    console.log(`Found ${adminMembers.length} admin/owner members`);

    if (adminMembers.length === 0) {
      console.log("No admins/owners found to notify");
      return new Response(
        JSON.stringify({ success: true, emailsSent: 0, emailsFailed: 0, message: "No admins found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get profile info for all admin members
    const adminUserIdsArray = adminMembers.map(m => m.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, whatsapp_phone, whatsapp_enabled")
      .in("id", adminUserIdsArray);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw new Error("Failed to fetch admin profiles");
    }

    console.log(`Found ${adminProfiles?.length || 0} admin profiles`);

    const roleLabel = ROLE_LABELS[role] || role;
    const displayName = newUserName || newUserEmail || "Nuevo usuario";

    // Helper function to wait between emails (Resend rate limit: 2 req/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send emails sequentially to avoid rate limiting
    let successCount = 0;
    let failCount = 0;
    
    for (const adminProfile of (adminProfiles || [])) {
      const adminEmail = adminProfile.email;
      const adminName = adminProfile.full_name || "Administrador";

      if (!adminEmail) {
        console.log("Skipping admin without email:", adminProfile.id);
        continue;
      }

      console.log(`Sending email to admin: ${adminEmail}`);

      try {
        const emailConfig = await getOrgEmailConfig(supabase, organization_id);
        const { data, error } = await resend.emails.send({
          from: emailConfig.from,
          to: [adminEmail],
          subject: `Nuevo miembro en ${org.name}: ${displayName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Nuevo Miembro Registrado</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                            🎉 Nuevo Miembro Registrado
                          </h1>
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px;">
                          <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Hola <strong>${adminName}</strong>,
                          </p>
                          <p style="margin: 0 0 30px; color: #374151; font-size: 16px; line-height: 1.6;">
                            Un nuevo usuario se ha registrado en <strong>${org.name}</strong>:
                          </p>
                          
                          <!-- User Info Card -->
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                            <tr>
                              <td style="padding: 24px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <span style="color: #6b7280; font-size: 14px;">Nombre:</span>
                                      <br>
                                      <span style="color: #111827; font-size: 16px; font-weight: 600;">${displayName}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style="padding-bottom: 12px;">
                                      <span style="color: #6b7280; font-size: 14px;">Email:</span>
                                      <br>
                                      <span style="color: #111827; font-size: 16px;">${newUserEmail || "No disponible"}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>
                                      <span style="color: #6b7280; font-size: 14px;">Rol:</span>
                                      <br>
                                      <span style="display: inline-block; margin-top: 4px; padding: 6px 12px; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: 500; border-radius: 20px;">
                                        ${roleLabel}
                                      </span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          
                          <p style="margin: 0 0 30px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                            El nuevo miembro ya tiene acceso completo a la plataforma. Puedes revisar y gestionar los miembros desde el panel de administración.
                          </p>
                          
                          <!-- CTA Button -->
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td align="center">
                                <a href="https://kreoon.com/settings?section=team" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                                  Ver Equipo
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                            Este es un mensaje automático de Kreoon.
                            <br>
                            © ${new Date().getFullYear()} Kreoon. Todos los derechos reservados.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });

        if (error) {
          console.error(`Error sending email to ${adminEmail}:`, error);
          failCount++;
        } else {
          console.log(`Email sent successfully to ${adminEmail}:`, data);
          successCount++;
        }
      } catch (err) {
        console.error(`Exception sending email to ${adminEmail}:`, err);
        failCount++;
      }

      // WhatsApp al admin si tiene número configurado
      // Plantilla new_member: {{1}}=org_name {{2}}=member_name {{3}}=role_label
      if (adminProfile.whatsapp_phone && adminProfile.whatsapp_enabled) {
        const waUrl = Deno.env.get("KREOON_SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
        const waKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const avisoAdmin = fetch(`${waUrl}/functions/v1/whatsapp-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${waKey}`,
          },
          body: JSON.stringify({
            phone: adminProfile.whatsapp_phone,
            variables: [org.name, displayName, roleLabel],
            event_type: "new_member",
            user_id: adminProfile.id,
          }),
        }).catch((err) => console.error("WhatsApp notify error:", err));
        // El runtime cancela lo pendiente al responder: sin retenerlo, el
        // WhatsApp simplemente no se envía y nadie se entera.
        try {
          EdgeRuntime?.waitUntil?.(avisoAdmin);
        } catch { /* fuera del runtime de Supabase */ }
      }

      // Wait 600ms between emails to stay under 2 req/sec rate limit
      await delay(600);
    }

    console.log(`Email notifications complete. Success: ${successCount}, Failed: ${failCount}`);

    // WhatsApp welcome al nuevo cliente (solo si role === 'client')
    if (role === 'client') {
      const { data: clientProfile } = await supabase
        .from("profiles")
        .select("whatsapp_phone, phone, whatsapp_enabled")
        .eq("id", user_id)
        .single();

      const clientPhone = clientProfile?.whatsapp_phone || clientProfile?.phone;
      if (clientPhone && clientProfile?.whatsapp_enabled !== false) {
        const waUrl = Deno.env.get("KREOON_SUPABASE_URL") || "https://wjkbqcrxwsmvtxmqgiqc.supabase.co";
        const waKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const bienvenidaCliente = fetch(`${waUrl}/functions/v1/whatsapp-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${waKey}`,
          },
          body: JSON.stringify({
            phone: clientPhone,
            event_type: "welcome_client",
            variables: [displayName, org.name],
            user_id,
          }),
        }).catch((err) => console.error("[notify-new-member] WhatsApp welcome_client error:", err));
        // Igual que el aviso al admin: si no se retiene, el mensaje de
        // bienvenida al cliente se pierde sin dejar rastro.
        try {
          EdgeRuntime?.waitUntil?.(bienvenidaCliente);
        } catch { /* fuera del runtime de Supabase */ }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: successCount,
        emailsFailed: failCount
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-new-member function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);