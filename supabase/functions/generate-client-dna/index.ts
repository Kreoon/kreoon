import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";

// ── JSON repair (enhanced for array element errors) ───────────────────
function repairJsonForParse(str: string): string {
  let s = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  s = s.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");

  // Try parsing as-is first
  try {
    JSON.parse(s);
    return s;
  } catch (firstError) {
    console.log("[generate-client-dna] JSON parse failed, attempting repair...");

    // Fix 1: Close unclosed strings
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

    // Fix 2: Remove trailing incomplete properties
    s = s.replace(/,\s*"[^"]*"\s*$/, "");
    s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
    s = s.replace(/,\s*$/, "");

    // Fix 3: Fix missing commas between array elements (""" -> "", ")
    s = s.replace(/"\s*"/g, '", "');

    // Fix 4: Fix arrays with missing commas before objects
    s = s.replace(/"\s*\{/g, '", {');
    s = s.replace(/\}\s*"/g, '}, "');
    s = s.replace(/\}\s*\{/g, '}, {');

    // Fix 5: Remove duplicate commas
    s = s.replace(/,\s*,+/g, ',');

    // Fix 6: Remove comma before closing brackets
    s = s.replace(/,\s*\]/g, ']');
    s = s.replace(/,\s*\}/g, '}');

    // Fix 7: Close unclosed brackets and braces
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

    // Try parsing again
    try {
      JSON.parse(s);
      console.log("[generate-client-dna] JSON repair successful");
      return s;
    } catch (secondError) {
      // Fix 8: More aggressive - try to find and fix the specific position
      const match = String(secondError).match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        console.log(`[generate-client-dna] Error at position ${pos}, attempting targeted fix`);

        // Look around the error position for common issues
        const before = s.substring(Math.max(0, pos - 20), pos);
        const after = s.substring(pos, Math.min(s.length, pos + 20));
        console.log(`[generate-client-dna] Context: ...${before}|ERROR|${after}...`);

        // Try inserting a comma if we're between elements
        if (s[pos - 1] === '"' && (s[pos] === '"' || s[pos] === '{' || s[pos] === '[')) {
          s = s.substring(0, pos) + ', ' + s.substring(pos);
        }
        // Try removing problematic character
        else if (s[pos] && !/["\[\]{},:0-9a-zA-Z\-_\s]/.test(s[pos])) {
          s = s.substring(0, pos) + s.substring(pos + 1);
        }
      }

      // Final attempt
      try {
        JSON.parse(s);
        console.log("[generate-client-dna] Targeted fix successful");
        return s;
      } catch (finalError) {
        console.error("[generate-client-dna] JSON repair failed:", finalError);
        // Return the best attempt
        return s;
      }
    }
  }
}

// ── Perplexity AI call ────────────────────────────────────────────────
async function callPerplexity(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not configured");

  console.log("[generate-client-dna] Calling Perplexity for DNA analysis...");
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
      return_citations: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-client-dna] Perplexity error:", errText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Fallback: Gemini for DNA generation ───────────────────────────────
async function callGeminiFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  console.log("[generate-client-dna] Falling back to Gemini for DNA analysis...");
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
    console.error("[generate-client-dna] Gemini fallback error:", errText);
    throw new Error(`Gemini API error: ${response.status}`);
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
    ? `\n\n--- CONTEXTO EMOCIONAL DEL AUDIO ---\nEl analisis emocional del audio revelo lo siguiente sobre la persona que habla. Usa esta informacion para generar un ADN mas empatico y alineado con la personalidad real del dueño:\n\n${parts.join("\n")}\n--- FIN CONTEXTO EMOCIONAL ---`
    : "";
}

// ── Format locations for user prompt ───────────────────────────────────
function formatLocations(locations: Array<{ name: string; code: string; flag?: string }>): string {
  if (!locations?.length) return "";

  const formatted = locations.map(loc =>
    `${loc.flag || ""} ${loc.name} (${loc.code})`.trim()
  ).join(", ");

  return `\n\nUbicaciones de audiencia seleccionadas: ${formatted}. Usa esta informacion geografica para contextualizar los intereses de segmentacion, keywords y hashtags de forma mas relevante para estas zonas.`;
}

// ── DNA System Prompt ─────────────────────────────────────────────────
const DNA_SYSTEM_PROMPT = `Eres un experto senior en branding estrategico, marketing digital, psicologia del consumidor y publicidad en redes sociales para el mercado latinoamericano. Tu tarea es analizar la transcripcion de un audio donde un dueño de negocio/marca describe su empresa, y generar un perfil estrategico "ADN de Marca" completo, profundo y accionable.

El cliente respondio preguntas organizadas en 4 bloques:

**BLOQUE 1 - IDENTIDAD DEL NEGOCIO:**
1. Que productos o servicios ofrece tu negocio? (nombre, sector, historia, modelo)
2. Cual es tu propuesta de valor? (diferenciador real vs competencia)
3. Cual es tu producto/servicio estrella? (mas vendido, mejor margen, embudo)

**BLOQUE 2 - TU CLIENTE IDEAL:**
4. Quien es tu cliente ideal? (edad, genero, ubicacion, nivel socioeconomico)
5. Que le duele, frustra o preocupa? (problemas emocionales y funcionales)
6. Que desea lograr con tu producto? (transformacion, estado futuro)
7. Que objeciones tiene antes de comprar? (miedos, barreras)

**BLOQUE 3 - TU SOLUCION:**
8. Como es la personalidad de tu marca? (tono, estilo, 3-5 adjetivos)
9. Que colores, estilo visual y estetica definen tu marca?
10. Que frase resume lo que tu marca promete? (slogan, tagline)

**BLOQUE 4 - ESTRATEGIA COMERCIAL:**
11. Cuales son tus objetivos de marketing principal? (ventas, leads, branding)
12. En que canales publicas contenido? Cual es tu presupuesto mensual de ads?

INSTRUCCIONES:
- Analiza todo lo dicho y genera datos ESTRATEGICOS, no genericos
- Si algun dato no se menciona explicitamente, INFIERE de forma inteligente basandote en el contexto del negocio, la industria y el mercado
- Los intereses de segmentacion deben ser REALES y especificos para Meta/Google/TikTok Ads
- Las keywords deben ser busquedas reales que haria el publico objetivo
- Los hashtags deben ser populares y relevantes en LATAM
- Todo el contenido debe estar en español

Genera un JSON con esta estructura EXACTA:

{
  "business_identity": {
    "name": "nombre del negocio",
    "industry": "industria/sector especifico",
    "sub_industry": "nicho especifico dentro del sector",
    "description": "descripcion estrategica del negocio en 2-3 oraciones",
    "business_model": "B2C, B2B, D2C, marketplace, etc.",
    "years_in_market": "estimado si no se menciona",
    "competitive_landscape": "contexto competitivo breve"
  },
  "value_proposition": {
    "main_usp": "propuesta de valor unica en 1 oracion contundente",
    "differentiators": ["diferenciador 1", "diferenciador 2", "diferenciador 3"],
    "proof_points": ["prueba/credibilidad 1", "prueba/credibilidad 2"],
    "brand_promise": "la promesa fundamental de la marca"
  },
  "ideal_customer": {
    "demographics": {
      "age_range": "25-45",
      "gender": "Mujeres (70%) / Hombres (30%)",
      "income_level": "Medio-alto",
      "education": "Profesional universitario",
      "occupation": "descripcion de ocupacion tipica",
      "location_context": "urbano/rural, ciudades especificas"
    },
    "psychographics": {
      "lifestyle": "descripcion del estilo de vida",
      "values": ["valor 1", "valor 2", "valor 3"],
      "interests": ["interes 1", "interes 2", "interes 3", "interes 4", "interes 5"],
      "media_consumption": ["donde consume contenido 1", "donde consume contenido 2"],
      "purchase_triggers": ["disparador de compra 1", "disparador de compra 2"]
    },
    "buying_behavior": {
      "decision_time": "impulsivo / investigador / comparador",
      "price_sensitivity": "baja / media / alta",
      "preferred_channels": ["canal de compra 1", "canal de compra 2"],
      "average_ticket": "rango de ticket promedio estimado"
    },
    "pain_points": {
      "primary": "dolor principal que resuelve la marca",
      "secondary": ["dolor secundario 1", "dolor secundario 2"],
      "failed_solutions": ["que ha intentado antes sin exito 1", "que ha intentado antes sin exito 2"]
    },
    "desires": {
      "functional": "que resultado concreto busca",
      "emotional": "como quiere sentirse despues",
      "social": "como quiere que lo vean los demas"
    },
    "common_objections": [
      { "objection": "objecion comun 1", "response": "respuesta estrategica" },
      { "objection": "objecion comun 2", "response": "respuesta estrategica" }
    ]
  },
  "flagship_offer": {
    "name": "nombre del producto/servicio estrella",
    "description": "descripcion breve",
    "price_range": "rango de precio",
    "main_benefit": "beneficio principal",
    "funnel_role": "front-end / core / premium / upsell"
  },
  "brand_identity": {
    "voice": {
      "tone": ["tono 1", "tono 2", "tono 3"],
      "do_say": ["frase/expresion que si usaria 1", "frase/expresion que si usaria 2"],
      "dont_say": ["frase/expresion que NO usaria 1", "frase/expresion que NO usaria 2"]
    },
    "personality_traits": ["rasgo 1", "rasgo 2", "rasgo 3", "rasgo 4", "rasgo 5"],
    "brand_archetype": "El arquetipo de marca dominante (explorador, heroe, sabio, etc.)",
    "messaging": {
      "tagline": "slogan o frase de marca",
      "elevator_pitch": "pitch de 30 segundos",
      "key_messages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"]
    }
  },
  "visual_identity": {
    "brand_colors": ["#hex1", "#hex2", "#hex3"],
    "color_meaning": "por que estos colores representan la marca",
    "visual_style": ["estilo 1", "estilo 2"],
    "content_themes": ["tema visual para contenido 1", "tema visual 2", "tema visual 3"],
    "photography_style": "tipo de fotografia recomendada",
    "mood": "sensacion/ambiente general de la marca"
  },
  "marketing_strategy": {
    "primary_objective": "objetivo principal (ventas/leads/branding)",
    "secondary_objectives": ["objetivo 2", "objetivo 3"],
    "main_cta": "llamado a la accion principal",
    "content_pillars": ["pilar de contenido 1", "pilar 2", "pilar 3", "pilar 4"],
    "channels": ["canal 1", "canal 2"],
    "monthly_budget": "presupuesto mensual estimado de ADS",
    "funnel_strategy": "descripcion breve del embudo recomendado"
  },
  "ads_targeting": {
    "interests": ["interes de segmentacion ADS 1", "interes 2", "interes 3", "interes 4", "interes 5", "interes 6", "interes 7", "interes 8", "interes 9", "interes 10"],
    "behaviors": ["comportamiento de segmentacion 1", "comportamiento 2", "comportamiento 3"],
    "lookalike_sources": ["fuente de lookalike 1", "fuente 2"],
    "keywords_google": ["keyword de busqueda 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6", "keyword 7", "keyword 8"],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
    "negative_keywords": ["keyword negativa 1", "keyword negativa 2", "keyword negativa 3"]
  }
}

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

    const body = await req.json();
    const { client_id, transcription, emotional_analysis, locations } = body;

    if (!client_id) {
      return new Response(
        JSON.stringify({ success: false, error: "client_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transcription) {
      return new Response(
        JSON.stringify({ success: false, error: "transcription es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-client-dna] Starting for client: ${client_id}, transcription: ${transcription.length} chars`);

    // Read existing active DNA for version tracking
    const { data: existingDna } = await supabase
      .from("client_dna")
      .select("version, emotional_analysis")
      .eq("client_id", client_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const nextVersion = (existingDna?.version || 0) + 1;

    // On regeneration, reuse emotional_analysis from previous version
    const emotionalAnalysis = emotional_analysis || existingDna?.emotional_analysis || {};

    // Deactivate previous active DNAs for this client
    await supabase
      .from("client_dna")
      .update({ is_active: false })
      .eq("client_id", client_id)
      .eq("is_active", true);

    // Build system prompt with emotional context
    const emotionalContext = formatEmotionalContext(emotionalAnalysis);
    const systemPrompt = DNA_SYSTEM_PROMPT + emotionalContext;

    // Build user prompt with locations
    const locationsContext = formatLocations(locations || []);
    const userPrompt = `Transcripcion del audio del cliente describiendo su negocio:\n\n${transcription}${locationsContext}`;

    // Generate DNA with Perplexity (fallback to Gemini) with retry logic
    let aiResponse = "";
    let dnaData: Record<string, unknown> | null = null;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt === 1) {
          try {
            aiResponse = await callPerplexity(systemPrompt, userPrompt);
          } catch (err) {
            console.warn("[generate-client-dna] Perplexity failed, trying Gemini fallback:", err);
            aiResponse = await callGeminiFallback(systemPrompt, userPrompt);
          }
        } else {
          // Retry with Gemini and stricter prompt
          console.log("[generate-client-dna] Retrying with Gemini (strict JSON mode)...");
          const strictPrompt = systemPrompt + "\n\nIMPORTANTE: Responde SOLO con JSON valido. NO uses caracteres especiales dentro de strings. Asegurate de que todos los arrays tengan comas entre elementos.";
          aiResponse = await callGeminiFallback(strictPrompt, userPrompt);
        }

        // Parse response
        const repaired = repairJsonForParse(aiResponse);
        dnaData = JSON.parse(repaired);
        console.log(`[generate-client-dna] JSON parsed successfully on attempt ${attempt}`);
        break;
      } catch (parseError) {
        console.error(`[generate-client-dna] Parse attempt ${attempt} failed:`, parseError);
        if (attempt >= maxAttempts) {
          throw new Error(`Error parseando respuesta de IA después de ${maxAttempts} intentos: ${parseError}`);
        }
      }
    }

    if (!dnaData) {
      throw new Error("No se pudo generar el ADN de marca");
    }

    // Add metadata
    dnaData.metadata = {
      generated_at: new Date().toISOString(),
      ai_model: "perplexity/sonar-pro",
      language: "es",
      emotional_context_used: Object.keys(emotionalAnalysis).length > 0,
    };

    console.log("[generate-client-dna] DNA generated successfully, sections:", Object.keys(dnaData).join(", "));

    // Insert completed DNA directly (no intermediate 'processing' state)
    const { data: newDna, error: insertError } = await supabase
      .from("client_dna")
      .insert({
        client_id,
        transcription,
        emotional_analysis: emotionalAnalysis,
        audience_locations: locations || [],
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
    const message = error instanceof Error ? error.message : "Error procesando ADN";
    console.error("[generate-client-dna] Error:", message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
