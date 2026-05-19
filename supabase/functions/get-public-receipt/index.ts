import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const signatureId = url.searchParams.get("id");

    if (!signatureId) {
      return new Response(
        JSON.stringify({ error: "Parámetro 'id' requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UUID básico validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(signatureId)) {
      return new Response(
        JSON.stringify({ error: "ID inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sig, error } = await supabase
      .from("digital_signatures")
      .select(`
        id, document_type, document_version, document_hash,
        signer_full_name, signer_email, declaration_text,
        signature_method, signed_at, status,
        legal_documents!document_id ( title )
      `)
      .eq("id", signatureId)
      .eq("status", "valid")
      .single();

    if (error || !sig) {
      return new Response(
        JSON.stringify({ error: "Comprobante no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mask email: alexander@kreoon.com → al***@kreoon.com
    const emailParts = sig.signer_email?.split("@") || ["", ""];
    const maskedEmail = emailParts[0].length > 2
      ? `${emailParts[0].slice(0, 2)}***@${emailParts[1]}`
      : `***@${emailParts[1]}`;

    const docTitle = (sig.legal_documents as { title: string } | null)?.title
      || DOC_LABELS[sig.document_type]
      || sig.document_type;

    return new Response(
      JSON.stringify({
        id: sig.id,
        document_type: sig.document_type,
        document_title: docTitle,
        document_title_label: DOC_LABELS[sig.document_type] || docTitle,
        document_version: sig.document_version,
        document_hash: sig.document_hash,
        signer_full_name: sig.signer_full_name,
        signer_email_masked: maskedEmail,
        declaration_text: sig.declaration_text,
        signature_method: sig.signature_method,
        signature_method_label: METHOD_LABELS[sig.signature_method] || sig.signature_method,
        signed_at: sig.signed_at,
        status: sig.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[get-public-receipt] Error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
