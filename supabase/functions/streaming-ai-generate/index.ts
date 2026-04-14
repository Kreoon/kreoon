import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getModuleAIConfig, getPerplexityConfig } from "../_shared/get-module-ai-config.ts";
import { makeAIRequest, corsHeaders } from "../_shared/ai-providers.ts";
import { logAIUsage, calculateCost } from "../_shared/ai-usage-logger.ts";
// SECURITY: Rate limiting para proteger APIs costosas
import { checkRateLimit, RATE_LIMIT_PRESETS, rateLimitResponse, getClientIp } from "../_shared/rate-limiter.ts";

const LIVE_SHOPPING_SYSTEM_PROMPT = `Eres un experto en Live Shopping y Social Commerce para Latinoamérica.

Tu especialidad es crear contenido estratégico para eventos de venta en vivo que:
1. Generen expectativa y FOMO antes del evento
2. Mantengan engagement durante la transmisión
3. Maximicen conversiones con ofertas y urgencia
4. Creen comunidad y fidelización post-evento

Conoces las mejores prácticas de:
- TikTok Shop
- Instagram Live Shopping
- Facebook Live Sales
- YouTube Live Commerce

Siempre responde en JSON estructurado válido. No incluyas markdown ni texto adicional.`;

const EVENT_TYPE_PROMPTS: Record<string, string> = {
  informative: "un evento informativo/educativo de streaming",
  shopping: "un evento de live shopping/venta en directo",
  webinar: "un webinar profesional",
  interview: "una entrevista en vivo",
  entertainment: "un evento de entretenimiento en vivo",
  educational: "un evento educativo/formativo",
  launch: "un lanzamiento de producto",
  flash_sale: "una venta relámpago",
  demo: "una demo de producto",
  qa: "sesión de preguntas y respuestas",
  collab: "una colaboración en vivo",
};

interface EventData {
  clientName?: string;
  productName?: string;
  productDescription?: string;
  productPrice?: number;
  discountPercent?: number;
  eventDate?: string;
  eventDuration?: number;
  platform?: "tiktok" | "instagram" | "facebook" | "youtube";
  eventType?: string;
  targetAudience?: string;
  previousContent?: string;
}

interface LiveContentRequest {
  action:
    | "generate_full"
    | "generate_event_content"
    | "generate_title"
    | "generate_description"
    | "generate_script"
    | "improve"
    | "improve_title"
    | "improve_description";
  organizationId?: string | null;
  eventData?: EventData;
  eventType?: string;
  clientName?: string;
  product?: string;
  productName?: string;
  keywords?: string[];
  currentTitle?: string;
  currentDescription?: string;
}

async function generateFullLiveContent(
  supabase: any,
  request: LiveContentRequest
): Promise<Record<string, unknown>> {
  const { eventData = {}, organizationId, usePerplexity } = request as LiveContentRequest & { usePerplexity?: boolean };
  const ed = eventData as EventData;

  let trendContext = "";
  if (usePerplexity && organizationId) {
    const perplexityConfig = await getPerplexityConfig(supabase, organizationId);
    if (perplexityConfig.apiKey) {
      const trendResult = await makeAIRequest({
        provider: "perplexity",
        model: perplexityConfig.model,
        apiKey: perplexityConfig.apiKey,
        systemPrompt: "Eres un investigador de tendencias de Live Shopping en Latinoamérica. Responde en español, de forma concisa.",
        userPrompt: `¿Cuáles son las tendencias actuales de Live Shopping para productos de ${ed.productName || "ecommerce"} en Latinoamérica? Incluye: mejores horarios, formatos exitosos, hooks que funcionan, ofertas efectivas. Sé específico y actual.`,
        temperature: 0.3,
      });
      if (trendResult.success && trendResult.content) {
        trendContext = `
TENDENCIAS ACTUALES (investigación en tiempo real):
${trendResult.content}
`;
      }
    }
  }

  const aiConfig = await getModuleAIConfig(supabase, organizationId ?? null, "streaming_ai", {
    requireActive: false,
    allowNullOrg: true,
  });

  const userPrompt = `
Genera un paquete completo de contenido para este evento de Live Shopping:

DATOS DEL EVENTO:
- Cliente/Marca: ${ed.clientName || "No especificado"}
- Producto: ${ed.productName || "No especificado"}
- Descripción: ${ed.productDescription || "No especificada"}
- Precio: ${ed.productPrice ? `$${ed.productPrice}` : "No especificado"}
- Descuento: ${ed.discountPercent ? `${ed.discountPercent}%` : "Sin descuento"}
- Fecha: ${ed.eventDate || "Por definir"}
- Duración: ${ed.eventDuration || 30} minutos
- Plataforma: ${ed.platform || "Instagram"}
- Tipo de evento: ${ed.eventType || "demo"}
- Audiencia objetivo: ${ed.targetAudience || "General"}

${trendContext}

Genera el siguiente contenido en JSON:
{
  "event_title": "título atractivo (max 60 chars)",
  "event_description": "descripción para promoción (max 200 chars)",
  "promotional_content": {
    "teaser_post": "texto para post de anuncio 3 días antes",
    "reminder_post": "texto para recordatorio 1 día antes",
    "countdown_story": "texto para story de countdown",
    "hashtags": ["array de hashtags relevantes"]
  },
  "script_outline": {
    "intro": { "duration_minutes": 3, "talking_points": ["punto 1", "punto 2"], "hook": "frase de apertura impactante" },
    "product_demo": { "duration_minutes": 10, "talking_points": ["beneficio 1"], "interaction_prompts": ["pregunta para audiencia"] },
    "offer_reveal": { "duration_minutes": 5, "urgency_elements": ["elemento"], "cta": "llamado a la acción" },
    "qa_section": { "duration_minutes": 7, "prepared_questions": ["pregunta"], "objection_handlers": ["objeción y respuesta"] },
    "closing": { "duration_minutes": 5, "final_cta": "último llamado", "next_steps": "qué sigue" }
  },
  "interaction_elements": {
    "polls": [{"question": "...", "options": ["...", "..."]}],
    "giveaway_mechanic": "descripción de sorteo si aplica",
    "comment_triggers": ["palabras clave"]
  },
  "technical_checklist": ["verificación 1", "verificación 2"],
  "kpis_target": {
    "viewers_peak": "objetivo",
    "engagement_rate": "objetivo",
    "conversion_rate": "objetivo",
    "revenue_target": "objetivo"
  }
}`;

  const result = await makeAIRequest({
    ...aiConfig,
    systemPrompt: LIVE_SHOPPING_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.7,
  });

  if (!result.success) {
    throw new Error(result.error ?? "AI error");
  }

  const content = result.content ?? "";
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { event_title: "", event_description: "", raw: content };
  } catch {
    return { event_title: "", event_description: "", raw: content };
  }
}

async function runLegacyAction(
  supabase: any,
  action: string,
  params: Record<string, unknown>,
  aiConfig: { provider: string; model: string; apiKey: string }
): Promise<Record<string, unknown>> {
  const typeDesc = EVENT_TYPE_PROMPTS[params.eventType as string] || "un evento de streaming";
  const systemPrompt =
    "Eres un experto en marketing digital y creación de contenido para streaming en vivo. Siempre respondes en español con contenido atractivo y profesional. SOLO respondes con JSON válido, sin texto adicional.";

  let userPrompt = "";
  switch (action) {
    case "generate_event_content":
      userPrompt = `Genera un título atractivo y una descripción breve para ${typeDesc}.
${params.clientName ? `Cliente/Marca: ${params.clientName}` : ""}
${params.product ? `Producto/Tema: ${params.product}` : ""}
${(params.keywords as string[])?.length ? `Palabras clave: ${(params.keywords as string[]).join(", ")}` : ""}

Responde SOLO con un JSON válido con las claves "title" y "description". El título máximo 60 caracteres, descripción máximo 200. Ejemplo: {"title": "🔴 Ofertas Exclusivas en VIVO", "description": "Únete a nuestra transmisión..."}`;
      break;
    case "improve_title":
      userPrompt = `Mejora este título para ${typeDesc}: "${params.currentTitle}"\nEl nuevo título máximo 60 caracteres, en español. Responde SOLO con JSON: {"title": "tu título mejorado"}`;
      break;
    case "improve_description":
      userPrompt = `Mejora esta descripción para ${typeDesc}: "${params.currentDescription}"\nLa nueva descripción máxima 200 caracteres, en español. Responde SOLO con JSON: {"description": "tu descripción mejorada"}`;
      break;
    default:
      throw new Error("Invalid action");
  }

  const result = await makeAIRequest({
    ...aiConfig,
    systemPrompt,
    userPrompt,
    temperature: 0.7,
  });

  if (!result.success) {
    throw new Error(result.error ?? "AI error");
  }

  const content = result.content ?? "";
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    if (action === "generate_event_content") {
      return { title: parsed.title ?? "", description: parsed.description ?? "" };
    }
    if (action === "improve_title") {
      return { title: parsed.title ?? params.currentTitle };
    }
    return { description: parsed.description ?? params.currentDescription };
  } catch {
    if (action === "generate_event_content") {
      return {
        title: `🔴 Live: ${params.clientName || params.eventType}`.substring(0, 60),
        description: "Únete a nuestra transmisión en vivo. ¡No te lo pierdas!",
      };
    }
    if (action === "improve_title") {
      return { title: `🔴 ${params.currentTitle}`.substring(0, 60) };
    }
    return { description: `¡No te pierdas! ${params.currentDescription}`.substring(0, 200) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── SECURITY: Rate limiting por IP (20 req/min para AI) ──
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkRateLimit(supabase, clientIp, RATE_LIMIT_PRESETS.ai);
    if (!rateLimitResult.allowed) {
      console.warn(`[streaming-ai-generate] Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(req, rateLimitResult, RATE_LIMIT_PRESETS.ai.limit);
    }
    // ─────────────────────────────────────────────────────────

    const body = (await req.json()) as LiveContentRequest & {
      usePerplexity?: boolean;
      eventType?: string;
      clientName?: string;
      product?: string;
      keywords?: string[];
      currentTitle?: string;
      currentDescription?: string;
    };

    const {
      action,
      organizationId,
      eventData,
      eventType,
      clientName,
      product,
      productName,
      keywords,
      currentTitle,
      currentDescription,
      usePerplexity,
    } = body;

    let output: Record<string, unknown>;

    if (action === "generate_full") {
      const mergedEventData: EventData = {
        ...eventData,
        clientName: eventData?.clientName ?? clientName,
        productName: eventData?.productName ?? product ?? productName,
        eventType: eventData?.eventType ?? eventType,
      };
      output = await generateFullLiveContent(supabase, {
        ...body,
        eventData: mergedEventData,
        organizationId,
        usePerplexity,
      });
      // Normalizar a formato compatible con legacy (title/description) si el frontend lo espera
      if (output.event_title && !output.title) {
        output.title = output.event_title;
      }
      if (output.event_description && !output.description) {
        output.description = output.event_description;
      }
    } else if (
      action === "generate_event_content" ||
      action === "improve_title" ||
      action === "improve_description"
    ) {
      const aiConfig = await getModuleAIConfig(supabase, organizationId ?? null, "streaming_ai", {
        requireActive: false,
        allowNullOrg: true,
      });
      output = await runLegacyAction(supabase, action, {
        eventType,
        clientName,
        product,
        keywords,
        currentTitle,
        currentDescription,
      }, aiConfig);
    } else {
      throw new Error(`Invalid action: ${action}`);
    }

    logAIUsage(supabase, {
      organization_id: organizationId || "00000000-0000-0000-0000-000000000000",
      user_id: "00000000-0000-0000-0000-000000000000",
      module: "streaming-ai",
      action: action ?? "streaming_ai",
      provider: "gemini",
      model: "gemini-2.5-flash",
      tokens_input: 0,
      tokens_output: 0,
      success: true,
      edge_function: "streaming-ai-generate",
    }).catch(console.error);

    return new Response(JSON.stringify(output), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (err.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required, please add funds." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
