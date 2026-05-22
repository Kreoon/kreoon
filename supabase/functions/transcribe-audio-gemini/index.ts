import { corsHeaders } from "../_shared/ai-providers.ts";

// ── JSON repair ──────────────────────────────────────────────────────
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

// ── Step 1: Transcribe with OpenAI Whisper ───────────────────────────
async function transcribeWithWhisper(audioFile: File): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

  // Normalize MIME type: strip codecs suffix that Whisper doesn't recognize
  // e.g. "audio/webm;codecs=opus" → "audio/webm", "audio/ogg;codecs=opus" → "audio/ogg"
  const rawMimeType = audioFile.type || "audio/webm";
  const mimeType = rawMimeType.split(";")[0].trim().toLowerCase();

  const extMap: Record<string, string> = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "video/mp4": ".mp4",   // Safari puede grabar como video/mp4
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/flac": ".flac",
    "audio/aac": ".m4a",
    "audio/x-m4a": ".m4a",
  };
  const ext = extMap[mimeType] || ".webm";
  const fileName = audioFile.name && audioFile.name !== "blob" && audioFile.name.includes(".")
    ? audioFile.name
    : `recording${ext}`;

  // Normalizar video/mp4 → audio/mp4 para Whisper (solo acepta audio)
  const whisperMimeType = mimeType === "video/mp4" ? "audio/mp4" : mimeType;

  // Read audio bytes explicitly — Deno FormData File may not transfer bytes when re-wrapped
  const audioBytes = await audioFile.arrayBuffer();
  console.log(`[transcribe] Audio: name=${fileName}, origName=${audioFile.name}, bytes=${audioBytes.byteLength}, rawType=${rawMimeType}, normalizedType=${whisperMimeType}`);

  if (audioBytes.byteLength === 0) {
    throw new Error("Audio file is empty (0 bytes)");
  }

  // Create a fresh Blob from raw bytes with normalized MIME type (sin codecs suffix)
  const properFile = new File([audioBytes], fileName, { type: whisperMimeType });

  const form = new FormData();
  form.append("file", properFile, fileName);
  form.append("model", "whisper-1");
  form.append("language", "es");
  form.append("response_format", "text");

  console.log(`[transcribe] Sending to Whisper: fileSize=${properFile.size}, fileName=${fileName}, mimeType=${whisperMimeType}`);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[transcribe] Whisper error:", res.status, errText);
    throw new Error(`Whisper ${res.status}: ${errText.slice(0, 300)}`);
  }

  const text = await res.text();
  console.log(`[transcribe] Whisper transcription: ${text.length} chars`);
  return text.trim();
}

// ── Step 2: Emotional analysis with Gemini (text-only, no audio) ─────
async function analyzeEmotions(transcription: string): Promise<Record<string, unknown>> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!geminiKey) {
    console.warn("[transcribe] No Gemini key, skipping emotional analysis");
    return {};
  }

  const prompt = `Eres un experto analista de comunicación y psicología. Analiza esta transcripción de un dueño de negocio describiendo su empresa.

El texto proviene de respuestas a preguntas guía organizadas en bloques (identidad del negocio, cliente ideal, solución, estrategia comercial).

TRANSCRIPCIÓN:
"""
${transcription}
"""

Analiza el texto para detectar:
- Estado emocional general inferido del lenguaje
- Nivel de confianza expresado (0-100)
- Emociones por segmento/tema
- Temas que generan más entusiasmo
- Temas que parecen preocuparle
- Recomendaciones para el tono del contenido de la marca

RESPONDE ÚNICAMENTE con este JSON exacto (sin markdown, sin texto adicional):
{
  "overall_mood": "enthusiastic|confident|uncertain|stressed|calm|passionate",
  "confidence_level": 75,
  "emotional_segments": [
    {
      "topic": "nombre del tema",
      "emotion": "entusiasmo",
      "intensity": "high",
      "notes": "Descripción breve"
    }
  ],
  "communication_style": {
    "pace": "slow|moderate|fast",
    "clarity": "very_clear|clear|somewhat_unclear",
    "energy": "low|moderate|high"
  },
  "notable_hesitations": ["ejemplo"],
  "passion_topics": ["tema1", "tema2"],
  "concern_areas": ["tema1", "tema2"],
  "content_recommendations": {
    "suggested_tone": "Descripción del tono recomendado",
    "avoid_topics": ["tema"],
    "emphasize_topics": ["tema"]
  }
}`;

  console.log("[transcribe] Calling Gemini for emotional analysis (text-only)...");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.warn("[transcribe] Gemini emotional analysis failed:", res.status, errText);
    return {};
  }

  const data = await res.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) return {};

  try {
    const repaired = repairJsonForParse(responseText);
    const parsed = JSON.parse(repaired);
    console.log(`[transcribe] Emotional analysis done. Mood: ${parsed.overall_mood}`);
    return parsed;
  } catch {
    console.warn("[transcribe] Failed to parse emotional analysis JSON");
    return {};
  }
}

// ── Main handler ─────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Soporte dual: JSON con base64 (nuevo) o FormData (legacy)
    const contentType = req.headers.get("content-type") || "";
    let audioFile: File;

    if (contentType.includes("application/json")) {
      // Nuevo path: { audio_base64: string, audio_type: string, audio_name?: string }
      const body = await req.json();
      const { audio_base64, audio_type, audio_name } = body as {
        audio_base64?: string;
        audio_type?: string;
        audio_name?: string;
      };

      if (!audio_base64) {
        return new Response(
          JSON.stringify({ success: false, error: "audio_base64 requerido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decodificar base64 → bytes
      const binaryStr = atob(audio_base64);
      const audioBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) audioBytes[i] = binaryStr.charCodeAt(i);

      // Mapa MIME type → extensión
      const extMap2: Record<string, string> = {
        "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a",
        "video/mp4": ".mp4", "audio/mpeg": ".mp3", "audio/wav": ".wav",
        "audio/x-wav": ".wav", "audio/flac": ".flac", "audio/aac": ".m4a",
        "audio/x-m4a": ".m4a", "audio/m4a": ".m4a",
      };

      // Mapa extensión de archivo → MIME type normalizado para Whisper
      const nameExtMap: Record<string, string> = {
        ".m4a": "audio/mp4", ".mp4": "audio/mp4", ".mp3": "audio/mpeg",
        ".wav": "audio/wav", ".ogg": "audio/ogg", ".flac": "audio/flac",
        ".webm": "audio/webm", ".oga": "audio/ogg", ".mpga": "audio/mpeg",
      };

      // Prioridad 1: extensión del nombre de archivo original (más confiable que MIME type en Windows)
      let fileName2: string;
      let whisperMime2: string;

      if (audio_name && audio_name.includes(".")) {
        // Usar el nombre original del archivo preservando su extensión
        const origExt = audio_name.substring(audio_name.lastIndexOf(".")).toLowerCase();
        fileName2 = `recording${origExt}`;
        whisperMime2 = nameExtMap[origExt] || "audio/mp4";
      } else {
        // Prioridad 2: derivar de MIME type
        const rawMime = (audio_type || "audio/webm").split(";")[0].trim().toLowerCase();
        const ext2 = extMap2[rawMime] || ".webm";
        fileName2 = `recording${ext2}`;
        whisperMime2 = rawMime === "video/mp4" ? "audio/mp4" : (rawMime || "audio/webm");
      }

      console.log(`[transcribe] Base64 path: bytes=${audioBytes.byteLength}, origName=${audio_name}, fileName=${fileName2}, mimeType=${whisperMime2}`);
      audioFile = new File([audioBytes], fileName2, { type: whisperMime2 });

    } else {
      // Legacy path: FormData
      const formData = await req.formData();
      const rawFile = formData.get("audio") as File | null;

      if (!rawFile) {
        return new Response(
          JSON.stringify({ success: false, error: "No audio file provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      audioFile = rawFile;
      console.log(`[transcribe] FormData path: name=${audioFile.name}, size=${audioFile.size}, type=${audioFile.type}`);
    }

    // Step 1: Transcribe with Whisper (reliable, purpose-built for speech-to-text)
    const transcription = await transcribeWithWhisper(audioFile);

    if (!transcription) {
      throw new Error("Transcripción vacía - no se detectó audio válido");
    }

    // Step 2: Emotional analysis with Gemini text-only (non-blocking — if it fails, we still return transcription)
    let emotional_analysis: Record<string, unknown> = {};
    try {
      emotional_analysis = await analyzeEmotions(transcription);
    } catch (err) {
      console.warn("[transcribe] Emotional analysis failed, continuing without it:", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcription,
        emotional_analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando audio";
    console.error("[transcribe] Error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
