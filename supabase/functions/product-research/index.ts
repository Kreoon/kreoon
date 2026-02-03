import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pasos del research con dependencias explícitas (mapeo a fases A1/A2/A3/B1/B2/B3)
const RESEARCH_STEPS = [
  { id: "market_overview", name: "Panorama de Mercado", dependsOn: [] as string[] },
  { id: "jtbd", name: "Jobs To Be Done + Dolores/Deseos", dependsOn: ["market_overview"] },
  { id: "competitors", name: "Análisis de Competencia", dependsOn: ["market_overview"] },
  { id: "avatars_differentiation", name: "Avatares + Diferenciación + ESFERA + Resumen Ejecutivo", dependsOn: ["jtbd", "competitors"] },
  { id: "sales_puv_transformation_leadmagnets", name: "Ángulos + PUV + Transformación + Lead Magnets", dependsOn: ["avatars_differentiation"] },
  { id: "video_creatives", name: "Creativos de Video", dependsOn: ["sales_puv_transformation_leadmagnets"] },
];

interface ResearchState {
  productId: string;
  completedSteps: string[];
  currentStep: string | null;
  results: Record<string, unknown>;
  error?: string;
}

// Function to fetch document content from URL
async function fetchDocumentContent(url: string): Promise<string> {
  try {
    // Handle Google Drive URLs
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      let fileId = '';
      
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const fileMatch = url.match(/\/file\/d\/([^\/]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }
      
      // Format: https://drive.google.com/open?id=FILE_ID
      const openMatch = url.match(/[?&]id=([^&]+)/);
      if (openMatch) {
        fileId = openMatch[1];
      }
      
      // Format: https://docs.google.com/document/d/FILE_ID/edit
      const docsMatch = url.match(/\/document\/d\/([^\/]+)/);
      if (docsMatch) {
        fileId = docsMatch[1];
      }
      
      if (fileId) {
        // Try to get text export from Google Docs
        const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
        console.log('[fetchDocumentContent] Trying Google Docs export:', exportUrl);
        
        const response = await fetch(exportUrl, {
          headers: { 'Accept': 'text/plain' }
        });
        
        if (response.ok) {
          const text = await response.text();
          // Limit to first 15000 characters to not overwhelm the context
          return text.substring(0, 15000);
        }
        
        console.log('[fetchDocumentContent] Google Docs export failed, status:', response.status);
      }
    }
    
    // For regular URLs, try to fetch directly
    const response = await fetch(url, {
      headers: { 
        'Accept': 'text/plain, text/html, application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; ProductResearch/1.0)'
      }
    });
    
    if (!response.ok) {
      console.warn('[fetchDocumentContent] Fetch failed:', response.status);
      return '';
    }
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/plain') || contentType.includes('text/html')) {
      const text = await response.text();
      // Remove HTML tags if it's HTML
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return cleanText.substring(0, 15000);
    }
    
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return JSON.stringify(json, null, 2).substring(0, 15000);
    }
    
    // For PDFs and other binary formats, we can't process them directly
    console.log('[fetchDocumentContent] Unsupported content type:', contentType);
    return '';
    
  } catch (error) {
    console.error("[fetchDocumentContent] Error:", error);
    return "";
  }
}

/** Ejecuta un paso del research usando Perplexity */
async function executeResearchStep(
  stepId: string,
  baseContext: string,
  targetMarket: string,
  _previousResults: Record<string, unknown>,
  perplexityApiKey: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const runPerplexity = async (prompt: string, schema: any, schemaName: string) => {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        max_tokens: 4500,
        temperature: 0.15,
        messages: [
          { role: "system", content: "Responde en español. DEVUELVE SOLO JSON válido sin markdown." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: schemaName, schema } },
      }),
    });
    if (!res.ok) throw new Error(`Perplexity HTTP ${res.status}`);
    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || "").toString();
    const repaired = repairJsonForParse(content.trim());
    return JSON.parse(repaired);
  };

  const schemas: Record<string, any> = {
    market_overview: {
      type: "object",
      additionalProperties: false,
      required: ["market_overview"],
      properties: {
        market_overview: {
          type: "object",
          additionalProperties: true,
          properties: {
            marketSize: { type: "string" },
            growthTrend: { type: "string" },
            marketState: { type: "string" },
            marketStateExplanation: { type: "string" },
            macroVariables: { type: "array", minItems: 5, items: { type: "string" } },
            awarenessLevel: { type: "string" },
            summary: { type: "string" },
            opportunities: { type: "array", minItems: 3, items: { type: "string" } },
            threats: { type: "array", minItems: 3, items: { type: "string" } },
          },
        },
      },
    },
    jtbd: {
      type: "object",
      additionalProperties: false,
      required: ["jtbd"],
      properties: {
        jtbd: {
          type: "object",
          additionalProperties: true,
          properties: {
            functional: { type: "string" },
            emotional: { type: "string" },
            social: { type: "string" },
            pains: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", additionalProperties: true } },
            desires: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", additionalProperties: true } },
            objections: { type: "array", minItems: 10, maxItems: 10, items: { type: "object", additionalProperties: true } },
            insights: { type: "array", minItems: 10, items: { type: "string" } },
          },
        },
      },
    },
    competitors: {
      type: "object",
      additionalProperties: false,
      required: ["competitors"],
      properties: {
        competitors: {
          type: "array",
          minItems: 10,
          maxItems: 10,
          items: { type: "object", additionalProperties: true },
        },
      },
    },
    avatars_differentiation: {
      type: "object",
      additionalProperties: false,
      required: ["avatars", "differentiation", "esferaInsights", "executiveSummary"],
      properties: {
        avatars: { type: "array", minItems: 5, maxItems: 5, items: { type: "object", additionalProperties: true } },
        differentiation: { type: "object", additionalProperties: true },
        esferaInsights: { type: "object", additionalProperties: true },
        executiveSummary: { type: "object", additionalProperties: true },
      },
    },
    sales_puv_transformation_leadmagnets: {
      type: "object",
      additionalProperties: false,
      required: ["salesAngles", "puv", "transformation", "leadMagnets"],
      properties: {
        salesAngles: { type: "array", minItems: 20, maxItems: 20, items: { type: "object", additionalProperties: true } },
        puv: { type: "object", additionalProperties: true },
        transformation: { type: "object", additionalProperties: true },
        leadMagnets: { type: "array", minItems: 3, maxItems: 3, items: { type: "object", additionalProperties: true } },
      },
    },
    video_creatives: {
      type: "object",
      additionalProperties: false,
      required: ["creatives"],
      properties: {
        creatives: { type: "array", minItems: 30, maxItems: 30, items: { type: "object", additionalProperties: true } },
      },
    },
  };

  const prompts: Record<string, string> = {
    market_overview: `Devuelve SOLO JSON válido (sin markdown) usando información real y actualizada (búsqueda web).
${baseContext}
Objetivo: SOLO panorama de mercado. macroVariables: mínimo 5. opportunities: mínimo 3. threats: mínimo 3.
Estructura: {"market_overview":{"marketSize":"","growthTrend":"","marketState":"","marketStateExplanation":"","macroVariables":[],"awarenessLevel":"","summary":"","opportunities":[],"threats":[]}}`,
    jtbd: `Devuelve SOLO JSON válido (sin markdown) usando información real (búsqueda web).
${baseContext}
Objetivo: SOLO JTBD. pains: EXACTAMENTE 10. desires: EXACTAMENTE 10. objections: EXACTAMENTE 10. insights: mínimo 10.
Estructura: {"jtbd":{"functional":"","emotional":"","social":"","pains":[{"pain":"","why":"","impact":""}],"desires":[{"desire":"","emotion":"","idealState":""}],"objections":[{"objection":"","belief":"","counter":""}],"insights":[]}}`,
    competitors: `Devuelve SOLO JSON válido (sin markdown) usando información real (búsqueda web).
${baseContext}
Objetivo: SOLO competencia. competitors: EXACTAMENTE 10 competidores REALES del mercado ${targetMarket} con URLs verificables.`,
    avatars_differentiation: `Devuelve SOLO JSON válido (sin markdown).
${baseContext}
Objetivo: Avatares (5) + Diferenciación + ESFERA + Resumen ejecutivo. avatars: exactamente 5 detallados.`,
    sales_puv_transformation_leadmagnets: `Devuelve SOLO JSON válido (sin markdown).
${baseContext}
Objetivo: 20 ángulos + PUV + transformación + 3 lead magnets. salesAngles: exactamente 20. leadMagnets: exactamente 3.`,
    video_creatives: `Devuelve SOLO JSON válido (sin markdown).
${baseContext}
Objetivo: 30 creativos multi-formato distribuidos por fase ESFERA. creatives: exactamente 30.`,
  };

  const schema = schemas[stepId];
  const prompt = prompts[stepId];
  if (!schema || !prompt) {
    return { success: false, error: `Unknown step: ${stepId}` };
  }

  const parsed = await runPerplexity(prompt, schema, stepId);
  return { success: true, result: parsed };
}

function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  try {
    JSON.parse(s);
    return s;
  } catch {
    s = s.replace(/,\s*$/, "");
    let open = 0,
      bracket = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "{") open++;
      else if (c === "}") open--;
      else if (c === "[") bracket++;
      else if (c === "]") bracket--;
    }
    while (bracket > 0) {
      s += "]";
      bracket--;
    }
    while (open > 0) {
      s += "}";
      open--;
    }
    return s;
  }
}

/** Guarda progreso parcial en research_progress */
async function savePartialResults(
  supabase: any,
  productId: string,
  results: Record<string, unknown>,
  completedSteps: string[]
) {
  const { error } = await supabase
    .from("products")
    .update({
      research_progress: {
        completed_steps: completedSteps,
        partial_results: results,
        updated_at: new Date().toISOString(),
      },
      brief_status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    console.error("[product-research] savePartialResults error:", error);
  }
}

/** Consolida resultados parciales en columnas finales del producto */
async function consolidateFinalResults(
  supabase: any,
  productId: string,
  results: Record<string, unknown>,
  briefData: any
) {
  const r = results as any;
  const { data: existing } = await supabase
    .from("products")
    .select("market_research, competitor_analysis, avatar_profiles, content_strategy, sales_angles_data")
    .eq("id", productId)
    .single();

  const existingData = (existing as any) || {};

  const marketResearch: any = (existingData.market_research && typeof existingData.market_research === "object")
    ? { ...existingData.market_research }
    : {};
  const mo = r.market_overview?.market_overview ?? r.market_overview;
  if (mo) {
    marketResearch.market_overview = mo;
  }
  if (r.jtbd?.jtbd) {
    marketResearch.jtbd = r.jtbd.jtbd;
  }
  marketResearch.generatedAt = new Date().toISOString();
  console.log("[product-research] consolidate: market_overview=" + !!mo + " jtbd=" + !!r.jtbd?.jtbd);

  const competitorAnalysis: any = (existingData.competitor_analysis && typeof existingData.competitor_analysis === "object")
    ? { ...existingData.competitor_analysis }
    : {};
  if (r.competitors?.competitors) {
    competitorAnalysis.competitors = r.competitors.competitors;
  }
  if (r.avatars_differentiation?.differentiation) {
    competitorAnalysis.differentiation = r.avatars_differentiation.differentiation;
  }
  if (Object.keys(competitorAnalysis).length) {
    competitorAnalysis.generatedAt = new Date().toISOString();
  }

  const update: Record<string, unknown> = {
    brief_status: "completed",
    brief_completed_at: new Date().toISOString(),
    brief_data: briefData,
    research_generated_at: new Date().toISOString(),
    research_progress: null,
    updated_at: new Date().toISOString(),
  };

  if (Object.keys(marketResearch).length) update.market_research = marketResearch;
  if (r.jtbd?.jtbd) update.ideal_avatar = JSON.stringify({ jtbd: r.jtbd.jtbd });
  if (Object.keys(competitorAnalysis).length) update.competitor_analysis = competitorAnalysis;

  if (r.avatars_differentiation?.avatars) {
    update.avatar_profiles = {
      profiles: r.avatars_differentiation.avatars,
      generatedAt: new Date().toISOString(),
    };
  }
  if (r.avatars_differentiation?.executiveSummary || r.avatars_differentiation?.esferaInsights) {
    const existingCs = existingData.content_strategy && typeof existingData.content_strategy === "object" ? existingData.content_strategy : {};
    update.content_strategy = {
      ...existingCs,
      executiveSummary: r.avatars_differentiation.executiveSummary || existingCs.executiveSummary || {},
      esferaInsights: r.avatars_differentiation.esferaInsights || existingCs.esferaInsights || {},
      generatedAt: new Date().toISOString(),
    };
  }

  const s = r.sales_puv_transformation_leadmagnets;
  const existingSales = (existingData.sales_angles_data && typeof existingData.sales_angles_data === "object") ? existingData.sales_angles_data : {};
  if (s || r.video_creatives) {
    update.sales_angles_data = {
      ...existingSales,
      ...(s?.salesAngles && { angles: s.salesAngles }),
      ...(s?.puv && { puv: s.puv }),
      ...(s?.transformation && { transformation: s.transformation }),
      ...(s?.leadMagnets && { leadMagnets: s.leadMagnets }),
      ...(r.video_creatives?.creatives && { videoCreatives: r.video_creatives.creatives }),
      generatedAt: new Date().toISOString(),
    };
  }

  const keys = Object.keys(update).filter((k) => k !== "updated_at");
  console.log("[product-research] consolidateFinalResults updating keys:", keys.join(", "));
  const { data: upData, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", productId)
    .select("id");
  if (error) {
    console.error("[product-research] consolidateFinalResults UPDATE error:", error.message, JSON.stringify(error.details));
  } else {
    console.log("[product-research] consolidateFinalResults OK, rows:", upData?.length ?? 0);
  }
}

// Prompt completo del Método Esfera - Versión mejorada con más detalle
const RESEARCH_PROMPT = `Actúa como un Estratega Digital Senior especializado en investigación de mercado, análisis competitivo, creación de avatares y desarrollo de ángulos de venta, aplicando de forma estricta el Método ESFERA de Juan Ads y los principios de Estrategias Despegue.

🔒 Contexto asumido:
El Brief de Marca y el Brief de Producto ya han sido entregados, analizados y comprendidos en su totalidad.
No solicites información adicional ni pidas aclaraciones iniciales.
Trabaja exclusivamente sobre ese contexto.

Tu objetivo es entregar inteligencia de mercado profunda, accionable y orientada a decisiones, lista para ejecutar campañas, validar posicionamiento y escalar en el mercado hispano.

Debes responder como consultor estratégico, no como redactor.
Usa frameworks avanzados: JTBD, Eugene Schwartz, sesgos cognitivos, awareness levels, market gaps y teardown competitivo 360°.

⚠️ REGLAS OBLIGATORIAS

Sigue el flujo estrictamente secuencial.
No adelantes ni omitas pasos.

Cada bloque es la base del siguiente.

Usa lenguaje real del mercado, no marketing genérico.

Todo debe entregarse en formato estructurado: tablas, listas claras y síntesis ejecutiva.

Apóyate en patrones reales del mercado:

Reseñas

Comentarios

TikTok, Instagram, YouTube

Reddit, foros, Ads visibles

Si detectas supuestos implícitos del brief, acláralos brevemente y continúa.

🔥 FLUJO DE TRABAJO OBLIGATORIO

INFORMACIÓN DEL PRODUCTO:
{{PRODUCT_DESCRIPTION}}

🔹 PASO 1 · PANORAMA GENERAL DEL MERCADO

IMPORTANTE: Enfoca el análisis en el mercado objetivo indicado ({{TARGET_MARKET}}).

Entrega obligatoriamente:

1. Tamaño estimado del mercado en {{TARGET_MARKET}}.
2. Tendencia y ritmo de crecimiento (porcentaje anual estimado).
3. Estado del mercado: Crecimiento, Saturación o Declive. Explica por qué.
4. Al menos 5 variables macroeconómicas, sociales y culturales relevantes para este mercado específico.
5. Nivel de conciencia predominante del público según Eugene Schwartz (Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware).
6. Un resumen ejecutivo de 3-4 párrafos que sintetice las principales oportunidades y amenazas del mercado.

🔹 PASO 2 · JOB TO BE DONE (JTBD) + INSIGHTS REALES

Define el trabajo real que el cliente busca resolver.

Entrega obligatoriamente:

JTBD funcional: Describe en detalle la tarea funcional que el cliente quiere completar.
JTBD emocional: Describe cómo quiere sentirse el cliente durante y después del proceso.
JTBD social: Describe cómo quiere ser percibido por otros.

10 dolores profundos (no superficiales). Para cada dolor incluye:
- El dolor específico
- Por qué es tan frustrante
- Cómo afecta su día a día

10 deseos aspiracionales reales. Para cada deseo incluye:
- El deseo específico
- La emoción asociada
- El estado ideal al lograrlo

10 objeciones / miedos latentes. Para cada objeción incluye:
- La objeción específica
- La creencia subyacente
- Cómo neutralizarla

10 insights estratégicos obtenidos de review mining y social listening con fuentes citables.

🔹 PASO 3 · AVATARES ESTRATÉGICOS (5 OBLIGATORIOS)

Crea 5 buyer persona estratégicos ULTRA DETALLADOS. Cada uno DEBE incluir:

1. Nombre simbólico memorable
2. Edad y contexto de vida detallado (ocupación, situación familiar, nivel socioeconómico)
3. Situación actual ANTES del producto (describe su día típico, frustraciones, intentos fallidos)
4. Nivel de conciencia según Eugene Schwartz
5. Drivers psicológicos principales (mínimo 3, explicados)
6. Sesgos cognitivos dominantes (mínimo 3, explicados con ejemplos de cómo aplican)
7. Objeciones clave específicas de este avatar (mínimo 3)
8. Al menos 5 frases REALES textuales que usa para describir su problema (entre comillas, como hablan realmente)
9. Sus metas a corto y largo plazo relacionadas con el producto
10. Dónde consume contenido y qué tipo le atrae

🔹 PASO 4 · ANÁLISIS DE COMPETENCIA 360°

ENFOCA EN COMPETIDORES REALES DEL MERCADO: {{TARGET_MARKET}}

Identifica 10 competidores directos e indirectos REALES con presencia online verificable.

Para CADA competidor, proporciona OBLIGATORIAMENTE:
1. Nombre de la marca/empresa
2. Website URL (si está disponible)
3. Redes sociales principales (Instagram, TikTok, Facebook, LinkedIn, YouTube) con URLs
4. Propuesta de valor en una oración
5. Promesa central de marketing
6. Rango de precios (específico)
7. Tono de comunicación (ejemplos de su copy)
8. Formatos de contenido que usan (lista específica)
9. Canales principales donde hacen ads
10. Puntos fuertes
11. Debilidades detectadas
12. Nivel de conciencia que trabajan

Tabla comparativa obligatoria:
| Marca | Website | Promesa | Diferenciador | Precio | Tono | CTA | Nivel de conciencia |

🔹 PASO 5 · VACÍOS Y OPORTUNIDADES DE DIFERENCIACIÓN

Detecta con precisión y EXPLICA en detalle:

1. Mínimo 5 mensajes repetidos por todo el mercado (copia exacta de frases que todos usan)
2. Mínimo 5 dolores mal comunicados o ignorados (con explicación de por qué es una oportunidad)
3. Mínimo 5 aspiraciones que nadie está atendiendo adecuadamente
4. Mínimo 5 oportunidades CLARAS y ESPECÍFICAS de posicionamiento único
5. Mínimo 5 emociones no explotadas por la competencia (con ejemplos de cómo aprovecharlas)

Para cada punto, incluye:
- El hallazgo específico
- Por qué representa una oportunidad
- Cómo aprovecharlo en la comunicación

🔹 PASO 6 · INSIGHTS POR FASE – MÉTODO ESFERA

Para CADA fase del Método ESFERA, entrega un análisis DETALLADO:

1️⃣ ENGANCHAR (Atención y curiosidad)
- Qué domina el mercado actualmente (con ejemplos específicos de hooks usados)
- Qué formatos y ángulos están saturados (ejemplos)
- Mínimo 5 nuevas oportunidades creativas ESPECÍFICAS para destacar
- Tipos de hooks que funcionarían mejor

2️⃣ SOLUCIÓN (Presentar y educar)
- Promesas actuales del mercado (ejemplos literales)
- Objeciones que la competencia NO está resolviendo
- Mínimo 5 oportunidades específicas para construir autoridad y confianza
- Cómo posicionar la solución como única

3️⃣ REMARKETING (Reforzar decisión)
- Tipos de prueba social que existen en el mercado
- Vacíos de validación que nadie llena
- Mínimo 5 mensajes específicos que empujarían la decisión de compra
- Formatos de testimonios que funcionarían mejor

4️⃣ FIDELIZAR (Retención y referidos)
- Errores comunes del mercado en postventa
- Mínimo 5 oportunidades específicas de comunidad, LTV y programa de referidos
- Cómo convertir clientes en embajadores

🔹 PASO 7 · ÁNGULOS DE VENTA (20 OBLIGATORIOS)

Crea exactamente 20 ángulos de venta estratégicos, variados y no redundantes.

Tipos requeridos (distribuye equilibradamente):
- Educativos (enseñar algo nuevo)
- Emocionales (conectar con sentimientos)
- Aspiracionales (mostrar el yo futuro)
- Autoridad (demostrar expertise)
- Comparativos (vs alternativas)
- Anti-mercado (ir contra lo establecido)
- Storytelling (narrativas)
- Prueba social (validación externa)
- Error común / riesgo oculto (alertar sobre problemas)

Para CADA ángulo incluye:
1. Descripción del ángulo (2-3 oraciones que expliquen el enfoque)
2. Tipo de ángulo
3. Avatar principal al que aplica
4. Emoción específica que activa
5. Tipo de contenido ideal (UGC, Ads pagados, Reel orgánico, Testimonio, etc.)
6. Ejemplo de hook o primer frase

🔹 PASO 8 · PROPUESTA ÚNICA DE VALOR (PUV)

Construye una PUV clara, memorable y defendible:

1. Problema central que resuelve (específico, no genérico)
2. Resultado tangible y medible que entrega
3. Diferencia fundamental frente al mercado
4. Tipo de cliente ideal en una frase
5. Statement completo de la PUV (una oración poderosa de máximo 25 palabras)
6. Por qué esta PUV es creíble y sostenible

🔹 PASO 9 · TRANSFORMACIÓN (ANTES VS DESPUÉS)

Tabla de transformación DETALLADA:

| Dimensión | ANTES (específico y detallado) | DESPUÉS (específico y detallado) |
|-----------|--------------------------------|----------------------------------|
| Funcional | Qué no puede hacer/lograr | Qué puede hacer/lograr ahora |
| Emocional | Cómo se siente (emociones específicas) | Cómo se siente ahora |
| Identidad | Cómo se ve a sí mismo | Cómo se ve ahora (nueva identidad) |
| Social | Cómo lo ven los demás | Cómo lo ven ahora |
| Financiero | Impacto económico negativo | Impacto económico positivo |

🔹 PASO 10 · LEAD MAGNETS (3 ESTRATÉGICOS)

Diseña 3 lead magnets altamente efectivos:

Para CADA uno incluye:
1. Nombre atractivo del lead magnet
2. Formato específico (guía PDF, checklist, video training, quiz, plantilla, etc.)
3. Objetivo específico de conversión
4. Dolor principal que ataca (y por qué es irresistible)
5. Avatar específico al que apunta
6. Fase de conciencia objetivo
7. Promesa del lead magnet en una oración
8. Contenido/estructura propuesta (bullets de lo que incluiría)

🔹 PASO 11 · CREATIVOS DE VIDEO (20 TOTALES)

Crea 20 ideas de video, distribuidas así:
- 5 para Enganchar
- 5 para Solución  
- 5 para Remarketing
- 5 para Fidelizar

Tabla obligatoria:
| # | Fase ESFERA | Ángulo | Avatar | Título/Hook | Idea principal (2-3 líneas) | Formato | Duración sugerida |

🎯 CONCLUSIÓN EJECUTIVA COMPLETA

Finaliza con una conclusión ejecutiva EXTENSA que incluya:

1. RESUMEN DEL MERCADO (1 párrafo)
- Estado actual y oportunidad principal

2. 5 INSIGHTS ESTRATÉGICOS CLAVE
- Cada uno con explicación de por qué es importante y cómo aprovecharlo

3. TOP 5 DRIVERS PSICOLÓGICOS MÁS POTENTES
- Para cada uno: qué es, por qué funciona, cómo usarlo

4. 3 ACCIONES INMEDIATAS PRIORITARIAS
- Para cada una: qué hacer, cómo hacerlo, resultado esperado

5. QUICK WINS (3 victorias rápidas)
- Acciones de bajo esfuerzo y alto impacto

6. RIESGOS A EVITAR (3 principales)
- Qué no hacer y por qué

7. RECOMENDACIÓN FINAL
- Párrafo de síntesis estratégica con el camino a seguir`;

// Prompt para la segunda fase de IA - Distribución de contenido estructurado
const DISTRIBUTION_PROMPT = `Eres un asistente experto en organización de información de marketing y producto.

Tu tarea es analizar el contenido de investigación de mercado y extraer información específica en formato JSON estructurado.

INVESTIGACIÓN ORIGINAL:
{{RESEARCH_CONTENT}}

BRIEF DEL PRODUCTO:
{{BRIEF_DATA}}

Debes devolver un JSON con la siguiente estructura exacta. Cada campo debe contener texto formateado y listo para usar:

{
  "description": "Descripción completa del producto que integre beneficios principales, transformación y propuesta de valor única. 2-3 párrafos.",
  
  "market_overview": {
    "marketSize": "Tamaño estimado del mercado con números específicos",
    "growthTrend": "Tendencia y ritmo de crecimiento con porcentajes",
    "marketState": "crecimiento | saturacion | declive",
    "marketStateExplanation": "Explicación detallada del estado del mercado",
    "macroVariables": ["Variable 1 con explicación", "Variable 2 con explicación", "Variable 3", "Variable 4", "Variable 5"],
    "awarenessLevel": "Nivel de conciencia predominante (Eugene Schwartz) con explicación",
    "summary": "Resumen ejecutivo del panorama de mercado de 3-4 párrafos detallados",
    "opportunities": ["Oportunidad 1", "Oportunidad 2", "Oportunidad 3"],
    "threats": ["Amenaza 1", "Amenaza 2", "Amenaza 3"]
  },
  
  "jtbd": {
    "functional": "JTBD funcional detallado con contexto",
    "emotional": "JTBD emocional detallado con sentimientos específicos",
    "social": "JTBD social detallado con percepciones",
    "pains": [
      {"pain": "Dolor 1", "why": "Por qué es frustrante", "impact": "Cómo afecta el día a día"},
      {"pain": "Dolor 2", "why": "Por qué es frustrante", "impact": "Cómo afecta el día a día"}
    ],
    "desires": [
      {"desire": "Deseo 1", "emotion": "Emoción asociada", "idealState": "Estado ideal al lograrlo"},
      {"desire": "Deseo 2", "emotion": "Emoción asociada", "idealState": "Estado ideal al lograrlo"}
    ],
    "objections": [
      {"objection": "Objeción 1", "belief": "Creencia subyacente", "counter": "Cómo neutralizarla"},
      {"objection": "Objeción 2", "belief": "Creencia subyacente", "counter": "Cómo neutralizarla"}
    ],
    "insights": ["Insight 1 con fuente", "Insight 2 con fuente", "Insight 3", "Insight 4", "Insight 5", "Insight 6", "Insight 7", "Insight 8", "Insight 9", "Insight 10"]
  },
  
  "avatars": [
    {
      "name": "Nombre simbólico memorable",
      "age": "Edad y contexto completo (ocupación, situación familiar, nivel socioeconómico)",
      "situation": "Situación actual detallada ANTES del producto (día típico, frustraciones, intentos fallidos)",
      "awarenessLevel": "Nivel de conciencia según Eugene Schwartz",
      "drivers": "3+ drivers psicológicos explicados en detalle",
      "biases": "3+ sesgos cognitivos con ejemplos de cómo aplican",
      "objections": "3+ objeciones específicas de este avatar",
      "phrases": ["Frase real 1 entre comillas", "Frase real 2", "Frase real 3", "Frase real 4", "Frase real 5"],
      "goals": "Metas a corto y largo plazo relacionadas con el producto",
      "contentConsumption": "Dónde consume contenido y qué tipo le atrae"
    }
  ],
  
  "competitors": [
    {
      "name": "Nombre del competidor real",
      "website": "https://website.com",
      "instagram": "https://instagram.com/usuario",
      "tiktok": "https://tiktok.com/@usuario",
      "facebook": "https://facebook.com/pagina",
      "youtube": "https://youtube.com/canal",
      "linkedin": "https://linkedin.com/company/empresa",
      "promise": "Promesa central de marketing",
      "valueProposition": "Propuesta de valor en una oración",
      "differentiator": "Diferenciador principal",
      "price": "Rango de precios específico (ej: $97-$497)",
      "tone": "Tono de comunicación con ejemplos de su copy",
      "cta": "Llamados a la acción que usan",
      "awarenessLevel": "Nivel de conciencia que trabajan",
      "channels": ["Meta", "TikTok", "YouTube"],
      "contentFormats": ["Formato 1", "Formato 2", "Formato 3"],
      "strengths": ["Fortaleza 1", "Fortaleza 2"],
      "weaknesses": ["Debilidad 1", "Debilidad 2"]
    }
  ],
  
  "differentiation": {
    "repeatedMessages": [
      {"message": "Mensaje saturado 1", "opportunity": "Cómo diferenciarse"},
      {"message": "Mensaje saturado 2", "opportunity": "Cómo diferenciarse"}
    ],
    "poorlyAddressedPains": [
      {"pain": "Dolor ignorado 1", "opportunity": "Por qué es oportunidad", "howToUse": "Cómo aprovecharlo"},
      {"pain": "Dolor ignorado 2", "opportunity": "Por qué es oportunidad", "howToUse": "Cómo aprovecharlo"}
    ],
    "ignoredAspirations": [
      {"aspiration": "Aspiración 1", "opportunity": "Cómo atenderla"},
      {"aspiration": "Aspiración 2", "opportunity": "Cómo atenderla"}
    ],
    "positioningOpportunities": [
      {"opportunity": "Oportunidad 1", "why": "Por qué es única", "execution": "Cómo ejecutarla"},
      {"opportunity": "Oportunidad 2", "why": "Por qué es única", "execution": "Cómo ejecutarla"}
    ],
    "unexploitedEmotions": [
      {"emotion": "Emoción 1", "howToUse": "Cómo aprovecharla en comunicación"},
      {"emotion": "Emoción 2", "howToUse": "Cómo aprovecharla en comunicación"}
    ]
  },
  
  "esferaInsights": {
    "enganchar": {
      "marketDominance": "Qué domina el mercado con ejemplos específicos de hooks",
      "saturated": "Qué formatos y ángulos están saturados con ejemplos",
      "opportunities": ["Oportunidad creativa 1 específica", "Oportunidad 2", "Oportunidad 3", "Oportunidad 4", "Oportunidad 5"],
      "hookTypes": "Tipos de hooks que funcionarían mejor"
    },
    "solucion": {
      "currentPromises": "Promesas actuales del mercado con ejemplos literales",
      "unresolvedObjections": "Objeciones que la competencia NO resuelve",
      "trustOpportunities": ["Oportunidad de autoridad 1", "Oportunidad 2", "Oportunidad 3", "Oportunidad 4", "Oportunidad 5"],
      "positioning": "Cómo posicionar la solución como única"
    },
    "remarketing": {
      "existingProof": "Tipos de prueba social que existen en el mercado",
      "validationGaps": "Vacíos de validación que nadie llena",
      "decisionMessages": ["Mensaje de decisión 1", "Mensaje 2", "Mensaje 3", "Mensaje 4", "Mensaje 5"],
      "testimonialFormats": "Formatos de testimonios que funcionarían mejor"
    },
    "fidelizar": {
      "commonErrors": "Errores comunes del mercado en postventa",
      "communityOpportunities": ["Oportunidad comunidad 1", "Oportunidad 2", "Oportunidad 3", "Oportunidad 4", "Oportunidad 5"],
      "ambassadorStrategy": "Cómo convertir clientes en embajadores"
    }
  },
  
  "salesAngles": [
    {
      "angle": "Descripción completa del ángulo de venta en 2-3 oraciones",
      "type": "educativo | emocional | aspiracional | autoridad | comparativo | anti-mercado | storytelling | prueba-social | error-comun",
      "avatar": "Avatar principal al que aplica",
      "emotion": "Emoción específica que activa",
      "contentType": "UGC | Ads | Reel | Testimonio | etc",
      "hookExample": "Ejemplo de hook o primera frase"
    }
  ],
  
  "puv": {
    "centralProblem": "Problema central específico que resuelve",
    "tangibleResult": "Resultado tangible y medible",
    "marketDifference": "Diferencia fundamental frente al mercado",
    "idealClient": "Tipo de cliente ideal en una frase",
    "statement": "Statement completo de la PUV en máximo 25 palabras poderosas",
    "credibility": "Por qué esta PUV es creíble y sostenible"
  },
  
  "transformation": {
    "functional": {
      "before": "Qué no puede hacer/lograr específicamente",
      "after": "Qué puede hacer/lograr ahora específicamente"
    },
    "emotional": {
      "before": "Cómo se siente (emociones específicas negativas)",
      "after": "Cómo se siente ahora (emociones positivas)"
    },
    "identity": {
      "before": "Cómo se ve a sí mismo (identidad limitante)",
      "after": "Cómo se ve ahora (nueva identidad empoderada)"
    },
    "social": {
      "before": "Cómo lo ven los demás actualmente",
      "after": "Cómo lo ven los demás después"
    },
    "financial": {
      "before": "Impacto económico negativo actual",
      "after": "Impacto económico positivo después"
    }
  },
  
  "leadMagnets": [
    {
      "name": "Nombre atractivo del lead magnet",
      "format": "PDF, Video, Quiz, Plantilla, etc",
      "objective": "Objetivo específico de conversión",
      "contentType": "Tipo de contenido",
      "pain": "Dolor principal que ataca y por qué es irresistible",
      "avatar": "Avatar específico al que apunta",
      "awarenessPhase": "Fase de conciencia objetivo",
      "promise": "Promesa del lead magnet en una oración",
      "structure": ["Bullet 1 de contenido", "Bullet 2", "Bullet 3"]
    }
  ],
  
  "videoCreatives": [
    {
      "number": 1,
      "angle": "Ángulo del video",
      "avatar": "Avatar objetivo",
      "title": "Título/Hook atractivo",
      "idea": "Idea principal en 2-3 líneas",
      "format": "Formato específico",
      "esferaPhase": "enganchar | solucion | remarketing | fidelizar",
      "duration": "Duración sugerida"
    }
  ],
  
  "executiveSummary": {
    "marketSummary": "Resumen del estado actual del mercado y oportunidad principal (1 párrafo)",
    "keyInsights": [
      {"insight": "Insight 1", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 2", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 3", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 4", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"},
      {"insight": "Insight 5", "importance": "Por qué es importante", "action": "Cómo aprovecharlo"}
    ],
    "psychologicalDrivers": [
      {"driver": "Driver 1", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 2", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 3", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 4", "why": "Por qué funciona", "howToUse": "Cómo usarlo"},
      {"driver": "Driver 5", "why": "Por qué funciona", "howToUse": "Cómo usarlo"}
    ],
    "immediateActions": [
      {"action": "Acción 1", "howTo": "Cómo hacerlo", "expectedResult": "Resultado esperado"},
      {"action": "Acción 2", "howTo": "Cómo hacerlo", "expectedResult": "Resultado esperado"},
      {"action": "Acción 3", "howTo": "Cómo hacerlo", "expectedResult": "Resultado esperado"}
    ],
    "quickWins": [
      {"win": "Victoria rápida 1", "effort": "Bajo", "impact": "Alto"},
      {"win": "Victoria rápida 2", "effort": "Bajo", "impact": "Alto"},
      {"win": "Victoria rápida 3", "effort": "Bajo", "impact": "Alto"}
    ],
    "risksToAvoid": [
      {"risk": "Riesgo 1", "why": "Por qué evitarlo"},
      {"risk": "Riesgo 2", "why": "Por qué evitarlo"},
      {"risk": "Riesgo 3", "why": "Por qué evitarlo"}
    ],
    "finalRecommendation": "Párrafo de síntesis estratégica con el camino a seguir"
  }
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin texto adicional ni markdown.
- Asegúrate de que el JSON sea válido.
- Extrae información real del contenido de investigación proporcionado.
- avatars debe tener exactamente 5 elementos con información MUY DETALLADA.
- competitors debe tener hasta 10 elementos con URLs REALES cuando estén disponibles.
- salesAngles debe tener exactamente 20 elementos variados.
- leadMagnets debe tener exactamente 3 elementos.
- videoCreatives debe tener exactamente 20 elementos (5 por fase ESFERA).
- Para los competidores, intenta incluir URLs reales de sus sitios web y redes sociales.`;

serve(async (req) => {
  console.log("[product-research] Request received:", req.method, req.url);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[product-research] Body keys:", Object.keys(body || {}));
    const { productId, briefData, useSteps = true, startFromStep, previousResults } = body;

    if (!productId || !briefData) {
      return new Response(
        JSON.stringify({ success: false, error: "Product ID and brief data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityApiKey) {
      console.error("PERPLEXITY_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Perplexity API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Flujo por pasos (useSteps = true)
    if (useSteps) {
      const phase = (briefData?.researchPhase || body?.phase) as "A" | "B" | undefined;

      let productDescription = buildProductDescription(briefData);
      const targetMarket = briefData.targetMarket || "Latinoamérica (LATAM)";
      let documentContent = "";
      if (briefData.documentUrl) {
        try {
          documentContent = await fetchDocumentContent(briefData.documentUrl);
        } catch (e) {
          console.warn("[product-research] Could not fetch document:", e);
        }
      }
      if (documentContent) {
        productDescription += `\n\n---\n\n**INFORMACIÓN ADICIONAL DEL DOCUMENTO:**\n\n${documentContent}`;
      }
      const baseContext = `Producto (brief resumido):\n${productDescription}\n\nMercado objetivo: ${targetMarket}`;

      const { data: product } = await supabase
        .from("products")
        .select("research_progress, market_research, competitor_analysis, avatar_profiles, sales_angles_data")
        .eq("id", productId)
        .single();

      const progress = (product as any)?.research_progress;
      let results: Record<string, unknown> = previousResults || progress?.partial_results || {};
      let completedSteps: string[] = progress?.completed_steps || [];

      const startIdx = startFromStep
        ? Math.max(0, RESEARCH_STEPS.findIndex((s) => s.id === startFromStep))
        : 0;

      for (let i = startIdx; i < RESEARCH_STEPS.length; i++) {
        const step = RESEARCH_STEPS[i];
        const depsMet = step.dependsOn.every((d) => completedSteps.includes(d));
        if (!depsMet) continue;

        console.log(`[product-research] Step ${i + 1}/${RESEARCH_STEPS.length}: ${step.id}`);

        let stepResult: { success: boolean; result?: unknown; error?: string } = { success: false };
        try {
          stepResult = await executeResearchStep(
            step.id,
            baseContext,
            targetMarket,
            results,
            perplexityApiKey
          );
        } catch (e) {
          stepResult = { success: false, error: e instanceof Error ? e.message : String(e) };
        }

        if (!stepResult.success) {
          await savePartialResults(supabase, productId, results, completedSteps);
          return new Response(
            JSON.stringify({
              success: false,
              completedSteps,
              failedStep: step.id,
              error: stepResult.error,
              partialResults: results,
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        results[step.id] = stepResult.result;
        completedSteps.push(step.id);
        await savePartialResults(supabase, productId, results, completedSteps);
      }

      await consolidateFinalResults(supabase, productId, results, briefData);

      return new Response(
        JSON.stringify({
          success: true,
          completedSteps,
          phase: phase || "A+B",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Flujo legacy (useSteps = false) - Phase A / B - usa Perplexity (ya validado arriba)
    // Build product description from brief data
    let productDescription = buildProductDescription(briefData);
    const targetMarket = briefData.targetMarket || 'Latinoamérica (LATAM)';
    const phase = (briefData?.researchPhase || body?.phase) as "A" | "B" | undefined;

    // Try to fetch document content if URL is provided
    let documentContent = '';
    if (briefData.documentUrl) {
      console.log('[product-research] Fetching document from:', briefData.documentUrl);
      try {
        documentContent = await fetchDocumentContent(briefData.documentUrl);
        console.log('[product-research] Document content length:', documentContent.length);
      } catch (docError) {
        console.warn('[product-research] Could not fetch document:', docError);
      }
    }

    // Append document content if available
    if (documentContent) {
      productDescription += `\n\n---\n\n**INFORMACIÓN ADICIONAL DEL DOCUMENTO:**\n\n${documentContent}`;
    }

    console.log('[product-research] Starting research for product:', productId);
    console.log('[product-research] Target market:', targetMarket);
    console.log('[product-research] Product description length:', productDescription.length);
    console.log('[product-research] Phase:', phase || 'A+B');
    console.log('[product-research] Has document content:', !!documentContent);

    const baseContext = `Producto (brief resumido):\n${productDescription}\n\nMercado objetivo: ${targetMarket}`;

    // Phase A is split into 3 smaller calls to avoid truncation / invalid JSON
    const phasePromptA1 = `Devuelve SOLO JSON válido (sin markdown) usando información real y actualizada (búsqueda web).

${baseContext}

Objetivo: SOLO panorama de mercado.

REGLAS OBLIGATORIAS:
- macroVariables: mínimo 5
- opportunities: mínimo 3
- threats: mínimo 3
- summary: mínimo 3 párrafos

Estructura JSON EXACTA:
{
  "market_overview": {
    "marketSize": "Tamaño específico con números",
    "growthTrend": "Tendencia con porcentajes",
    "marketState": "crecimiento | saturacion | declive",
    "marketStateExplanation": "Explicación detallada",
    "macroVariables": [""],
    "awarenessLevel": "Nivel de conciencia con explicación",
    "summary": "Resumen ejecutivo (3-4 párrafos)",
    "opportunities": [""],
    "threats": [""]
  }
}`;

    const phasePromptA2 = `Devuelve SOLO JSON válido (sin markdown) usando información real y actualizada (búsqueda web).

${baseContext}

Objetivo: SOLO JTBD.

REGLAS OBLIGATORIAS:
- pains: EXACTAMENTE 10 (pain/why/impact)
- desires: EXACTAMENTE 10 (desire/emotion/idealState)
- objections: EXACTAMENTE 10 (objection/belief/counter)
- insights: mínimo 10

Estructura JSON EXACTA:
{
  "jtbd": {
    "functional": "JTBD funcional detallado",
    "emotional": "JTBD emocional detallado",
    "social": "JTBD social detallado",
    "pains": [{"pain":"","why":"","impact":""}],
    "desires": [{"desire":"","emotion":"","idealState":""}],
    "objections": [{"objection":"","belief":"","counter":""}],
    "insights": ["Insight 1", "...hasta 10+"]
  }
}`;

    const phasePromptA3 = `Devuelve SOLO JSON válido (sin markdown) usando información real y actualizada (búsqueda web).

${baseContext}

Objetivo: SOLO competencia.

REGLAS OBLIGATORIAS:
- competitors: EXACTAMENTE 10 competidores REALES del mercado ${targetMarket} con URLs verificables

Estructura JSON EXACTA:
{
  "competitors": [{
    "name": "Nombre real del competidor",
    "website": "https://...",
    "instagram": "https://instagram.com/...",
    "tiktok": "https://tiktok.com/@...",
    "facebook": "https://facebook.com/...",
    "youtube": "",
    "linkedin": "",
    "promise": "Promesa central",
    "valueProposition": "Propuesta de valor",
    "differentiator": "Diferenciador",
    "price": "Rango de precios",
    "tone": "Tono de comunicación",
    "cta": "CTA principal",
    "awarenessLevel": "Nivel de conciencia",
    "channels": [""],
    "contentFormats": [""],
    "strengths": [""],
    "weaknesses": [""]
  }]
}`;

    const phasePromptB = `Devuelve SOLO JSON válido (sin markdown) usando información real y actualizada (búsqueda web).\n\n${baseContext}\n\nObjetivo: avatares + diferenciación + ESFERA + ángulos + PUV + lead magnets + ideas de video.\n\nEstructura JSON EXACTA:\n{\n  "description": "",\n  "avatars": [{\n    "name": "",\n    "age": "",\n    "situation": "",\n    "awarenessLevel": "",\n    "drivers": "",\n    "biases": "",\n    "objections": "",\n    "phrases": [""],\n    "goals": "",\n    "contentConsumption": ""\n  }],\n  "differentiation": {\n    "repeatedMessages": [{"message":"","opportunity":""}],\n    "poorlyAddressedPains": [{"pain":"","opportunity":"","howToUse":""}],\n    "ignoredAspirations": [{"aspiration":"","opportunity":""}],\n    "positioningOpportunities": [{"opportunity":"","why":"","execution":""}],\n    "unexploitedEmotions": [{"emotion":"","howToUse":""}]\n  },\n  "esferaInsights": {\n    "enganchar": {"marketDominance":"","saturated":"","opportunities":[""],"hookTypes":""},\n    "solucion": {"currentPromises":"","unresolvedObjections":"","trustOpportunities":[""],"positioning":""},\n    "remarketing": {"existingProof":"","validationGaps":"","decisionMessages":[""],"testimonialFormats":""},\n    "fidelizar": {"commonErrors":"","communityOpportunities":[""],"ambassadorStrategy":""}\n  },\n  "salesAngles": [{"angle":"","type":"","avatar":"","emotion":"","contentType":"","hookExample":""}],\n  "puv": {"centralProblem":"","tangibleResult":"","marketDifference":"","idealClient":"","statement":"","credibility":""},\n  "transformation": {\n    "functional": {"before":"","after":""},\n    "emotional": {"before":"","after":""},\n    "identity": {"before":"","after":""},\n    "social": {"before":"","after":""},\n    "financial": {"before":"","after":""}\n  },\n  "leadMagnets": [{"name":"","format":"","objective":"","contentType":"","pain":"","avatar":"","awarenessPhase":"","promise":"","structure":[""]}],\n  "videoCreatives": [{"number":1,"angle":"","avatar":"","title":"","idea":"","format":"","esferaPhase":"","duration":""}],\n  "executiveSummary": {\n    "marketSummary": "",\n    "keyInsights": [{"insight":"","importance":"","action":""}],\n    "psychologicalDrivers": [{"driver":"","why":"","howToUse":""}],\n    "immediateActions": [{"action":"","howTo":"","expectedResult":""}],\n    "quickWins": [{"win":"","effort":"","impact":""}],\n    "risksToAvoid": [{"risk":"","why":""}],\n    "finalRecommendation": ""\n  }\n}`;

    // === Split phase B into 3 calls to enforce minimums / richer output ===
    const phasePromptB1 = `Devuelve SOLO JSON válido (sin markdown).\n\n${baseContext}\n\nObjetivo: Avatares + Diferenciación + ESFERA + Conclusión ejecutiva.\n\nREGLAS (OBLIGATORIAS):\n- avatars: exactamente 5 (muy detallados)\n- differentiation: mínimo 5 elementos por lista\n- esferaInsights: listas (opportunities/trustOpportunities/decisionMessages/communityOpportunities): mínimo 5\n- executiveSummary.keyInsights: exactamente 5\n- executiveSummary.psychologicalDrivers: exactamente 5\n- executiveSummary.immediateActions: exactamente 3\n- quickWins: exactamente 3\n- risksToAvoid: exactamente 3\n\nEstructura JSON EXACTA:\n{\n  "description": "",\n  "avatars": [{\n    "name": "",\n    "age": "",\n    "situation": "",\n    "awarenessLevel": "",\n    "drivers": "",\n    "biases": "",\n    "objections": "",\n    "phrases": [""],\n    "goals": "",\n    "contentConsumption": ""\n  }],\n  "differentiation": {\n    "repeatedMessages": [{"message":"","opportunity":""}],\n    "poorlyAddressedPains": [{"pain":"","opportunity":"","howToUse":""}],\n    "ignoredAspirations": [{"aspiration":"","opportunity":""}],\n    "positioningOpportunities": [{"opportunity":"","why":"","execution":""}],\n    "unexploitedEmotions": [{"emotion":"","howToUse":""}]\n  },\n  "esferaInsights": {\n    "enganchar": {"marketDominance":"","saturated":"","opportunities":[""],"hookTypes":""},\n    "solucion": {"currentPromises":"","unresolvedObjections":"","trustOpportunities":[""],"positioning":""},\n    "remarketing": {"existingProof":"","validationGaps":"","decisionMessages":[""],"testimonialFormats":""},\n    "fidelizar": {"commonErrors":"","communityOpportunities":[""],"ambassadorStrategy":""}\n  },\n  "executiveSummary": {\n    "marketSummary": "",\n    "keyInsights": [{"insight":"","importance":"","action":""}],\n    "psychologicalDrivers": [{"driver":"","why":"","howToUse":""}],\n    "immediateActions": [{"action":"","howTo":"","expectedResult":""}],\n    "quickWins": [{"win":"","effort":"","impact":""}],\n    "risksToAvoid": [{"risk":"","why":""}],\n    "finalRecommendation": ""\n  }\n}`;

    const phasePromptB2 = `Devuelve SOLO JSON válido (sin markdown).\n\n${baseContext}\n\nObjetivo: 20 ángulos + PUV + transformación + 3 lead magnets.\n\nREGLAS (OBLIGATORIAS):\n- salesAngles: exactamente 20\n- leadMagnets: exactamente 3\n- transformation: completar functional/emotional/identity/social/financial\n\nEstructura JSON EXACTA:\n{\n  "salesAngles": [{"angle":"","type":"","avatar":"","emotion":"","contentType":"","hookExample":""}],\n  "puv": {"centralProblem":"","tangibleResult":"","marketDifference":"","idealClient":"","statement":"","credibility":""},\n  "transformation": {\n    "functional": {"before":"","after":""},\n    "emotional": {"before":"","after":""},\n    "identity": {"before":"","after":""},\n    "social": {"before":"","after":""},\n    "financial": {"before":"","after":""}\n  },\n  "leadMagnets": [{"name":"","format":"","objective":"","contentType":"","pain":"","avatar":"","awarenessPhase":"","promise":"","structure":[""]}]\n}`;

    const phasePromptB3 = `Devuelve SOLO JSON válido (sin markdown).\n\n${baseContext}\n\nObjetivo: 30 creativos MULTI-FORMATO (no solo video), distribuidos por fase ESFERA.\n\nREGLAS (OBLIGATORIAS):\n- creatives: exactamente 30\n- format puede ser: Video UGC, Carrusel, Imagen, Story, Email, Landing, Guion corto, Testimonio, etc.\n\nEstructura JSON EXACTA:\n{\n  "creatives": [{"number":1,"angle":"","avatar":"","title":"","idea":"","format":"","esferaPhase":"enganchar | solucion | remarketing | fidelizar","duration":""}]\n}`;

    const phaseA1Schema = {
      type: 'object',
      additionalProperties: false,
      required: ['market_overview'],
      properties: {
        market_overview: {
          type: 'object',
          additionalProperties: true,
          properties: {
            marketSize: { type: 'string' },
            growthTrend: { type: 'string' },
            marketState: { type: 'string' },
            marketStateExplanation: { type: 'string' },
            macroVariables: { type: 'array', minItems: 5, items: { type: 'string' } },
            awarenessLevel: { type: 'string' },
            summary: { type: 'string' },
            opportunities: { type: 'array', minItems: 3, items: { type: 'string' } },
            threats: { type: 'array', minItems: 3, items: { type: 'string' } },
          },
        },
      },
    };

    const phaseA2Schema = {
      type: 'object',
      additionalProperties: false,
      required: ['jtbd'],
      properties: {
        jtbd: {
          type: 'object',
          additionalProperties: true,
          properties: {
            functional: { type: 'string' },
            emotional: { type: 'string' },
            social: { type: 'string' },
            pains: {
              type: 'array',
              minItems: 10,
              maxItems: 10,
              items: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  pain: { type: 'string' },
                  why: { type: 'string' },
                  impact: { type: 'string' },
                },
              },
            },
            desires: {
              type: 'array',
              minItems: 10,
              maxItems: 10,
              items: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  desire: { type: 'string' },
                  emotion: { type: 'string' },
                  idealState: { type: 'string' },
                },
              },
            },
            objections: {
              type: 'array',
              minItems: 10,
              maxItems: 10,
              items: {
                type: 'object',
                additionalProperties: true,
                properties: {
                  objection: { type: 'string' },
                  belief: { type: 'string' },
                  counter: { type: 'string' },
                },
              },
            },
            insights: { type: 'array', minItems: 10, items: { type: 'string' } },
          },
        },
      },
    };

    const phaseA3Schema = {
      type: 'object',
      additionalProperties: false,
      required: ['competitors'],
      properties: {
        competitors: {
          type: 'array',
          minItems: 10,
          maxItems: 10,
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              name: { type: 'string' },
              website: { type: 'string' },
              instagram: { type: 'string' },
              tiktok: { type: 'string' },
              facebook: { type: 'string' },
              youtube: { type: 'string' },
              linkedin: { type: 'string' },
              promise: { type: 'string' },
              valueProposition: { type: 'string' },
              differentiator: { type: 'string' },
              price: { type: 'string' },
              tone: { type: 'string' },
              cta: { type: 'string' },
              awarenessLevel: { type: 'string' },
              channels: { type: 'array', items: { type: 'string' } },
              contentFormats: { type: 'array', items: { type: 'string' } },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    };

    const phaseBSchema = {
      type: 'object',
      additionalProperties: true,
      properties: {
        description: { type: 'string' },
        avatars: { type: 'array', items: { type: 'object', additionalProperties: true } },
        differentiation: { type: 'object', additionalProperties: true },
        esferaInsights: { type: 'object', additionalProperties: true },
        salesAngles: { type: 'array', items: { type: 'object', additionalProperties: true } },
        puv: { type: 'object', additionalProperties: true },
        transformation: { type: 'object', additionalProperties: true },
        leadMagnets: { type: 'array', items: { type: 'object', additionalProperties: true } },
        videoCreatives: { type: 'array', items: { type: 'object', additionalProperties: true } },
        executiveSummary: { type: 'object', additionalProperties: true },
      },
    };

    // Schemas para fase B (split)
    const phaseB1Schema = {
      type: 'object',
      additionalProperties: false,
      required: ['description', 'avatars', 'differentiation', 'esferaInsights', 'executiveSummary'],
      properties: {
        description: { type: 'string' },
        avatars: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'object', additionalProperties: true } },
        differentiation: { type: 'object', additionalProperties: true },
        esferaInsights: { type: 'object', additionalProperties: true },
        executiveSummary: { type: 'object', additionalProperties: true },
      },
    };

    const phaseB2Schema = {
      type: 'object',
      additionalProperties: false,
      required: ['salesAngles', 'puv', 'transformation', 'leadMagnets'],
      properties: {
        salesAngles: { type: 'array', minItems: 20, maxItems: 20, items: { type: 'object', additionalProperties: true } },
        puv: { type: 'object', additionalProperties: true },
        transformation: { type: 'object', additionalProperties: true },
        leadMagnets: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', additionalProperties: true } },
      },
    };

    const phaseB3Schema = {
      type: 'object',
      additionalProperties: false,
      required: ['creatives'],
      properties: {
        creatives: { type: 'array', minItems: 30, maxItems: 30, items: { type: 'object', additionalProperties: true } },
      },
    };

    const sanitizeJsonString = (input: string) =>
      input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    // Attempt to repair truncated or malformed JSON
    const repairJson = (jsonStr: string): string => {
      let str = jsonStr.trim();
      
      // Remove any trailing incomplete string (ends with unmatched quote)
      // Find the last complete property value
      const lastQuoteIdx = str.lastIndexOf('"');
      if (lastQuoteIdx > 0) {
        // Check if there's an unclosed string by counting quotes
        const beforeLast = str.substring(0, lastQuoteIdx);
        const quoteCount = (beforeLast.match(/(?<!\\)"/g) || []).length;
        
        // If odd number of quotes before the last one, the string is incomplete
        if (quoteCount % 2 !== 0) {
          // Find the start of the incomplete string and remove it
          let searchIdx = lastQuoteIdx - 1;
          while (searchIdx > 0 && str[searchIdx] !== '"') {
            searchIdx--;
          }
          if (searchIdx > 0) {
            // Check if this looks like a truncated property
            const afterPrevQuote = str.substring(searchIdx + 1, lastQuoteIdx);
            if (!afterPrevQuote.includes(':') && !afterPrevQuote.includes('{') && !afterPrevQuote.includes('[')) {
              // This might be a value string, keep looking for property start
              str = str.substring(0, searchIdx);
            }
          }
        }
      }
      
      // Remove trailing comma if present
      str = str.replace(/,\s*$/, '');
      
      // Remove incomplete property assignments (ending with "key": or "key":")
      str = str.replace(/,?\s*"[^"]*"\s*:\s*"?$/, '');
      str = str.replace(/,?\s*"[^"]*"\s*:$/, '');
      
      // Count brackets and braces
      let openBraces = 0;
      let openBrackets = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') openBraces++;
          else if (char === '}') openBraces--;
          else if (char === '[') openBrackets++;
          else if (char === ']') openBrackets--;
        }
      }
      
      // Close any unclosed strings
      if (inString) {
        str += '"';
      }
      
      // Remove trailing comma again after potential string closure
      str = str.replace(/,\s*$/, '');
      
      // Close brackets and braces in reverse order
      while (openBrackets > 0) {
        str += ']';
        openBrackets--;
      }
      while (openBraces > 0) {
        str += '}';
        openBraces--;
      }
      
      return str;
    };

    const runPerplexity = async (prompt: string, timeoutMs: number, schema: any, schemaName: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            max_tokens: 4500,
            temperature: 0.15,
            messages: [
              { role: 'system', content: `Responde en español. Sé directo. DEVUELVE SOLO JSON válido sin texto adicional ni markdown.` },
              { role: 'user', content: prompt }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: schemaName,
                schema,
              },
            },
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Perplexity HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        const content = (data.choices?.[0]?.message?.content || '').toString();
        const citations = data.citations || [];

        let jsonStr = sanitizeJsonString(content.trim());
        if (!jsonStr) throw new Error('Empty response from Perplexity');

        let parsed: any;
        try {
          parsed = JSON.parse(jsonStr);
        } catch (e) {
          // Try to repair the JSON
          console.warn('[product-research] Initial JSON parse failed, attempting repair...');
          const repaired = repairJson(jsonStr);
          try {
            parsed = JSON.parse(repaired);
            console.log('[product-research] JSON repair successful');
          } catch (e2) {
            console.error('[product-research] Perplexity returned non-JSON content (first 400 chars):', content.slice(0, 400));
            console.error('[product-research] Repaired JSON (first 400 chars):', repaired.slice(0, 400));
            throw new Error(`Invalid JSON from Perplexity: ${(e as Error).message}`);
          }
        }

        return { json: parsed, rawContent: content, citations };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Supabase client
    const supabase = getKreoonClient();

    const savePartial = async (partialUpdate: Record<string, unknown>) => {
      const { error: partialError } = await supabase
        .from('products')
        .update({
          ...partialUpdate,
          brief_status: 'in_progress',
          research_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (partialError) {
        console.error('[product-research] Partial DB update error:', partialError);
      }
    };


    const applyPhaseA = async () => {
      console.log('[product-research] Running phase A (split: market/JTBD/competitors)');

      // A1: market
      console.log('[product-research] Phase A1 (market_overview)');
      const { json: a1, rawContent: rawA1, citations: citA1 } = await runPerplexity(phasePromptA1, 55000, phaseA1Schema, 'phase_a1');

      await savePartial({
        market_research: {
          ...(a1.market_overview || {}),
          rawContent: rawA1,
          citations: citA1,
          generatedAt: new Date().toISOString(),
        },
      });

      // A2: JTBD
      console.log('[product-research] Phase A2 (jtbd)');
      const { json: a2 } = await runPerplexity(phasePromptA2, 55000, phaseA2Schema, 'phase_a2');

      await savePartial({
        ideal_avatar: a2.jtbd
          ? JSON.stringify({ jtbd: a2.jtbd, summary: a2.jtbd.functional })
          : null,
      });

      // A3: competitors
      console.log('[product-research] Phase A3 (competitors)');
      const { json: a3 } = await runPerplexity(phasePromptA3, 55000, phaseA3Schema, 'phase_a3');

      await savePartial({
        competitor_analysis: {
          competitors: a3.competitors || [],
          differentiation: {},
          generatedAt: new Date().toISOString(),
        },
      });

      return { a1, a2, a3 };
    };

    const applyPhaseB = async () => {
      console.log('[product-research] Running phase B (split calls: B1/B2/B3)');

      // B1: avatars + differentiation + esfera + executive summary + description
      console.log('[product-research] Phase B1');
      const { json: b1 } = await runPerplexity(phasePromptB1, 55000, phaseB1Schema, 'phase_b1');

      const updateB1: any = {
        brief_status: 'in_progress',
        brief_data: briefData,
        research_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (b1?.description) updateB1.description = b1.description;

      updateB1.avatar_profiles = {
        profiles: b1.avatars || [],
        generatedAt: new Date().toISOString(),
      };

      updateB1.content_strategy = {
        esferaInsights: b1.esferaInsights || {},
        executiveSummary: b1.executiveSummary || {},
        generatedAt: new Date().toISOString(),
      };

      if (b1?.differentiation) {
        const { data: existing } = await supabase
          .from('products')
          .select('competitor_analysis')
          .eq('id', productId)
          .single();

        const existingCompetitors = (existing as any)?.competitor_analysis?.competitors || [];
        updateB1.competitor_analysis = {
          competitors: existingCompetitors,
          differentiation: b1.differentiation,
          generatedAt: new Date().toISOString(),
        };
      }

      const { error: errB1 } = await supabase
        .from('products')
        .update(updateB1)
        .eq('id', productId);

      if (errB1) {
        console.error('[product-research] Database update error (B1):', errB1);
        throw new Error('Failed to save research (B1) to database');
      }

      // B2: sales angles + PUV + transformation + lead magnets
      console.log('[product-research] Phase B2');
      const { json: b2 } = await runPerplexity(phasePromptB2, 55000, phaseB2Schema, 'phase_b2');

      const { data: existingAngles } = await supabase
        .from('products')
        .select('sales_angles_data')
        .eq('id', productId)
        .single();

      const existingSalesAnglesData = (existingAngles as any)?.sales_angles_data || {};

      const updateB2: any = {
        sales_angles_data: {
          ...existingSalesAnglesData,
          angles: b2.salesAngles || [],
          puv: b2.puv || {},
          transformation: b2.transformation || {},
          leadMagnets: b2.leadMagnets || [],
          generatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      };

      const { error: errB2 } = await supabase
        .from('products')
        .update(updateB2)
        .eq('id', productId);

      if (errB2) {
        console.error('[product-research] Database update error (B2):', errB2);
        throw new Error('Failed to save research (B2) to database');
      }

      // B3: creatives (30)
      console.log('[product-research] Phase B3');
      const { json: b3 } = await runPerplexity(phasePromptB3, 55000, phaseB3Schema, 'phase_b3');

      const { data: existingAngles2 } = await supabase
        .from('products')
        .select('sales_angles_data')
        .eq('id', productId)
        .single();

      const existingSalesAnglesData2 = (existingAngles2 as any)?.sales_angles_data || {};

      const updateB3: any = {
        sales_angles_data: {
          ...existingSalesAnglesData2,
          videoCreatives: b3.creatives || [],
          generatedAt: new Date().toISOString(),
        },
        brief_status: 'completed',
        brief_completed_at: new Date().toISOString(),
        research_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: errB3 } = await supabase
        .from('products')
        .update(updateB3)
        .eq('id', productId);

      if (errB3) {
        console.error('[product-research] Database update error (B3):', errB3);
        throw new Error('Failed to save research (B3) to database');
      }

      return { b1, b2, b3 };
    };

    if (phase === 'A') {
      await applyPhaseA();
      return new Response(
        JSON.stringify({ success: true, phase: 'A' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (phase === 'B') {
      await applyPhaseB();
      return new Response(
        JSON.stringify({ success: true, phase: 'B' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await applyPhaseA();
    await applyPhaseB();

    return new Response(
      JSON.stringify({ success: true, phase: 'A+B' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[product-research] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildProductDescription(briefData: any): string {
  const parts = [];

  // Basic info
  if (briefData.productName) {
    parts.push(`**Nombre del producto:** ${briefData.productName}`);
  }
  if (briefData.category) {
    parts.push(`**Categoría:** ${briefData.category}${briefData.customCategory ? ` - ${briefData.customCategory}` : ''}`);
  }
  if (briefData.currentObjective) {
    parts.push(`**Objetivo actual:** ${briefData.currentObjective}`);
  }
  if (briefData.slogan) {
    parts.push(`**Slogan:** ${briefData.slogan}`);
  }

  // Target Market
  if (briefData.targetMarket) {
    parts.push(`**Mercado objetivo:** ${briefData.targetMarket}`);
  }

  // Value & Transformation
  if (briefData.mainBenefit) {
    parts.push(`**Beneficio principal:** ${briefData.mainBenefit}`);
  }
  if (briefData.transformation) {
    parts.push(`**Transformación que produce:** ${briefData.transformation}`);
  }
  if (briefData.differentiator) {
    parts.push(`**Diferenciador:** ${briefData.differentiator}`);
  }
  if (briefData.keyIngredients) {
    parts.push(`**Ingredientes/Componentes clave:** ${briefData.keyIngredients}`);
  }
  if (briefData.mustCommunicate) {
    parts.push(`**Lo que debe comunicarse:** ${briefData.mustCommunicate}`);
  }

  // Problem & Desire
  if (briefData.problemSolved) {
    parts.push(`**Problema que resuelve:** ${briefData.problemSolved}`);
  }
  if (briefData.mainDesire) {
    parts.push(`**Deseo principal que satisface:** ${briefData.mainDesire}`);
  }
  if (briefData.consequenceOfNotBuying) {
    parts.push(`**Consecuencia de no comprar:** ${briefData.consequenceOfNotBuying}`);
  }
  if (briefData.competitiveAdvantage) {
    parts.push(`**Ventaja competitiva:** ${briefData.competitiveAdvantage}`);
  }

  // Neuromarketing
  if (briefData.reptileBrain?.length > 0) {
    parts.push(`**Gatillos reptilianos:** ${briefData.reptileBrain.join(', ')}`);
  }
  if (briefData.limbicBrain?.length > 0) {
    parts.push(`**Emociones objetivo:** ${briefData.limbicBrain.join(', ')}`);
  }
  if (briefData.cortexBrain) {
    parts.push(`**Justificación racional:** ${briefData.cortexBrain}`);
  }

  // Target Audience
  const audienceParts = [];
  if (briefData.targetGender) audienceParts.push(`Género: ${briefData.targetGender}`);
  if (briefData.targetAgeRange) audienceParts.push(`Edad: ${briefData.targetAgeRange}`);
  if (briefData.targetOccupation) audienceParts.push(`Ocupación: ${briefData.targetOccupation}`);
  if (audienceParts.length > 0) {
    parts.push(`**Público objetivo:** ${audienceParts.join(', ')}`);
  }
  if (briefData.targetInterests?.length > 0) {
    parts.push(`**Intereses:** ${briefData.targetInterests.join(', ')}`);
  }
  if (briefData.targetHabits) {
    parts.push(`**Hábitos:** ${briefData.targetHabits}`);
  }
  if (briefData.commonObjections?.length > 0) {
    parts.push(`**Objeciones comunes:** ${briefData.commonObjections.join(', ')}`);
  }
  if (briefData.idealScenario) {
    parts.push(`**Escenario ideal post-compra:** ${briefData.idealScenario}`);
  }

  // Content Strategy
  if (briefData.contentTypes?.length > 0) {
    parts.push(`**Tipos de contenido:** ${briefData.contentTypes.join(', ')}`);
  }
  if (briefData.platforms?.length > 0) {
    parts.push(`**Plataformas:** ${briefData.platforms.join(', ')}`);
  }
  if (briefData.useForAds) {
    parts.push(`**Uso en Ads:** ${briefData.useForAds}`);
  }
  if (briefData.referenceContent) {
    parts.push(`**Contenido de referencia:** ${briefData.referenceContent}`);
  }
  if (briefData.brandStrengths) {
    parts.push(`**Puntos fuertes a comunicar:** ${briefData.brandStrengths}`);
  }
  if (briefData.brandRestrictions) {
    parts.push(`**Restricciones de marca:** ${briefData.brandRestrictions}`);
  }
  if (briefData.expectedResult) {
    parts.push(`**Resultado esperado:** ${briefData.expectedResult}`);
  }
  if (briefData.additionalNotes) {
    parts.push(`**Notas adicionales:** ${briefData.additionalNotes}`);
  }

  return parts.join('\n\n');
}

// Fallback parser if AI distribution fails
function parseResearchContentFallback(content: string, citations: string[], briefData: any): any {
  const extractSection = (startMarker: string, endMarker: string | null): string => {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    let endIndex = content.length;
    if (endMarker) {
      const foundEnd = content.indexOf(endMarker, startIndex + startMarker.length);
      if (foundEnd !== -1) {
        endIndex = foundEnd;
      }
    }
    
    return content.substring(startIndex, endIndex).trim();
  };

  return {
    description: `${briefData.mainBenefit || ''}\n\n${briefData.transformation || ''}\n\n${briefData.differentiator || ''}`.trim(),
    market_overview: {
      summary: extractSection('PASO 1', 'PASO 2'),
      marketState: 'crecimiento',
      macroVariables: [],
      awarenessLevel: ''
    },
    jtbd: {
      functional: extractSection('PASO 2', 'PASO 3'),
      emotional: '',
      social: '',
      pains: [],
      desires: [],
      objections: [],
      insights: []
    },
    avatars: [],
    competitors: [],
    differentiation: {
      repeatedMessages: [],
      poorlyAddressedPains: [],
      ignoredAspirations: [],
      positioningOpportunities: [],
      unexploitedEmotions: []
    },
    esferaInsights: {
      enganchar: { marketDominance: '', saturated: '', opportunities: [] },
      solucion: { currentPromises: '', unresolvedObjections: '', trustOpportunities: [] },
      remarketing: { existingProof: '', validationGaps: '', decisionMessages: [] },
      fidelizar: { commonErrors: '', communityOpportunities: [] }
    },
    salesAngles: [],
    puv: {
      centralProblem: briefData.problemSolved || '',
      tangibleResult: briefData.transformation || '',
      marketDifference: briefData.differentiator || '',
      idealClient: '',
      statement: ''
    },
    transformation: {
      functional: { before: '', after: '' },
      emotional: { before: '', after: '' },
      identity: { before: '', after: '' }
    },
    leadMagnets: [],
    videoCreatives: [],
    executiveSummary: {
      keyInsights: [],
      psychologicalDrivers: [],
      immediateActions: []
    }
  };
}
