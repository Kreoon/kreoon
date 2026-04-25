import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";

// ── JSON extraction and repair ─────────────────────────────────────────────
function extractJsonFromText(text: string): string | null {
  // Remove common prefixes that Perplexity might add
  const s = text
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

// ── Location mapping for market context ──────────────────────────────────
const LOCATION_NAMES: Record<string, string> = {
  // Regiones
  worldwide: "Todo el mundo",
  latam: "Latinoamérica",
  europe: "Europa",
  north_america: "Norteamérica",
  central_america: "Centroamérica",
  south_america: "Sudamérica",
  spanish_speaking: "Países hispanohablantes",
  // Países
  AR: "Argentina", BO: "Bolivia", BR: "Brasil", CL: "Chile", CO: "Colombia",
  CR: "Costa Rica", CU: "Cuba", DO: "República Dominicana", EC: "Ecuador",
  SV: "El Salvador", GT: "Guatemala", HN: "Honduras", MX: "México",
  NI: "Nicaragua", PA: "Panamá", PY: "Paraguay", PE: "Perú", PR: "Puerto Rico",
  UY: "Uruguay", VE: "Venezuela", ES: "España", PT: "Portugal", FR: "Francia",
  IT: "Italia", DE: "Alemania", GB: "Reino Unido", NL: "Países Bajos",
  US: "Estados Unidos", CA: "Canadá",
  // Ciudades
  "CO-BOG": "Bogotá, Colombia", "CO-MDE": "Medellín, Colombia", "CO-CLO": "Cali, Colombia",
  "CO-BAQ": "Barranquilla, Colombia", "CO-CTG": "Cartagena, Colombia",
  "MX-MEX": "Ciudad de México", "MX-GDL": "Guadalajara, México", "MX-MTY": "Monterrey, México",
  "MX-TIJ": "Tijuana, México", "MX-CUN": "Cancún, México",
  "AR-BUE": "Buenos Aires, Argentina", "AR-COR": "Córdoba, Argentina",
  "AR-ROS": "Rosario, Argentina", "AR-MZA": "Mendoza, Argentina",
  "CL-SCL": "Santiago, Chile", "CL-VAP": "Valparaíso, Chile", "CL-CCP": "Concepción, Chile",
  "PE-LIM": "Lima, Perú", "PE-AQP": "Arequipa, Perú", "PE-TRU": "Trujillo, Perú",
  "ES-MAD": "Madrid, España", "ES-BCN": "Barcelona, España",
  "ES-VLC": "Valencia, España", "ES-SEV": "Sevilla, España",
  "US-MIA": "Miami, USA", "US-LAX": "Los Ángeles, USA", "US-NYC": "Nueva York, USA",
  "US-HOU": "Houston, USA", "US-CHI": "Chicago, USA", "US-DFW": "Dallas, USA",
  "US-PHX": "Phoenix, USA", "US-SAN": "San Diego, USA",
  // Legacy single country IDs (backward compatibility)
  colombia: "Colombia", mexico: "México", argentina: "Argentina", chile: "Chile",
  peru: "Perú", ecuador: "Ecuador", spain: "España", usa: "Estados Unidos",
  usa_hispanic: "Estados Unidos (mercado hispano)",
};

function getMarketDescription(wizardResponses: Record<string, unknown>): string {
  // Support both new array format and legacy single string
  const locations = wizardResponses.target_locations as string[] | undefined;
  const legacyCountry = wizardResponses.target_country as string | undefined;

  if (locations && locations.length > 0) {
    const names = locations
      .map(id => LOCATION_NAMES[id] || id)
      .filter(Boolean);
    if (names.length === 1) return names[0];
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
  }

  if (legacyCountry) {
    return LOCATION_NAMES[legacyCountry] || legacyCountry;
  }

  return "Latinoamérica";
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
  const mercadoNombre = getMarketDescription(wizardResponses);

  const canalPrimario = extractedData.canal_primario || platforms[0] || "instagram";
  const servicioExacto = extractedData.servicio_exacto || "producto/servicio";

  const systemPrompt = `Eres un estratega digital especialista en contenido para ${canalPrimario}.
Tu investigacion debe ser ESPECIFICA para crear contenido de ${serviceTypes.join(" y ") || "video UGC"}
con el objetivo de ${goals.join(" y ") || "vender"}.
MERCADO OBJETIVO: ${mercadoNombre}. Enfoca toda tu investigacion en este mercado especifico.
Usa datos reales y actuales.`;

  const userPrompt = `Necesito una investigacion de mercado completa para crear contenido.

PRODUCTO/SERVICIO: ${servicioExacto}
CANAL PRINCIPAL: ${platforms.join(", ") || "Instagram, TikTok"}
AUDIENCIA: ${audiences.join(", ") || "25-34"} anos
OBJETIVO: ${goals.join(", ") || "vender"}
MERCADO: ${mercadoNombre}

Investiga y dame:

1. PANORAMA DEL MERCADO
   - Estado actual del mercado para este producto/servicio en ${mercadoNombre}
   - Tamano aproximado y tendencias actuales en ${mercadoNombre}
   - Que esta funcionando HOY en ${platforms.join("/") || "redes sociales"} para esta categoria en ${mercadoNombre}

2. ANALISIS DE COMPETENCIA (5 competidores reales y activos en ${mercadoNombre})
   Para cada uno: nombre, promesa principal, precio referencial si aplica,
   principal fortaleza en contenido, principal debilidad, que plataformas usa

3. GAP COMPETITIVO EN ${mercadoNombre}
   - Que NO estan haciendo bien los competidores en contenido
   - La oportunidad real de diferenciacion en este mercado

4. COMPORTAMIENTO DE LA AUDIENCIA EN ${platforms.join("/") || "REDES"} (${mercadoNombre})
   - Como consume contenido esta audiencia en ese canal en ${mercadoNombre}
   - Que formatos generan mas engagement
   - Que tipo de hooks detienen el scroll
   - Horarios y frecuencias de mayor actividad en ${mercadoNombre}

5. TENDENCIAS DE CONTENIDO ACTUALES EN ${mercadoNombre}
   - Formatos que estan funcionando ahora mismo en ${mercadoNombre}
   - Estilos de video que generan conversion en este nicho
   - Hashtags y terminos relevantes para ${mercadoNombre}

Responde con datos reales, especificos y actuales de ${mercadoNombre}. Evita generalidades.`;

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

  // Default values for call4 sections when Gemini fails
  const goals = (wizardResponses.goals as string[]) || [];
  const defaultOrganico = {
    objetivo_organico: "Construir autoridad y comunidad",
    distribucion_contenido: { viral: 25, valor: 40, venta: 25, personal: 10, justificacion: "Balance entre engagement y conversion" },
    frecuencia_publicacion: "5 veces por semana",
    tipo_contenido_organico: "Reels, carruseles educativos, stories interactivos",
    pilares_tematicos: ["Educacion", "Casos de exito", "Detras de camaras"],
    tono_organico: "Cercano y profesional",
    metricas_organico: { retencion_objetivo: "50-70%", interacciones_clave: "Guardados > Compartidos > Comentarios", frecuencia_revision: "Semanal" },
    errores_comunes_organico: ["Publicar sin estrategia", "Ignorar metricas", "No responder comentarios"],
  };
  const defaultAds = {
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
  };
  const defaultBrief = {
    tono_de_voz: "Cercano, confiable, experto pero accesible",
    palabras_usar: ["Resultados", "Facil", "Rapido", "Comprobado", "Autentico"],
    palabras_evitar: ["Barato", "Gratis", "Garantizado", "Milagroso"],
    indicaciones_visuales: "Luz natural, fondo limpio, ropa casual-profesional, encuadre vertical 9:16",
    especificaciones_tecnicas: "Video vertical 9:16, minimo 1080p, audio claro sin eco",
    cta_recomendado: goals.includes("sales") ? "Link en bio para mas info" : "Guardalo y sigueme para mas",
    restricciones_del_cliente: (extractedData.restricciones_creativas as string) || "Ninguna especificada",
  };

  // Check if call4Result has valid data
  const hasCall4Data = call4Result && Object.keys(call4Result).length > 0;
  const sec6 = hasCall4Data && call4Result?.seccion_6_estrategia_organica && Object.keys(call4Result.seccion_6_estrategia_organica as object).length > 0
    ? call4Result.seccion_6_estrategia_organica
    : defaultOrganico;
  const sec7 = hasCall4Data && call4Result?.seccion_7_estrategia_ads && Object.keys(call4Result.seccion_7_estrategia_ads as object).length > 0
    ? call4Result.seccion_7_estrategia_ads
    : defaultAds;
  const sec8 = hasCall4Data && call4Result?.seccion_8_brief_creador && Object.keys(call4Result.seccion_8_brief_creador as object).length > 0
    ? call4Result.seccion_8_brief_creador
    : defaultBrief;

  console.log(`[generate-product-dna] Call4 status: hasData=${hasCall4Data}, sec6=${Object.keys(sec6 as object).length}, sec7=${Object.keys(sec7 as object).length}, sec8=${Object.keys(sec8 as object).length}`);

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
      seccion_6_organico: sec6,
      seccion_7_ads: sec7,
    },
    content_brief: {
      seccion_5_ideas: call3Result?.seccion_5_ideas_contenido || [],
      seccion_8_brief_creador: sec8,
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
  const competidores = (extracted.competitors as string[]).slice(0, 5).map((name) => ({
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
        restricciones_del_cliente: (extractedData.restricciones_creativas as string) || "Ninguna especificada",
      },
    },
  };
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
  const mercado = getMarketDescription(wizardResponses);

  return `Eres un estratega de marketing digital y creativo de contenido experto en ${mercado}.

DATOS DEL ENCARGO:
${JSON.stringify(extractedData, null, 2)}

INVESTIGACION DE MERCADO:
${perplexityResearch.substring(0, 15000)}

WIZARD:
- Tipos de servicio: ${serviceTypes.join(", ")}
- Objetivos: ${goals.join(", ")}
- Plataformas: ${platforms.join(", ")}
- Audiencias: ${audiences.join(", ")} anos
- Mercado objetivo: ${mercado}

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
  const mercado = getMarketDescription(wizardResponses);

  return `Eres un estratega de marketing digital experto en psicologia del consumidor
y comportamiento de audiencias digitales en ${mercado}.

PRODUCTO/SERVICIO: ${extractedData.servicio_exacto || "No especificado"}
CANAL: ${platforms.join(", ")}
AUDIENCIA: ${audiences.join(", ")} anos
OBJETIVO: ${goals.join(", ")}
MERCADO: ${mercado}
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
  const mercado = getMarketDescription(wizardResponses);

  return `Eres un estratega creativo de contenido digital especialista en UGC,
copywriting de alto impacto y produccion de contenido para ${platforms.join("/")} en ${mercado}.

PRODUCTO/SERVICIO: ${extractedData.servicio_exacto || "No especificado"}
OBJETIVO: ${goals.join(", ")}
CANAL: ${platforms.join(", ")}
MERCADO: ${mercado}
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
  const mercado = getMarketDescription(wizardResponses);

  return `Eres un estratega digital senior especialista en growth de contenido organico
y performance de campanas pagas en ${platforms.join("/")} para el mercado de ${mercado}.

PRODUCTO/SERVICIO: ${extractedData.servicio_exacto || "No especificado"}
OBJETIVO: ${goals.join(", ")}
CANAL: ${platforms.join(", ")}
AUDIENCIA: ${audiences.join(", ")} anos
MERCADO OBJETIVO: ${mercado}
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
    const angulos = (analysisResult.strategy_recommendations as Record<string, unknown>)?.seccion_4_angulos;
    if (!angulos || !Array.isArray(angulos) || angulos.length === 0) confidenceScore -= 10;
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

    // Store emotional analysis in wizard_responses
    if (Object.keys(emotionalAnalysis).length > 0) {
      updatePayload.wizard_responses = {
        ...(record.wizard_responses || {}),
        emotional_analysis: emotionalAnalysis,
      };
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

    console.log(`[generate-product-dna] Product DNA updated: ${productDnaId} → status=ready`);

    // ── 9. CREATE a products record so it shows in the Products tab ──────
    let productId: string | null = null;
    try {
      const sr = analysisResult.strategy_recommendations as Record<string, unknown> || {};
      const mr = analysisResult.market_research as Record<string, unknown> || {};
      const cb = analysisResult.content_brief as Record<string, unknown> || {};
      const ca = analysisResult.competitor_analysis || {};

      // New structure fields
      const contexto = (mr.seccion_1_contexto as Record<string, unknown>) || {};
      const mercado = (mr.seccion_2_mercado as Record<string, unknown>) || {};
      const avatares = (sr.seccion_3_avatares as unknown[]) || [];
      const angulos = (sr.seccion_4_angulos as Array<{ hook_apertura?: string }>) || [];
      const briefCreador = (cb.seccion_8_brief_creador as Record<string, unknown>) || {};

      // Build a product name from extracted service or service group
      const groupLabels: Record<string, string> = {
        content_creation: "Creación de Contenido",
        post_production: "Post Producción",
        strategy_marketing: "Estrategia de Marketing",
        technology: "Tecnología",
        education_training: "Educación",
        general_services: "Servicios Generales",
      };
      const groupName = groupLabels[record.service_group] || record.service_group;
      const servicioExacto = (contexto.servicio_exacto as string) || "";
      const productName = servicioExacto
        ? servicioExacto.substring(0, 80)
        : `${groupName} - ${(record.service_types || []).join(", ")}`;

      // Extract sales angle hooks as text array
      const salesAngles = angulos
        .map((a) => a.hook_apertura)
        .filter(Boolean);

      // Build ideal avatar summary from first avatar
      const firstAvatar = avatares[0] as Record<string, unknown> | undefined;
      const idealAvatar = firstAvatar ? [
        firstAvatar.nombre_edad,
        firstAvatar.situacion_actual,
        firstAvatar.dolor_principal ? `Dolor: ${firstAvatar.dolor_principal}` : null,
        firstAvatar.deseo_principal ? `Deseo: ${firstAvatar.deseo_principal}` : null,
      ].filter(Boolean).join("\n") : null;

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          client_id: record.client_id,
          name: productName,
          description: (contexto.objetivo_real as string) || null,
          strategy: (briefCreador.tono_de_voz as string) || null,
          market_research: (mercado.panorama_mercado as string) || null,
          ideal_avatar: idealAvatar || null,
          sales_angles: salesAngles.length > 0 ? salesAngles : null,
          competitor_analysis: ca,
          sales_angles_data: angulos || null,
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
        confidence_score: confidenceScore,
        sections: Object.keys(analysisResult),
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
