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

// ── Perplexity AI call (research mode - no JSON constraint) ─────────────
async function callPerplexityResearch(userPrompt: string, researchPrompt: string): Promise<string> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) {
    console.error("[generate-product-dna] PERPLEXITY_API_KEY not found in environment");
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  console.log("[generate-product-dna] Step 1: Perplexity research...");

  const requestBody = {
    model: "sonar-pro",
    messages: [
      { role: "system", content: researchPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 8000,
    temperature: 0.3,
    return_citations: true,
  };

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[generate-product-dna] Perplexity response status: ${response.status}`);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Perplexity error response:", errText);
    throw new Error(`Perplexity API error: ${response.status} - ${errText.substring(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  if (!content) {
    console.error("[generate-product-dna] Perplexity returned empty content");
    throw new Error("Perplexity returned empty response");
  }

  console.log(`[generate-product-dna] Perplexity research: ${content.length} chars`);
  return content;
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
            parts: [{ text: `Genera la seccion "${section}" basandote en esta investigacion.

INVESTIGACION:
${research.substring(0, 4000)}

---

${sectionPrompt}

IMPORTANTE: Responde UNICAMENTE con un objeto JSON valido. Ejemplo: {"${section}": {...}}` }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
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
        return parsed;
      } catch (parseErr) {
        console.error(`[generate-product-dna] ${section} JSON repair failed, trying simpler structure`);
        // Return empty section that will be filled with defaults
        return {};
      }
    }
    console.error(`[generate-product-dna] ${section} no JSON found in response`);
    return {};
  } catch (err) {
    console.error(`[generate-product-dna] ${section} exception:`, err);
    throw err;
  }
}

// ── Gemini call (structure into JSON) - calls 4 sections in parallel ────
async function callGeminiStructure(research: string, _jsonStructure: string, _structurePrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }

  console.log("[generate-product-dna] Step 2: Gemini structuring (4 parallel calls)...");

  const sectionPrompts = {
    market_research: `Genera "market_research" con: market_overview (string), market_size (string), growth_trends (array de strings), opportunities (array), threats (array), target_segments (array de objetos con name, description, size_estimate, priority), ideal_customer_profile (objeto con demographics, psychographics, pain_points, desires, objections, buying_triggers).`,

    competitor_analysis: `Genera "competitor_analysis" con: direct_competitors (array de objetos con name, strengths, weaknesses, positioning, price_range), indirect_competitors (array de strings), competitive_advantage (string), positioning_strategy (string), differentiation_points (array de strings).`,

    strategy_recommendations: `Genera "strategy_recommendations" con: value_proposition (string), brand_positioning (string), pricing_strategy (string), sales_angles (array de objetos con angle_name, headline, hook, target_emotion), funnel_strategy (objeto con awareness, consideration, conversion, retention), content_pillars (array), platforms (array de objetos con name, strategy, content_types, priority), hashtags (array), ads_targeting (objeto con interests, behaviors, keywords, lookalike_sources).`,

    content_brief: `Genera "content_brief" con: brand_voice (objeto con tone, personality, do_say, dont_say), key_messages (array), tagline_suggestions (array), content_ideas (array de objetos con title, format, objective, brief_description), visual_direction (objeto con color_palette, style, mood).`
  };

  // Call all 4 sections in parallel with error handling
  const results = await Promise.allSettled([
    callGeminiSection(apiKey, research, "market_research", sectionPrompts.market_research),
    callGeminiSection(apiKey, research, "competitor_analysis", sectionPrompts.competitor_analysis),
    callGeminiSection(apiKey, research, "strategy_recommendations", sectionPrompts.strategy_recommendations),
    callGeminiSection(apiKey, research, "content_brief", sectionPrompts.content_brief),
  ]);

  // Extract results
  const marketRes = results[0].status === "fulfilled" ? results[0].value : {};
  const compRes = results[1].status === "fulfilled" ? results[1].value : {};
  const stratRes = results[2].status === "fulfilled" ? results[2].value : {};
  const contentRes = results[3].status === "fulfilled" ? results[3].value : {};

  // Log failures
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[generate-product-dna] Section ${i} failed:`, r.reason);
    }
  });

  // Combine all sections - handle both wrapped and unwrapped responses
  const combined = {
    market_research: marketRes.market_research || (Object.keys(marketRes).length > 0 ? marketRes : null),
    competitor_analysis: compRes.competitor_analysis || (Object.keys(compRes).length > 0 ? compRes : null),
    strategy_recommendations: stratRes.strategy_recommendations || (Object.keys(stratRes).length > 0 ? stratRes : null),
    content_brief: contentRes.content_brief || (Object.keys(contentRes).length > 0 ? contentRes : null),
  };

  console.log("[generate-product-dna] Combined sections:", Object.keys(combined).filter(k => combined[k as keyof typeof combined]).join(", "));
  return JSON.stringify(combined);
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

// ── Generate basic fallback analysis ────────────────────────────────────
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

// ── JSON Structure Template ─────────────────────────────────────────────
const JSON_STRUCTURE_TEMPLATE = `{
  "market_research": {
    "market_overview": "Descripcion del mercado (3-4 oraciones con datos)",
    "market_size": "Tamaño estimado del mercado",
    "growth_trends": ["tendencia 1", "tendencia 2", "tendencia 3"],
    "opportunities": ["oportunidad 1", "oportunidad 2", "oportunidad 3"],
    "threats": ["amenaza 1", "amenaza 2"],
    "target_segments": [{"name": "Segmento", "description": "Desc", "size_estimate": "Tamaño", "priority": "high/medium/low"}],
    "ideal_customer_profile": {
      "demographics": "Edad, genero, ubicacion",
      "psychographics": "Valores, intereses, estilo de vida",
      "pain_points": ["dolor 1", "dolor 2", "dolor 3"],
      "desires": ["deseo 1", "deseo 2", "deseo 3"],
      "objections": ["objecion 1", "objecion 2"],
      "buying_triggers": ["disparador 1", "disparador 2"]
    }
  },
  "competitor_analysis": {
    "direct_competitors": [{"name": "Nombre", "strengths": ["f1"], "weaknesses": ["d1"], "positioning": "Pos", "price_range": "Rango"}],
    "indirect_competitors": ["competidor 1", "competidor 2"],
    "competitive_advantage": "Ventaja competitiva principal",
    "positioning_strategy": "Estrategia de posicionamiento",
    "differentiation_points": ["diferenciador 1", "diferenciador 2"]
  },
  "strategy_recommendations": {
    "value_proposition": "Propuesta de valor (1-2 oraciones)",
    "brand_positioning": "Posicionamiento de marca",
    "pricing_strategy": "Estrategia de precio",
    "sales_angles": [{"angle_name": "Angulo", "headline": "Titular", "hook": "Gancho", "target_emotion": "Emocion"}],
    "funnel_strategy": {"awareness": "Estrategia", "consideration": "Estrategia", "conversion": "Estrategia", "retention": "Estrategia"},
    "content_pillars": ["pilar 1", "pilar 2", "pilar 3"],
    "platforms": [{"name": "Plataforma", "strategy": "Estrategia", "content_types": ["tipo 1"], "priority": "high"}],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "ads_targeting": {"interests": ["i1", "i2"], "behaviors": ["b1"], "keywords": ["k1"], "lookalike_sources": ["fuente 1"]}
  },
  "content_brief": {
    "brand_voice": {"tone": ["tono 1", "tono 2"], "personality": "Personalidad", "do_say": ["frase 1"], "dont_say": ["frase 1"]},
    "key_messages": ["mensaje 1", "mensaje 2"],
    "tagline_suggestions": ["tagline 1", "tagline 2"],
    "content_ideas": [{"title": "Idea", "format": "video/reel/carrusel", "objective": "awareness/conversion", "brief_description": "Descripcion"}],
    "visual_direction": {"color_palette": ["#hex1", "#hex2"], "style": "Estilo visual", "mood": "Atmosfera"}
  }
}`;

// ── Default Prompts (fallback if DB unavailable) ────────────────────────
const DEFAULT_RESEARCH_PROMPT = `Eres un investigador de mercado experto para LATAM. Tu tarea es investigar a fondo el producto/servicio descrito y proporcionar un analisis completo.

INVESTIGA Y PROPORCIONA:
1. MERCADO: Tamaño del mercado, tendencias actuales, oportunidades y amenazas
2. COMPETENCIA: Competidores directos e indirectos, sus fortalezas y debilidades, precios
3. AUDIENCIA: Perfil demografico y psicografico del cliente ideal, sus dolores y deseos
4. ESTRATEGIA: Propuesta de valor, posicionamiento, angulos de venta, estrategia de precios
5. CONTENIDO: Tono de marca, mensajes clave, ideas de contenido, hashtags relevantes

Incluye datos especificos, numeros y tendencias actuales del mercado latinoamericano.
Puedes estructurar tu respuesta como prefieras (bullet points, parrafos, etc).
Lo importante es que sea COMPLETO y con DATOS REALES.`;

const DEFAULT_STRUCTURE_PROMPT = `Eres un asistente que estructura informacion en JSON.
Tu UNICA tarea es tomar la investigacion proporcionada y organizarla en el formato JSON especificado.

REGLAS ESTRICTAS:
1. Tu respuesta debe ser UNICAMENTE un objeto JSON valido
2. El primer caracter debe ser {
3. El ultimo caracter debe ser }
4. NO incluyas texto, explicaciones ni markdown
5. Usa la informacion de la investigacion para llenar cada campo
6. Si falta informacion para algun campo, infiere basandote en el contexto
7. Todo el contenido debe estar en español`;

// ── System Prompt (legacy, kept for backward compat) ────────────────────
const PRODUCT_DNA_SYSTEM_PROMPT = `Eres un API de analisis de mercado. Respondes EXCLUSIVAMENTE con JSON.

INSTRUCCIONES CRITICAS:
- Responde SOLO con un objeto JSON valido
- El primer caracter de tu respuesta DEBE ser {
- El ultimo caracter de tu respuesta DEBE ser }
- NO escribas texto antes o despues del JSON
- NO uses markdown, NO uses \`\`\`
- NO digas "Aqui esta" ni "Este es" ni ninguna introduccion

Analiza la informacion y genera un analisis estrategico para LATAM.

REGLAS:
1. Responde SOLO con JSON valido
2. Todo en español
3. Datos estrategicos y accionables
4. Infiere lo que no se mencione

ESTRUCTURA JSON REQUERIDA:

{
  "market_research": {
    "market_overview": "Descripcion del mercado actual para este producto/servicio (3-4 oraciones con datos reales)",
    "market_size": "Estimacion del tamaño del mercado (local e internacional si aplica)",
    "growth_trends": ["tendencia 1", "tendencia 2", "tendencia 3"],
    "opportunities": ["oportunidad de mercado 1", "oportunidad 2", "oportunidad 3"],
    "threats": ["amenaza/riesgo 1", "amenaza 2"],
    "target_segments": [
      {
        "name": "Segmento 1",
        "description": "Descripcion del segmento",
        "size_estimate": "Estimacion del tamaño",
        "priority": "high"
      },
      {
        "name": "Segmento 2",
        "description": "Descripcion",
        "size_estimate": "Estimacion",
        "priority": "medium"
      }
    ],
    "ideal_customer_profile": {
      "demographics": "Edad, genero, ubicacion, nivel socioeconomico",
      "psychographics": "Valores, intereses, estilo de vida",
      "pain_points": ["dolor 1", "dolor 2", "dolor 3"],
      "desires": ["deseo 1", "deseo 2", "deseo 3"],
      "objections": ["objecion 1", "objecion 2", "objecion 3"],
      "buying_triggers": ["disparador 1", "disparador 2"]
    }
  },
  "competitor_analysis": {
    "direct_competitors": [
      {
        "name": "Competidor 1",
        "strengths": ["fortaleza 1", "fortaleza 2"],
        "weaknesses": ["debilidad 1", "debilidad 2"],
        "positioning": "Como se posiciona",
        "price_range": "Rango de precios"
      }
    ],
    "indirect_competitors": ["competidor indirecto 1", "competidor indirecto 2"],
    "competitive_advantage": "Ventaja competitiva principal del producto",
    "positioning_strategy": "Estrategia de posicionamiento recomendada",
    "differentiation_points": ["diferenciador 1", "diferenciador 2", "diferenciador 3"]
  },
  "strategy_recommendations": {
    "value_proposition": "Propuesta de valor unica en 1-2 oraciones",
    "brand_positioning": "Posicionamiento de marca recomendado",
    "pricing_strategy": "Estrategia de precio recomendada con justificacion",
    "sales_angles": [
      {
        "angle_name": "Angulo 1",
        "headline": "Titular de venta",
        "hook": "Gancho para captar atencion",
        "target_emotion": "Emocion que apela"
      },
      {
        "angle_name": "Angulo 2",
        "headline": "Titular de venta",
        "hook": "Gancho",
        "target_emotion": "Emocion"
      },
      {
        "angle_name": "Angulo 3",
        "headline": "Titular de venta",
        "hook": "Gancho",
        "target_emotion": "Emocion"
      }
    ],
    "funnel_strategy": {
      "awareness": "Estrategia de awareness",
      "consideration": "Estrategia de consideracion",
      "conversion": "Estrategia de conversion",
      "retention": "Estrategia de retencion"
    },
    "content_pillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
    "platforms": [
      {
        "name": "Instagram",
        "strategy": "Estrategia especifica para esta plataforma",
        "content_types": ["tipo 1", "tipo 2"],
        "priority": "high"
      }
    ],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
    "ads_targeting": {
      "interests": ["interes 1", "interes 2", "interes 3", "interes 4", "interes 5"],
      "behaviors": ["comportamiento 1", "comportamiento 2"],
      "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
      "lookalike_sources": ["fuente 1", "fuente 2"]
    }
  },
  "content_brief": {
    "brand_voice": {
      "tone": ["tono 1", "tono 2", "tono 3"],
      "personality": "Personalidad de marca en 1-2 oraciones",
      "do_say": ["frase que SI usar 1", "frase 2"],
      "dont_say": ["frase que NO usar 1", "frase 2"]
    },
    "key_messages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"],
    "tagline_suggestions": ["tagline 1", "tagline 2", "tagline 3"],
    "content_ideas": [
      {
        "title": "Idea de contenido 1",
        "format": "video/carrusel/reel/story",
        "objective": "awareness/conversion/engagement",
        "brief_description": "Descripcion breve del contenido"
      },
      {
        "title": "Idea de contenido 2",
        "format": "formato",
        "objective": "objetivo",
        "brief_description": "Descripcion"
      },
      {
        "title": "Idea de contenido 3",
        "format": "formato",
        "objective": "objetivo",
        "brief_description": "Descripcion"
      }
    ],
    "visual_direction": {
      "color_palette": ["#hex1", "#hex2", "#hex3"],
      "style": "Estilo visual recomendado",
      "mood": "Atmosfera/mood de la marca"
    }
  }
}

Responde UNICAMENTE con el JSON. Sin markdown, sin explicaciones, sin texto adicional.`;

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

    try {
      // Step 1: Perplexity does deep research (no JSON constraint)
      const research = await callPerplexityResearch(userPrompt, researchPrompt);
      console.log(`[generate-product-dna] Research completed: ${research.length} chars`);

      // Step 2: Gemini structures the research into JSON
      aiResponse = await callGeminiStructure(research, JSON_STRUCTURE_TEMPLATE, structurePrompt);
      console.log(`[generate-product-dna] Structuring completed: ${aiResponse.length} chars`);
    } catch (genError) {
      console.error("[generate-product-dna] Generation failed:", genError);
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

      // Fill missing sections with basic defaults
      const defaults = generateBasicAnalysis(wizardResponses, record.service_group, record.service_types || []);
      for (const section of missingSections) {
        analysisData[section] = defaults[section as keyof typeof defaults];
        console.log(`[generate-product-dna] Filled ${section} with defaults`);
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
