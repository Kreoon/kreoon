import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";

// ── JSON repair (from product-research pattern) ───────────────────────
function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  s = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

  try {
    JSON.parse(s);
    return s;
  } catch {
    let inString = false;
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') inString = !inString;
    }
    if (inString) {
      while (s.endsWith("\\")) s = s.slice(0, -1);
      s += '"';
    }
    s = s.replace(/,\s*"[^"]*"\s*$/, "");
    s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
    s = s.replace(/,\s*$/, "");

    let open = 0, bracket = 0;
    inString = false;
    escaped = false;
    for (let i = 0; i < s.length; i++) {
      if (escaped) { escaped = false; continue; }
      if (s[i] === "\\" && inString) { escaped = true; continue; }
      if (s[i] === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (s[i] === "{") open++;
      else if (s[i] === "}") open--;
      else if (s[i] === "[") bracket++;
      else if (s[i] === "]") bracket--;
    }
    while (bracket > 0) { s += "]"; bracket--; }
    while (open > 0) { s += "}"; open--; }
    return s;
  }
}

// ── Gemini AI call ────────────────────────────────────────────────────
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  console.log("[generate-talent-dna] Calling Gemini for DNA analysis...");
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
        max_tokens: 8192,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-talent-dna] Gemini error:", errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Perplexity fallback ───────────────────────────────────────────────
async function callPerplexityFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not configured");

  console.log("[generate-talent-dna] Falling back to Perplexity for DNA analysis...");
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8192,
      temperature: 0.3,
      return_citations: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-talent-dna] Perplexity error:", errText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Format emotional context for system prompt injection ──────────────
function formatEmotionalContext(ea: Record<string, unknown>): string {
  if (!ea || Object.keys(ea).length === 0) return "";

  const parts: string[] = [];
  if (ea.overall_mood) parts.push(`Estado emocional general: ${ea.overall_mood}`);
  if (ea.confidence_level != null) parts.push(`Nivel de confianza al hablar: ${ea.confidence_level}%`);

  const style = ea.communication_style as Record<string, string> | undefined;
  if (style) {
    parts.push(`Estilo de comunicacion: ritmo ${style.pace || "?"}, claridad ${style.clarity || "?"}, energia ${style.energy || "?"}`);
  }

  const passionTopics = ea.passion_topics as string[] | undefined;
  if (passionTopics?.length) parts.push(`Temas que le apasionan: ${passionTopics.join(", ")}`);

  const concernAreas = ea.concern_areas as string[] | undefined;
  if (concernAreas?.length) parts.push(`Areas de preocupacion: ${concernAreas.join(", ")}`);

  const recommendations = ea.content_recommendations as Record<string, unknown> | undefined;
  if (recommendations?.suggested_tone) parts.push(`Tono sugerido para contenido: ${recommendations.suggested_tone}`);

  const segments = ea.emotional_segments as Array<{ question_number: number; emotion: string; intensity: string }> | undefined;
  if (segments?.length) {
    const segmentLines = segments.map(s => `  - Pregunta ${s.question_number}: ${s.emotion} (${s.intensity})`);
    parts.push(`Emociones por pregunta:\n${segmentLines.join("\n")}`);
  }

  return parts.length > 0
    ? `\n\n--- CONTEXTO EMOCIONAL DEL AUDIO ---\nEl analisis emocional del audio revelo lo siguiente sobre la persona que habla. Usa esta informacion para generar un ADN mas autentico y alineado con la personalidad real del creador:\n\n${parts.join("\n")}\n--- FIN CONTEXTO EMOCIONAL ---`
    : "";
}

// ── DNA System Prompt ─────────────────────────────────────────────────
const TALENT_DNA_SYSTEM_PROMPT = `Eres un experto en talento creativo, marketing de influencers y la industria de creadores de contenido en Latinoamerica. Tu tarea es analizar la transcripcion de un audio donde un creador de contenido describe su perfil profesional, y generar un "ADN de Talento" completo, autentico y optimizado para el marketplace.

El creador respondio preguntas organizadas en 7 bloques:

**BLOQUE 1 - TU HISTORIA:**
1. Quien eres y como empezaste a crear contenido? Que te motivo?

**BLOQUE 2 - TU EXPERIENCIA:**
2. Cuantos anos llevas creando contenido y cuales han sido tus logros mas importantes?

**BLOQUE 3 - TU ESPECIALIDAD:**
3. En que nichos o industrias te especializas? Que tipo de contenido creas mejor?

**BLOQUE 4 - TU ESTILO:**
4. Como describirias tu estilo de contenido? Que te hace diferente?

**BLOQUE 5 - TU PROCESO:**
5. Como es tu proceso creativo desde el brief hasta la entrega final?

**BLOQUE 6 - TUS PLATAFORMAS:**
6. En que plataformas creas contenido y en que idiomas puedes trabajar?

**BLOQUE 7 - TUS METAS:**
7. Cuales son tus metas profesionales? Con que marcas suenas colaborar?

INSTRUCCIONES:
- Analiza todo lo dicho y genera un perfil AUTENTICO y PROFESIONAL
- Si algun dato no se menciona explicitamente, INFIERE de forma inteligente basandote en el contexto
- El tagline debe ser atractivo, conciso (max 150 caracteres) y captar la esencia del creador
- La bio completa debe ser profesional pero con personalidad (max 1000 caracteres)
- Los nichos y roles deben ser especificos y relevantes para marcas
- El unique_factor debe destacar lo que hace DIFERENTE a este creador
- Todo el contenido debe estar en espanol
- **MUY IMPORTANTE**: Los textos narrativos (tagline, bio_full, unique_factor, workflow_description, collaboration_style) DEBEN estar escritos en PRIMERA PERSONA. Usa "Soy", "Tengo", "Mi experiencia", "Creo", "Me especializo", etc. NUNCA uses tercera persona como "Es un creador" o "Tiene experiencia"

Genera un JSON con esta estructura EXACTA:

{
  "creator_identity": {
    "tagline": "Frase corta EN PRIMERA PERSONA. Ej: 'Creo contenido que conecta marcas con audiencias reales'",
    "bio_full": "Biografia EN PRIMERA PERSONA. Ej: 'Soy creador de contenido con 5 anos de experiencia. Me especializo en...'",
    "experience_level": "beginner|intermediate|advanced|expert",
    "unique_factor": "EN PRIMERA PERSONA. Ej: 'Mi diferencial es que combino storytelling con datos de conversion'",
    "years_creating": "X anos",
    "achievements": ["logro 1", "logro 2", "logro 3"]
  },
  "specialization": {
    "niches": ["nicho 1", "nicho 2", "nicho 3"],
    "production_skills": ["habilidad 1", "habilidad 2"],
    "content_formats": ["Reels", "TikTok", "YouTube", etc.],
    "specialized_services": ["servicio 1", "servicio 2"]
  },
  "marketplace_roles": ["ugc_creator", "influencer", "video_editor", etc.],
  "content_style": {
    "primary_style": "minimalista|energetico|educativo|etc",
    "tone_descriptors": ["cercano", "divertido", "profesional", etc.],
    "visual_aesthetic": "descripcion de la estetica visual",
    "editing_style": "descripcion del estilo de edicion"
  },
  "platforms": ["instagram", "tiktok", "youtube", etc.],
  "languages": ["espanol", "ingles", etc.],
  "ideal_collaborations": {
    "brand_types": ["tipo de marca 1", "tipo de marca 2"],
    "industries": ["industria 1", "industria 2"],
    "project_types": ["tipo de proyecto 1", "tipo de proyecto 2"],
    "avoid_categories": ["categoria a evitar 1"]
  },
  "creative_process": {
    "workflow_description": "EN PRIMERA PERSONA. Ej: 'Mi proceso inicia con una llamada de briefing donde entiendo la marca...'",
    "turnaround_typical": "tiempo tipico de entrega",
    "collaboration_style": "EN PRIMERA PERSONA. Ej: 'Prefiero comunicacion directa por WhatsApp y entregas en Drive'",
    "tools_used": ["herramienta 1", "herramienta 2"]
  },
  "professional_goals": {
    "short_term": ["meta corto plazo 1", "meta corto plazo 2"],
    "long_term": ["meta largo plazo 1", "meta largo plazo 2"],
    "dream_brands": ["marca ideal 1", "marca ideal 2", "marca ideal 3"]
  }
}

IMPORTANTE para marketplace_roles (maximo 5):
- ugc_creator: Creador de contenido UGC para marcas
- influencer: Promocion en redes propias
- content_creator: Produccion de contenido general
- video_editor: Edicion y postproduccion
- photographer: Fotografia de producto/lifestyle
- copywriter: Redaccion publicitaria y guiones
- social_media_manager: Gestion de redes
- brand_ambassador: Representacion de marca
- live_streamer: Transmisiones en vivo
- podcast_host: Contenido en audio

IMPORTANTE para experience_level:
- beginner: Menos de 1 ano creando contenido
- intermediate: 1-3 anos de experiencia
- advanced: 3-5 anos de experiencia
- expert: Mas de 5 anos de experiencia

Responde UNICAMENTE con el JSON. Sin markdown, sin explicaciones, sin texto adicional.`;

// ── Main handler ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Token invalido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { transcription, emotional_analysis } = body;

    if (!transcription) {
      return new Response(
        JSON.stringify({ success: false, error: "transcription es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-talent-dna] Starting for user: ${user.id}, transcription: ${transcription.length} chars`);

    // Read existing active DNA for version tracking
    const { data: existingDna } = await supabase
      .from("talent_dna")
      .select("version, emotional_analysis")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const nextVersion = (existingDna?.version || 0) + 1;

    // On regeneration, reuse emotional_analysis from previous version
    const emotionalAnalysis = emotional_analysis || existingDna?.emotional_analysis || {};

    // Deactivate previous active DNAs for this user
    await supabase
      .from("talent_dna")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Build system prompt with emotional context
    const emotionalContext = formatEmotionalContext(emotionalAnalysis);
    const systemPrompt = TALENT_DNA_SYSTEM_PROMPT + emotionalContext;

    // Build user prompt
    const userPrompt = `Transcripcion del audio del creador describiendo su perfil profesional:\n\n${transcription}`;

    // Generate DNA with Gemini (fallback to Perplexity)
    let aiResponse: string;
    try {
      aiResponse = await callGemini(systemPrompt, userPrompt);
    } catch (err) {
      console.warn("[generate-talent-dna] Gemini failed, trying Perplexity fallback:", err);
      aiResponse = await callPerplexityFallback(systemPrompt, userPrompt);
    }

    // Parse response
    const repaired = repairJsonForParse(aiResponse);
    const dnaData = JSON.parse(repaired);

    // Add metadata
    dnaData.metadata = {
      generated_at: new Date().toISOString(),
      ai_model: "gemini-2.5-flash",
      language: "es",
      emotional_context_used: Object.keys(emotionalAnalysis).length > 0,
    };

    console.log("[generate-talent-dna] DNA generated successfully, sections:", Object.keys(dnaData).join(", "));

    // Insert completed DNA directly
    const { data: newDna, error: insertError } = await supabase
      .from("talent_dna")
      .insert({
        user_id: user.id,
        transcription,
        emotional_analysis: emotionalAnalysis,
        dna_data: dnaData,
        status: "completed",
        version: nextVersion,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Error creating DNA record: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, dna_data: dnaData, dna_id: newDna.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando ADN de Talento";
    console.error("[generate-talent-dna] Error:", message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
