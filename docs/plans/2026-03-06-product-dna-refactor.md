# Product DNA Refactor - Plan de Implementacion

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactorizar generate-product-dna para eliminar dependencia de client_dna y generar 8 secciones orientadas a produccion de contenido.

**Architecture:** Pipeline de 4 pasos: (1) Extraer datos del audio con Gemini, (2) Investigar con Perplexity 12k tokens, (3) 4 calls paralelos a Gemini 12k tokens cada uno, (4) Ensamblar y guardar en los 4 campos existentes de la tabla.

**Tech Stack:** Deno, Supabase Edge Functions, Gemini 2.5 Flash, Perplexity sonar-pro

---

## Task 1: Agregar funcion extractFromAudio()

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts:102` (despues de analyzeEmotions)

**Step 1: Agregar la nueva funcion extractFromAudio**

Insertar despues de la funcion `analyzeEmotions` (linea ~152):

```typescript
// ── Extract structured data from audio transcription ─────────────────────
async function extractFromAudio(
  transcription: string,
  wizardResponses: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("[generate-product-dna] No Gemini key for extraction, using defaults");
    return {
      servicio_exacto: "Servicio no especificado",
      objetivo_real: (wizardResponses.goals as string[])?.join(", ") || "Vender",
      palabras_clave_cliente: [],
      restricciones_creativas: "",
      referentes_estilo: "",
      tono_emocional: "neutral",
      canal_primario: (wizardResponses.platforms as string[])?.[0] || "instagram",
      tipo_contenido_principal: (wizardResponses.service_types as string[])?.[0] || "video_ugc",
    };
  }

  const serviceTypes = (wizardResponses.service_types as string[]) || [];
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  const extractionPrompt = `Eres un estratega de contenido digital experto en briefing creativo.

Analiza esta transcripcion de audio donde un cliente describe lo que necesita:

TRANSCRIPCION:
${transcription}

SELECCIONES DEL WIZARD:
- Tipos de servicio: ${serviceTypes.join(", ") || "No especificado"}
- Objetivos: ${goals.join(", ") || "No especificado"}
- Plataformas: ${platforms.join(", ") || "No especificado"}
- Audiencias: ${audiences.join(", ") || "No especificado"}

Extrae y devuelve SOLO este JSON (sin texto adicional, sin markdown):
{
  "servicio_exacto": "descripcion exacta del producto/servicio en las palabras del cliente",
  "objetivo_real": "objetivo declarado + objetivo implicito detectado",
  "palabras_clave_cliente": ["frase literal 1", "frase literal 2", "frase literal 3"],
  "restricciones_creativas": "lo que NO quiere en el contenido",
  "referentes_estilo": "estilos o ejemplos mencionados",
  "tono_emocional": "urgente|claro|apasionado|inseguro|neutral",
  "canal_primario": "el canal mas importante mencionado o seleccionado",
  "tipo_contenido_principal": "el tipo de contenido mas solicitado"
}`;

  console.log("[generate-product-dna] Extracting data from audio with Gemini...");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: extractionPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 },
        }),
      }
    );

    if (!response.ok) {
      console.warn("[generate-product-dna] Extraction failed, using defaults");
      return getDefaultExtraction(wizardResponses);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = JSON.parse(repairJsonForParse(content));
    console.log("[generate-product-dna] Extraction successful:", Object.keys(parsed).join(", "));
    return parsed;
  } catch (err) {
    console.error("[generate-product-dna] Extraction error:", err);
    return getDefaultExtraction(wizardResponses);
  }
}

function getDefaultExtraction(wizardResponses: Record<string, unknown>): Record<string, unknown> {
  return {
    servicio_exacto: "Servicio no especificado",
    objetivo_real: (wizardResponses.goals as string[])?.join(", ") || "Vender",
    palabras_clave_cliente: [],
    restricciones_creativas: "",
    referentes_estilo: "",
    tono_emocional: "neutral",
    canal_primario: (wizardResponses.platforms as string[])?.[0] || "instagram",
    tipo_contenido_principal: (wizardResponses.service_types as string[])?.[0] || "video_ugc",
  };
}
```

**Step 2: Commit**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "feat(product-dna): agregar funcion extractFromAudio para extraer datos del brief"
```

---

## Task 2: Reemplazar callPerplexityResearch con query orientado a contenido

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts:155-202`

**Step 1: Reemplazar la funcion callPerplexityResearch**

Reemplazar la funcion existente con:

```typescript
// ── Perplexity AI call (research mode - content focused) ─────────────────
async function callPerplexityResearch(
  extractedData: Record<string, unknown>,
  wizardResponses: Record<string, unknown>
): Promise<string> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) {
    console.error("[generate-product-dna] PERPLEXITY_API_KEY not found");
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const serviceTypes = (wizardResponses.service_types as string[]) || [];
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  const canalPrimario = extractedData.canal_primario || platforms[0] || "instagram";
  const servicioExacto = extractedData.servicio_exacto || "producto/servicio";

  const systemPrompt = `Eres un estratega digital especialista en contenido para ${canalPrimario}.
Tu investigacion debe ser ESPECIFICA para crear contenido de ${serviceTypes.join(" y ") || "video UGC"}
con el objetivo de ${goals.join(" y ") || "vender"}.
Enfocate en LATAM. Usa datos reales y actuales.`;

  const userPrompt = `Necesito una investigacion de mercado completa para crear contenido.

PRODUCTO/SERVICIO: ${servicioExacto}
CANAL PRINCIPAL: ${platforms.join(", ") || "Instagram, TikTok"}
AUDIENCIA: ${audiences.join(", ") || "25-34"} anos
OBJETIVO: ${goals.join(", ") || "vender"}

Investiga y dame:

1. PANORAMA DEL MERCADO
   - Estado actual del mercado para este producto/servicio en LATAM
   - Tamano aproximado y tendencias actuales
   - Que esta funcionando HOY en ${platforms.join("/") || "redes sociales"} para esta categoria

2. ANALISIS DE COMPETENCIA (5 competidores reales y activos)
   Para cada uno: nombre, promesa principal, precio referencial si aplica,
   principal fortaleza en contenido, principal debilidad, que plataformas usa

3. GAP COMPETITIVO
   - Que NO estan haciendo bien los competidores en contenido
   - La oportunidad real de diferenciacion

4. COMPORTAMIENTO DE LA AUDIENCIA EN ${platforms.join("/") || "REDES"}
   - Como consume contenido esta audiencia en ese canal
   - Que formatos generan mas engagement
   - Que tipo de hooks detienen el scroll
   - Horarios y frecuencias de mayor actividad

5. TENDENCIAS DE CONTENIDO ACTUALES
   - Formatos que estan funcionando ahora mismo
   - Estilos de video que generan conversion en este nicho
   - Hashtags y terminos relevantes

Responde con datos reales, especificos y actuales. Evita generalidades.`;

  console.log("[generate-product-dna] Step 1: Perplexity research (content-focused)...");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 12000,
      temperature: 0.3,
      return_citations: true,
    }),
  });

  console.log(`[generate-product-dna] Perplexity response status: ${response.status}`);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Perplexity error:", errText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  if (!content) {
    throw new Error("Perplexity returned empty response");
  }

  console.log(`[generate-product-dna] Perplexity research: ${content.length} chars`);
  return content;
}
```

**Step 2: Commit**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "feat(product-dna): reemplazar query de Perplexity con enfoque en contenido de canal"
```

---

## Task 3: Crear los 4 nuevos prompts de Gemini para las 8 secciones

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts:1074-1175` (reemplazar constantes)

**Step 1: Reemplazar JSON_STRUCTURE_TEMPLATE y prompts con nuevas constantes**

Reemplazar las constantes existentes con:

```typescript
// ── Prompt Call 1: Contexto + Mercado ────────────────────────────────────
function buildCall1Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  wizardResponses: Record<string, unknown>
): string {
  const serviceTypes = (wizardResponses.service_types as string[]) || [];
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  return `Eres un estratega de marketing digital y creativo de contenido experto en LATAM.

DATOS DEL ENCARGO:
${JSON.stringify(extractedData, null, 2)}

INVESTIGACION DE MERCADO:
${perplexityResearch.substring(0, 15000)}

WIZARD:
- Tipos de servicio: ${serviceTypes.join(", ")}
- Objetivos: ${goals.join(", ")}
- Plataformas: ${platforms.join(", ")}
- Audiencias: ${audiences.join(", ")} anos

Genera SOLO este JSON (sin texto adicional, sin markdown):
{
  "seccion_1_contexto": {
    "servicio_exacto": "string",
    "objetivo_real": "string",
    "palabras_clave_cliente": ["string"],
    "restricciones_creativas": "string",
    "referentes_estilo": "string",
    "tono_emocional_audio": "string"
  },
  "seccion_2_mercado": {
    "panorama_mercado": "string - 3-4 oraciones con datos concretos",
    "tendencias_actuales": "string - que funciona HOY en el canal",
    "competidores": [
      {
        "nombre": "string",
        "promesa_principal": "string",
        "precio_referencial": "string",
        "fortaleza": "string",
        "debilidad": "string",
        "plataformas": ["string"]
      }
    ],
    "gap_competitivo": "string - la oportunidad real",
    "posicionamiento_sugerido": "string - como diferenciarse en ese canal"
  }
}`;
}

// ── Prompt Call 2: Avatares ──────────────────────────────────────────────
function buildCall2Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  wizardResponses: Record<string, unknown>
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];
  const palabrasClave = (extractedData.palabras_clave_cliente as string[]) || [];

  return `Eres un estratega de marketing digital experto en psicologia del consumidor
y comportamiento de audiencias digitales en LATAM.

PRODUCTO/SERVICIO: ${extractedData.servicio_exacto || "No especificado"}
CANAL: ${platforms.join(", ")}
AUDIENCIA: ${audiences.join(", ")} anos
OBJETIVO: ${goals.join(", ")}
PALABRAS DEL CLIENTE: ${palabrasClave.join(", ")}

INVESTIGACION DE MERCADO:
${perplexityResearch.substring(0, 12000)}

Crea 3 avatares del cliente ideal. Cada avatar debe ser especifico,
humano y basado en la investigacion real. No generico.

Genera SOLO este JSON (sin texto adicional, sin markdown):
{
  "seccion_3_avatares": [
    {
      "id": "avatar_1",
      "nombre_edad": "string - nombre ficticio + edad ej: Maria, 28 anos",
      "situacion_actual": "string - donde esta hoy, que problema tiene",
      "dolor_principal": "string - el dolor mas profundo y urgente",
      "deseo_principal": "string - lo que realmente quiere lograr",
      "objecion_principal": "string - por que dudaria en comprar",
      "como_habla": ["frase textual 1", "frase textual 2", "frase textual 3"],
      "trigger_de_compra": "string - que lo haria decidirse a actuar",
      "nivel_consciencia": "inconsciente_del_problema|consciente_del_problema|consciente_de_la_solucion|consciente_del_producto"
    },
    {
      "id": "avatar_2",
      "nombre_edad": "string",
      "situacion_actual": "string",
      "dolor_principal": "string",
      "deseo_principal": "string",
      "objecion_principal": "string",
      "como_habla": ["string"],
      "trigger_de_compra": "string",
      "nivel_consciencia": "string"
    },
    {
      "id": "avatar_3",
      "nombre_edad": "string",
      "situacion_actual": "string",
      "dolor_principal": "string",
      "deseo_principal": "string",
      "objecion_principal": "string",
      "como_habla": ["string"],
      "trigger_de_compra": "string",
      "nivel_consciencia": "string"
    }
  ]
}`;
}

// ── Prompt Call 3: Angulos + Ideas ───────────────────────────────────────
function buildCall3Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  avatares: unknown[],
  wizardResponses: Record<string, unknown>
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  return `Eres un estratega creativo de contenido digital especialista en UGC,
copywriting de alto impacto y produccion de contenido para ${platforms.join("/")}.

PRODUCTO/SERVICIO: ${extractedData.servicio_exacto || "No especificado"}
OBJETIVO: ${goals.join(", ")}
CANAL: ${platforms.join(", ")}
AUDIENCIA: ${audiences.join(", ")} anos
RESTRICCIONES: ${extractedData.restricciones_creativas || "Ninguna especificada"}
TONO EMOCIONAL DEL CLIENTE: ${extractedData.tono_emocional || "neutral"}

AVATARES GENERADOS:
${JSON.stringify(avatares, null, 2)}

INVESTIGACION:
${perplexityResearch.substring(0, 10000)}

Genera SOLO este JSON (sin texto adicional, sin markdown):
{
  "seccion_4_angulos": [
    {
      "id": 1,
      "tipo": "educativo|emocional|aspiracional|prueba_social|anti_objecion|transformacion|urgencia|comparativo|testimonial|error_comun",
      "hook_apertura": "string - primera frase que detiene el scroll",
      "desarrollo": "string - de que trata el cuerpo del video",
      "cta": "string - accion especifica al final",
      "avatar_objetivo": "avatar_1|avatar_2|avatar_3",
      "fase_esfera": "enganche|solucion|remarketing|fidelizacion",
      "uso_recomendado": "organico|ads|ambos"
    }
  ],
  "seccion_5_ideas_contenido": [
    {
      "id": 1,
      "titulo": "string",
      "formato": "testimonial_selfie|antes_despues|tutorial|unboxing|broll|educativo|reto|pov",
      "hook_variacion_1": "string",
      "hook_variacion_2": "string",
      "hook_variacion_3": "string",
      "desarrollo": "string - estructura del cuerpo del video",
      "cta": "string",
      "duracion_recomendada": "string - ej: 15-30 seg, 30-60 seg",
      "fase_esfera": "enganche|solucion|remarketing|fidelizacion",
      "uso_recomendado": "organico|ads|ambos"
    }
  ]
}

IMPORTANTE:
- Genera EXACTAMENTE 10 angulos en seccion_4_angulos
- Genera EXACTAMENTE 10 ideas en seccion_5_ideas_contenido
- Distribuir ideas: 3 enganche, 4 solucion, 2 remarketing, 1 fidelizacion`;
}

// ── Prompt Call 4: Estrategia Organica + Ads + Brief ─────────────────────
function buildCall4Prompt(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  angulos: unknown[],
  wizardResponses: Record<string, unknown>
): string {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  return `Eres un estratega digital senior especialista en growth de contenido organico
y performance de campanas pagas en ${platforms.join("/")} para el mercado LATAM.

PRODUCTO/SERVICIO: ${extractedData.servicio_exacto || "No especificado"}
OBJETIVO: ${goals.join(", ")}
CANAL: ${platforms.join(", ")}
AUDIENCIA: ${audiences.join(", ")} anos
RESTRICCIONES: ${extractedData.restricciones_creativas || "Ninguna"}

INVESTIGACION:
${perplexityResearch.substring(0, 8000)}

ANGULOS E IDEAS GENERADOS:
${JSON.stringify(angulos, null, 2).substring(0, 4000)}

Genera SOLO este JSON (sin texto adicional, sin markdown):
{
  "seccion_6_estrategia_organica": {
    "objetivo_organico": "string - que construye en el tiempo",
    "distribucion_contenido": {
      "viral": 25,
      "valor": 40,
      "venta": 25,
      "personal": 10,
      "justificacion": "string - por que esa distribucion para este caso"
    },
    "frecuencia_publicacion": "string - ej: 5 veces por semana",
    "tipo_contenido_organico": "string - que formatos funcionan mejor organicamente",
    "pilares_tematicos": ["pilar 1", "pilar 2", "pilar 3"],
    "tono_organico": "string",
    "metricas_organico": {
      "retencion_objetivo": "string - ej: 50-70% del video",
      "interacciones_clave": "string - jerarquia de interacciones importantes",
      "frecuencia_revision": "string - cada cuanto revisar metricas"
    },
    "errores_comunes_organico": ["error 1", "error 2", "error 3"]
  },
  "seccion_7_estrategia_ads": {
    "objetivo_campana": "conversiones|trafico|reconocimiento",
    "estructura_campana": {
      "frio": "string - como atacar audiencia nueva",
      "tibio": "string - como atacar audiencia que ya interactuo",
      "remarketing": "string - como reimpactar a quienes no compraron"
    },
    "publico_frio": {
      "intereses": ["interes 1", "interes 2", "interes 3"],
      "comportamientos": ["comportamiento 1", "comportamiento 2"],
      "caracteristicas": "string - descripcion del publico frio ideal"
    },
    "publico_remarketing": "string - a quien reimpactar y con que mensaje",
    "presupuesto_minimo_sugerido": "string - monto base recomendado",
    "ideas_para_ads": "string - cuales de las 10 ideas son mas recomendadas para pauta y por que",
    "estructura_creativo_ad": {
      "hook": "string - duracion y objetivo (3-5 seg)",
      "problema": "string - duracion y objetivo (5-10 seg)",
      "solucion": "string - duracion y objetivo (15-30 seg)",
      "cta": "string - duracion y objetivo (3-5 seg)"
    },
    "variaciones_recomendadas": "string - cuantas variaciones de hook probar",
    "ctr_objetivo": "string - benchmark segun canal: Meta >1% / TikTok >1.5%",
    "senales_de_escalar": "string - cuando y bajo que metricas escalar el presupuesto",
    "senales_de_pausar": "string - cuando pausar un creativo"
  },
  "seccion_8_brief_creador": {
    "tono_de_voz": "string",
    "palabras_usar": ["palabra 1", "palabra 2", "palabra 3", "palabra 4", "palabra 5"],
    "palabras_evitar": ["palabra 1", "palabra 2", "palabra 3"],
    "indicaciones_visuales": "string - locacion, vestimenta, iluminacion, encuadre",
    "especificaciones_tecnicas": "string - duracion, formato 9:16, calidad minima",
    "cta_recomendado": "string - llamada a la accion exacta segun objetivo",
    "restricciones_del_cliente": "string - lo que el cliente dijo que no quiere"
  }
}`;
}
```

**Step 2: Commit**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "feat(product-dna): agregar 4 nuevos prompt builders para las 8 secciones"
```

---

## Task 4: Reemplazar callGeminiStructure con 4 calls paralelos

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts:384-552` (reemplazar funcion)

**Step 1: Reemplazar la funcion callGeminiStructure**

```typescript
// ── Execute 4 parallel Gemini calls for 8 sections ───────────────────────
async function generateAllSections(
  extractedData: Record<string, unknown>,
  perplexityResearch: string,
  wizardResponses: Record<string, unknown>
): Promise<{
  market_research: Record<string, unknown>;
  competitor_analysis: Record<string, unknown>;
  strategy_recommendations: Record<string, unknown>;
  content_brief: Record<string, unknown>;
}> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }

  console.log("[generate-product-dna] Step 2: Generating 8 sections with 4 parallel Gemini calls...");

  // Call 1: Contexto + Mercado
  const call1Promise = callGeminiWithPrompt(apiKey, buildCall1Prompt(extractedData, perplexityResearch, wizardResponses), "call1_contexto_mercado");

  // Call 2: Avatares (independiente)
  const call2Promise = callGeminiWithPrompt(apiKey, buildCall2Prompt(extractedData, perplexityResearch, wizardResponses), "call2_avatares");

  // Wait for call1 and call2 to complete
  const [call1Result, call2Result] = await Promise.all([call1Promise, call2Promise]);

  // Extract avatares for call3
  const avatares = call2Result?.seccion_3_avatares || [];

  // Call 3: Angulos + Ideas (needs avatares)
  const call3Promise = callGeminiWithPrompt(apiKey, buildCall3Prompt(extractedData, perplexityResearch, avatares, wizardResponses), "call3_angulos_ideas");

  // Wait for call3
  const call3Result = await call3Promise;

  // Extract angulos for call4
  const angulos = call3Result?.seccion_4_angulos || [];

  // Call 4: Estrategia + Brief (needs angulos)
  const call4Result = await callGeminiWithPrompt(apiKey, buildCall4Prompt(extractedData, perplexityResearch, angulos, wizardResponses), "call4_estrategia_brief");

  // Assemble final result mapping to existing DB columns
  return {
    market_research: {
      seccion_1_contexto: call1Result?.seccion_1_contexto || extractedData,
      seccion_2_mercado: call1Result?.seccion_2_mercado || {},
    },
    competitor_analysis: {
      competidores: call1Result?.seccion_2_mercado?.competidores || [],
      gap_competitivo: call1Result?.seccion_2_mercado?.gap_competitivo || "",
      posicionamiento: call1Result?.seccion_2_mercado?.posicionamiento_sugerido || "",
    },
    strategy_recommendations: {
      seccion_3_avatares: call2Result?.seccion_3_avatares || [],
      seccion_4_angulos: call3Result?.seccion_4_angulos || [],
      seccion_6_organico: call4Result?.seccion_6_estrategia_organica || {},
      seccion_7_ads: call4Result?.seccion_7_estrategia_ads || {},
    },
    content_brief: {
      seccion_5_ideas: call3Result?.seccion_5_ideas_contenido || [],
      seccion_8_brief_creador: call4Result?.seccion_8_brief_creador || {},
    },
  };
}

// ── Single Gemini call helper ────────────────────────────────────────────
async function callGeminiWithPrompt(
  apiKey: string,
  prompt: string,
  callName: string
): Promise<Record<string, unknown>> {
  console.log(`[generate-product-dna] ${callName}: calling Gemini...`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 12000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-product-dna] ${callName} error:`, errText.substring(0, 200));
      return {};
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`[generate-product-dna] ${callName} response: ${content.length} chars`);

    // Extract and parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const repaired = repairJsonForParse(jsonMatch[0]);
      const parsed = JSON.parse(repaired);
      console.log(`[generate-product-dna] ${callName} parsed keys:`, Object.keys(parsed).join(", "));
      return parsed;
    }

    console.warn(`[generate-product-dna] ${callName} no JSON found in response`);
    return {};
  } catch (err) {
    console.error(`[generate-product-dna] ${callName} exception:`, err);
    return {};
  }
}
```

**Step 2: Commit**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "feat(product-dna): reemplazar callGeminiStructure con 4 calls paralelos para 8 secciones"
```

---

## Task 5: Actualizar generateEnrichedAnalysis para nuevo formato sin client_dna

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts:646-916`

**Step 1: Reemplazar generateEnrichedAnalysis**

```typescript
// ── Generate fallback analysis (no client_dna) ──────────────────────────
function generateEnrichedAnalysis(
  wizardResponses: Record<string, unknown>,
  extractedData: Record<string, unknown>,
  research: string
): {
  market_research: Record<string, unknown>;
  competitor_analysis: Record<string, unknown>;
  strategy_recommendations: Record<string, unknown>;
  content_brief: Record<string, unknown>;
} {
  const extracted = extractFromResearch(research);
  const goals = (wizardResponses.goals as string[]) || ["sales"];
  const platforms = (wizardResponses.platforms as string[]) || ["instagram"];
  const audiences = (wizardResponses.audiences as string[]) || ["25_34"];
  const serviceTypes = (wizardResponses.service_types as string[]) || ["video_ugc"];

  // Build competitor objects from research
  const competidores = (extracted.competitors as string[]).slice(0, 5).map((name, i) => ({
    nombre: String(name).replace(/[,;]/g, "").trim(),
    promesa_principal: "Propuesta no identificada",
    precio_referencial: "Variable",
    fortaleza: "Presencia de mercado",
    debilidad: "Por analizar",
    plataformas: platforms,
  }));

  // Build default avatars based on audience
  const avatarDefaults = [
    {
      id: "avatar_1",
      nombre_edad: "Maria, 28 anos",
      situacion_actual: "Emprendedora buscando escalar su negocio online",
      dolor_principal: "No tiene tiempo para crear contenido de calidad",
      deseo_principal: "Aumentar ventas sin invertir mas horas",
      objecion_principal: "No se si realmente funciona para mi nicho",
      como_habla: ["Necesito algo rapido", "No tengo presupuesto enorme", "Quiero resultados ya"],
      trigger_de_compra: "Ver casos de exito similares a su negocio",
      nivel_consciencia: "consciente_de_la_solucion",
    },
    {
      id: "avatar_2",
      nombre_edad: "Carlos, 35 anos",
      situacion_actual: "Dueno de PYME queriendo digitalizar su negocio",
      dolor_principal: "No entiende de redes sociales ni contenido",
      deseo_principal: "Tener presencia profesional sin complicarse",
      objecion_principal: "Es muy caro para lo que necesito",
      como_habla: ["Solo quiero que funcione", "No tengo tiempo para aprender", "Necesito algo simple"],
      trigger_de_compra: "Recomendacion de alguien de confianza",
      nivel_consciencia: "consciente_del_problema",
    },
    {
      id: "avatar_3",
      nombre_edad: "Ana, 32 anos",
      situacion_actual: "Marketing manager buscando optimizar recursos",
      dolor_principal: "El equipo interno no da abasto",
      deseo_principal: "Escalar produccion sin contratar mas gente",
      objecion_principal: "Ya probamos agencias y no funcionaron",
      como_habla: ["Necesito calidad consistente", "El ROI es lo que importa", "Quiero ver metricas"],
      trigger_de_compra: "Demostracion de resultados medibles",
      nivel_consciencia: "consciente_del_producto",
    },
  ];

  // Build default angles
  const angulosDefault = [
    { id: 1, tipo: "educativo", hook_apertura: "El error que comete el 90% de los emprendedores en redes", desarrollo: "Explicar el problema comun y la solucion", cta: "Guardalo para despues", avatar_objetivo: "avatar_1", fase_esfera: "enganche", uso_recomendado: "organico" },
    { id: 2, tipo: "transformacion", hook_apertura: "Asi pasamos de 0 a 10k seguidores en 30 dias", desarrollo: "Mostrar el antes/despues con el proceso", cta: "Te cuento como en el link", avatar_objetivo: "avatar_1", fase_esfera: "solucion", uso_recomendado: "ambos" },
    { id: 3, tipo: "prueba_social", hook_apertura: "Lo que dicen nuestros clientes despues de 3 meses", desarrollo: "Testimoniales reales con resultados", cta: "Quieres lo mismo? Link en bio", avatar_objetivo: "avatar_2", fase_esfera: "remarketing", uso_recomendado: "ads" },
  ];

  return {
    market_research: {
      seccion_1_contexto: {
        servicio_exacto: extractedData.servicio_exacto || serviceTypes.join(", "),
        objetivo_real: extractedData.objetivo_real || goals.join(", "),
        palabras_clave_cliente: extractedData.palabras_clave_cliente || [],
        restricciones_creativas: extractedData.restricciones_creativas || "",
        referentes_estilo: extractedData.referentes_estilo || "",
        tono_emocional_audio: extractedData.tono_emocional || "neutral",
      },
      seccion_2_mercado: {
        panorama_mercado: `El mercado de ${serviceTypes.join(" y ")} en LATAM muestra crecimiento sostenido, impulsado por la demanda de contenido autentico.`,
        tendencias_actuales: "Videos cortos verticales dominan. El contenido UGC genera mayor engagement que el producido profesionalmente.",
        competidores: competidores,
        gap_competitivo: "Oportunidad en contenido autentico y personalizado para nichos especificos.",
        posicionamiento_sugerido: "Diferenciarse por autenticidad y resultados medibles.",
      },
    },
    competitor_analysis: {
      competidores: competidores,
      gap_competitivo: "Contenido autentico y personalizado",
      posicionamiento: "Autenticidad + Resultados",
    },
    strategy_recommendations: {
      seccion_3_avatares: avatarDefaults,
      seccion_4_angulos: angulosDefault,
      seccion_6_organico: {
        objetivo_organico: "Construir autoridad y comunidad",
        distribucion_contenido: { viral: 25, valor: 40, venta: 25, personal: 10, justificacion: "Balance entre engagement y conversion" },
        frecuencia_publicacion: "5 veces por semana",
        tipo_contenido_organico: "Reels, carruseles educativos, stories interactivos",
        pilares_tematicos: ["Educacion", "Casos de exito", "Detras de camaras"],
        tono_organico: "Cercano y profesional",
        metricas_organico: { retencion_objetivo: "50-70%", interacciones_clave: "Guardados > Compartidos > Comentarios", frecuencia_revision: "Semanal" },
        errores_comunes_organico: ["Publicar sin estrategia", "Ignorar metricas", "No responder comentarios"],
      },
      seccion_7_ads: {
        objetivo_campana: "conversiones",
        estructura_campana: { frio: "Contenido educativo de valor", tibio: "Casos de exito y testimoniales", remarketing: "Oferta directa con urgencia" },
        publico_frio: { intereses: ["Marketing digital", "Emprendimiento", "E-commerce"], comportamientos: ["Compradores online", "Duenos de paginas"], caracteristicas: "25-45 anos, interes en negocios" },
        publico_remarketing: "Visitantes web ultimos 30 dias, engagement en redes",
        presupuesto_minimo_sugerido: "$300-500 USD/mes para empezar",
        ideas_para_ads: "Ideas 2 y 3 son ideales para pauta por su enfoque en resultados",
        estructura_creativo_ad: { hook: "0-3 seg: Pregunta o dato impactante", problema: "3-10 seg: Identificar el dolor", solucion: "10-25 seg: Mostrar la solucion", cta: "25-30 seg: Llamada clara a la accion" },
        variaciones_recomendadas: "3-5 variaciones de hook por creativo",
        ctr_objetivo: "Meta Ads >1%, TikTok Ads >1.5%",
        senales_de_escalar: "CTR >2%, CPA bajo objetivo, ROAS >2x",
        senales_de_pausar: "CTR <0.5% despues de 1000 impresiones, CPA 2x objetivo",
      },
    },
    content_brief: {
      seccion_5_ideas: [
        { id: 1, titulo: "El secreto que nadie te cuenta", formato: "educativo", hook_variacion_1: "Nadie te dice esto sobre...", hook_variacion_2: "Lo que los gurus no quieren que sepas", hook_variacion_3: "El error que yo cometi y tu puedes evitar", desarrollo: "Revelar insight valioso del nicho", cta: "Guardalo", duracion_recomendada: "30-60 seg", fase_esfera: "enganche", uso_recomendado: "organico" },
        { id: 2, titulo: "Antes vs Despues real", formato: "antes_despues", hook_variacion_1: "Mira esta transformacion", hook_variacion_2: "De esto a esto en 30 dias", hook_variacion_3: "No vas a creer el cambio", desarrollo: "Mostrar resultados tangibles", cta: "Quieres lo mismo?", duracion_recomendada: "15-30 seg", fase_esfera: "solucion", uso_recomendado: "ambos" },
      ],
      seccion_8_brief_creador: {
        tono_de_voz: "Cercano, confiable, experto pero accesible",
        palabras_usar: ["Resultados", "Facil", "Rapido", "Comprobado", "Autentico"],
        palabras_evitar: ["Barato", "Gratis", "Garantizado", "Milagroso"],
        indicaciones_visuales: "Luz natural, fondo limpio, ropa casual-profesional, encuadre vertical 9:16",
        especificaciones_tecnicas: "Video vertical 9:16, minimo 1080p, audio claro sin eco",
        cta_recomendado: goals.includes("vender") ? "Link en bio para mas info" : "Guardalo y sigueme para mas",
        restricciones_del_cliente: extractedData.restricciones_creativas || "Ninguna especificada",
      },
    },
  };
}
```

**Step 2: Commit**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "feat(product-dna): actualizar generateEnrichedAnalysis para nuevo formato sin client_dna"
```

---

## Task 6: Actualizar el handler principal con nuevo flujo

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts:1331-1754`

**Step 1: Reemplazar el flujo principal en el handler**

Modificar el handler para usar el nuevo flujo. Buscar la seccion que empieza en "// ── 3. Build enhanced prompt" (linea ~1420) y reemplazar hasta el final del try-catch principal:

```typescript
    // ── 3. Extract data from audio ─────────────────────────────────────────
    console.log("[generate-product-dna] Step 1: Extracting data from audio...");
    const extractedData = await extractFromAudio(transcription, wizardResponses);
    console.log(`[generate-product-dna] Extracted data keys: ${Object.keys(extractedData).join(", ")}`);

    // ── 4. Research with Perplexity ────────────────────────────────────────
    let perplexityResearch = "";

    try {
      perplexityResearch = await callPerplexityResearch(extractedData, wizardResponses);
      console.log(`[generate-product-dna] Research completed: ${perplexityResearch.length} chars`);
    } catch (researchError) {
      console.error("[generate-product-dna] Perplexity research failed:", researchError);
      // Continue with fallback - will use extractedData + defaults
    }

    // ── 5. Generate 8 sections with Gemini ─────────────────────────────────
    let analysisResult: {
      market_research: Record<string, unknown>;
      competitor_analysis: Record<string, unknown>;
      strategy_recommendations: Record<string, unknown>;
      content_brief: Record<string, unknown>;
    };

    if (perplexityResearch.length > 100) {
      try {
        analysisResult = await generateAllSections(extractedData, perplexityResearch, wizardResponses);
        console.log("[generate-product-dna] All sections generated successfully");
      } catch (genError) {
        console.error("[generate-product-dna] Section generation failed:", genError);
        analysisResult = generateEnrichedAnalysis(wizardResponses, extractedData, perplexityResearch);
      }
    } else {
      console.log("[generate-product-dna] Using fallback analysis (no research)");
      analysisResult = generateEnrichedAnalysis(wizardResponses, extractedData, "");
    }

    // ── 6. Calculate confidence score ──────────────────────────────────────
    let confidenceScore = 85;
    if (!perplexityResearch || perplexityResearch.length < 500) confidenceScore -= 20;
    if (!transcription || transcription.length < 100) confidenceScore -= 15;
    if (!analysisResult.strategy_recommendations?.seccion_4_angulos?.length) confidenceScore -= 10;
    confidenceScore = Math.max(50, Math.min(100, confidenceScore));

    // ── 7. Update product_dna record ───────────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      market_research: analysisResult.market_research,
      competitor_analysis: analysisResult.competitor_analysis,
      strategy_recommendations: analysisResult.strategy_recommendations,
      content_brief: analysisResult.content_brief,
      ai_confidence_score: confidenceScore,
      estimated_complexity: "moderate",
      status: "ready",
    };

    // Save transcription if we generated it
    if (transcription && !record.transcription) {
      updatePayload.transcription = transcription;
    }

    console.log("[generate-product-dna] Updating record with analysis...");

    const { error: updateError } = await supabase
      .from("product_dna")
      .update(updatePayload)
      .eq("id", productDnaId);

    if (updateError) {
      throw new Error(`Error updating product DNA: ${updateError.message}`);
    }

    // ── 8. Consume tokens ──────────────────────────────────────────────────
    try {
      await supabase.rpc("consume_ai_tokens", {
        p_user_id: null,
        p_organization_id: null,
        p_tokens: 600,
        p_feature: "product_dna",
        p_model: "gemini-2.5-flash",
      });
    } catch (tokenErr) {
      console.warn("[generate-product-dna] Token consumption failed:", tokenErr);
    }

    console.log(`[generate-product-dna] Completed successfully for ${productDnaId}`);

    return new Response(
      JSON.stringify({ success: true, confidence_score: confidenceScore }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
```

**Step 2: Eliminar codigo muerto**

Eliminar las siguientes funciones y constantes que ya no se usan:
- `buildWizardContext` (lineas ~919-1056)
- `formatEmotionalContext` (lineas ~1059-1071)
- `JSON_STRUCTURE_TEMPLATE` (lineas ~1074-1116)
- `DEFAULT_RESEARCH_PROMPT` (lineas ~1119-1165)
- `DEFAULT_STRUCTURE_PROMPT` (lineas ~1167-...)
- `callGeminiStructure` (la version vieja)
- `retryWithSimplePrompt`
- `callGeminiSection` (la version vieja)
- `callGeminiFallback`

**Step 3: Commit**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "feat(product-dna): actualizar handler principal con nuevo flujo de 4 pasos"
```

---

## Task 7: Limpiar imports y codigo no usado

**Files:**
- Modify: `supabase/functions/generate-product-dna/index.ts`

**Step 1: Revisar imports**

Verificar que solo se importa lo necesario:

```typescript
import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";
```

El import de `getPrompt` ya no es necesario si no usamos prompts de DB.

**Step 2: Commit final**

```bash
git add supabase/functions/generate-product-dna/index.ts
git commit -m "refactor(product-dna): limpiar imports y codigo no utilizado"
```

---

## Task 8: Probar con caso de prueba

**Test Case:**

```json
{
  "wizard_responses": {
    "service_types": ["video_ugc", "reels"],
    "goals": ["vender"],
    "platforms": ["tiktok", "meta_ads"],
    "audiences": ["25_34"],
    "transcription": "Tenemos unas capsulas de Sacha Inchi, un omega natural para mejorar piel y cabello. La gente siempre duda del precio porque no conoce el ingrediente. Queremos algo autentico, nada de produccion medica o farmaceutica. Que se vea natural y cercano."
  }
}
```

**Verificaciones:**
1. seccion_2_mercado.competidores debe tener competidores de suplementos naturales (NO abarrotes)
2. seccion_3_avatares debe tener mujeres 25-34 interesadas en bienestar natural
3. seccion_7_ads debe tener estructura para TikTok y Meta
4. NO debe haber ninguna referencia a client_dna ni datos de marca externa

---

## Resumen de Archivos Modificados

| Archivo | Accion |
|---------|--------|
| `supabase/functions/generate-product-dna/index.ts` | Refactorizar completo |

## Orden de Ejecucion

1. Task 1: extractFromAudio
2. Task 2: callPerplexityResearch
3. Task 3: 4 prompt builders
4. Task 4: generateAllSections
5. Task 5: generateEnrichedAnalysis
6. Task 6: Handler principal
7. Task 7: Limpieza
8. Task 8: Testing
