import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getResend } from "../_shared/resend-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyPayload {
  signature_id: string;
  user_id: string;
}

interface SignatureReceipt {
  id: string;
  document_type: string;
  document_title: string;
  document_version: string;
  document_hash: string;
  signer_full_name: string;
  signer_email: string;
  declaration_text: string;
  signature_method: string;
  ip_address: string;
  signed_at: string;
  status: string;
}

const DOC_LABELS: Record<string, string> = {
  client_agreement: "Acuerdo de Cliente",
  creator_agreement: "Acuerdo de Creador",
  talent_agreement: "Acuerdo de Talento",
  brand_agreement: "Acuerdo de Marca",
  organization_agreement: "Acuerdo de Organización",
  terms_of_service: "Términos de Servicio",
  privacy_policy: "Política de Privacidad",
  escrow_payment_terms: "Términos de Pago Anticipado",
  data_processing_agreement: "Acuerdo de Procesamiento de Datos",
};

const METHOD_LABELS: Record<string, string> = {
  clickwrap: "Aceptación electrónica",
  typed_name: "Firma con nombre",
  drawn_signature: "Firma dibujada",
  otp_verified: "Verificación OTP",
};

function buildReceiptHtml(r: SignatureReceipt, receiptUrl: string): string {
  const signedDate = new Date(r.signed_at).toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Bogota",
  });
  const docLabel = DOC_LABELS[r.document_type] || r.document_title;
  const methodLabel = METHOD_LABELS[r.signature_method] || r.signature_method;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprobante de firma — KREOON</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2a2a45;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6c63ff,#a855f7);padding:32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:#e0cfff;letter-spacing:2px;text-transform:uppercase;">KREOON</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;">Comprobante de Firma</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#d8b4fe;">Documento firmado electrónicamente con validez legal</p>
        </td></tr>

        <!-- Document info -->
        <tr><td style="padding:28px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#12122a;border-radius:12px;border:1px solid #2a2a45;overflow:hidden;">
            <tr><td colspan="2" style="padding:16px 20px;border-bottom:1px solid #2a2a45;">
              <p style="margin:0;font-size:11px;color:#7c7ca0;text-transform:uppercase;letter-spacing:1px;">Documento firmado</p>
              <p style="margin:4px 0 0;font-size:17px;font-weight:600;color:#fff;">${docLabel}</p>
              <p style="margin:2px 0 0;font-size:13px;color:#7c7ca0;">Versión ${r.document_version}</p>
            </td></tr>
            <tr>
              <td style="padding:14px 20px;border-right:1px solid #2a2a45;width:50%;">
                <p style="margin:0;font-size:11px;color:#7c7ca0;text-transform:uppercase;letter-spacing:1px;">Firmado el</p>
                <p style="margin:4px 0 0;font-size:14px;color:#e0e0e0;">${signedDate}</p>
              </td>
              <td style="padding:14px 20px;width:50%;">
                <p style="margin:0;font-size:11px;color:#7c7ca0;text-transform:uppercase;letter-spacing:1px;">Método de firma</p>
                <p style="margin:4px 0 0;font-size:14px;color:#e0e0e0;">${methodLabel}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Signer info -->
        <tr><td style="padding:20px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#12122a;border-radius:12px;border:1px solid #2a2a45;overflow:hidden;">
            <tr><td colspan="2" style="padding:12px 20px;border-bottom:1px solid #2a2a45;">
              <p style="margin:0;font-size:12px;font-weight:600;color:#7c7ca0;text-transform:uppercase;letter-spacing:1px;">Datos del firmante</p>
            </td></tr>
            <tr>
              <td style="padding:14px 20px;border-right:1px solid #2a2a45;width:50%;">
                <p style="margin:0;font-size:11px;color:#7c7ca0;">Nombre completo</p>
                <p style="margin:4px 0 0;font-size:14px;color:#e0e0e0;font-weight:500;">${r.signer_full_name}</p>
              </td>
              <td style="padding:14px 20px;width:50%;">
                <p style="margin:0;font-size:11px;color:#7c7ca0;">Correo electrónico</p>
                <p style="margin:4px 0 0;font-size:14px;color:#e0e0e0;">${r.signer_email}</p>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:14px 20px;border-top:1px solid #2a2a45;">
                <p style="margin:0;font-size:11px;color:#7c7ca0;">IP de firma</p>
                <p style="margin:4px 0 0;font-size:13px;color:#7c7ca0;font-family:monospace;">${r.ip_address}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Declaration -->
        <tr><td style="padding:20px 32px 0;">
          <div style="background:#1e1e38;border-left:3px solid #6c63ff;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:11px;color:#7c7ca0;text-transform:uppercase;letter-spacing:1px;">Declaración firmada</p>
            <p style="margin:0;font-size:14px;color:#c0c0e0;line-height:1.6;font-style:italic;">"${r.declaration_text}"</p>
          </div>
        </td></tr>

        <!-- Hash -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 6px;font-size:11px;color:#7c7ca0;text-transform:uppercase;letter-spacing:1px;">Huella del documento (SHA-256)</p>
          <p style="margin:0;font-size:11px;color:#5a5a7a;font-family:monospace;word-break:break-all;">${r.document_hash}</p>
        </td></tr>

        <!-- Legal note -->
        <tr><td style="padding:24px 32px;">
          <div style="background:#0d1a0d;border:1px solid #1a3a1a;border-radius:10px;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#6abf69;line-height:1.6;">
              ✅ <strong>Validez legal:</strong> Esta firma electrónica tiene plena validez conforme a la Ley 527 de 1999 (Colombia) y al E-SIGN Act (EE.UU.). El registro incluye identidad, timestamp, IP y huella del documento.
            </p>
          </div>
        </td></tr>

        <!-- CTA ver comprobante -->
        <tr><td style="padding:0 32px 24px;text-align:center;">
          <a href="${receiptUrl}" target="_blank"
            style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#a855f7);color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;">
            Ver comprobante online →
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#5a5a7a;">También puedes guardar este email como PDF desde tu cliente de correo.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #2a2a45;text-align:center;">
          <p style="margin:0;font-size:12px;color:#5a5a7a;">ID de firma: <span style="font-family:monospace;">${r.id}</span></p>
          <p style="margin:8px 0 0;font-size:12px;color:#5a5a7a;">
            KREOON · SICOMMER INT LLC · 12550 Biscayne Blvd Ste 218, North Miami FL 33181
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:#5a5a7a;">
            <a href="mailto:legal@kreoon.com" style="color:#6c63ff;">legal@kreoon.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { signature_id, user_id }: NotifyPayload = await req.json();

    if (!signature_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "signature_id y user_id son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Obtener comprobante de firma
    const { data: receipt, error: receiptErr } = await supabase.rpc("get_signature_receipt", {
      p_signature_id: signature_id,
      p_user_id: user_id,
    });

    if (receiptErr || !receipt) {
      console.error("[notify-signature] Error obteniendo comprobante:", receiptErr);
      return new Response(
        JSON.stringify({ error: "Comprobante no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const r = receipt as SignatureReceipt;

    // 2. Obtener teléfono del perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user_id)
      .single();

    const phone: string | null = profile?.phone || null;

    const docLabel = DOC_LABELS[r.document_type] || r.document_title;
    const signedDateShort = new Date(r.signed_at).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const receiptUrl = `https://kreoon.com/receipt/${signature_id}`;

    // 3. Enviar email
    let emailSent = false;
    try {
      const resend = getResend();
      const emailResult = await resend.emails.send({
        from: "KREOON <legal@kreoon.com>",
        to: r.signer_email,
        subject: `Comprobante de firma — ${docLabel}`,
        html: buildReceiptHtml(r, receiptUrl),
      });
      emailSent = !emailResult.error;
      if (emailResult.error) {
        console.error("[notify-signature] Error enviando email:", emailResult.error);
      } else {
        console.log("[notify-signature] Email enviado:", emailResult.data?.id);
      }
    } catch (emailErr) {
      console.error("[notify-signature] Excepción email:", emailErr);
    }

    // 4. Enviar WhatsApp (si hay teléfono)
    let whatsappSent = false;
    if (phone) {
      try {
        const { error: waErr } = await supabase.functions.invoke("whatsapp-notify", {
          body: {
            phone,
            event_type: "document_signed",
            variables: [r.signer_full_name, docLabel, signedDateShort],
            user_id,
            entity_id: signature_id,
          },
        });
        whatsappSent = !waErr;
        if (waErr) console.warn("[notify-signature] WhatsApp no enviado:", waErr);
      } catch (waEx) {
        console.warn("[notify-signature] Excepción WhatsApp:", waEx);
      }
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: emailSent, whatsapp_sent: whatsappSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notify-signature] Error general:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
