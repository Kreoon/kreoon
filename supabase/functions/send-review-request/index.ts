/**
 * Edge Function: send-review-request
 *
 * Envia solicitud de resena a un cliente por email.
 * Genera un link unico con token para que el cliente deje su resena.
 *
 * Request body:
 * - requestId: UUID de la solicitud en review_requests
 * - sendVia?: 'email' | 'whatsapp' (default: email)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from "../_shared/cors.ts";
import { sendEmail, getOrgEmailConfig } from "../_shared/resend-client.ts";

interface ReviewRequestBody {
  requestId: string;
  sendVia?: 'email' | 'whatsapp';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const { requestId, sendVia = 'email' }: ReviewRequestBody = await req.json();

    if (!requestId) {
      return corsJsonResponse(req, { error: "requestId es requerido" }, 400);
    }

    // Conectar a Supabase
    const supabaseUrl = Deno.env.get("KREOON_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("KREOON_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Database credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener la solicitud de resena con datos del creador
    const { data: request, error: fetchError } = await supabase
      .from("review_requests")
      .select(`
        *,
        creator:creator_id (
          id,
          user_id,
          display_name,
          avatar_url,
          bio
        )
      `)
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error("Error fetching request:", fetchError);
      return corsJsonResponse(req, { error: "Solicitud no encontrada" }, 404);
    }

    // Verificar que no haya expirado
    if (new Date(request.expires_at) < new Date()) {
      return corsJsonResponse(req, { error: "La solicitud ha expirado" }, 400);
    }

    // Verificar que no este completada
    if (request.status === 'completed') {
      return corsJsonResponse(req, { error: "Esta solicitud ya fue completada" }, 400);
    }

    const creator = request.creator as any;
    const reviewLink = `https://kreoon.com/review/${request.token}`;

    if (sendVia === 'email' && request.recipient_email) {
      // Obtener configuracion de email del creador
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", creator?.user_id)
        .single();

      const emailConfig = await getOrgEmailConfig(supabase, profile?.organization_id);

      // Enviar email
      await sendEmail({
        to: [request.recipient_email],
        subject: `${creator?.display_name || 'Un creador'} te invita a dejar una resena`,
        html: generateReviewRequestEmail({
          creatorName: creator?.display_name || 'Creador',
          creatorAvatar: creator?.avatar_url,
          recipientName: request.recipient_name,
          reviewLink,
          brandColor: emailConfig.brandColor,
          logoHtml: emailConfig.logoHtml,
        }),
      });

      // Actualizar estado de la solicitud
      await supabase
        .from("review_requests")
        .update({
          status: 'sent',
          sent_via: 'email',
          sent_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return corsJsonResponse(req, {
        success: true,
        message: "Email enviado correctamente",
        reviewLink,
      });
    }

    if (sendVia === 'whatsapp' && request.recipient_phone) {
      // Para WhatsApp, retornar el link para que el frontend lo envie
      // o integrar con n8n webhook
      await supabase
        .from("review_requests")
        .update({
          status: 'sent',
          sent_via: 'whatsapp',
          sent_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return corsJsonResponse(req, {
        success: true,
        message: "Link generado para WhatsApp",
        reviewLink,
        whatsappMessage: `Hola ${request.recipient_name}! ${creator?.display_name} te invita a dejar una resena sobre tu experiencia trabajando juntos. Es rapido y tu opinion es muy valiosa: ${reviewLink}`,
      });
    }

    // Si no hay email ni telefono, solo retornar el link
    return corsJsonResponse(req, {
      success: true,
      message: "Link generado",
      reviewLink,
    });

  } catch (error) {
    console.error("Error in send-review-request:", error);
    return corsJsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Error desconocido" },
      500
    );
  }
});

// ============================================================================
// Email Template
// ============================================================================

interface EmailTemplateParams {
  creatorName: string;
  creatorAvatar?: string;
  recipientName: string;
  reviewLink: string;
  brandColor: string;
  logoHtml: string;
}

function generateReviewRequestEmail(params: EmailTemplateParams): string {
  const { creatorName, creatorAvatar, recipientName, reviewLink, brandColor } = params;

  const avatarHtml = creatorAvatar
    ? `<img src="${creatorAvatar}" alt="${creatorName}" width="80" height="80" style="border-radius:50%;margin:0 auto 16px;display:block" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:${brandColor};color:#fff;font-size:32px;font-weight:bold;line-height:80px;text-align:center;margin:0 auto 16px">${creatorName.charAt(0).toUpperCase()}</div>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #111111; border-radius: 16px; padding: 40px; border: 1px solid #222; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo img { width: 48px; height: 48px; border-radius: 12px; }
    .creator-section { text-align: center; margin-bottom: 32px; }
    h1 { font-size: 24px; margin: 0 0 8px 0; color: #ffffff; text-align: center; }
    .subtitle { font-size: 16px; color: #a1a1aa; text-align: center; margin-bottom: 24px; }
    p { font-size: 16px; line-height: 1.6; color: #d4d4d8; margin: 16px 0; }
    .button { display: block; background: linear-gradient(135deg, ${brandColor}, ${brandColor}dd); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; text-align: center; margin: 32px 0; }
    .features { background: #1a1a1a; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .features li { color: #a1a1aa; font-size: 14px; margin: 8px 0; list-style: none; padding-left: 24px; position: relative; }
    .features li::before { content: "✓"; position: absolute; left: 0; color: #22c55e; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #222; font-size: 13px; color: #71717a; text-align: center; }
    .link-fallback { font-size: 12px; color: #71717a; word-break: break-all; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://kreoon.com/favicon.png" alt="KREOON" />
    </div>

    <div class="creator-section">
      ${avatarHtml}
      <h1>${creatorName}</h1>
      <p class="subtitle">Te invita a compartir tu experiencia</p>
    </div>

    <p>Hola ${recipientName},</p>

    <p><strong>${creatorName}</strong> te ha invitado a dejar una resena sobre tu experiencia trabajando juntos. Tu opinion es muy valiosa y ayudara a otros a conocer su trabajo.</p>

    <div class="features">
      <ul style="margin: 0; padding: 0;">
        <li>Solo toma 2 minutos</li>
        <li>Tu resena sera verificada</li>
        <li>Ayudas a construir confianza</li>
      </ul>
    </div>

    <a href="${reviewLink}" class="button">Dejar mi Resena</a>

    <p class="link-fallback">
      Si el boton no funciona, copia este enlace:<br/>
      ${reviewLink}
    </p>

    <div class="footer">
      <p>Este enlace expira en 30 dias.</p>
      <p>Si no conoces a ${creatorName} o no esperabas este mensaje, puedes ignorarlo.</p>
      <p style="margin-top: 16px;">KREOON &copy; 2026</p>
    </div>
  </div>
</body>
</html>
  `;
}
