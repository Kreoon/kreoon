import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  organizationId: string;
  contentId: string;
  videoUrl?: string;
  product?: {
    name?: string;
    description?: string;
    strategy?: string;
    market_research?: string;
    ideal_avatar?: string;
    sales_angles?: string[];
  };
  client?: {
    name?: string;
    category?: string;
    bio?: string;
  };
  script?: string;
  spherePhase?: string;
  guidelines?: {
    editor?: string;
    strategist?: string;
    trafficker?: string;
    designer?: string;
    admin?: string;
  };
}

interface AdCopy {
  text: string;
  cta: string;
  trustBadge: string;
  psychologicalTriggers: string[];
}

interface AnalysisResult {
  recommendedPhase: {
    phase: string;
    confidence: number;
    reasoning: string;
  };
  adCopies: AdCopy[];
  contentAnalysis: {
    hook_effectiveness: number;
    emotional_impact: number;
    clarity: number;
    cta_strength: number;
    overall_score: number;
    strengths: string[];
    improvements: string[];
  };
}

const SPHERE_PHASES = {
  engage: {
    label: "Enganchar (Engage)",
    description: "Captar atención, generar curiosidad, crear awareness. Audiencia fría.",
    indicators: ["hooks potentes", "scroll-stoppers", "contenido disruptivo", "curiosidad", "awareness"]
  },
  solution: {
    label: "Solución",
    description: "Presentar producto como solución. Audiencia tibia que reconoce su problema.",
    indicators: ["beneficios", "diferenciadores", "educativo", "problema-solución", "empático"]
  },
  remarketing: {
    label: "Remarketing",
    description: "Reconectar con usuarios que ya interactuaron. Superar objeciones.",
    indicators: ["urgencia", "testimonios", "objeciones", "prueba social", "ofertas"]
  },
  fidelize: {
    label: "Fidelizar",
    description: "Retener clientes, generar recompra. Clientes existentes.",
    indicators: ["exclusivo", "valoración", "comunidad", "referidos", "lealtad"]
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: AnalysisRequest = await req.json();
    const { organizationId, contentId, videoUrl, product, client, script, spherePhase, guidelines } = body;

    if (!organizationId || !contentId) {
      throw new Error("organizationId and contentId are required");
    }

    // Build comprehensive context for analysis
    let contextParts: string[] = [];
    
    contextParts.push("=== INFORMACIÓN DE LA EMPRESA/CLIENTE ===");
    if (client) {
      if (client.name) contextParts.push(`Nombre: ${client.name}`);
      if (client.category) contextParts.push(`Categoría: ${client.category}`);
      if (client.bio) contextParts.push(`Descripción: ${client.bio}`);
    }

    contextParts.push("\n=== INFORMACIÓN DEL PRODUCTO ===");
    if (product) {
      if (product.name) contextParts.push(`Producto: ${product.name}`);
      if (product.description) contextParts.push(`Descripción: ${product.description}`);
      if (product.strategy) contextParts.push(`Estrategia: ${product.strategy}`);
      if (product.market_research) contextParts.push(`Investigación de mercado: ${product.market_research}`);
      if (product.ideal_avatar) contextParts.push(`Avatar ideal: ${product.ideal_avatar}`);
      if (product.sales_angles?.length) {
        contextParts.push(`Ángulos de venta:\n${product.sales_angles.map((a, i) => `${i+1}. ${a}`).join('\n')}`);
      }
    }

    if (script) {
      contextParts.push("\n=== GUIÓN DEL CONTENIDO ===");
      contextParts.push(script);
    }

    if (guidelines) {
      contextParts.push("\n=== GUÍAS GENERADAS POR ROL ===");
      if (guidelines.editor) contextParts.push(`Editor: ${guidelines.editor}`);
      if (guidelines.strategist) contextParts.push(`Estratega: ${guidelines.strategist}`);
      if (guidelines.trafficker) contextParts.push(`Trafficker: ${guidelines.trafficker}`);
      if (guidelines.designer) contextParts.push(`Diseñador: ${guidelines.designer}`);
      if (guidelines.admin) contextParts.push(`Admin: ${guidelines.admin}`);
    }

    if (spherePhase && SPHERE_PHASES[spherePhase as keyof typeof SPHERE_PHASES]) {
      contextParts.push("\n=== FASE ESFERA ACTUAL ===");
      const phase = SPHERE_PHASES[spherePhase as keyof typeof SPHERE_PHASES];
      contextParts.push(`Fase: ${phase.label}`);
      contextParts.push(`Descripción: ${phase.description}`);
    }

    const fullContext = contextParts.join('\n');

    const systemPrompt = `Eres un experto en marketing digital, copywriting persuasivo, neuropsicología aplicada a ventas y análisis de contenido UGC para performance ads.

Tu tarea es analizar el contenido (video/guión + contexto) y devolver:

1) RECOMENDACIÓN DE FASE ESFERA (la fase donde este contenido rinde mejor):
   - ENGAGE: audiencia fría. Objetivo: detener el scroll + curiosidad + awareness.
   - SOLUTION (FASE 2): audiencia tibia que YA reconoce el problema. Objetivo: VENDER (campaña de ventas/conversión) presentando la solución + beneficio + oferta/garantía + CTA directa.
   - REMARKETING: audiencia caliente. Objetivo: superar objeciones + prueba social + urgencia.
   - FIDELIZE: clientes existentes. Objetivo: recompra + comunidad + referidos.

2) GENERAR 5 COPYS PARA ADS, CADA UNO CON UNA ESTRUCTURA/FRAMEWORK DIFERENTE:

   COPY 1 - AIDA (Attention, Interest, Desire, Action):
   - Atención: gancho impactante
   - Interés: desarrollar beneficio principal
   - Deseo: pintar el resultado/transformación
   - Acción: CTA clara

   COPY 2 - PAS (Problem, Agitate, Solution):
   - Problema: identificar el dolor del avatar
   - Agitar: amplificar las consecuencias de no resolver
   - Solución: presentar el producto como la respuesta

   COPY 3 - PASTOR (Problem, Amplify, Story, Transformation, Offer, Response):
   - Problema + Amplificación emocional
   - Historia breve o caso
   - Transformación tangible
   - Oferta + Llamada a responder

   COPY 4 - BAB (Before, After, Bridge):
   - Antes: situación actual con el problema
   - Después: visión del resultado deseado
   - Puente: el producto como camino entre ambos

   COPY 5 - 4Ps (Picture, Promise, Prove, Push):
   - Pintar escenario emocional
   - Prometer resultado específico
   - Probar con dato/testimonio/garantía
   - Empujar con CTA + urgencia

REGLAS ADICIONALES POR FASE:
- ENGAGE: 1 idea, 1 tensión, 1 curiosidad. CTA suave.
- SOLUTION (FASE 2): SIEMPRE es campaña de ventas. Habla en 2ª persona, problema→solución→resultado. Incluir: beneficio + diferenciador + reducción de riesgo + CTA DIRECTA.
- REMARKETING: atacar objeciones, prueba social, urgencia/escasez. CTA de cierre.
- FIDELIZE: valor post-compra, comunidad, upgrades, referidos.

Cada copy debe incluir:
- framework: nombre del framework usado (AIDA, PAS, PASTOR, BAB, 4Ps)
- text: Copy principal del anuncio siguiendo la estructura del framework
- clickBooster: Frase ULTRA persuasiva (5-10 palabras) que acompaña el botón e incita a hacer clic. NO es el texto del botón, es un microcopy al lado que genera urgencia/deseo/curiosidad. Usa emoji. Ejemplos:
  - "👇 Miles ya cambiaron su vida"
  - "⚡ Tu transformación empieza aquí"
  - "🔥 Lo que buscabas, al fin"
  - "✨ Un clic te separa del cambio"
  - "🚀 No te quedes atrás"
  - "💎 Acceso exclusivo por tiempo limitado"
  - "🎯 Esto es para ti"
  - "⏳ Mañana puede ser tarde"
  - "👀 ¿Vas a dejar pasar esto?"
  - "💥 Tu momento es ahora"
- trustBadge: Frase de confianza/seguridad de 3-5 palabras con emoji que reduce fricción. Ejemplos:
  - "🔒 Pago 100% seguro"
  - "✅ Garantía de satisfacción"
  - "📦 Envío gratis hoy"
  - "🏆 +10,000 clientes felices"
  - "💳 Paga en cuotas sin interés"
  - "🔄 Devolución sin preguntas"
- psychologicalTriggers: Lista de gatillos mentales/sesgos usados

3) ANÁLISIS DEL CONTENIDO:
Evalúa hook_effectiveness, emotional_impact, clarity, cta_strength, overall_score + fortalezas y mejoras.

RESPONDE EN FORMATO JSON EXACTO:
{
  "recommendedPhase": {
    "phase": "engage|solution|remarketing|fidelize",
    "confidence": 0-100,
    "reasoning": "explicación breve"
  },
  "adCopies": [
    {
      "framework": "AIDA|PAS|PASTOR|BAB|4Ps",
      "text": "copy del anuncio",
      "clickBooster": "👇 Frase persuasiva que incita al clic",
      "trustBadge": "🔒 Frase de confianza con emoji",
      "psychologicalTriggers": ["gatillo1", "gatillo2"]
    }
  ],
  "contentAnalysis": {
    "hook_effectiveness": 0-100,
    "emotional_impact": 0-100,
    "clarity": 0-100,
    "cta_strength": 0-100,
    "overall_score": 0-100,
    "strengths": ["fortaleza1", "fortaleza2"],
    "improvements": ["mejora1", "mejora2"]
  }
}`;

    const userPrompt = `Analiza el siguiente contenido y genera recomendaciones:

${fullContext}

${videoUrl ? `URL del video: ${videoUrl}` : ''}

Genera el análisis completo con la recomendación de fase, 5 copys para ads y el análisis de efectividad.`;

    console.log("[analyze-video-content] Calling Gemini API...");
    console.log("[analyze-video-content] Context length:", fullContext.length);

    // Call Gemini via Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded - intenta de nuevo en unos segundos");
      }
      if (response.status === 402) {
        throw new Error("Créditos de IA agotados - contacta al administrador");
      }
      const errorText = await response.text();
      console.error("[analyze-video-content] API error:", errorText);
      throw new Error(`Error de IA: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No se recibió respuesta de la IA");
    }

    console.log("[analyze-video-content] AI response received, length:", content.length);

    // Parse JSON response
    let analysisResult: AnalysisResult;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[analyze-video-content] Parse error:", parseError);
      console.error("[analyze-video-content] Raw content:", content);
      throw new Error("Error al procesar la respuesta de la IA");
    }

    // Log usage
    try {
      await supabase.from("ai_usage_logs").insert({
        organization_id: organizationId,
        user_id: user.id,
        provider: "lovable",
        model: "google/gemini-2.5-flash",
        module: "content_analysis",
        action: "analyze_video",
        success: true,
      });
    } catch (e) {
      console.error("[analyze-video-content] Failed to log usage:", e);
    }

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[analyze-video-content] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      {
        status: error.message?.includes("Unauthorized") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
