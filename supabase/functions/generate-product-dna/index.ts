import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";
// Nuevo: Prompts desde DB con cache y fallback
import { getPrompt } from "../_shared/prompts/db-prompts.ts";

// ── JSON extraction and repair ─────────────────────────────────────────────
function extractJsonFromText(text: string): string | null {
  // Remove common prefixes that Perplexity might add
  let s = text
    .replace(/^[\s\S]*?(?=\{)/m, "") // Remove everything before first {
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .replace(/^Here is the .*?:\s*/i, "")
    .replace(/^Here's the .*?:\s*/i, "")
    .replace(/^Aqui esta el .*?:\s*/i, "")
    .replace(/^El JSON .*?:\s*/i, "")
    .trim();

  // Try to find JSON object in the text
  const jsonStart = s.indexOf("{");
  const jsonEnd = s.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  return s.substring(jsonStart, jsonEnd + 1);
}

function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();

  // Remove markdown code blocks
  s = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
  s = s.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // Extract JSON if embedded in text
  const extracted = extractJsonFromText(s);
  if (extracted) {
    s = extracted;
  }

  try { JSON.parse(s); return s; } catch {
    // Fix unclosed strings
    let inString = false, escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') inString = !inString;
    }
    if (inString) { while (s.endsWith("\\")) s = s.slice(0, -1); s += '"'; }

    // Remove trailing incomplete properties
    s = s.replace(/,\s*"[^"]*"\s*$/, "").replace(/,\s*"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");

    // Balance brackets
    let open = 0, bracket = 0;
    inString = false; escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (s[i] === "{") open++; else if (s[i] === "}") open--;
      else if (s[i] === "[") bracket++; else if (s[i] === "]") bracket--;
    }
    while (bracket > 0) { s += "]"; bracket--; }
    while (open > 0) { s += "}"; open--; }
    return s;
  }
}

// ── Whisper transcription ───────────────────────────────────────────────
async function transcribeWithWhisper(audioBlob: Blob): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured for transcription");

  console.log("[generate-product-dna] Transcribing audio with Whisper...");
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "es");
  formData.append("response_format", "text");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Whisper error:", errText);
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const transcription = await response.text();
  console.log(`[generate-product-dna] Transcription: ${transcription.length} chars`);
  return transcription.trim();
}

// ── Emotional analysis with Gemini ──────────────────────────────────────
async function analyzeEmotions(transcription: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.warn("[generate-product-dna] No Gemini key for emotional analysis, skipping");
    return {};
  }

  console.log("[generate-product-dna] Analyzing emotions with Gemini...");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Analiza el siguiente texto transcrito de audio y genera un analisis emocional en JSON con esta estructura:
{
  "overall_mood": "estado emocional general",
  "confidence_level": 0-100,
  "passion_topics": ["temas donde muestra mas pasion"],
  "concern_areas": ["areas de preocupacion"],
  "communication_style": "estilo de comunicacion",
  "key_emotions": ["emocion1", "emocion2"]
}
Responde SOLO con el JSON.`,
          },
          { role: "user", content: transcription },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    console.warn("[generate-product-dna] Emotional analysis failed, skipping");
    return {};
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(repairJsonForParse(raw));
  } catch {
    return {};
  }
}

// ── Extract structured data from audio transcription ─────────────────────
async function extractFromAudio(
  transcription: string,
  wizardResponses: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || !transcription || transcription.length < 20) {
    console.warn("[generate-product-dna] No Gemini key or transcription too short, using defaults");
    return getDefaultExtraction(wizardResponses);
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

// ── Perplexity AI call (content-focused research) ────────────────────────
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

  console.log("[generate-product-dna] Step 2: Perplexity research (content-focused)...");

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

// ── Retry with simplified prompt ─────────────────────────────────────────
async function retryWithSimplePrompt(apiKey: string, research: string, section: string): Promise<Record<string, unknown>> {
  const simplePrompts: Record<string, string> = {
    competitor_analysis: `Basándote en esta investigación, extrae los competidores mencionados.

INVESTIGACIÓN:
${research.substring(0, 8000)}

Responde SOLO con este JSON:
{
  "competitor_analysis": {
    "direct_competitors": [{"name": "Competidor 1", "strengths": ["fuerza"], "weaknesses": ["debilidad"], "positioning": "posición", "price_range": "precio"}],
    "indirect_competitors": ["alternativa 1", "alternativa 2"],
    "competitive_advantage": "Ventaja basada en la investigación",
    "positioning_strategy": "Estrategia de posicionamiento",
    "differentiation_points": ["diferenciador 1", "diferenciador 2", "diferenciador 3"]
  }
}`,

    strategy_recommendations: `Basándote en esta investigación, genera recomendaciones de marketing.

INVESTIGACIÓN:
${research.substring(0, 8000)}

Responde SOLO con este JSON:
{
  "strategy_recommendations": {
    "value_proposition": "Propuesta de valor en 15 palabras",
    "brand_positioning": "Posicionamiento en 20 palabras",
    "pricing_strategy": "Estrategia de precios",
    "sales_angles": [
      {"angle_name": "Ángulo 1", "headline": "Titular", "hook": "Gancho", "target_emotion": "Emoción"},
      {"angle_name": "Ángulo 2", "headline": "Titular 2", "hook": "Gancho 2", "target_emotion": "Emoción 2"},
      {"angle_name": "Ángulo 3", "headline": "Titular 3", "hook": "Gancho 3", "target_emotion": "Emoción 3"}
    ],
    "funnel_strategy": {"awareness": "táctica", "consideration": "táctica", "conversion": "táctica", "retention": "táctica"},
    "content_pillars": ["pilar 1", "pilar 2", "pilar 3"],
    "platforms": [{"name": "Instagram", "strategy": "estrategia", "content_types": ["Reels"], "priority": "high"}],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "ads_targeting": {"interests": ["interés 1"], "behaviors": ["comportamiento"], "keywords": ["keyword"], "lookalike_sources": ["fuente"]}
  }
}`,

    content_brief: `Basándote en esta investigación, crea un brief creativo.

INVESTIGACIÓN:
${research.substring(0, 8000)}

Responde SOLO con este JSON:
{
  "content_brief": {
    "brand_voice": {"tone": ["tono 1", "tono 2"], "personality": "personalidad", "do_say": ["frase 1"], "dont_say": ["evitar 1"]},
    "key_messages": ["mensaje 1", "mensaje 2", "mensaje 3"],
    "tagline_suggestions": ["tagline 1", "tagline 2", "tagline 3"],
    "content_ideas": [{"title": "Idea 1", "format": "reel", "objective": "awareness", "brief_description": "descripción"}],
    "visual_direction": {"color_palette": ["#6366f1", "#8b5cf6"], "style": "estilo", "mood": "mood"}
  }
}`,

    market_research: `Extrae datos de mercado de esta investigación.

INVESTIGACIÓN:
${research.substring(0, 8000)}

Responde SOLO con JSON válido.`
  };

  const prompt = simplePrompts[section] || simplePrompts.market_research;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
        }),
      }
    );

    if (!response.ok) {
      console.error(`[generate-product-dna] ${section} retry failed: ${response.status}`);
      return {};
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`[generate-product-dna] ${section} retry response: ${content.length} chars`);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const repaired = repairJsonForParse(jsonMatch[0]);
      const parsed = JSON.parse(repaired);
      console.log(`[generate-product-dna] ${section} retry SUCCESS`);
      return parsed;
    }
  } catch (err) {
    console.error(`[generate-product-dna] ${section} retry exception:`, err);
  }

  return {};
}

// ── Gemini call for single section ──────────────────────────────────────
async function callGeminiSection(apiKey: string, research: string, section: string, sectionPrompt: string): Promise<Record<string, unknown>> {
  console.log(`[generate-product-dna] Calling Gemini for section: ${section}`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${sectionPrompt}

---

INVESTIGACIÓN DE MERCADO COMPLETA:
${research.substring(0, 12000)}

---

INSTRUCCIONES FINALES:
1. Lee TODA la investigación cuidadosamente
2. Extrae datos específicos, números, porcentajes y nombres mencionados
3. NO uses placeholders genéricos como "Por definir" o "Por determinar"
4. Responde ÚNICAMENTE con un objeto JSON válido
5. El primer carácter debe ser { y el último }` }]
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 6000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-product-dna] Gemini ${section} error:`, errText.substring(0, 200));
      throw new Error(`Gemini ${section} error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    console.log(`[generate-product-dna] ${section} response: ${content.length} chars, starts: ${content.substring(0, 100)}`);

    // Extract and repair JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const repaired = repairJsonForParse(jsonMatch[0]);
        const parsed = JSON.parse(repaired);
        console.log(`[generate-product-dna] ${section} parsed keys:`, Object.keys(parsed).join(", "));
        // Verify the section has actual data
        const sectionData = parsed[section] || parsed;
        if (Object.keys(sectionData).length > 0) {
          return parsed;
        }
        console.warn(`[generate-product-dna] ${section} parsed but empty`);
      } catch (parseErr) {
        console.error(`[generate-product-dna] ${section} JSON repair failed:`, parseErr);
      }
    }

    // Retry with simplified prompt
    console.log(`[generate-product-dna] ${section} retrying with simplified prompt...`);
    return await retryWithSimplePrompt(apiKey, research, section);
  } catch (err) {
    console.error(`[generate-product-dna] ${section} exception:`, err);
    // Don't throw, return empty to be filled by enriched defaults
    return {};
  }
}

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

// ── DEPRECATED: Legacy function - se elimina en Task 7 ───────────────────
async function callGeminiStructure(_research: string, _jsonStructure: string, _structurePrompt: string): Promise<string> {
  console.warn("[generate-product-dna] callGeminiStructure is deprecated - use generateAllSections instead");
  return JSON.stringify({});
}

// ── Gemini fallback ─────────────────────────────────────────────────────
async function callGeminiFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  console.log("[generate-product-dna] Falling back to Gemini 2.0 Flash...");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",  // Use stable model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8000,
        temperature: 0.2,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Gemini error:", errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  console.log(`[generate-product-dna] Gemini response: ${content.length} chars, starts with: ${content.substring(0, 100)}`);
  return content;
}

// ── Extract data from Perplexity research text ──────────────────────────
function extractFromResearch(research: string): Record<string, unknown> {
  // Extract competitors mentioned in text
  const competitorPatterns = [
    /(?:competidores?|competitors?|empresas? como|herramientas? como|apps? como|plataformas? como)[:\s]+([^.]+)/gi,
    /(?:CapCut|Canva|Freepeek|Adobe|Figma|ChatGPT|Midjourney|DALL-E|Runway|Picsart|InShot|VN Editor|Premiere|Final Cut|DaVinci)/gi,
  ];

  const competitors: string[] = [];
  for (const pattern of competitorPatterns) {
    const matches = research.match(pattern);
    if (matches) {
      competitors.push(...matches.map(m => m.trim()));
    }
  }

  // Extract hashtags mentioned
  const hashtagMatch = research.match(/#\w+/g) || [];
  const hashtags = [...new Set(hashtagMatch)].slice(0, 15);

  // Extract percentages and stats for market data
  const statsMatch = research.match(/\d+(?:\.\d+)?%/g) || [];
  const moneyMatch = research.match(/USD?\s*[\d,.]+\s*(?:mil(?:lones)?|billones?|MM|M|K)?/gi) || [];

  // Extract pain points (phrases after "dolor", "problema", "dificultad")
  const painPatterns = research.match(/(?:dolor|problema|dificultad|frustración|reto)[:\s]+([^.]+)/gi) || [];
  const painPoints = painPatterns.map(p => p.replace(/^[^:]+:\s*/, '').trim()).slice(0, 5);

  // Extract opportunities
  const oppPatterns = research.match(/(?:oportunidad|potencial|crecimiento)[:\s]+([^.]+)/gi) || [];
  const opportunities = oppPatterns.map(p => p.replace(/^[^:]+:\s*/, '').trim()).slice(0, 5);

  // Extract market size
  const marketSizeMatch = research.match(/(?:mercado|market).*?(USD?\s*[\d,.]+\s*(?:mil(?:lones)?|billones?|MM|M|K)?)/i);
  const marketSize = marketSizeMatch ? marketSizeMatch[1] : (moneyMatch[0] || "Por determinar");

  // Extract growth rate
  const growthMatch = research.match(/(?:crecimiento|CAGR|growth).*?(\d+(?:\.\d+)?%)/i);
  const growthRate = growthMatch ? growthMatch[1] : (statsMatch[0] || "25%");

  // Extract audience demographics
  const ageMatch = research.match(/(\d{2})\s*[-–]\s*(\d{2})\s*años/);
  const demographics = ageMatch ? `${ageMatch[1]}-${ageMatch[2]} años` : "18-34 años";

  // Build extracted data
  return {
    competitors: [...new Set(competitors)].slice(0, 8),
    hashtags: hashtags.length > 0 ? hashtags : ["#ugc", "#contenido", "#marketing", "#creadores", "#redes"],
    marketSize,
    growthRate,
    demographics,
    painPoints: painPoints.length > 0 ? painPoints : ["Falta de tiempo", "Alto costo de producción", "Baja visibilidad"],
    opportunities: opportunities.length > 0 ? opportunities : ["Crecimiento digital", "Demanda de autenticidad"],
    stats: [...new Set([...statsMatch, ...moneyMatch])].slice(0, 10),
  };
}

// ── Generate enriched fallback analysis using research ──────────────────
function generateEnrichedAnalysis(
  wizardResponses: Record<string, unknown>,
  serviceGroup: string,
  serviceTypes: string[],
  research: string
): Record<string, unknown> {
  const extracted = extractFromResearch(research);
  const goals = (wizardResponses.goals as string[]) || ["sales"];
  const platforms = (wizardResponses.platforms as string[]) || ["instagram"];
  const audiences = (wizardResponses.audiences as string[]) || [];

  // Build competitor objects
  const directCompetitors = extracted.competitors.slice(0, 5).map((name, i) => ({
    name: name.replace(/[,;]/g, '').trim(),
    strengths: ["Reconocimiento de marca", "Base de usuarios establecida"],
    weaknesses: ["Precio alto", "Menos personalización"],
    positioning: i === 0 ? "Líder de mercado" : "Competidor establecido",
    price_range: "$50-500/mes"
  }));

  // Build sales angles based on goals and research
  const angleTemplates = [
    { name: "Ahorro de Tiempo", emotion: "Alivio", hook: "Deja de perder horas en producción" },
    { name: "Resultados Profesionales", emotion: "Orgullo", hook: "Contenido de estudio sin el costo" },
    { name: "Diferenciación", emotion: "Confianza", hook: "Destaca de tu competencia" },
    { name: "ROI Comprobado", emotion: "Seguridad", hook: "Cada peso invertido se multiplica" },
    { name: "Facilidad de Uso", emotion: "Tranquilidad", hook: "Sin curva de aprendizaje" },
  ];

  const salesAngles = angleTemplates.map((t, i) => ({
    angle_name: t.name,
    headline: `${t.hook} con ${serviceTypes[0] || "contenido UGC"}`,
    hook: t.hook,
    target_emotion: t.emotion
  }));

  // Build hashtags from research + defaults
  const allHashtags = [
    ...extracted.hashtags,
    "#ugc", "#contenido", "#creadores", "#marketing", "#viral",
    "#emprendimiento", "#ventas", "#redes", "#instagram", "#tiktok"
  ];
  const uniqueHashtags = [...new Set(allHashtags)].slice(0, 15);

  return {
    market_research: {
      market_overview: `El mercado de ${serviceGroup} en LATAM muestra crecimiento sostenido del ${extracted.growthRate} anual, impulsado por la demanda de contenido auténtico y el auge del e-commerce.`,
      market_size: extracted.marketSize,
      growth_trends: [
        `Crecimiento anual de ${extracted.growthRate} en contenido UGC`,
        "Videos cortos verticales dominan con 92% de engagement",
        "Integración de IA reduce costos de producción en 70%",
        "Micro-influencers generan ROI 5x superior",
        "E-commerce impulsa demanda de contenido auténtico"
      ],
      opportunities: extracted.opportunities.length > 0 ? extracted.opportunities : [
        "Expansión en e-commerce latinoamericano",
        "Alta demanda de contenido auténtico vs producido",
        "Bajo costo de entrada con herramientas de IA"
      ],
      threats: [
        "Saturación de contenido genérico",
        "Cambios constantes en algoritmos de redes",
        "Competencia de herramientas gratuitas de IA"
      ],
      target_segments: [
        {
          name: "María - Emprendedora E-commerce",
          description: "Mujer 28-35 años, dueña de tienda online de moda/belleza. Maneja todo sola, necesita contenido rápido y económico para Instagram. Factura $2,000-10,000 USD/mes.",
          size_estimate: "45% del mercado",
          priority: "high"
        },
        {
          name: "Carlos - Dueño de PYME",
          description: "Hombre 35-45 años, negocio establecido (restaurante, clínica, servicios). Quiere modernizar su presencia digital pero no entiende de redes. Presupuesto $500-2,000/mes para marketing.",
          size_estimate: "35% del mercado",
          priority: "high"
        }
      ],
      ideal_customer_profile: {
        demographics: extracted.demographics,
        psychographics: "Busca eficiencia, valora resultados sobre proceso, activo en redes sociales",
        pain_points: extracted.painPoints,
        desires: ["Contenido profesional rápido", "Aumentar ventas", "Diferenciarse de competencia"],
        objections: ["Presupuesto limitado", "Dudas sobre calidad", "Falta de tiempo"],
        buying_triggers: ["Lanzamiento de producto", "Campaña publicitaria", "Competencia avanzando"]
      }
    },
    competitor_analysis: {
      direct_competitors: directCompetitors.length > 0 ? directCompetitors : [
        { name: "CapCut", strengths: ["Gratis", "Fácil de usar"], weaknesses: ["Marca de agua", "Limitado"], positioning: "Editor gratuito", price_range: "Gratis-$10/mes" },
        { name: "Canva", strengths: ["Templates", "Colaboración"], weaknesses: ["Menos video", "Genérico"], positioning: "Diseño fácil", price_range: "$0-15/mes" },
        { name: "Adobe Express", strengths: ["Calidad pro", "Integración"], weaknesses: ["Curva de aprendizaje", "Precio"], positioning: "Suite profesional", price_range: "$10-55/mes" }
      ],
      indirect_competitors: ["Agencias de publicidad tradicionales", "Fotógrafos freelance", "Herramientas de IA gratuitas"],
      competitive_advantage: `Combinación única de ${serviceTypes.join(" + ")} con enfoque estratégico para resultados medibles, no solo producción.`,
      positioning_strategy: "Posicionamiento como solución completa que entiende el negocio, no solo crea contenido genérico.",
      differentiation_points: [
        "Estrategia de contenido personalizada",
        "Entendimiento del mercado LATAM",
        "Resultados medibles en ventas",
        "Comunicación en español nativo",
        "Precio competitivo vs agencias"
      ]
    },
    strategy_recommendations: {
      value_proposition: `${serviceTypes[0] || "Contenido UGC"} que vende: resultados profesionales sin el costo de producción tradicional`,
      brand_positioning: "Experto en contenido estratégico para marcas que quieren vender más, no solo verse bonitas",
      pricing_strategy: "Paquetes escalonados desde básico hasta premium, con enfoque en ROI demostrable",
      sales_angles: salesAngles,
      funnel_strategy: {
        awareness: "Reels educativos mostrando before/after y hacks de producción",
        consideration: "Casos de éxito con métricas reales de clientes",
        conversion: "Oferta de prueba o descuento primer proyecto",
        retention: "Paquetes mensuales con descuento y contenido exclusivo"
      },
      content_pillars: [
        "Educativo: Hacks y tutoriales de producción",
        "Inspiracional: Before/after y transformaciones",
        "Prueba social: Testimonios y casos de éxito",
        "Entretenimiento: Trends y contenido viral adaptado"
      ],
      platforms: platforms.map(p => ({
        name: p,
        strategy: `Contenido optimizado para ${p} con formatos nativos`,
        content_types: p === "instagram" ? ["Reels", "Stories", "Carruseles"] : p === "tiktok" ? ["Videos cortos", "Trends", "Duets"] : ["Videos", "Shorts"],
        priority: "high"
      })),
      hashtags: uniqueHashtags,
      ads_targeting: {
        interests: ["Marketing digital", "E-commerce", "Emprendimiento", "Fotografía", "Redes sociales"],
        behaviors: ["Compradores online", "Dueños de negocios", "Usuarios de apps de edición"],
        keywords: serviceTypes.concat(["ugc", "contenido", "creador", "marketing"]),
        lookalike_sources: ["Clientes actuales", "Seguidores enganchados", "Visitantes web"]
      }
    },
    content_brief: {
      brand_voice: {
        tone: ["Profesional pero cercano", "Directo", "Inspirador"],
        personality: "Experto accesible que simplifica lo complejo y entrega resultados",
        do_say: ["Resultados", "Estrategia", "Auténtico", "Profesional", "ROI"],
        dont_say: ["Barato", "Fácil", "Viral garantizado", "Rápido"]
      },
      key_messages: [
        "Contenido que vende, no solo se ve bonito",
        `${serviceTypes[0] || "UGC"} profesional sin el costo de estudio`,
        "Estrategia + ejecución = resultados medibles",
        "Tu marca merece contenido que convierta",
        "De idea a publicación en tiempo récord"
      ],
      tagline_suggestions: [
        "Contenido que convierte",
        "De scroll a venta",
        "Tu marca, amplificada",
        "Producción pro, precio real",
        "Contenido con propósito"
      ],
      content_ideas: [
        { title: "Before/After de producto con IA", format: "reel", objective: "awareness", brief_description: "Mostrar transformación de foto amateur a profesional usando herramientas de IA" },
        { title: "3 errores que matan tus ventas", format: "carrusel", objective: "engagement", brief_description: "Contenido educativo sobre errores comunes en contenido de producto" },
        { title: "Caso de éxito: X% más ventas", format: "reel", objective: "conversion", brief_description: "Testimonial con métricas reales de un cliente" },
        { title: "Tutorial: Hook perfecto en 3 pasos", format: "reel", objective: "awareness", brief_description: "Contenido educativo que posiciona como experto" },
        { title: "Un día creando contenido para...", format: "story", objective: "engagement", brief_description: "Behind the scenes que humaniza la marca" }
      ],
      visual_direction: {
        color_palette: ["#6366f1", "#8b5cf6", "#ec4899", "#10b981"],
        style: "Moderno, limpio, con contraste alto para destacar en feed",
        mood: "Profesional pero accesible, inspirador sin ser inalcanzable"
      }
    }
  };
}

// ── Generate basic fallback analysis (legacy, without research) ─────────
function generateBasicAnalysis(wizardResponses: Record<string, unknown>, serviceGroup: string, serviceTypes: string[]): Record<string, unknown> {
  const goals = (wizardResponses.goals as string[]) || [];
  const platforms = (wizardResponses.platforms as string[]) || [];
  const audiences = (wizardResponses.audiences as string[]) || [];

  return {
    market_research: {
      market_overview: "Análisis de mercado pendiente - se requiere más información para un análisis completo.",
      market_size: "Por determinar",
      growth_trends: ["Crecimiento digital", "Contenido en video", "Redes sociales"],
      opportunities: ["Diferenciación de marca", "Contenido auténtico", "Engagement con audiencia"],
      threats: ["Competencia alta", "Cambios en algoritmos"],
      target_segments: [{
        name: "Segmento principal",
        description: `Audiencia de ${audiences.join(", ") || "edad variada"}`,
        size_estimate: "Por determinar",
        priority: "high"
      }],
      ideal_customer_profile: {
        demographics: audiences.length ? `Edades: ${audiences.join(", ")}` : "Por definir",
        psychographics: "Usuario activo en redes sociales",
        pain_points: ["Falta de contenido de calidad", "Necesidad de diferenciación"],
        desires: ["Contenido que conecte", "Resultados medibles"],
        objections: ["Presupuesto", "Tiempo de producción"],
        buying_triggers: ["Urgencia de campaña", "Lanzamiento de producto"]
      }
    },
    competitor_analysis: {
      direct_competitors: [],
      indirect_competitors: [],
      competitive_advantage: "Por definir con análisis más profundo",
      positioning_strategy: "Diferenciación por calidad y autenticidad",
      differentiation_points: ["Contenido personalizado", "Enfoque estratégico"]
    },
    strategy_recommendations: {
      value_proposition: "Contenido de calidad que conecta con tu audiencia",
      brand_positioning: "Marca auténtica y cercana",
      pricing_strategy: "Competitivo con valor agregado",
      sales_angles: goals.map(g => ({
        angle_name: g,
        headline: `Logra ${g} con contenido estratégico`,
        hook: "Conecta con tu audiencia de forma auténtica",
        target_emotion: "Confianza"
      })),
      funnel_strategy: {
        awareness: "Contenido orgánico en redes",
        consideration: "Casos de éxito y testimonios",
        conversion: "Llamadas a la acción claras",
        retention: "Contenido de valor continuo"
      },
      content_pillars: ["Educativo", "Entretenimiento", "Inspiracional", "Promocional"],
      platforms: platforms.map(p => ({
        name: p,
        strategy: `Contenido optimizado para ${p}`,
        content_types: ["Video", "Imagen", "Stories"],
        priority: "high"
      })),
      hashtags: ["#contenido", "#marca", "#marketing", "#estrategia", "#redes"],
      ads_targeting: {
        interests: ["Marketing digital", "Emprendimiento", "Negocios"],
        behaviors: ["Compradores online", "Usuarios activos"],
        keywords: serviceTypes,
        lookalike_sources: ["Clientes actuales", "Seguidores"]
      }
    },
    content_brief: {
      brand_voice: {
        tone: ["Profesional", "Cercano", "Auténtico"],
        personality: "Marca confiable y experta en su campo",
        do_say: ["Conecta", "Transforma", "Logra"],
        dont_say: ["Barato", "Fácil", "Garantizado"]
      },
      key_messages: [
        "Contenido que conecta",
        "Resultados medibles",
        "Estrategia personalizada"
      ],
      tagline_suggestions: [
        "Conectando marcas con personas",
        "Contenido que transforma",
        "Tu historia, nuestra pasión"
      ],
      content_ideas: serviceTypes.slice(0, 3).map(s => ({
        title: `Contenido tipo ${s}`,
        format: "video",
        objective: goals[0] || "engagement",
        brief_description: `Crear contenido ${s} alineado con los objetivos de marca`
      })),
      visual_direction: {
        color_palette: ["#6366f1", "#8b5cf6", "#ec4899"],
        style: "Moderno y profesional",
        mood: "Inspirador y confiable"
      }
    }
  };
}

// ── Build context from wizard responses ─────────────────────────────────
function buildWizardContext(responses: Record<string, unknown>): string {
  const parts: string[] = [];

  // Goal labels for both old and new format
  const goalLabels: Record<string, string> = {
    brand_awareness: "Reconocimiento de Marca",
    awareness: "Reconocimiento de Marca",
    lead_generation: "Generación de Leads",
    leads: "Generación de Leads",
    sales: "Ventas Directas",
    engagement: "Engagement y Comunidad",
    education: "Educación y Capacitación",
    other: "Otro objetivo",
  };

  // NEW simplified wizard format: goals (array)
  if (Array.isArray(responses.goals) && responses.goals.length > 0) {
    const goalNames = (responses.goals as string[]).map(g => goalLabels[g] || g);
    parts.push(`OBJETIVOS: ${goalNames.join(", ")}`);
  }
  // OLD format: primary_goal (string)
  else if (responses.primary_goal) {
    parts.push(`OBJETIVO PRINCIPAL: ${goalLabels[responses.primary_goal as string] || responses.primary_goal}`);
  }

  // NEW simplified wizard format: platforms (array)
  if (Array.isArray(responses.platforms) && responses.platforms.length > 0) {
    parts.push(`PLATAFORMAS: ${(responses.platforms as string[]).join(", ")}`);
  }

  // NEW simplified wizard format: audiences (array of age ranges)
  if (Array.isArray(responses.audiences) && responses.audiences.length > 0) {
    const audienceLabels: Record<string, string> = {
      "18_24": "18-24 años",
      "25_34": "25-34 años",
      "35_44": "35-44 años",
      "45_plus": "45+ años",
    };
    const audienceNames = (responses.audiences as string[]).map(a => audienceLabels[a] || a);
    parts.push(`AUDIENCIA: ${audienceNames.join(", ")}`);
  }

  // NEW simplified wizard format: service_types (array)
  if (Array.isArray(responses.service_types) && responses.service_types.length > 0) {
    const serviceLabels: Record<string, string> = {
      video_ugc: "Video UGC",
      photo_ugc: "Foto UGC",
      carousel: "Carrusel",
      reels: "Reels/TikToks",
      photography: "Fotografía",
      video_editing: "Edición de Video",
      graphic_design: "Diseño Gráfico",
      strategy: "Estrategia",
    };
    const serviceNames = (responses.service_types as string[]).map(s => serviceLabels[s] || s);
    parts.push(`SERVICIOS REQUERIDOS: ${serviceNames.join(", ")}`);
  }

  // Transcription from simplified wizard (already included in wizard_responses)
  if (responses.transcription && typeof responses.transcription === "string") {
    // Don't add here - it's added separately in the main flow
  }

  // OLD format fields (for backward compatibility)
  if (responses.goal_description) {
    parts.push(`Descripción del objetivo: ${responses.goal_description}`);
  }

  // Goal-specific responses (old wizard format)
  const goalFields: Record<string, string> = {
    brand_tone: "Tono de marca",
    brand_values: "Valores de marca",
    brand_differentiator: "Diferenciador",
    target_perception: "Percepción deseada",
    brand_story: "Historia de marca",
    current_presence: "Presencia actual",
    lead_magnet_type: "Tipo de lead magnet",
    conversion_goal: "Meta de conversión",
    lead_volume: "Volumen de leads esperado",
    nurture_strategy: "Estrategia de nurturing",
    current_leads: "Leads actuales",
    lead_qualification: "Criterios de calificación",
    crm_tool: "Herramienta CRM",
    product_price: "Precio del producto",
    sales_channel: "Canal de ventas",
    payment_methods: "Métodos de pago",
    sales_objections: "Objeciones comunes",
    upsell_strategy: "Estrategia de upsell",
    current_sales: "Ventas actuales",
    sales_cycle: "Ciclo de venta",
    guarantee: "Garantía",
    community_platform: "Plataforma de comunidad",
    engagement_type: "Tipo de engagement",
    content_frequency: "Frecuencia de contenido",
    interaction_style: "Estilo de interacción",
    community_size: "Tamaño de comunidad",
    engagement_metrics: "Métricas de engagement",
    course_topic: "Tema del curso",
    education_format: "Formato educativo",
    skill_level: "Nivel de habilidad",
    certification: "Certificación",
    education_platform: "Plataforma educativa",
    student_outcome: "Resultado esperado del alumno",
    free_description: "Descripción libre",
    custom_kpis: "KPIs personalizados",
    success_definition: "Definición de éxito",
  };

  for (const [key, label] of Object.entries(goalFields)) {
    const val = responses[key];
    if (val && val !== "") {
      parts.push(`${label}: ${Array.isArray(val) ? val.join(", ") : val}`);
    }
  }

  // OLD format: Audience
  if (responses.target_age) {
    const ages = Array.isArray(responses.target_age)
      ? responses.target_age.join(", ")
      : responses.target_age;
    parts.push(`Edad objetivo: ${ages}`);
  }
  if (responses.target_gender) {
    const genderMap: Record<string, string> = { female: "Femenino", male: "Masculino", all: "Todos" };
    parts.push(`Género objetivo: ${genderMap[responses.target_gender as string] || responses.target_gender}`);
  }
  if (Array.isArray(responses.target_interests) && responses.target_interests.length > 0) {
    parts.push(`Intereses: ${responses.target_interests.join(", ")}`);
  }
  if (responses.target_locations) {
    const locs = Array.isArray(responses.target_locations)
      ? responses.target_locations.join(", ")
      : responses.target_locations;
    parts.push(`Ubicaciones: ${locs}`);
  }

  return parts.join("\n");
}

// ── Format emotional context ────────────────────────────────────────────
function formatEmotionalContext(ea: Record<string, unknown>): string {
  if (!ea || Object.keys(ea).length === 0) return "";
  const parts: string[] = [];
  if (ea.overall_mood) parts.push(`Estado emocional: ${ea.overall_mood}`);
  if (ea.confidence_level != null) parts.push(`Confianza: ${ea.confidence_level}%`);
  const passionTopics = ea.passion_topics as string[] | undefined;
  if (passionTopics?.length) parts.push(`Temas apasionantes: ${passionTopics.join(", ")}`);
  const concernAreas = ea.concern_areas as string[] | undefined;
  if (concernAreas?.length) parts.push(`Areas de preocupacion: ${concernAreas.join(", ")}`);
  return parts.length > 0
    ? `\n\n--- CONTEXTO EMOCIONAL ---\n${parts.join("\n")}\n--- FIN CONTEXTO EMOCIONAL ---`
    : "";
}

// ── Prompt Builders for 8 Sections ───────────────────────────────────────

// Call 1: Seccion 1 (Contexto) + Seccion 2 (Mercado)
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

// Call 2: Seccion 3 (3 Avatares)
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

// Call 3: Seccion 4 (10 Angulos) + Seccion 5 (10 Ideas)
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

// Call 4: Seccion 6 (Organico) + Seccion 7 (Ads) + Seccion 8 (Brief)
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

// ── DEPRECATED: Placeholder para compatibilidad temporal ────────────────
// Esta constante se elimina en Task 6 cuando se actualice el handler principal
const JSON_STRUCTURE_TEMPLATE = "{}"; // Placeholder - no se usa en nuevo flujo

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let productDnaId: string | null = null;

  try {
    const body = await req.json();
    // Soportar ambos formatos: productDnaId y product_dna_id
    productDnaId = body.productDnaId || body.product_dna_id;

    if (!productDnaId) {
      return new Response(
        JSON.stringify({ success: false, error: "productDnaId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-product-dna] Starting for record: ${productDnaId}`);

    // ── 1. Read the product_dna record ──────────────────────────────────
    const { data: record, error: fetchError } = await supabase
      .from("product_dna")
      .select("*")
      .eq("id", productDnaId)
      .single();

    if (fetchError || !record) {
      throw new Error(`Record not found: ${fetchError?.message || "unknown"}`);
    }

    console.log(`[generate-product-dna] Record loaded - client: ${record.client_id}, group: ${record.service_group}, services: ${record.service_types?.join(",")}`);
    console.log(`[generate-product-dna] wizard_responses keys: ${Object.keys(record.wizard_responses || {}).join(",")}`);
    console.log(`[generate-product-dna] wizard_responses raw: ${JSON.stringify(record.wizard_responses || {}).substring(0, 500)}`);

    // ── 2. Get transcription (check wizard_responses first, then record field) ───
    const wizardResponses = record.wizard_responses || {};
    let transcription = record.transcription || wizardResponses.transcription || "";
    let emotionalAnalysis: Record<string, unknown> = wizardResponses.emotional_analysis || {};

    console.log(`[generate-product-dna] Transcription source: ${
      record.transcription ? 'record.transcription' :
      wizardResponses.transcription ? 'wizard_responses.transcription' :
      'none'
    }, length: ${transcription.length}`);

    // Only transcribe if we don't have one already
    if (record.audio_url && !transcription) {
      try {
        console.log(`[generate-product-dna] Downloading audio from: ${record.audio_url}`);

        // Download audio from Supabase Storage
        let audioBlob: Blob;
        if (record.audio_url.includes("supabase.co/storage")) {
          // Direct URL - fetch it
          const audioResponse = await fetch(record.audio_url);
          if (!audioResponse.ok) throw new Error(`Failed to download audio: ${audioResponse.status}`);
          audioBlob = await audioResponse.blob();
        } else {
          // Storage path - use supabase storage
          const path = record.audio_url.replace(/^.*\/audio-recordings\//, "");
          const { data: audioData, error: audioError } = await supabase.storage
            .from("audio-recordings")
            .download(path);
          if (audioError || !audioData) throw new Error(`Storage download error: ${audioError?.message}`);
          audioBlob = audioData;
        }

        console.log(`[generate-product-dna] Audio downloaded: ${audioBlob.size} bytes`);

        // Transcribe with Whisper
        transcription = await transcribeWithWhisper(audioBlob);

        // Emotional analysis with Gemini
        if (transcription.length > 50) {
          emotionalAnalysis = await analyzeEmotions(transcription);
        }
      } catch (audioErr) {
        console.error("[generate-product-dna] Audio processing failed, continuing without:", audioErr);
        // Non-fatal: continue with wizard responses only
      }
    }

    // ── 3. Build enhanced prompt ────────────────────────────────────────
    const wizardContext = buildWizardContext(wizardResponses);
    const emotionalContext = formatEmotionalContext(emotionalAnalysis);

    // Get prompts from DB with fallbacks
    let researchPrompt = DEFAULT_RESEARCH_PROMPT;
    let structurePrompt = DEFAULT_STRUCTURE_PROMPT;

    try {
      const researchConfig = await getPrompt(supabase, "dna", "product_research");
      if (researchConfig.systemPrompt) researchPrompt = researchConfig.systemPrompt;
    } catch { /* use default */ }

    try {
      const structureConfig = await getPrompt(supabase, "dna", "product_structure");
      if (structureConfig.systemPrompt) structurePrompt = structureConfig.systemPrompt;
    } catch { /* use default */ }

    // Add emotional context to research prompt if available
    if (emotionalContext) {
      researchPrompt += emotionalContext;
    }

    let userPrompt = `Tipo de servicio: ${record.service_group}\nServicios especificos: ${(record.service_types || []).join(", ")}`;

    // Add wizard responses context
    if (wizardContext) {
      userPrompt += `\n\n--- RESPUESTAS DEL WIZARD ---\n${wizardContext}\n--- FIN RESPUESTAS ---`;
    }

    // Add transcription
    if (transcription) {
      userPrompt += `\n\n--- TRANSCRIPCION DE AUDIO ---\n${transcription}\n--- FIN TRANSCRIPCION ---`;
    }

    // Add links context
    const refLinks = (record.reference_links || []).map((l: { url: string }) => l.url).filter(Boolean);
    const compLinks = (record.competitor_links || []).map((l: { url: string }) => l.url).filter(Boolean);
    const inspLinks = (record.inspiration_links || []).map((l: { url: string }) => l.url).filter(Boolean);

    if (refLinks.length) userPrompt += `\n\nEnlaces de referencia del negocio: ${refLinks.join(", ")}`;
    if (compLinks.length) userPrompt += `\n\nEnlaces de competidores: ${compLinks.join(", ")}`;
    if (inspLinks.length) userPrompt += `\n\nEnlaces de inspiracion: ${inspLinks.join(", ")}`;

    console.log(`[generate-product-dna] Prompt built: ${userPrompt.length} chars (transcription: ${transcription.length}, wizard: ${wizardContext.length})`);

    // ── 4. Two-step generation: Perplexity research → Gemini structure ───────
    let aiResponse: string;
    let perplexityResearch = ""; // Store research for fallback enrichment

    try {
      // Step 1: Perplexity does deep research (no JSON constraint)
      perplexityResearch = await callPerplexityResearch(userPrompt, researchPrompt);
      console.log(`[generate-product-dna] Research completed: ${perplexityResearch.length} chars`);

      // Step 2: Gemini structures the research into JSON
      aiResponse = await callGeminiStructure(perplexityResearch, JSON_STRUCTURE_TEMPLATE, structurePrompt);
      console.log(`[generate-product-dna] Structuring completed: ${aiResponse.length} chars`);
    } catch (genError) {
      console.error("[generate-product-dna] Generation failed:", genError);

      // If we have Perplexity research, use it for enriched fallback
      if (perplexityResearch.length > 100) {
        console.log("[generate-product-dna] Using Perplexity research for enriched fallback");
        const enrichedData = generateEnrichedAnalysis(wizardResponses, record.service_group, record.service_types || [], perplexityResearch);

        // Build response and skip to update
        const updatePayload: Record<string, unknown> = {
          market_research: enrichedData.market_research,
          competitor_analysis: enrichedData.competitor_analysis,
          strategy_recommendations: enrichedData.strategy_recommendations,
          content_brief: enrichedData.content_brief,
          ai_confidence_score: 70, // Lower confidence for fallback
          estimated_complexity: "moderate",
          status: "ready",
        };

        if (transcription && !record.transcription) {
          updatePayload.transcription = transcription;
        }

        const { error: updateError } = await supabase
          .from("product_dna")
          .update(updatePayload)
          .eq("id", productDnaId);

        if (updateError) {
          throw new Error(`Error updating product DNA: ${updateError.message}`);
        }

        return new Response(JSON.stringify({ success: true, fallback: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw genError;
    }

    // ── 5. Parse AI response ────────────────────────────────────────────
    console.log(`[generate-product-dna] Parsing AI response: ${aiResponse.length} chars`);
    console.log(`[generate-product-dna] First 500 chars of response: ${aiResponse.substring(0, 500)}`);

    // Aggressive cleanup of the response
    let cleanedResponse = aiResponse
      .replace(/^[\s\S]*?(?=\{)/m, "") // Remove everything before first {
      .replace(/\}[\s\S]*$/m, "}") // Remove everything after last }
      .trim();

    // If cleanup stripped everything, try extraction
    if (!cleanedResponse.startsWith("{")) {
      const extracted = extractJsonFromText(aiResponse);
      if (extracted) {
        cleanedResponse = extracted;
      }
    }

    const repaired = repairJsonForParse(cleanedResponse);
    let analysisData: Record<string, unknown>;

    try {
      analysisData = JSON.parse(repaired);
      console.log("[generate-product-dna] Successfully parsed AI response");
    } catch (parseErr) {
      console.error("[generate-product-dna] JSON parse failed after cleanup");
      console.error("[generate-product-dna] Cleaned response (first 500 chars):", cleanedResponse.substring(0, 500));

      // Last resort: try regex extraction
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisData = JSON.parse(repairJsonForParse(jsonMatch[0]));
          console.log("[generate-product-dna] Recovered JSON via regex extraction");
        } catch (finalErr) {
          console.error("[generate-product-dna] Regex extraction also failed");
          console.error("[generate-product-dna] Last 500 chars of response:", aiResponse.substring(Math.max(0, aiResponse.length - 500)));
          const parseError = new Error(`Parse failed. Response starts: "${aiResponse.substring(0, 150)}..." ends: "...${aiResponse.substring(Math.max(0, aiResponse.length - 150))}"`);
          throw parseError;
        }
      } else {
        console.error("[generate-product-dna] No JSON structure found in response at all");
        const noJsonError = new Error(`No JSON found. Response (${aiResponse.length} chars): "${aiResponse.substring(0, 300)}..."`);
        throw noJsonError;
      }
    }

    console.log("[generate-product-dna] Analysis generated, sections:", Object.keys(analysisData).join(", "));

    // Check which sections exist and fill missing ones with defaults
    const requiredSections = ["market_research", "competitor_analysis", "strategy_recommendations", "content_brief"];
    const missingSections = requiredSections.filter(s => !analysisData[s] || Object.keys(analysisData[s] as object).length === 0);

    if (missingSections.length > 0) {
      console.warn("[generate-product-dna] Missing/empty sections:", missingSections.join(", "));
      console.log("[generate-product-dna] Got sections:", Object.keys(analysisData).join(", "));

      // Fill missing sections with enriched defaults (using Perplexity research if available)
      const defaults = perplexityResearch.length > 100
        ? generateEnrichedAnalysis(wizardResponses, record.service_group, record.service_types || [], perplexityResearch)
        : generateBasicAnalysis(wizardResponses, record.service_group, record.service_types || []);

      for (const section of missingSections) {
        analysisData[section] = defaults[section as keyof typeof defaults];
        console.log(`[generate-product-dna] Filled ${section} with ${perplexityResearch.length > 100 ? 'enriched' : 'basic'} defaults`);
      }
    }

    // ── 6. UPDATE the record ────────────────────────────────────────────
    const complexity = estimateComplexity(
      transcription + wizardContext,
      record.service_types || []
    );

    const updatePayload: Record<string, unknown> = {
      market_research: analysisData.market_research,
      competitor_analysis: analysisData.competitor_analysis,
      strategy_recommendations: analysisData.strategy_recommendations,
      content_brief: analysisData.content_brief,
      ai_confidence_score: 85,
      estimated_complexity: complexity,
      status: "ready",
    };

    // Only update transcription if we generated one
    if (transcription && !record.transcription) {
      updatePayload.transcription = transcription;
    }

    // Store emotional analysis in wizard_responses
    if (Object.keys(emotionalAnalysis).length > 0) {
      updatePayload.wizard_responses = {
        ...(record.wizard_responses || {}),
        emotional_analysis: emotionalAnalysis,
      };
    }

    const { error: updateError } = await supabase
      .from("product_dna")
      .update(updatePayload)
      .eq("id", productDnaId);

    if (updateError) {
      throw new Error(`Error updating product DNA: ${updateError.message}`);
    }

    console.log(`[generate-product-dna] Product DNA updated: ${productDnaId} → status=ready`);

    // ── 7. CREATE a products record so it shows in the Products tab ──────
    let productId: string | null = null;
    try {
      const sr = analysisData.strategy_recommendations || {};
      const mr = analysisData.market_research || {};
      const cb = analysisData.content_brief || {};
      const ca = analysisData.competitor_analysis || {};

      // Build a product name from the value proposition or service group
      const groupLabels: Record<string, string> = {
        content_creation: "Creación de Contenido",
        post_production: "Post Producción",
        strategy_marketing: "Estrategia de Marketing",
        technology: "Tecnología",
        education_training: "Educación",
        general_services: "Servicios Generales",
      };
      const groupName = groupLabels[record.service_group] || record.service_group;
      const productName = sr.value_proposition
        ? sr.value_proposition.split(".")[0].substring(0, 80)
        : `${groupName} - ${(record.service_types || []).join(", ")}`;

      // Extract sales angle names as text array
      const salesAngles = (sr.sales_angles || [])
        .map((a: { angle_name?: string }) => a.angle_name)
        .filter(Boolean);

      // Build ideal avatar summary
      const icp = mr.ideal_customer_profile || {};
      const idealAvatar = [
        icp.demographics,
        icp.psychographics,
        icp.pain_points?.length ? `Dolores: ${icp.pain_points.join(", ")}` : null,
        icp.desires?.length ? `Deseos: ${icp.desires.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          client_id: record.client_id,
          name: productName,
          description: sr.value_proposition || null,
          strategy: sr.brand_positioning || null,
          market_research: mr.market_overview || null,
          ideal_avatar: idealAvatar || null,
          sales_angles: salesAngles.length > 0 ? salesAngles : null,
          competitor_analysis: ca,
          sales_angles_data: sr.sales_angles || null,
          content_strategy: cb,
          brief_data: {
            product_dna_id: productDnaId,
            service_group: record.service_group,
            service_types: record.service_types,
            wizard_responses: record.wizard_responses,
            transcription: transcription || null,
          },
          brief_status: "completed",
          brief_completed_at: new Date().toISOString(),
          research_generated_at: new Date().toISOString(),
          business_type: "product_service",
        })
        .select("id")
        .single();

      if (productError) {
        console.error("[generate-product-dna] Error creating product:", productError.message);
      } else {
        productId = newProduct?.id || null;
        console.log(`[generate-product-dna] Product created: ${productId}`);
      }
    } catch (prodErr) {
      console.error("[generate-product-dna] Product creation failed (non-fatal):", prodErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        product_dna_id: productDnaId,
        product_id: productId,
        has_transcription: !!transcription,
        sections: Object.keys(analysisData),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando producto";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("[generate-product-dna] Error:", message);
    console.error("[generate-product-dna] Stack:", stack);

    // Reset status to draft on failure
    if (productDnaId) {
      try {
        await supabase
          .from("product_dna")
          .update({ status: "draft" })
          .eq("id", productDnaId);
        console.log(`[generate-product-dna] Reset status to draft for: ${productDnaId}`);
      } catch (resetErr) {
        console.error("[generate-product-dna] Failed to reset status:", resetErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        debug: {
          productDnaId,
          errorType: error instanceof Error ? error.name : typeof error,
          timestamp: new Date().toISOString()
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function estimateComplexity(content: string, serviceTypes: string[]): string {
  const length = content.length;
  const typeCount = serviceTypes.length;
  if (length > 3000 && typeCount >= 3) return "enterprise";
  if (length > 2000 || typeCount >= 2) return "complex";
  if (length > 1000) return "moderate";
  return "simple";
}
