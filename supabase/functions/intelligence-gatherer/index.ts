/**
 * Intelligence Gatherer - Edge Function
 * ADN Recargado v3 - Fase de recopilación de inteligencia
 *
 * Recopila Social Intelligence y Ad Intelligence en paralelo
 * usando Perplexity sonar-pro con búsqueda web real
 *
 * 4 tareas paralelas:
 * A - Social Intelligence (reviews, comentarios reales)
 * B - Meta Ads Intelligence (ads activos, patrones)
 * C - TikTok Intelligence (hooks virales, formatos)
 * D - Competitor Social Analysis (presencia en redes)
 */

import { createClient } from "npm:@supabase/supabase-js@2.46.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntelligenceInput {
  product_dna_id: string;
  session_id: string;
  organization_id: string;
  product_name: string;
  product_description: string;
  product_category?: string;
  locations: string[];
  competitor_urls: string[];
  inspiration_urls: string[];
  target_audience_description?: string;
  service_group?: string;
}

interface PhraseItem {
  phrase: string;
  source: string;
  frequency: "alta" | "media" | "baja";
  context?: string;
}

interface ObjectionItem {
  objection: string;
  source: string;
  type: "precio" | "tiempo" | "confianza" | "relevancia" | "complejidad" | "otro";
}

interface VocabItem {
  word: string;
  context: string;
  emotional_charge: "positivo" | "negativo" | "neutro";
}

interface SocialIntelligence {
  pain_phrases: PhraseItem[];
  desire_phrases: PhraseItem[];
  real_objections: ObjectionItem[];
  recommendation_reasons: string[];
  complaint_reasons: string[];
  common_vocabulary: VocabItem[];
  raw_insights: string;
  scraped_at: string;
}

interface MetaAdsIntelligence {
  dominant_hooks: string[];
  emotional_angles: string[];
  dominant_formats: string[];
  common_ctas: string[];
  main_promises: string[];
  visual_styles: string[];
  fatigued_angles: string[];
  untested_opportunities: string[];
}

interface TikTokAdsIntelligence {
  viral_hooks: string[];
  trending_audio_types: string[];
  best_creator_profile: string;
  native_formats: string[];
  organic_content_styles: string[];
}

interface CompetitorSocialItem {
  competitor_url: string;
  detected_name: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  top_content_types: string[];
  engagement_tone: string;
  main_hashtags: string[];
  key_promises: string[];
  what_works: string[];
  what_to_differentiate: string[];
}

interface AdIntelligence {
  meta_ads: MetaAdsIntelligence;
  tiktok_ads: TikTokAdsIntelligence;
  competitor_social: CompetitorSocialItem[];
  raw_insights: string;
  analyzed_at: string;
}

// ─── AI Helpers ──────────────────────────────────────────────────────────────

async function callPerplexity(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY no configurada");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGemini(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY no configurada");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4000 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callAI(
  prompt: string,
  systemPrompt: string,
  retries = 2
): Promise<string> {
  // Intentar Perplexity primero (tiene búsqueda web real)
  for (let i = 0; i <= retries; i++) {
    try {
      return await callPerplexity(prompt, systemPrompt);
    } catch (err) {
      console.error(`Perplexity intento ${i + 1} fallido:`, (err as Error).message);
      if (i < retries) await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
    }
  }

  // Fallback a Gemini
  console.log("Usando Gemini como fallback...");
  try {
    return await callGemini(prompt, systemPrompt);
  } catch (err) {
    console.error("Gemini también falló:", (err as Error).message);
    throw new Error("Todos los proveedores de AI fallaron");
  }
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    // Limpiar markdown fences si vienen
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Buscar el primer { y el último }
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.substring(start, end + 1));
    }

    return JSON.parse(clean);
  } catch {
    console.error(
      "Error parseando JSON, usando fallback. Texto recibido:",
      text.slice(0, 200)
    );
    return fallback;
  }
}

// ─── Task A: Social Intelligence ─────────────────────────────────────────────

async function gatherSocialIntelligence(
  input: IntelligenceInput
): Promise<SocialIntelligence> {
  const locationsStr = input.locations.join(", ") || "LATAM";
  const competitorsList =
    input.competitor_urls.slice(0, 3).join(", ") || "competidores similares";

  const systemPrompt = `Eres un investigador de mercado experto especializado en LATAM.
Tu misión: buscar y analizar lo que REALMENTE dice la gente sobre productos y servicios similares.
Debes buscar en: Amazon, Mercado Libre, Reddit, grupos de Facebook, comentarios de TikTok e Instagram.
Responde ÚNICAMENTE con JSON válido, sin markdown, sin explicaciones adicionales.
Usa español LATAM en todos los textos.`;

  const prompt = `Busca y analiza lo que dice la gente sobre productos/servicios como: "${input.product_name}"

Descripción del producto: ${input.product_description}
Mercado objetivo: ${locationsStr}
Competidores a analizar: ${competitorsList}

Realiza búsquedas en:
1. Reviews de Amazon: site:amazon.com OR site:amazon.com.mx OR site:amazon.co "${input.product_name}" reviews
2. Mercado Libre: site:mercadolibre.com.co OR site:mercadolibre.com.mx "${input.product_name}" opiniones
3. Reddit en español: site:reddit.com "${input.product_name}" experiencia OR recomendación
4. Comentarios en TikTok y Facebook sobre la categoría: "${input.product_name}" comentarios 2024 2025

Con la información encontrada, extrae y estructura lo siguiente en JSON:

{
  "pain_phrases": [
    {
      "phrase": "frase EXACTA como lo dice la gente, en sus propias palabras",
      "source": "amazon_review | mercadolibre | reddit | facebook | tiktok_comment",
      "frequency": "alta | media | baja",
      "context": "cuándo ocurre este dolor"
    }
  ],
  "desire_phrases": [
    {
      "phrase": "frase EXACTA expresando el resultado que desean",
      "source": "fuente",
      "frequency": "alta | media | baja",
      "context": "en qué situación lo desean"
    }
  ],
  "real_objections": [
    {
      "objection": "objeción EXACTA antes de comprar, en palabras del cliente",
      "source": "fuente",
      "type": "precio | tiempo | confianza | relevancia | complejidad | otro"
    }
  ],
  "recommendation_reasons": [
    "razón 1 por la que recomiendan productos similares",
    "razón 2..."
  ],
  "complaint_reasons": [
    "queja 1 más común sobre productos similares",
    "queja 2..."
  ],
  "common_vocabulary": [
    {
      "word": "palabra o frase corta que usa el mercado",
      "context": "en qué contexto la usan",
      "emotional_charge": "positivo | negativo | neutro"
    }
  ],
  "raw_insights": "párrafo de 150 palabras con los hallazgos más importantes para copywriting y estrategia"
}

IMPORTANTE:
- Las frases deben ser REALES, como las escribe la gente, no pulidas
- Mínimo 8 pain_phrases, 8 desire_phrases, 6 real_objections, 15 common_vocabulary
- Si no encuentras datos específicos, infiere con base en categorías similares en LATAM`;

  const raw = await callAI(prompt, systemPrompt);

  const fallback: Omit<SocialIntelligence, "scraped_at"> = {
    pain_phrases: [],
    desire_phrases: [],
    real_objections: [],
    recommendation_reasons: [],
    complaint_reasons: [],
    common_vocabulary: [],
    raw_insights: "No se pudo obtener información suficiente",
  };

  const parsed = parseJSON<Omit<SocialIntelligence, "scraped_at">>(raw, fallback);
  return { ...parsed, scraped_at: new Date().toISOString() };
}

// ─── Task B: Meta Ads Intelligence ───────────────────────────────────────────

async function gatherMetaAdsIntelligence(
  input: IntelligenceInput
): Promise<MetaAdsIntelligence> {
  const systemPrompt = `Eres un experto en Meta Ads y publicidad digital en LATAM.
Tu misión: analizar los ads activos de la competencia en Meta Ads Library y detectar patrones de la categoría.
Responde ÚNICAMENTE con JSON válido, sin markdown.
Usa español LATAM.`;

  const competitorsList =
    input.competitor_urls.slice(0, 5).join("\n- ") || "N/A";
  const locationsStr = input.locations.join(", ");

  const prompt = `Analiza los ads activos para la categoría: "${input.product_name}"
Descripción: ${input.product_description}
Mercados: ${locationsStr}
Competidores:
- ${competitorsList}

Busca en:
1. Meta Ads Library: https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(input.product_name)}
2. Anuncios activos de los competidores listados
3. Tendencias de ads en la categoría para LATAM 2024-2025

Estructura el análisis en JSON:

{
  "dominant_hooks": [
    "hook exacto o patrón de hook más usado en los primeros 3 segundos/primera línea de ads"
  ],
  "emotional_angles": [
    "ángulo emocional dominante: dolor | aspiración | curiosidad | social_proof | autoridad | urgencia | transformación"
  ],
  "dominant_formats": [
    "formato más usado: video_ugc | video_testimonial | imagen_producto | carrusel | video_demo | video_educativo"
  ],
  "common_ctas": [
    "CTAs más usados en la categoría"
  ],
  "main_promises": [
    "promesa principal que hace la categoría: qué resultado prometen"
  ],
  "visual_styles": [
    "estilos visuales dominantes: persona_real | producto_solo | lifestyle | antes_despues | texto_animado"
  ],
  "fatigued_angles": [
    "ángulos o formatos que ya están tan vistos que el mercado los ignora"
  ],
  "untested_opportunities": [
    "ángulos o formatos que nadie en la categoría está usando y podrían funcionar"
  ]
}

Mínimo: 5 items por campo. Si no tienes datos directos de Meta Ads Library, analiza la categoría general.`;

  const raw = await callAI(prompt, systemPrompt);

  return parseJSON<MetaAdsIntelligence>(raw, {
    dominant_hooks: [],
    emotional_angles: [],
    dominant_formats: [],
    common_ctas: [],
    main_promises: [],
    visual_styles: [],
    fatigued_angles: [],
    untested_opportunities: [],
  });
}

// ─── Task C: TikTok Intelligence ─────────────────────────────────────────────

async function gatherTikTokIntelligence(
  input: IntelligenceInput
): Promise<TikTokAdsIntelligence> {
  const systemPrompt = `Eres un experto en TikTok Ads y contenido orgánico viral en LATAM.
Tu misión: analizar qué funciona en TikTok para esta categoría de producto/servicio.
Responde ÚNICAMENTE con JSON válido, sin markdown.`;

  const prompt = `Analiza el contenido de TikTok (ads y orgánico) para la categoría: "${input.product_name}"
Descripción: ${input.product_description}
Mercados: ${input.locations.join(", ")}

Busca en:
1. TikTok Creative Center: https://ads.tiktok.com/business/creativecenter/inspiration/topads/
2. Búsqueda: "${input.product_name} tiktok" para ver contenido orgánico viral
3. Búsqueda: "${input.product_name} tiktok ads" para ver publicidad activa

Estructura en JSON:

{
  "viral_hooks": [
    "hook exacto o patrón de los primeros 1-3 segundos que genera scroll-stop y engancha en TikTok para esta categoría"
  ],
  "trending_audio_types": [
    "tipo de audio que funciona: trending_song | voz_original | sonido_viral | musica_energica | silencio_dramatic | voice_over"
  ],
  "best_creator_profile": "descripción del perfil de creador que mejor convierte en esta categoría en TikTok (edad, género, estilo, credibilidad)",
  "native_formats": [
    "formatos nativos de TikTok que dominan la categoría: duet | stitch | pov | dia_en_mi_vida | tutorial | before_after | trend_sound | unboxing"
  ],
  "organic_content_styles": [
    "estilo de contenido orgánico que genera más engagement y conversiones en esta categoría"
  ]
}

Mínimo 5 viral_hooks. Sé específico con los patrones de los hooks (ej: 'POV: llevas 3 meses buscando...' o 'Nadie te dice que...')`;

  const raw = await callAI(prompt, systemPrompt);

  return parseJSON<TikTokAdsIntelligence>(raw, {
    viral_hooks: [],
    trending_audio_types: [],
    best_creator_profile: "",
    native_formats: [],
    organic_content_styles: [],
  });
}

// ─── Task D: Competitor Social Analysis ──────────────────────────────────────

async function gatherCompetitorSocial(
  input: IntelligenceInput
): Promise<CompetitorSocialItem[]> {
  if (!input.competitor_urls || input.competitor_urls.length === 0) {
    return [];
  }

  const systemPrompt = `Eres un analista de redes sociales y marketing digital experto en LATAM.
Tu misión: analizar la presencia en redes sociales de los competidores identificados.
Responde ÚNICAMENTE con JSON válido (array), sin markdown.`;

  const competitorsToAnalyze = input.competitor_urls.slice(0, 4);

  const prompt = `Analiza la presencia en redes sociales de estos competidores del producto "${input.product_name}":

${competitorsToAnalyze.map((url, i) => `${i + 1}. ${url}`).join("\n")}

Para cada competidor, busca su cuenta en Instagram y TikTok y analiza:
- Tipo de contenido que más engagement genera
- Tono de comunicación con su audiencia
- Hashtags más usados
- Promesas y mensajes clave
- Lo que les funciona
- Oportunidades de diferenciación

Devuelve un array JSON:
[
  {
    "competitor_url": "url original",
    "detected_name": "nombre de la marca/empresa detectado",
    "instagram_handle": "@handle o null si no se encontró",
    "tiktok_handle": "@handle o null si no se encontró",
    "top_content_types": ["tipos de contenido que más engagement generan"],
    "engagement_tone": "descripción del tono: formal | cercano | inspiracional | educativo | humor | urgencia",
    "main_hashtags": ["hashtags más usados por ellos"],
    "key_promises": ["promesas principales que hacen en su contenido"],
    "what_works": ["qué está funcionando bien en su estrategia de contenido"],
    "what_to_differentiate": ["qué están haciendo MAL o qué oportunidad dejan abierta para diferenciarse"]
  }
]

Si no encuentras información de algún competidor, incluye el item con campos vacíos pero no lo omitas.`;

  const raw = await callAI(prompt, systemPrompt);

  return parseJSON<CompetitorSocialItem[]>(raw, []);
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input: IntelligenceInput = await req.json();

    // Validación básica
    if (
      !input.product_dna_id ||
      !input.product_name ||
      !input.organization_id
    ) {
      return new Response(
        JSON.stringify({
          error:
            "product_dna_id, product_name y organization_id son obligatorios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `🔍 Intelligence Gatherer iniciando para: ${input.product_name}`
    );
    console.log(`Competidores a analizar: ${input.competitor_urls?.length || 0}`);
    console.log(`Ubicaciones: ${input.locations?.join(", ")}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Actualizar sesión a 'gathering_intelligence'
    if (input.session_id) {
      await supabase
        .from("adn_research_sessions")
        .update({
          status: "gathering_intelligence",
          current_step: 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.session_id);
    }

    // ─── Ejecutar las 4 tareas en paralelo ───────────────
    console.log("🚀 Ejecutando 4 tareas de inteligencia en paralelo...");

    const [socialResult, metaAdsResult, tiktokResult, competitorResult] =
      await Promise.allSettled([
        gatherSocialIntelligence(input),
        gatherMetaAdsIntelligence(input),
        gatherTikTokIntelligence(input),
        gatherCompetitorSocial(input),
      ]);

    // Extraer resultados (con fallbacks si alguna tarea falló)
    const socialIntelligence: SocialIntelligence =
      socialResult.status === "fulfilled"
        ? socialResult.value
        : {
            pain_phrases: [],
            desire_phrases: [],
            real_objections: [],
            recommendation_reasons: [],
            complaint_reasons: [],
            common_vocabulary: [],
            raw_insights: "Error al obtener datos",
            scraped_at: new Date().toISOString(),
          };

    const adIntelligence: AdIntelligence = {
      meta_ads:
        metaAdsResult.status === "fulfilled"
          ? metaAdsResult.value
          : {
              dominant_hooks: [],
              emotional_angles: [],
              dominant_formats: [],
              common_ctas: [],
              main_promises: [],
              visual_styles: [],
              fatigued_angles: [],
              untested_opportunities: [],
            },
      tiktok_ads:
        tiktokResult.status === "fulfilled"
          ? tiktokResult.value
          : {
              viral_hooks: [],
              trending_audio_types: [],
              best_creator_profile: "",
              native_formats: [],
              organic_content_styles: [],
            },
      competitor_social:
        competitorResult.status === "fulfilled" ? competitorResult.value : [],
      raw_insights: "",
      analyzed_at: new Date().toISOString(),
    };

    // Log de errores si los hubo
    if (socialResult.status === "rejected")
      console.error("❌ Social Intelligence falló:", socialResult.reason);
    if (metaAdsResult.status === "rejected")
      console.error("❌ Meta Ads Intelligence falló:", metaAdsResult.reason);
    if (tiktokResult.status === "rejected")
      console.error("❌ TikTok Intelligence falló:", tiktokResult.reason);
    if (competitorResult.status === "rejected")
      console.error("❌ Competitor Social falló:", competitorResult.reason);

    console.log("✅ Todas las tareas completadas. Guardando en Supabase...");

    // ─── Guardar en Supabase ──────────────────────────────
    const { error: updateError } = await supabase
      .from("product_dna")
      .update({
        social_intelligence: socialIntelligence,
        ad_intelligence: adIntelligence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.product_dna_id);

    if (updateError) {
      console.error("❌ Error guardando en product_dna:", updateError);
      throw new Error(`Error guardando inteligencia: ${updateError.message}`);
    }

    // Actualizar sesión: intelligence gathering completado
    if (input.session_id) {
      await supabase
        .from("adn_research_sessions")
        .update({
          status: "researching",
          current_step: 2,
          progress: {
            intelligence_completed: true,
            social_intelligence_items:
              socialIntelligence.pain_phrases.length +
              socialIntelligence.desire_phrases.length,
            competitors_analyzed: adIntelligence.competitor_social.length,
            ads_patterns_found: adIntelligence.meta_ads.dominant_hooks.length,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.session_id);
    }

    console.log("✅ Intelligence Gatherer completado exitosamente");

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          pain_phrases_found: socialIntelligence.pain_phrases.length,
          desire_phrases_found: socialIntelligence.desire_phrases.length,
          objections_found: socialIntelligence.real_objections.length,
          vocab_items: socialIntelligence.common_vocabulary.length,
          meta_hooks_found: adIntelligence.meta_ads.dominant_hooks.length,
          tiktok_hooks_found: adIntelligence.tiktok_ads.viral_hooks.length,
          competitors_analyzed: adIntelligence.competitor_social.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error en intelligence-gatherer:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
