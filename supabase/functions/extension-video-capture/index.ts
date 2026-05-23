import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com";
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // 15 MB limit for Edge Function

// ─────────────────────────────────────────────────────────────
// PROMPTS (adapted from Jarvis gemini-vision.ts + prompt-chain.ts)
// ─────────────────────────────────────────────────────────────

// Adapted from Jarvis VIDEO_ANALYSIS_PROMPT — full 10-section visual analysis
const VISUAL_ANALYSIS_PROMPT = `Eres un analista experto de contenido audiovisual para redes sociales en LATAM. Haz un desglose EXHAUSTIVO de este video/contenido.

Analiza CADA elemento y devuelve SOLO JSON válido con esta estructura:
{
  "transcription": "transcripción word-for-word de todo el audio, con timestamps aproximados [0:00] si aplica",
  "hook_visual": "descripción exacta de los primeros 3 segundos: qué se ve, qué texto aparece, qué emoción genera, qué técnica usa para captar atención",
  "scenes": "desglose escena por escena: timestamp, qué se ve, tipo de plano, ángulo, movimiento de cámara, iluminación",
  "text_on_screen": "lista exacta de todo texto en pantalla: contenido, posición, estilo, tiempo que aparece",
  "editing_style": "tipo de cortes, ritmo de edición (cortes/minuto), efectos visuales, filtros, transiciones, sincronización musical",
  "emotions": "emociones transmitidas, lenguaje corporal, energía (alta/media/baja), momentos clave de impacto emocional con timestamp",
  "music_audio": "tipo de música, género, energía, si es trending sound, cómo complementa el mensaje, nivel vs voz",
  "narrative_formula": "fórmula narrativa detectada: PAS/AIDA/StoryBrand/Storytelling personal/Tutorial/Testimonial/etc. — con explicación de por qué",
  "structure": "estructura detallada: Hook → Problema → Agitación → Solución → CTA u otra estructura detectada con timestamps",
  "emotion_triggers": ["trigger emocional 1", "trigger emocional 2", "trigger emocional 3"],
  "hooks": ["hook principal exacto (palabra por palabra)", "segundo gancho si existe"],
  "cta_type": "tipo de CTA detectado y cómo se ejecuta (verbal, texto, comentar, seguir, comprar, etc.)",
  "production_level": "calidad de producción (UGC casero / semi-pro / profesional), equipo estimado, nivel de edición (básica/intermedia/avanzada)",
  "viral_factors": ["factor viral 1: por qué funciona", "factor viral 2", "factor viral 3"],
  "whats_working": ["qué hace bien 1 con evidencia específica", "qué hace bien 2"],
  "replication_guide": ["cómo replicar elemento 1", "cómo replicar elemento 2", "cómo replicar elemento 3"],
  "viral_score": número del 0 al 100,
  "engagement_justification": "por qué este contenido tiene las métricas que tiene — análisis específico"
}`;

// For text-only analysis (when no video file available)
const TEXT_ANALYSIS_PROMPT = `Eres un auditor de contenido digital senior especializado en UGC para LATAM. Analiza este contenido con máximo detalle basándote en caption, métricas y metadata.

IMPORTANTE: Aunque no tengas el video, puedes detectar la metodología viral del caption, las métricas y el contexto.

Devuelve SOLO JSON válido:
{
  "transcription": "el caption completo como transcripción del mensaje principal del contenido",
  "hook_analysis": "análisis del hook en el caption: primera línea, técnica usada (pregunta/afirmación disruptiva/identificación/dato impactante/etc.)",
  "narrative_formula": "fórmula narrativa detectada en el caption: PAS/AIDA/StoryBrand/Storytelling/Microhistoria/Tutorial/etc.",
  "structure": "estructura narrativa del caption: cómo fluye de hook a CTA",
  "emotion_triggers": ["trigger emocional 1", "trigger emocional 2"],
  "hooks": ["primera frase/hook exacto", "segundo gancho si existe"],
  "cta_type": "tipo de CTA: comentar, seguir, guardar, comprar, mensaje directo, etc.",
  "engagement_analysis": "por qué este caption genera el engagement que tiene — análisis de cada elemento",
  "viral_factors": ["factor viral 1", "factor viral 2", "factor viral 3"],
  "whats_working": ["qué elemento del caption funciona y por qué", "otro elemento"],
  "replication_guide": ["cómo replicar este hook", "cómo replicar esta estructura", "qué elementos son transferibles"],
  "viral_score": número 0-100 basado en métricas y calidad del caption,
  "suggestions": ["sugerencia para adaptar a otro producto 1", "sugerencia 2"]
}`;

// Adapted from Jarvis prompt-chain P4 (Content Strategist) + Kreoon CAST methodology
const SCRIPT_GENERATION_PROMPT = `Eres KREOON AI, copywriter senior especializado en guiones UGC para Latinoamérica.

METODOLOGÍA CAST DE KREOON:
- CONOCER (TOFU): Hooks de identificación, audiencia fría, NO vender en los primeros 3s
- ATRAER (MOFU): Educación, posicionar la solución antes que el producto
- SEDUCIR (BOFU): Prueba social, demos, urgencia, objeciones
- TRANSFORMAR (FIDELIZAR): La transformación específica del avatar, CTA único sin fricción

FÓRMULAS DE COPYWRITING DISPONIBLES (elige la más adecuada al viral de referencia):
- PAS: Problema → Agitación → Solución
- AIDA: Atención → Interés → Deseo → Acción
- BAB: Before → After → Bridge
- StoryBrand: Avatar-Héroe, Marca-Guía, Problema-Villano, Solución-Plan, CTA
- Microhistoria personal: Situación → Conflicto → Resolución → Lección → CTA

PROCESO OBLIGATORIO (sigue estos pasos antes de escribir):
1. ANALIZA el avatar del producto y su nivel de consciencia (dormido/buscando/comparando/listo)
2. IDENTIFICA el dolor principal y deseo profundo del avatar
3. MAPEA la fórmula viral de referencia al avatar del producto
4. SELECCIONA el ángulo de venta más resonante de los disponibles
5. ESTRUCTURA el guión con la misma fórmula del viral pero para el producto
6. VALIDA que el hook pare el scroll en 2 segundos

REGLAS DE OUTPUT — formato teleprompter:
- Una idea por línea, sin párrafos largos
- Máximo 150 palabras (45-60 segundos de lectura natural)
- Indicaciones de acción [ENTRE CORCHETES] para el creator
- Español neutro latinoamericano (natural, no genérico, no corporativo)
- NO mencionar la fórmula ni la metodología en el guión`;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CaptureRequest {
  orgId: string;
  productId?: string;
  platform: string;
  videoUrl: string;
  videoBase64?: string;   // base64 bytes from content script (has cookies)
  videoMimeType?: string; // 'video/mp4' | 'image/jpeg'
  metadata: {
    title?: string;
    caption?: string;
    author?: string;
    views?: number;
    likes?: number;
    comments?: number;
    adCopy?: string;
  };
}

interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  strategy?: string;
  market_research?: string;
  ideal_avatar?: string;
  sales_angles?: string[];
  client_name?: string;
  client_id?: string;
}

interface ViralAnalysis {
  transcription: string;
  hooks: string[];
  structure: string;
  narrative_formula: string;
  emotion_triggers: string[];
  cta_type: string;
  viral_factors: string[];
  whats_working: string[];
  replication_guide: string[];
  viral_score: number;
  hook_analysis?: string;
  hook_visual?: string;
  scenes?: string;
  emotions?: string;
  text_on_screen?: string;
  suggestions?: string[];
}

// ─────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const body: CaptureRequest = await req.json();
    const { orgId, productId, platform, videoUrl, videoBase64, videoMimeType, metadata } = body;
    if (!orgId || !platform || !videoUrl) throw new Error("orgId, platform y videoUrl son requeridos");

    // Fetch product details in parallel with video analysis setup
    const [product] = await Promise.all([
      productId ? fetchProduct(supabase, productId) : Promise.resolve(null),
    ]);

    const startTime = Date.now();

    // ── STEP 1: Viral Analysis (Jarvis gemini-vision architecture) ──
    let analysis: ViralAnalysis = {
      transcription: metadata.caption || metadata.adCopy || "",
      hooks: [],
      structure: "",
      narrative_formula: "",
      emotion_triggers: [],
      cta_type: "",
      viral_factors: [],
      whats_working: [],
      replication_guide: [],
      viral_score: 50,
    };

    if (googleApiKey) {
      analysis = await analyzeViralContent({
        googleApiKey,
        platform,
        videoUrl,
        videoBase64,
        videoMimeType,
        metadata,
      });
    }

    // ── STEP 2: Script Generation (if product selected) ──
    let generatedScript = "";
    if (googleApiKey && product) {
      generatedScript = await generateAdaptedScript({
        googleApiKey,
        product,
        analysis,
        platform,
        metadata,
      });
    }

    const responseTime = Date.now() - startTime;

    // ── STEP 3: Create content item ──
    const contentTitle = buildTitle(platform, metadata);

    const contentData: Record<string, unknown> = {
      organization_id: orgId,
      title: contentTitle,
      // Description = structured viral analysis reference for the guionizador
      description: buildViralReference(platform, metadata, analysis),
      // Script = only set if explicitly generated for a product; otherwise guionizador generates it
      ...(generatedScript ? { script: generatedScript } : {}),
      status: "draft",
      creation_mode: "manual",
    };
    if (product?.client_id) contentData.client_id = product.client_id;
    if (product?.id) contentData.product_id = product.id;

    const { data: contentItem, error: insertError } = await supabase
      .from("content")
      .insert(contentData)
      .select("id")
      .single();

    if (insertError) throw new Error(`Error al crear item: ${insertError.message}`);

    if (googleApiKey) {
      logAIUsage(supabase, {
        organization_id: orgId,
        user_id: user.id,
        module: "extension_capture",
        action: `capture_${platform}${product ? "_with_script" : ""}`,
        provider: "gemini",
        model: GEMINI_MODEL,
        tokens_input: 0,
        tokens_output: 0,
        success: true,
        edge_function: "extension-video-capture",
        response_time_ms: responseTime,
      }).catch(console.error);
    }

    return new Response(
      JSON.stringify({
        transcription: analysis.transcription,
        viralScore: analysis.viral_score,
        hooks: analysis.hooks,
        structure: analysis.structure,
        narrative_formula: analysis.narrative_formula,
        emotion_triggers: analysis.emotion_triggers,
        viral_factors: analysis.viral_factors,
        replication_guide: analysis.replication_guide,
        suggestions: analysis.suggestions || analysis.replication_guide,
        generatedScript: generatedScript || undefined,
        contentItemId: contentItem?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno";
    console.error("[extension-video-capture]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      {
        status: msg.includes("Unauthorized") ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ─────────────────────────────────────────────────────────────
// Step 1: Viral Analysis
// Architecture: Jarvis gemini-vision.ts — try video upload → fallback to text
// ─────────────────────────────────────────────────────────────

async function analyzeViralContent({
  googleApiKey,
  platform,
  videoUrl,
  videoBase64,
  videoMimeType,
  metadata,
}: {
  googleApiKey: string;
  platform: string;
  videoUrl: string;
  videoBase64?: string;
  videoMimeType?: string;
  metadata: CaptureRequest["metadata"];
}): Promise<ViralAnalysis> {

  const isYouTube = platform === "youtube" && videoUrl.includes("youtube.com");
  const textContext = buildTextContext(platform, metadata, videoUrl);

  // Level 1 (best): YouTube native URL — Gemini reads audio + video directly
  if (isYouTube) {
    return await analyzeWithYouTubeUrl(googleApiKey, videoUrl, textContext);
  }

  // Level 2: Full video bytes from content script (page context had cookies)
  if (videoBase64 && videoMimeType === "video/mp4") {
    console.log("[extension-video-capture] Using content-script video bytes");
    const result = await analyzeWithBase64Video(googleApiKey, videoBase64, textContext);
    if (result) return result;
  }

  // Level 3: Canvas frame from content script (always works as visual fallback)
  if (videoBase64 && videoMimeType === "image/jpeg") {
    console.log("[extension-video-capture] Using content-script frame capture");
    const result = await analyzeWithFrame(googleApiKey, videoBase64, textContext);
    if (result) return result;
  }

  // Level 4: Try CDN download server-side (usually fails for IG/TT without cookies)
  if (videoUrl && videoUrl.startsWith("http") && !videoUrl.startsWith("blob:")) {
    const result = await analyzeWithVideoFile(googleApiKey, videoUrl, textContext);
    if (result) return result;
  }

  // Final fallback: deep text/caption analysis
  return await analyzeWithText(googleApiKey, textContext);
}

// YouTube — native URL understanding (Gemini reads audio + video directly)
async function analyzeWithYouTubeUrl(
  apiKey: string,
  youtubeUrl: string,
  textContext: string,
): Promise<ViralAnalysis> {
  const response = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { file_data: { mime_type: "video/mp4", file_uri: youtubeUrl } },
            { text: `${VISUAL_ANALYSIS_PROMPT}\n\n${textContext}` },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    // Gemini may not support all YouTube URLs — fall back to text
    return analyzeWithText(apiKey, textContext);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseAnalysis(text, metadata_fallback(textContext));
}

// Full video base64 — uploaded to Gemini File API (content script had page cookies)
async function analyzeWithBase64Video(
  apiKey: string,
  base64Data: string,
  textContext: string,
): Promise<ViralAnalysis | null> {
  try {
    // Decode base64 → ArrayBuffer
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    const chunkSize = 8192;
    for (let i = 0; i < binaryStr.length; i += chunkSize) {
      for (let j = i; j < Math.min(i + chunkSize, binaryStr.length); j++) {
        bytes[j] = binaryStr.charCodeAt(j);
      }
    }
    const videoBuffer = bytes.buffer;
    console.log(`[extension-video-capture] Decoded video: ${Math.round(videoBuffer.byteLength / 1024)}KB`);

    return await uploadAndAnalyzeVideo(apiKey, videoBuffer, "video/mp4", textContext);
  } catch (err) {
    console.warn("[extension-video-capture] Base64 decode/upload failed:", (err as Error).message);
    return null;
  }
}

// Canvas frame base64 — inline_data image analysis (no file upload needed)
async function analyzeWithFrame(
  apiKey: string,
  frameBase64: string,
  textContext: string,
): Promise<ViralAnalysis | null> {
  try {
    const FRAME_PROMPT = `${VISUAL_ANALYSIS_PROMPT}

NOTA: Solo tienes acceso a UN FRAME del video (no al video completo). Analiza todo lo que puedes ver en ese frame: composición, texto en pantalla, expresión facial, tipo de plano, iluminación, branding. Complementa con el caption y las métricas para inferir la estructura narrativa, el hook y la fórmula viral.`;

    const res = await fetch(
      `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: frameBase64 } },
              { text: `${FRAME_PROMPT}\n\n${textContext}` },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 6144,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return null;
    console.log("[extension-video-capture] Frame analysis complete");
    return parseAnalysis(text, metadata_fallback(textContext));
  } catch (err) {
    console.warn("[extension-video-capture] Frame analysis failed:", (err as Error).message);
    return null;
  }
}

// Shared upload helper used by analyzeWithBase64Video and analyzeWithVideoFile
async function uploadAndAnalyzeVideo(
  apiKey: string,
  videoBuffer: ArrayBuffer,
  mimeType: string,
  textContext: string,
): Promise<ViralAnalysis | null> {
  // Step 1: Start resumable upload
  const initRes = await fetch(
    `${GEMINI_BASE}/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(videoBuffer.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
      },
      body: JSON.stringify({ file: { display_name: "viral-video.mp4" } }),
    }
  );

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) return null;

  // Step 2: Upload bytes
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(videoBuffer.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: videoBuffer,
  });

  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri;
  if (!fileUri) return null;

  // Step 3: Poll PROCESSING → ACTIVE
  const fileName = uploadData.file.name;
  let state = uploadData.file.state;
  let attempts = 0;
  while (state === "PROCESSING" && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${GEMINI_BASE}/v1beta/${fileName}?key=${apiKey}`);
    state = (await statusRes.json()).state;
    attempts++;
  }

  if (state !== "ACTIVE") return null;

  // Step 4: Analyze with visual prompt
  const analysisRes = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { file_data: { mime_type: mimeType, file_uri: fileUri } },
            { text: `${VISUAL_ANALYSIS_PROMPT}\n\n${textContext}` },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const analysisData = await analysisRes.json();
  const analysisText = analysisData.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!analysisText) return null;

  console.log("[extension-video-capture] Video analysis complete via File API");
  return parseAnalysis(analysisText, metadata_fallback(textContext));
}

// Video file — download from CDN + upload to Gemini (fallback, usually fails for IG/TT)
async function analyzeWithVideoFile(
  apiKey: string,
  videoUrl: string,
  textContext: string,
): Promise<ViralAnalysis | null> {
  try {
    const videoRes = await fetch(videoUrl, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!videoRes.ok) return null;

    const contentLength = Number(videoRes.headers.get("content-length") || "0");
    if (contentLength > MAX_VIDEO_BYTES) return null;

    const videoBytes = await videoRes.arrayBuffer();
    if (videoBytes.byteLength > MAX_VIDEO_BYTES) return null;

    console.log(`[extension-video-capture] CDN video downloaded: ${Math.round(videoBytes.byteLength / 1024)}KB`);
    return await uploadAndAnalyzeVideo(apiKey, videoBytes, "video/mp4", textContext);
  } catch (err) {
    console.warn("[extension-video-capture] CDN video download failed:", (err as Error).message);
    return null;
  }
}

// Text-only fallback — deep caption/metadata analysis (Jarvis post-analyzer fallback pattern)
async function analyzeWithText(
  apiKey: string,
  textContext: string,
): Promise<ViralAnalysis> {
  const response = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${TEXT_ANALYSIS_PROMPT}\n\n${textContext}` }],
        }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseAnalysis(text, metadata_fallback(textContext));
}

// ─────────────────────────────────────────────────────────────
// Step 2: Script Generation
// Architecture: Jarvis prompt-chain.ts P4 (Content Strategist) + CAST
// ─────────────────────────────────────────────────────────────

async function generateAdaptedScript({
  googleApiKey,
  product,
  analysis,
  platform,
  metadata,
}: {
  googleApiKey: string;
  product: ProductInfo;
  analysis: ViralAnalysis;
  platform: string;
  metadata: CaptureRequest["metadata"];
}): Promise<string> {

  const productContext = `PRODUCTO A PROMOCIONAR:
- Nombre: ${product.name}
- Marca/Cliente: ${product.client_name || "Sin especificar"}
- Descripción: ${product.description || "No especificada"}
- Estrategia: ${product.strategy || "No especificada"}
- Avatar ideal: ${product.ideal_avatar || "No especificado"}
- Ángulos de venta: ${(product.sales_angles || []).join(", ") || "No especificados"}
- Research de mercado: ${product.market_research ? product.market_research.substring(0, 300) : "No disponible"}`;

  const viralContext = `CONTENIDO VIRAL DE REFERENCIA (${platform} — @${metadata.author || "desconocido"}):
- Score viral: ${analysis.viral_score}/100
- Fórmula narrativa: ${analysis.narrative_formula || "No identificada"}
- Estructura: ${analysis.structure || "No identificada"}
- Hook principal: "${analysis.hooks[0] || "No identificado"}"
- Triggers emocionales: ${analysis.emotion_triggers.join(", ") || "No identificados"}
- Tipo de CTA: ${analysis.cta_type || "No identificado"}
- Qué hace bien: ${analysis.whats_working.join(" | ") || "N/A"}
- Guía de replicación: ${analysis.replication_guide.join(" | ") || "N/A"}
- Transcripción/Caption: "${analysis.transcription.substring(0, 500)}"`;

  const instruction = `${productContext}

${viralContext}

INSTRUCCIÓN:
Genera un guión UGC para "${product.name}" aplicando EXACTAMENTE la misma fórmula narrativa (${analysis.narrative_formula || "detectada arriba"}) y estructura del viral de referencia.

PROCESO:
1. Identifica el nivel de consciencia del avatar del producto
2. Mapea el hook viral al dolor específico del avatar
3. Adapta la estructura ${analysis.structure || "del viral"} al producto
4. Usa los mismos tipos de triggers emocionales pero para el producto
5. Cierra con el mismo tipo de CTA (${analysis.cta_type || "seguir/comprar"})

El resultado debe sonar auténtico, en español LATAM natural, sin que parezca copiado del viral.`;

  const response = await fetch(
    `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: SCRIPT_GENERATION_PROMPT },
            { text: instruction },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function fetchProduct(supabase: ReturnType<typeof createClient>, productId: string): Promise<ProductInfo | null> {
  const { data } = await supabase
    .from("products")
    .select("id,name,description,strategy,market_research,ideal_avatar,sales_angles,client_id,clients(name)")
    .eq("id", productId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    strategy: data.strategy,
    market_research: data.market_research,
    ideal_avatar: data.ideal_avatar,
    sales_angles: data.sales_angles,
    client_id: data.client_id,
    client_name: (data.clients as { name?: string } | null)?.name,
  };
}

function buildTextContext(platform: string, metadata: CaptureRequest["metadata"], videoUrl: string): string {
  const isAd = platform === "meta-ads" || platform === "tiktok-ads";
  const parts: string[] = [`PLATAFORMA: ${platform.toUpperCase()}`];

  if (metadata.author) parts.push(`CREADOR: @${metadata.author}`);
  if (metadata.title) parts.push(`TÍTULO: ${metadata.title}`);
  if (metadata.caption) parts.push(`CAPTION COMPLETO:\n"${metadata.caption}"`);
  if (isAd && metadata.adCopy) parts.push(`COPY DEL ANUNCIO:\n"${metadata.adCopy}"`);

  const metrics: string[] = [];
  if (metadata.likes) metrics.push(`${formatNumber(metadata.likes)} likes`);
  if (metadata.views) metrics.push(`${formatNumber(metadata.views)} vistas`);
  if (metadata.comments) metrics.push(`${formatNumber(metadata.comments)} comentarios`);
  if (metrics.length) parts.push(`MÉTRICAS: ${metrics.join(" | ")}`);
  parts.push(`URL: ${videoUrl}`);

  return parts.join("\n");
}

function parseAnalysis(text: string, fallback: Partial<ViralAnalysis>): ViralAnalysis {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        transcription: parsed.transcription || fallback.transcription || "",
        hooks: parsed.hooks || [],
        structure: parsed.structure || "",
        narrative_formula: parsed.narrative_formula || "",
        emotion_triggers: parsed.emotion_triggers || [],
        cta_type: parsed.cta_type || "",
        viral_factors: parsed.viral_factors || [],
        whats_working: parsed.whats_working || [],
        replication_guide: parsed.replication_guide || parsed.suggestions || [],
        viral_score: typeof parsed.viral_score === "number" ? parsed.viral_score : 50,
        hook_analysis: parsed.hook_analysis,
        hook_visual: parsed.hook_visual,
        scenes: parsed.scenes,
        emotions: parsed.emotions,
        text_on_screen: parsed.text_on_screen,
        suggestions: parsed.suggestions || parsed.replication_guide,
      };
    }
  } catch (e) {
    console.warn("[extension-video-capture] JSON parse failed, using raw text");
  }
  return {
    transcription: fallback.transcription || text.substring(0, 500),
    hooks: [],
    structure: "",
    narrative_formula: "",
    emotion_triggers: [],
    cta_type: "",
    viral_factors: [],
    whats_working: [],
    replication_guide: [],
    viral_score: 50,
  };
}

function metadata_fallback(textContext: string): Partial<ViralAnalysis> {
  const captionMatch = textContext.match(/CAPTION COMPLETO:\n"([^"]+)"/);
  return { transcription: captionMatch?.[1] || "" };
}

function buildTitle(platform: string, metadata: CaptureRequest["metadata"]): string {
  const date = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  if (metadata.author) return `Viral @${metadata.author} — ${platform.toUpperCase()} ${date}`;
  if (metadata.title) return `${metadata.title.substring(0, 60)} — ${date}`;
  return `Referencia viral ${platform.toUpperCase()} — ${date}`;
}

// Structured viral analysis reference for the guionizador
// Saved in `description` so the script generator can use it as context
function buildViralReference(
  platform: string,
  metadata: CaptureRequest["metadata"],
  analysis: ViralAnalysis,
): string {
  const lines: string[] = [
    `📊 REFERENCIA VIRAL — ${platform.toUpperCase()}`,
    `Fuente: ${metadata.author ? `@${metadata.author}` : "Desconocido"} · Score viral: ${analysis.viral_score}/100`,
  ];

  const metrics: string[] = [];
  if (metadata.views) metrics.push(`${formatNumber(metadata.views)} vistas`);
  if (metadata.likes) metrics.push(`${formatNumber(metadata.likes)} likes`);
  if (metadata.comments) metrics.push(`${formatNumber(metadata.comments)} comentarios`);
  if (metrics.length) lines.push(`Métricas: ${metrics.join(" · ")}`);

  if (analysis.narrative_formula) lines.push(`\n🎯 FÓRMULA NARRATIVA\n${analysis.narrative_formula}`);
  if (analysis.structure) lines.push(`\n🏗️ ESTRUCTURA\n${analysis.structure}`);

  if (analysis.hooks.length) {
    lines.push(`\n🪝 HOOKS DETECTADOS`);
    analysis.hooks.forEach(h => lines.push(`• ${h}`));
  }

  if (analysis.emotion_triggers.length) {
    lines.push(`\n💡 TRIGGERS EMOCIONALES`);
    analysis.emotion_triggers.forEach(t => lines.push(`• ${t}`));
  }

  if (analysis.cta_type) lines.push(`\n📣 CTA\n${analysis.cta_type}`);

  if (analysis.whats_working?.length) {
    lines.push(`\n✅ QUÉ FUNCIONA`);
    analysis.whats_working.slice(0, 3).forEach(w => lines.push(`• ${w}`));
  }

  if (analysis.replication_guide?.length) {
    lines.push(`\n🔁 GUÍA DE REPLICACIÓN`);
    analysis.replication_guide.slice(0, 3).forEach(r => lines.push(`• ${r}`));
  }

  if (analysis.transcription) {
    lines.push(`\n📝 TRANSCRIPCIÓN`);
    lines.push(analysis.transcription.substring(0, 800));
  }

  if (metadata.caption && !analysis.transcription) {
    lines.push(`\n📝 CAPTION ORIGINAL`);
    lines.push(metadata.caption.substring(0, 500));
  }

  lines.push(`\n---\n⚡ Usa esta referencia en el Guionizador para adaptar la fórmula a tu producto.`);

  return lines.join("\n");
}

function formatNumber(n?: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
