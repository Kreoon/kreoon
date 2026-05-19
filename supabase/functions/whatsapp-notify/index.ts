import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * whatsapp-notify — Envío de mensajes WhatsApp vía Botcake API (plantillas Meta aprobadas)
 *
 * API: POST /pages/{BOTCAKE_PAGE_ID}/flows/send_content
 * Header: access-token: {BOTCAKE_API_KEY}
 * psid format: "wa_" + phone digits (sin +), ej: wa_573001234567
 *
 * La función busca el template en whatsapp_notification_templates por event_type.
 * Si el template no está activo (is_active = false) o no existe, omite el envío.
 *
 * Env vars requeridas (Supabase Dashboard → Settings → Edge Functions):
 *   BOTCAKE_API_KEY   → access-token de tu página en Botcake
 *   BOTCAKE_PAGE_ID   → WABA page ID (ej: waba_788008314404286)
 *   BOTCAKE_API_URL   → opcional, default: https://botcake.io/api/public_api/v1
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppPayload {
  phone: string;
  event_type: string;
  variables: string[];         // valores para {{1}}, {{2}}, ... del cuerpo
  button_variables?: string[]; // valores para {{1}} del botón CTA (URL dinámica)
  entity_id?: string;
  user_id?: string;
}

interface TemplateRow {
  template_id: string;
  template_name: string;
  language: string;
  category: string;
  is_active: boolean;
}

/**
 * Convierte número de teléfono al psid de Botcake WhatsApp.
 * Formato: "wa_" + dígitos con código de país, sin "+" ni espacios
 *
 * Casos manejados:
 *   "+573001234567"  → "wa_573001234567"  (formato internacional estándar)
 *   "00573001234567" → "wa_573001234567"  (prefijo 00 = +)
 *   "3001234567"     → "wa_573001234567"  (Colombia: 10 dígitos que empiezan en 3)
 *   "573001234567"   → "wa_573001234567"  (Colombia con prefijo, sin +)
 *   "+12025551234"   → "wa_12025551234"   (USA)
 *   "+34612345678"   → "wa_34612345678"   (España)
 */
function toPsid(phone: string): string {
  const raw = phone.trim();

  // Si viene con +, es formato internacional — quitar solo el +
  if (raw.startsWith("+")) {
    return `wa_${raw.replace(/\D/g, "")}`;
  }

  const digits = raw.replace(/\D/g, "");

  // Prefijo internacional con 00 (ej: 00573001234567)
  if (digits.startsWith("00") && digits.length > 10) {
    return `wa_${digits.slice(2)}`;
  }

  // Colombia: 10 dígitos que empiezan en 3 (móvil colombiano sin prefijo)
  if (digits.startsWith("3") && digits.length === 10) {
    return `wa_57${digits}`;
  }

  // Ya tiene código de país (≥11 dígitos)
  return `wa_${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: WhatsAppPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { phone, event_type, variables = [], button_variables, entity_id, user_id } = payload;

  if (!phone || !event_type) {
    return new Response(
      JSON.stringify({ error: "phone and event_type are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Buscar template activo para este event_type
  const { data: template, error: tmplError } = await supabase
    .from("whatsapp_notification_templates")
    .select("template_id, template_name, language, category, is_active")
    .eq("event_type", event_type)
    .single<TemplateRow>();

  if (tmplError || !template) {
    console.warn(`[whatsapp-notify] Template no encontrado para event_type="${event_type}" — omitiendo`);
    return new Response(
      JSON.stringify({ success: false, reason: "Template not found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!template.is_active) {
    console.warn(`[whatsapp-notify] Template "${event_type}" inactivo (pendiente aprobación Meta) — omitiendo`);
    return new Response(
      JSON.stringify({ success: false, reason: "Template not active" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const botcakeApiKey = Deno.env.get("BOTCAKE_API_KEY");
  const botcakePageId = Deno.env.get("BOTCAKE_PAGE_ID");
  const botcakeApiUrl = Deno.env.get("BOTCAKE_API_URL") || "https://botcake.io/api/public_api/v1";

  if (!botcakeApiKey || !botcakePageId) {
    console.warn("[whatsapp-notify] BOTCAKE_API_KEY o BOTCAKE_PAGE_ID no configurados — omitiendo envío");
    return new Response(
      JSON.stringify({ success: false, reason: "Botcake credentials not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const psid = toPsid(phone);

  // Mensaje de log (concatenación de variables para legibilidad en logs)
  const logMessage = variables.join(" | ");

  // Log inicial (pending)
  const { data: logRow } = await supabase
    .from("whatsapp_notification_logs")
    .insert({
      user_id: user_id || null,
      phone: psid,
      message: logMessage,
      event_type,
      entity_id: entity_id || null,
      status: "pending",
    })
    .select("id")
    .single();

  const logId = logRow?.id;

  // Construir payload de plantilla para Botcake
  const endpoint = `${botcakeApiUrl}/pages/${botcakePageId}/flows/send_content`;

  const sanitizedVars = variables.map((value) =>
    String(value ?? "").replace(/[\n\r\t]/g, " ").replace(/ {5,}/g, "    ").trim()
  );

  const components: unknown[] = [];

  if (sanitizedVars.length > 0) {
    components.push({
      type: "BODY",
      params: sanitizedVars.map((v, i) => ({
        key: `{{${i + 1}}}`,
        parameter_name: `${i + 1}`,
        value: v,
      })),
    });
  }

  // Botón CTA con URL dinámica (ej: "Ver Documento" → https://kreoon.com/{{1}})
  if (button_variables && button_variables.length > 0) {
    components.push({
      type: "BUTTON",
      sub_type: "url",
      index: "0",
      params: button_variables.map((v, i) => ({
        key: `{{${i + 1}}}`,
        parameter_name: `${i + 1}`,
        value: String(v ?? "").trim(),
      })),
    });
  }

  const botcakeBody = {
    psid,
    data: {
      version: "v2",
      content: {
        messages: [
          {
            type: "whatsapp_message_template",
            template_id: template.template_id,
            language: template.language,
            category: template.category,
            components,
          },
        ],
      },
    },
  };

  let status: "sent" | "failed" = "failed";
  let providerResponse: unknown = null;

  try {
    const botcakeRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access-token": botcakeApiKey,
      },
      body: JSON.stringify(botcakeBody),
    });

    providerResponse = await botcakeRes.json().catch(() => null);
    // Botcake retorna HTTP 200 incluso en fallo — verificar campo success en el body
    const bodySuccess = (providerResponse as Record<string, unknown>)?.success !== false;
    status = (botcakeRes.ok && bodySuccess) ? "sent" : "failed";

    if (status === "failed") {
      console.error(`[whatsapp-notify] Botcake error ${botcakeRes.status}:`, providerResponse);
    } else {
      console.log(`[whatsapp-notify] Template "${event_type}" enviado a ${psid}`);
    }
  } catch (err) {
    console.error("[whatsapp-notify] Error de red:", err);
    providerResponse = { error: String(err) };
  }

  // Actualizar log
  if (logId) {
    await supabase
      .from("whatsapp_notification_logs")
      .update({ status, provider_response: providerResponse })
      .eq("id", logId);
  }

  return new Response(
    JSON.stringify({ success: status === "sent", psid, event_type }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
