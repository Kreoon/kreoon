import { createClient } from "npm:@supabase/supabase-js@2.46.2";
import { corsHeaders, getAPIKey } from "../_shared/ai-providers.ts";
import {
  checkAndDeductTokens,
  insufficientTokensResponse,
} from "../_shared/ai-token-guard.ts";

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

  console.log("[generate-project-dna] Transcribing audio with Whisper...");
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
    console.error("[generate-project-dna] Whisper error:", errText);
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const transcription = await response.text();
  console.log(`[generate-project-dna] Transcription: ${transcription.length} chars`);
  return transcription.trim();
}

// ── Perplexity AI call ──────────────────────────────────────────────────
async function callPerplexity(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getAPIKey("perplexity");
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not configured");

  console.log("[generate-project-dna] Calling Perplexity...");
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 8000,
      temperature: 0.3,
      return_citations: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-project-dna] Perplexity error:", errText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Gemini fallback ─────────────────────────────────────────────────────
async function callGeminiFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  console.log("[generate-project-dna] Falling back to Gemini...");
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
        max_tokens: 8000,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("[generate-project-dna] Gemini error:", errText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ── Project-type specific prompt focus ──────────────────────────────────
const PROJECT_TYPE_FOCUS: Record<string, string> = {
  content_creation:
    "Enfocate en estrategia de contenido digital, seleccion de plataformas (TikTok, Instagram, YouTube), formatos de contenido, calendario editorial, engagement y crecimiento de audiencia.",
  post_production:
    "Enfocate en pipeline de produccion, software y herramientas de edicion, gestion de revisiones, formatos de entrega, flujo de trabajo entre equipo creativo y editor.",
  strategy_marketing:
    "Enfocate en estrategia multicanal, segmentacion de audiencia, embudo de conversion, KPIs medibles, presupuesto publicitario y ROI esperado.",
  technology:
    "Enfocate en arquitectura tecnica, stack tecnologico, metodologia de desarrollo, testing, CI/CD, escalabilidad y seguridad.",
  education:
    "Enfocate en diseño instruccional, progresion de aprendizaje, formato de contenido educativo (video, texto, interactivo), evaluacion del aprendizaje y plataforma de distribucion.",
};

// ── System Prompt ───────────────────────────────────────────────────────
function buildSystemPrompt(projectType: string): string {
  const typeFocus = PROJECT_TYPE_FOCUS[projectType] || "";

  return `Eres un estratega senior de proyectos creativos y digitales para el mercado latinoamericano. Tu tarea es analizar el ADN de un proyecto y generar un analisis estrategico completo que sirva como guia de inicio.

TIPO DE PROYECTO: ${projectType}
${typeFocus ? `\nENFOQUE ESPECIFICO:\n${typeFocus}` : ""}

INSTRUCCIONES:
- Analiza TODO lo proporcionado: respuestas escritas y transcripcion de audio (si existe)
- Si algo no se menciona, INFIERE de forma inteligente basandote en el tipo de proyecto y contexto
- Las recomendaciones deben ser ESPECIFICAS y ACCIONABLES, no genericas
- Todo en español
- El plan de accion debe tener exactamente 5 pasos priorizados para iniciar el proyecto

Genera un JSON con EXACTAMENTE esta estructura:

{
  "project_summary": "Resumen claro del proyecto en 2-3 oraciones que capture la esencia, objetivo y alcance",
  "target_audience": "Descripcion detallada de la audiencia objetivo (demograficos, intereses, necesidades)",
  "key_objectives": ["Objetivo especifico y medible 1", "Objetivo 2", "Objetivo 3"],
  "recommended_approach": "Estrategia recomendada adaptada al tipo de proyecto (3-4 oraciones con enfoque practico)",
  "action_plan": [
    { "step": 1, "action": "Primera accion critica para iniciar", "why": "Justificacion de por que es prioritario" },
    { "step": 2, "action": "Segunda accion", "why": "Justificacion" },
    { "step": 3, "action": "Tercera accion", "why": "Justificacion" },
    { "step": 4, "action": "Cuarta accion", "why": "Justificacion" },
    { "step": 5, "action": "Quinta accion", "why": "Justificacion" }
  ],
  "success_metrics": ["Metrica de exito concreta 1", "Metrica 2", "Metrica 3"],
  "risks_and_considerations": ["Riesgo o consideracion 1 con sugerencia de mitigacion", "Riesgo 2 con mitigacion"],
  "estimated_complexity": "Baja|Media|Alta",
  "complexity_justification": "Explicacion breve de por que tiene esta complejidad"
}

Responde UNICAMENTE con el JSON. Sin markdown, sin explicaciones, sin texto adicional.`;
}

// ── Format written responses for prompt ─────────────────────────────────
function formatResponses(responses: Record<string, string>): string {
  const entries = Object.entries(responses).filter(([, v]) => v?.trim());
  if (entries.length === 0) return "";

  return entries
    .map(([key, value]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return `${label}: ${value}`;
    })
    .join("\n");
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const projectId = body.project_id;

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: "project_id es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-project-dna] Starting for project: ${projectId}`);

    // ── 1. Fetch project from marketplace_projects ────────────────────────
    const { data: project, error: fetchError } = await supabase
      .from("marketplace_projects")
      .select("id, brief, project_type, organization_id, title")
      .eq("id", projectId)
      .single();

    if (fetchError || !project) {
      throw new Error(`Project not found: ${fetchError?.message || "unknown"}`);
    }

    const brief = project.brief || {};
    const dna = brief.dna || {};
    const responses: Record<string, string> = dna.responses || {};
    const audioUrl: string | null = dna.audio_url || null;
    const projectType: string = project.project_type || "content_creation";

    console.log(`[generate-project-dna] Project loaded - type: ${projectType}, org: ${project.organization_id}, responses: ${Object.keys(responses).length}, audio: ${!!audioUrl}`);

    // ── 2. Check & deduct tokens ──────────────────────────────────────────
    if (project.organization_id) {
      const tokenCheck = await checkAndDeductTokens(
        supabase,
        project.organization_id,
        "dna.project_analysis",
        400,
        {
          ai_provider: "perplexity",
          ai_model: "sonar-pro",
          description: `Project DNA analysis: ${project.title || projectId}`,
        }
      );

      if (!tokenCheck.allowed) {
        return insufficientTokensResponse(tokenCheck);
      }
    }

    // ── 3. Transcribe audio (if audio_url exists) ─────────────────────────
    let transcription = "";

    if (audioUrl) {
      try {
        console.log(`[generate-project-dna] Downloading audio from: ${audioUrl}`);

        let audioBlob: Blob;
        if (audioUrl.includes("supabase.co/storage")) {
          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) throw new Error(`Failed to download audio: ${audioResponse.status}`);
          audioBlob = await audioResponse.blob();
        } else {
          const path = audioUrl.replace(/^.*\/audio-recordings\//, "");
          const { data: audioData, error: audioError } = await supabase.storage
            .from("audio-recordings")
            .download(path);
          if (audioError || !audioData) throw new Error(`Storage download error: ${audioError?.message}`);
          audioBlob = audioData;
        }

        console.log(`[generate-project-dna] Audio downloaded: ${audioBlob.size} bytes`);
        transcription = await transcribeWithWhisper(audioBlob);
      } catch (audioErr) {
        console.error("[generate-project-dna] Audio processing failed, continuing without:", audioErr);
      }
    }

    // ── 4. Build prompts ──────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(projectType);
    const responsesText = formatResponses(responses);

    let userPrompt = `Proyecto: ${project.title || "Sin titulo"}\nTipo: ${projectType}`;

    if (responsesText) {
      userPrompt += `\n\n--- RESPUESTAS DEL BRIEF ---\n${responsesText}\n--- FIN RESPUESTAS ---`;
    }

    if (transcription) {
      userPrompt += `\n\n--- TRANSCRIPCION DE AUDIO ---\n${transcription}\n--- FIN TRANSCRIPCION ---`;
    }

    console.log(`[generate-project-dna] Prompt built: ${userPrompt.length} chars (transcription: ${transcription.length}, responses: ${responsesText.length})`);

    // ── 5. Generate analysis with Perplexity (fallback to Gemini) ─────────
    let aiResponse: string;
    let usedProvider = "perplexity";
    try {
      aiResponse = await callPerplexity(systemPrompt, userPrompt);
    } catch (err) {
      console.warn("[generate-project-dna] Perplexity failed, trying Gemini:", err);
      aiResponse = await callGeminiFallback(systemPrompt, userPrompt);
      usedProvider = "gemini";
    }

    // ── 6. Parse AI response ──────────────────────────────────────────────
    const repaired = repairJsonForParse(aiResponse);
    let analysisData;
    try {
      analysisData = JSON.parse(repaired);
    } catch (parseErr) {
      console.error("[generate-project-dna] JSON parse failed:", parseErr);
      console.error("[generate-project-dna] Raw response:", aiResponse.substring(0, 500));
      throw new Error("Error al parsear la respuesta de IA. Intenta de nuevo.");
    }

    console.log("[generate-project-dna] Analysis generated, keys:", Object.keys(analysisData).join(", "));

    // ── 7. Update marketplace_projects.brief with ai_analysis ─────────────
    const updatedDna = {
      ...dna,
      ai_analysis: {
        ...analysisData,
        generated_at: new Date().toISOString(),
        ai_provider: usedProvider,
        ai_model: usedProvider === "perplexity" ? "sonar-pro" : "gemini-2.5-flash",
      },
      transcription: transcription || dna.transcription || null,
    };

    const updatedBrief = { ...brief, dna: updatedDna };

    const { error: updateError } = await supabase
      .from("marketplace_projects")
      .update({ brief: updatedBrief })
      .eq("id", projectId);

    if (updateError) {
      throw new Error(`Error updating project: ${updateError.message}`);
    }

    console.log(`[generate-project-dna] Project updated: ${projectId} → analysis saved`);

    return new Response(
      JSON.stringify({
        success: true,
        project_id: projectId,
        analysis: updatedDna.ai_analysis,
        has_transcription: !!transcription,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error procesando proyecto";
    console.error("[generate-project-dna] Error:", message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
