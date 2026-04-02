import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured } from "../_shared/kreoon-client.ts";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";
import { makeAIRequest, corsHeaders } from "../_shared/ai-providers.ts";
// Nuevo: Prompts desde DB con fallback a V2 hardcodeados
import { getPrompt } from "../_shared/prompts/db-prompts.ts";
import { errorResponse, successResponse, moduleInactiveResponse, validationErrorResponse } from "../_shared/error-response.ts";
import { logAIUsage, calculateCost } from "../_shared/ai-usage-logger.ts";

interface ScriptRequest {
  organizationId: string;
  product_name: string;
  strategy: string;
  market_research: string;
  ideal_avatar: string;
  sales_angle: string;
  additional_context: string;
  sphere_phase?: string;
}

// ============================================
// MASTER_SCRIPT_PROMPT_V2 - Prompt Optimizado
// ============================================
// Tecnicas aplicadas:
// - Chain of Thought explicito (6 pasos)
// - 2 Few-Shot examples
// - Temperatura: 0.7 (configurada en makeAIRequest)
// - Output validation rules
// - Contexto ESFERA condensado
// ============================================

const MASTER_SCRIPT_SYSTEM_PROMPT_V2 = `Eres KREOON AI, copywriter senior especializado en guiones UGC para Latinoamerica.

TU METODOLOGIA (ESFERA - 4 Fases):
1. ENGANCHAR (TOFU): Hooks disruptivos, audiencia fria, NO vender
2. SOLUCION (MOFU): Venta directa, demos, testimonios, audiencia tibia
3. REMARKETING (BOFU): Urgencia, FOMO, audiencia caliente
4. FIDELIZAR: Comunidad, exclusividad, clientes actuales

PROCESO DE PENSAMIENTO (sigue estos pasos):
1. ANALIZA el avatar objetivo y su nivel de consciencia
2. IDENTIFICA el dolor principal y deseo profundo
3. SELECCIONA el angulo de venta mas resonante
4. ESTRUCTURA el guion segun la fase ESFERA
5. ESCRIBE hooks que rompan el patron de scroll
6. VALIDA que cada seccion tenga proposito claro

REGLAS DE OUTPUT:
- Formato HTML limpio (h2, h3, p, ul, li, strong, em)
- NO uses markdown (**, ##)
- Maximo 2 emojis por seccion
- Indicaciones de accion [ENTRE CORCHETES]
- Duracion total: 30-60 segundos de lectura`;

// Few-shot examples para el user prompt
const FEW_SHOT_EXAMPLES = `
EJEMPLOS DE REFERENCIA:

EJEMPLO 1 - FASE ENGANCHAR (Skincare):
<h2>HOOKS</h2>
<h3>Hook A: La Revelacion</h3>
<p>"Llevo 3 anos buscando esto y nadie me lo habia dicho..."</p>
<p><strong>[ACCION]:</strong> Mirar fijamente a camara, pausa dramatica</p>

<h3>Hook B: El Secreto</h3>
<p>"Las dermatologas no quieren que sepas esto"</p>
<p><strong>[ACCION]:</strong> Susurrar, acercarse a camara</p>

<h2>DESARROLLO</h2>
<h3>Problema (10 seg)</h3>
<p>[ACCION: Tocar cara con frustracion]</p>
<p>"Yo tambien tenia la piel opaca, sin vida, llena de marcas..."</p>

<h3>Transicion (5 seg)</h3>
<p>[ACCION: Cambio de expresion a esperanza]</p>
<p>"Hasta que descubri algo que cambio TODO"</p>

<h3>Solucion (15 seg)</h3>
<p>[ACCION: Mostrar producto]</p>
<p>"Este serum tiene vitamina C estabilizada al 20%..."</p>

<h2>CTA</h2>
<p>[ACCION: Mostrar link]</p>
<p>"Link en mi bio, hay 50% de descuento solo hoy"</p>

---

EJEMPLO 2 - FASE SOLUCION (Curso Online):
<h2>HOOKS</h2>
<h3>Hook A: Resultado</h3>
<p>"Asi facture mi primer millon con freelancing"</p>
<p><strong>[ACCION]:</strong> Mostrar pantalla con numeros</p>

<h2>DESARROLLO</h2>
<h3>Antes/Despues (15 seg)</h3>
<p>[ACCION: Split screen o transicion]</p>
<p>"Hace 2 anos ganaba $500 al mes en una oficina que odiaba..."</p>
<p>"Hoy trabajo 4 horas al dia desde Bali..."</p>

<h3>El Puente (10 seg)</h3>
<p>[ACCION: Mostrar metodologia]</p>
<p>"El metodo tiene 3 pilares: posicionamiento, automatizacion, y escalamiento"</p>

<h2>CTA</h2>
<p>[ACCION: Urgencia]</p>
<p>"Quedan 12 cupos para la masterclass gratis de manana"</p>

---`;

// Información detallada del Método Esfera para cada fase
const SPHERE_PHASE_DETAILS: Record<string, {
  label: string;
  objective: string;
  audience: string;
  tone: string;
  techniques: string[];
  keywords: string[];
  cta_style: string;
}> = {
  engage: {
    label: 'ENGANCHAR (Fase 1)',
    objective: 'Viralidad, enganche, disrupción, educar. Que las personas conozcan el producto o servicio y se den cuenta que tienen el problema.',
    audience: 'Audiencia FRÍA - personas que nunca han interactuado con la marca, no conocen el producto ni saben que tienen un problema',
    tone: 'Disruptivo, viral, llamativo, sorprendente. Romper patrones, generar curiosidad extrema.',
    techniques: [
      'Hooks ultra potentes en los primeros 1-3 segundos',
      'Pattern interrupts (romper patrones visuales/auditivos)',
      'Declaraciones controversiales o contraintuitivas',
      'Preguntas que despiertan curiosidad',
      'Mostrar el problema de forma dramatizada',
      'Contenido educativo que revele un problema oculto'
    ],
    keywords: ['¿Sabías que...?', 'Esto es lo que nadie te cuenta', 'Error #1', 'Por qué no funciona', 'La verdad sobre', 'Descubrí que'],
    cta_style: 'Suave - invitar a seguir, comentar, guardar. NO vender directamente.'
  },
  solution: {
    label: 'SOLUCIÓN (Fase 2)',
    objective: 'Venta directa, persuadir para comprar, ser el mejor vendiendo. Mostrar que el producto ES la solución perfecta.',
    audience: 'Audiencia TIBIA - personas que ya saben que tienen el problema y buscan activamente una solución',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación. Venta directa pero no agresiva.',
    techniques: [
      'Demostración del producto en acción',
      'Antes y después transformacionales',
      'Testimonios de clientes reales',
      'Comparación sutil con alternativas',
      'Storytelling de éxito',
      'Beneficios específicos y cuantificables'
    ],
    keywords: ['La solución es', 'Esto cambió todo', 'Finalmente', 'Por eso creamos', 'Resultados garantizados', 'Funciona porque'],
    cta_style: 'Directo - invitar a comprar, probar, registrarse. Link en bio, desliza arriba.'
  },
  remarketing: {
    label: 'REMARKETING (Fase 3)',
    objective: 'Mostrar lo que se está perdiendo, crear urgencia, superar objeciones finales. Cerrar la venta.',
    audience: 'Audiencia CALIENTE - personas que ya vieron el producto, visitaron el sitio, agregaron al carrito pero NO compraron',
    tone: 'Urgente, resolutivo, enfocado en pérdida (FOMO). Atacar objeciones directamente.',
    techniques: [
      'Escasez real (stock limitado, tiempo limitado)',
      'Social proof masivo (X personas ya compraron)',
      'Responder objeciones comunes',
      'Garantías y eliminación de riesgo',
      'Comparación de precio vs valor',
      'Recordatorio de beneficios clave'
    ],
    keywords: ['Últimas unidades', 'Se acaba en', 'No te pierdas', 'Mientras lees esto', 'Si no ahora, cuándo', 'Otros ya lo tienen'],
    cta_style: 'Urgente - comprar ahora, última oportunidad, no esperes más.'
  },
  fidelize: {
    label: 'FIDELIZAR (Fase 4)',
    objective: 'Entregar valor y confianza, buscar que nos refieran y recompren. Crear comunidad y lealtad.',
    audience: 'CLIENTES existentes - personas que ya compraron y queremos que vuelvan a comprar y nos recomienden',
    tone: 'Cercano, exclusivo, valorando al cliente. Contenido de alto valor, tips, comunidad.',
    techniques: [
      'Contenido exclusivo para clientes',
      'Tips de uso avanzado del producto',
      'Historias de otros clientes exitosos',
      'Ofertas exclusivas para clientes',
      'Invitación a programas de referidos',
      'Behind the scenes y contenido humano'
    ],
    keywords: ['Para ti que ya eres cliente', 'Tip exclusivo', 'Gracias por confiar', 'Comparte con', 'Tu experiencia importa', 'Familia [marca]'],
    cta_style: 'Comunitario - compartir, etiquetar amigos, dejar reseña, referir.'
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: ScriptRequest | null = null;

  try {
    // Use Kreoon database if configured, otherwise fallback to default
    let supabase;
    if (isKreoonConfigured()) {
      console.log("[generate-script] Using Kreoon database");
      supabase = getKreoonClient();
    } else {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    requestBody = await req.json();
    const {
      organizationId,
      product_name,
      strategy,
      market_research,
      ideal_avatar,
      sales_angle,
      additional_context,
      sphere_phase
    } = requestBody;

    console.log("Generating script for product:", product_name);

    if (!organizationId) {
      return validationErrorResponse("organizationId es requerido", "organizationId");
    }

    // Validate module is active and get config
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, "scripts");
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        return moduleInactiveResponse("scripts");
      }
      throw error;
    }

    // Get sphere phase info if provided
    const phaseInfo = sphere_phase ? SPHERE_PHASE_DETAILS[sphere_phase] : null;

    // Obtener prompt base desde DB (con cache y fallback a V2 hardcodeado)
    const promptConfig = await getPrompt(supabase, "scripts", "creator");

    // ============================================
    // MASTER_SCRIPT_PROMPT_V2 - Sistema
    // ============================================
    // Usamos el prompt V2 optimizado con Chain of Thought
    // Si hay prompt en DB, lo usamos; sino fallback a V2
    let systemPrompt = promptConfig.systemPrompt || MASTER_SCRIPT_SYSTEM_PROMPT_V2;

    // Add sphere phase specific instructions (condensado para V2)
    if (phaseInfo) {
      systemPrompt += `

=== FASE ESFERA ACTIVA: ${phaseInfo.label} ===
OBJETIVO: ${phaseInfo.objective}
AUDIENCIA: ${phaseInfo.audience}
TONO: ${phaseInfo.tone}
TECNICAS (usar minimo 2): ${phaseInfo.techniques.slice(0, 3).join(', ')}
KEYWORDS: ${phaseInfo.keywords.slice(0, 4).map(k => `"${k}"`).join(', ')}
CTA: ${phaseInfo.cta_style}

VALIDACION: El guion DEBE alinearse 100% con esta fase. NO mezclar tacticas de otras fases.`;
    }

    // ============================================
    // MASTER_SCRIPT_PROMPT_V2 - Usuario
    // ============================================
    // Incluye few-shot examples para mejor calidad
    let userPrompt = `Crea un guion UGC para:

PRODUCTO: ${product_name}
DESCRIPCION: ${strategy || 'No especificada'}
AVATAR: ${ideal_avatar || 'No especificado'}
FASE ESFERA: ${phaseInfo?.label || 'General (Hook -> Problema -> Solucion -> CTA)'}
ANGULO DE VENTA: ${sales_angle || 'General'}
INVESTIGACION DE MERCADO: ${market_research || 'No especificada'}
CTA: Alineado con la fase
PAIS: Colombia/LATAM
CANTIDAD DE HOOKS: 2-3

---
${FEW_SHOT_EXAMPLES}
---`;

    if (additional_context) {
      userPrompt += `

INDICACIONES ADICIONALES: ${additional_context}`;
    }

    userPrompt += `

AHORA GENERA EL GUION PARA EL PRODUCTO INDICADO.
Sigue el proceso de pensamiento. Adapta al avatar y fase ESFERA.
Formato: HTML limpio (h2, h3, p, strong). NO markdown.`;

    // ============================================
    // Llamada a IA con temperatura 0.7 (V2)
    // ============================================
    let script: string;
    const startTime = Date.now();
    try {
      const aiResult = await makeAIRequest({
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey: aiConfig.apiKey,
        systemPrompt,
        userPrompt,
        temperature: 0.7, // V2: Balance creatividad/coherencia
        maxTokens: 4096,  // V2: Guion completo con ejemplos
      });

      if (!aiResult.success || !aiResult.content) {
        const errorMsg = aiResult.error || "No se genero contenido";
        // Check for rate limit or payment errors
        if (errorMsg.includes("429")) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (errorMsg.includes("402")) {
          return new Response(
            JSON.stringify({ error: "Payment required" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(errorMsg);
      }

      script = aiResult.content;
    } catch (err: any) {
      if (err?.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (err?.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }

    const response_time_ms = Date.now() - startTime;
    console.log("Script generated successfully with provider:", aiConfig.provider);

    // Log usage con logger compartido
    logAIUsage(supabase, {
      organization_id: organizationId,
      user_id: "system",
      module: "generate-script",
      action: "generate_script",
      provider: aiConfig.provider,
      model: aiConfig.model,
      tokens_input: 0,
      tokens_output: 0,
      success: true,
      edge_function: "generate-script",
      response_time_ms,
    }).catch(console.error);

    return successResponse({
      script,
      ai_provider: aiConfig.provider,
      ai_model: aiConfig.model
    });
  } catch (error) {
    return errorResponse(error, {
      action: 'generate-script:generate',
      resourceId: requestBody?.product_name,
    });
  }
});
