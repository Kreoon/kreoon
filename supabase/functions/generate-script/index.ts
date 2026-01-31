import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getKreoonClient, isKreoonConfigured } from "../_shared/kreoon-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Get module AI configuration with validation
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  if (!moduleData?.is_active) {
    throw new Error(`MODULE_INACTIVE:${moduleKey}`);
  }
  
  let provider = moduleData?.provider || "lovable";
  let model = moduleData?.model || "google/gemini-2.5-flash";
  let apiKey: string | null = null;
  
  if (provider !== "lovable") {
    const { data: providerData } = await supabase
      .from("organization_ai_providers")
      .select("api_key_encrypted")
      .eq("organization_id", organizationId)
      .eq("provider_key", provider)
      .eq("is_enabled", true)
      .maybeSingle();
    
    if (providerData?.api_key_encrypted) {
      apiKey = providerData.api_key_encrypted;
    } else {
      provider = "lovable";
      model = "google/gemini-2.5-flash";
    }
  }
  
  if (provider === "lovable") {
    apiKey = lovableApiKey || null;
  }
  
  if (!apiKey) {
    throw new Error("No hay API key configurada para el proveedor de IA");
  }
  
  return { provider, model, apiKey };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use Kreoon (external) database if configured, otherwise fallback to Lovable Cloud
    let supabase;
    if (isKreoonConfigured()) {
      console.log("[generate-script] Using Kreoon database");
      supabase = getKreoonClient();
    } else {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      supabase = createClient(supabaseUrl, supabaseKey);
    }

    const { 
      organizationId,
      product_name, 
      strategy, 
      market_research, 
      ideal_avatar, 
      sales_angle, 
      additional_context,
      sphere_phase
    }: ScriptRequest = await req.json();

    console.log("Generating script for product:", product_name);

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate module is active
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, "scripts");
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        return new Response(
          JSON.stringify({ 
            error: "MODULE_INACTIVE",
            module: "scripts",
            message: "El módulo de IA 'Generación de Guiones' no está habilitado. Actívalo en Configuración → IA & Modelos."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    // Get sphere phase info if provided
    const phaseInfo = sphere_phase ? SPHERE_PHASE_DETAILS[sphere_phase] : null;
    
    // Build dynamic system prompt based on sphere phase
    let systemPrompt = `Eres un experto copywriter especializado en crear guiones para videos UGC (User Generated Content) y anuncios en redes sociales. Tu objetivo es crear guiones persuasivos, naturales y que conecten emocionalmente con la audiencia.

Reglas generales para el guión:
1. Usa un tono conversacional y natural, como si hablaras con un amigo
2. Incluye un hook poderoso en los primeros 3 segundos
3. Mantén el guión entre 30-60 segundos de lectura
4. Incluye indicaciones entre corchetes [ACCIÓN] para el creador
5. Evita sonar como publicidad tradicional
6. Usa storytelling cuando sea posible
7. El idioma debe ser español latinoamericano`;

    // Add sphere phase specific instructions
    if (phaseInfo) {
      systemPrompt += `

=== INSTRUCCIONES CRÍTICAS - MÉTODO ESFERA: ${phaseInfo.label} ===

🎯 OBJETIVO DE ESTA FASE:
${phaseInfo.objective}

👥 AUDIENCIA OBJETIVO:
${phaseInfo.audience}

🎨 TONO Y ESTILO:
${phaseInfo.tone}

📋 TÉCNICAS A USAR (OBLIGATORIO incluir al menos 2):
${phaseInfo.techniques.map((t, i) => `${i + 1}. ${t}`).join('\n')}

💬 FRASES/KEYWORDS SUGERIDAS:
${phaseInfo.keywords.map(k => `• "${k}"`).join('\n')}

📢 ESTILO DE CTA (Call to Action):
${phaseInfo.cta_style}

IMPORTANTE: El guión DEBE estar 100% alineado con los objetivos de la ${phaseInfo.label}. 
NO uses tácticas de otras fases. Por ejemplo:
- Si es ENGAGE: NO vendas directamente, solo genera curiosidad y awareness
- Si es SOLUCIÓN: SÍ vende directamente, muestra beneficios claros
- Si es REMARKETING: Crea urgencia, supera objeciones, usa FOMO
- Si es FIDELIZAR: Valora al cliente, ofrece exclusividad, busca referidos`;
    } else {
      systemPrompt += `

Estructura recomendada: Hook → Problema → Solución → Beneficios → CTA`;
    }

    let userPrompt = `Crea un guión de video UGC para el siguiente producto:

**Producto:** ${product_name}

**Estrategia del producto:** ${strategy || 'No especificada'}

**Investigación de mercado:** ${market_research || 'No especificada'}

**Avatar ideal (cliente objetivo):** ${ideal_avatar || 'No especificado'}

**Ángulo de venta a usar:** ${sales_angle || 'General'}`;

    if (phaseInfo) {
      userPrompt += `

**🎯 FASE DEL EMBUDO ESFERA:** ${phaseInfo.label}
- Objetivo: ${phaseInfo.objective}
- Audiencia: ${phaseInfo.audience}
- Tono requerido: ${phaseInfo.tone}`;
    }

    if (additional_context) {
      userPrompt += `

**Indicaciones adicionales:** ${additional_context}`;
    }

    userPrompt += `

Genera un guión completo listo para grabar, con indicaciones de acción para el creador.
${phaseInfo ? `RECUERDA: Este guión es específicamente para la fase "${phaseInfo.label}" del Método Esfera. Asegúrate de que cada elemento del guión cumpla con los objetivos de esta fase.` : ''}`;

    // Build request based on provider
    let url: string;
    let headers: Record<string, string>;
    let body: any;

    if (aiConfig.provider === "lovable") {
      url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };
    } else if (aiConfig.provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };
    } else {
      // Fallback to lovable
      url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content || "";

    console.log("Script generated successfully with provider:", aiConfig.provider);

    // Log usage
    try {
      await supabase.from("ai_usage_logs").insert({
        organization_id: organizationId,
        user_id: "system",
        provider: aiConfig.provider,
        model: aiConfig.model,
        module: "scripts",
        action: "generate_script",
        success: true
      });
    } catch (e) {
      console.error("Failed to log AI usage:", e);
    }

    return new Response(
      JSON.stringify({ script, ai_provider: aiConfig.provider, ai_model: aiConfig.model }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
