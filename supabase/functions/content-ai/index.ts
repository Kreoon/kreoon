import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentAIRequest {
  action: "generate_script" | "analyze_content" | "chat" | "improve_script";
  data: {
    // For generate_script
    client_name?: string;
    product?: string;
    objective?: string;
    duration?: string;
    tone?: string;
    // For analyze_content
    script?: string;
    video_url?: string;
    // For chat
    messages?: Array<{ role: string; content: string }>;
    // For improve_script
    original_script?: string;
    feedback?: string;
  };
}

const SYSTEM_PROMPTS = {
  generate_script: `Eres un experto guionista de contenido para redes sociales y marketing digital. 
Generas guiones profesionales, creativos y efectivos para videos de TikTok, Instagram Reels y YouTube Shorts.

Estructura tus guiones con:
- HOOK (0-3s): Gancho inicial impactante
- PROBLEMA (3-10s): Identifica el pain point
- SOLUCIÓN (10-40s): Presenta la solución/producto
- CTA (40-60s): Llamada a la acción clara

Usa un formato claro con timestamps y descripciones visuales entre [corchetes].
Incluye sugerencias de música/sonidos cuando sea relevante.`,

  analyze_content: `Eres un experto en análisis de contenido de video y marketing digital.
Tu trabajo es analizar guiones y videos para dar feedback constructivo y específico.

Evalúa:
1. Enganche inicial (¿Captura atención en los primeros 3 segundos?)
2. Estructura narrativa
3. Claridad del mensaje
4. Llamada a la acción
5. Potencial viral
6. Áreas de mejora

Sé específico y da ejemplos concretos de cómo mejorar.`,

  chat: `Eres un asistente experto en producción de contenido de video y marketing digital.
Ayudas al equipo de Content Studio con:
- Ideas creativas para videos
- Estrategias de contenido
- Mejores prácticas de redes sociales
- Optimización de guiones
- Consejos de producción

Responde de manera profesional pero amigable, en español.`,

  improve_script: `Eres un editor experto de guiones para contenido de video.
Tu tarea es mejorar guiones existentes basándote en el feedback proporcionado.
Mantén la esencia del mensaje original mientras optimizas:
- Claridad
- Engagement
- Estructura
- Impacto emocional

Devuelve el guion mejorado con el mismo formato y marcas de tiempo.`,
};

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("Payment required");
    }
    const errorText = await response.text();
    console.error("AI Error:", errorText);
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, data, prompt, product, script_params } = body;

    console.log("Content AI Request:", { action });

    let result: string;

    switch (action) {
      case "generate_script": {
        // New strategist form script generation
        if (prompt && product) {
          const systemPrompt = `Eres un experto copywriter especializado en crear guiones de video para redes sociales (TikTok, Instagram Reels, YouTube Shorts).

Tu trabajo es crear guiones que:
- Sean naturales y conversacionales
- Tengan hooks de apertura potentes
- Sigan la estructura narrativa indicada
- Incluyan el CTA de forma natural
- Estén optimizados para el país objetivo (usa expresiones locales cuando sea apropiado)
- Sean fáciles de memorizar y grabar

Formato de respuesta:
- Usa formato Markdown
- Separa claramente las secciones: HOOKS, DESARROLLO, CIERRE/CTA
- Incluye indicaciones de tono/emoción entre corchetes [emocionado], [serio], etc.
- Indica pausas cuando sean necesarias`;

          result = await callAI(systemPrompt, prompt);
          
          return new Response(
            JSON.stringify({ success: true, script: result }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Legacy format
        const legacyPrompt = `Genera un guion de video para:

CLIENTE: ${data?.client_name || "Cliente"}
PRODUCTO/SERVICIO: ${data?.product || "Producto"}
OBJETIVO: ${data?.objective || "Generar awareness"}
DURACIÓN: ${data?.duration || "60 segundos"}
TONO: ${data?.tone || "Profesional y dinámico"}

Genera un guion completo con timestamps, descripciones visuales y sugerencias de audio.`;

        result = await callAI(SYSTEM_PROMPTS.generate_script, legacyPrompt);
        break;
      }

      case "analyze_content": {
        const analyzePrompt = `Analiza el siguiente contenido y proporciona feedback detallado:

${data?.script ? `GUION:\n${data.script}` : ""}
${data?.video_url ? `VIDEO URL: ${data.video_url}` : ""}

Proporciona un análisis completo con puntuación del 1-10 para cada aspecto y sugerencias específicas de mejora.`;

        result = await callAI(SYSTEM_PROMPTS.analyze_content, analyzePrompt);
        break;
      }

      case "chat": {
        if (!data?.messages || data.messages.length === 0) {
          throw new Error("Messages are required for chat");
        }

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY not configured");
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPTS.chat },
              ...data.messages,
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`AI request failed: ${response.status}`);
        }

        const aiData = await response.json();
        result = aiData.choices?.[0]?.message?.content || "";
        break;
      }

      case "improve_script": {
        const improvePrompt = `Mejora el siguiente guion basándote en el feedback proporcionado:

GUION ORIGINAL:
${data?.original_script || ""}

FEEDBACK:
${data?.feedback || "Hazlo más dinámico y atractivo"}

Devuelve el guion mejorado manteniendo el mismo formato.`;

        result = await callAI(SYSTEM_PROMPTS.improve_script, improvePrompt);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in content-ai function:", error);

    let status = 500;
    if (errorMessage.includes("Rate limit")) status = 429;
    if (errorMessage.includes("Payment required")) status = 402;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
