import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";
// Nuevo: Prompts desde DB con cache y fallback
import { getPrompt } from "../_shared/prompts/db-prompts.ts";

// ── JSON repair ─────────────────────────────────────────────────────────
function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  s = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

  try { JSON.parse(s); return s; } catch {
    let inString = false, escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') inString = !inString;
    }
    if (inString) { while (s.endsWith("\\")) s = s.slice(0, -1); s += '"'; }
    s = s.replace(/,\s*"[^"]*"\s*$/, "").replace(/,\s*"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");

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
        model: "gemini-2.0-flash",
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

// ── Perplexity AI call ──────────────────────────────────────────────────
async function callPerplexity(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not configured");

  console.log("[generate-product-dna] Calling Perplexity...");
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Perplexity error:", errText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Gemini fallback ─────────────────────────────────────────────────────
async function callGeminiFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  console.log("[generate-product-dna] Falling back to Gemini...");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 12000,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-product-dna] Gemini error:", errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
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

// ── System Prompt ───────────────────────────────────────────────────────
const PRODUCT_DNA_SYSTEM_PROMPT = `Eres un experto senior en investigacion de mercado, estrategia de producto, marketing digital y analisis competitivo para el mercado latinoamericano. Tu tarea es analizar la informacion de un producto/servicio y generar un analisis completo y accionable.

El usuario proporciono informacion a traves de un wizard interactivo y opcionalmente un audio describiendo su producto.

INSTRUCCIONES:
- Analiza TODO lo proporcionado: respuestas del wizard, transcripcion de audio (si existe), y links de referencia
- Si algo no se menciona, INFIERE de forma inteligente basandote en la industria y contexto
- Los datos deben ser ESTRATEGICOS y ACCIONABLES, no genericos
- Todo en español
- Considera el tipo de servicio (service_group) y los servicios especificos seleccionados
- Si se proporcionan links de referencia/competidores/inspiracion, incluyelos en tu analisis
- Adapta tu analisis al OBJETIVO principal del emprendedor

Genera un JSON con EXACTAMENTE esta estructura:

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

    // Intentar obtener prompt desde DB
    let systemPrompt: string;
    try {
      const promptConfig = await getPrompt(supabase, "dna", "product_analysis");
      systemPrompt = (promptConfig.systemPrompt || PRODUCT_DNA_SYSTEM_PROMPT) + emotionalContext;
    } catch {
      systemPrompt = PRODUCT_DNA_SYSTEM_PROMPT + emotionalContext;
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

    // ── 4. Generate analysis with Perplexity (fallback to Gemini) ───────
    let aiResponse: string;
    try {
      aiResponse = await callPerplexity(systemPrompt, userPrompt);
    } catch (err) {
      console.warn("[generate-product-dna] Perplexity failed, trying Gemini:", err);
      aiResponse = await callGeminiFallback(systemPrompt, userPrompt);
    }

    // ── 5. Parse AI response ────────────────────────────────────────────
    console.log(`[generate-product-dna] AI response length: ${aiResponse.length} chars`);

    // Check if response is empty or too short
    if (!aiResponse || aiResponse.length < 100) {
      console.error("[generate-product-dna] AI response too short or empty");
      throw new Error("La IA no generó una respuesta válida. Intenta de nuevo.");
    }

    const repaired = repairJsonForParse(aiResponse);
    let analysisData;
    try {
      analysisData = JSON.parse(repaired);
    } catch (parseErr) {
      console.error("[generate-product-dna] JSON parse failed:", parseErr);
      console.error("[generate-product-dna] Raw response (first 1000 chars):", aiResponse.substring(0, 1000));
      console.error("[generate-product-dna] Repaired response (first 1000 chars):", repaired.substring(0, 1000));

      // Try to extract any valid JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysisData = JSON.parse(repairJsonForParse(jsonMatch[0]));
          console.log("[generate-product-dna] Recovered JSON from response");
        } catch {
          throw new Error("Error al parsear la respuesta de IA. Intenta de nuevo.");
        }
      } else {
        throw new Error("Error al parsear la respuesta de IA. Intenta de nuevo.");
      }
    }

    console.log("[generate-product-dna] Analysis generated, sections:", Object.keys(analysisData).join(", "));

    // ── 6. UPDATE the record ────────────────────────────────────────────
    const complexity = estimateComplexity(
      transcription + wizardContext,
      record.service_types || []
    );

    const updatePayload: Record<string, unknown> = {
      market_research: analysisData.market_research || null,
      competitor_analysis: analysisData.competitor_analysis || null,
      strategy_recommendations: analysisData.strategy_recommendations || null,
      content_brief: analysisData.content_brief || null,
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
    console.error("[generate-product-dna] Error:", message);

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
      JSON.stringify({ success: false, error: message }),
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
