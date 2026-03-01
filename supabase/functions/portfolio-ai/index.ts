import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAIRequest, getAPIKey, corsHeaders } from "../_shared/ai-providers.ts";
// Fallback legacy
import { PORTFOLIO_PROMPTS } from "../_shared/portfolio-prompts.ts";
// Nuevo: Prompts desde DB con cache y fallback
import { getPrompt, interpolatePrompt } from "../_shared/prompts/db-prompts.ts";

interface AIRequest {
  action: "search" | "caption" | "bio" | "recommendations" | "moderation" | "blocks";
  payload: Record<string, unknown>;
  organizationId?: string;
  prompts?: {
    system: string;
    user: string;
    outputSchema?: Record<string, unknown>;
  };
}

/** Prompts centralizados - fallback cuando el frontend no envía prompts */
function getLocalPrompts(action: string, payload: Record<string, unknown>): { system: string; user: string } {
  const config = PORTFOLIO_PROMPTS[action];
  if (config) {
    return {
      system: config.system,
      user: config.userTemplate(payload ?? {}),
    };
  }
  return {
    system: "Eres un asistente útil. Responde SOLO en JSON válido.",
    user: JSON.stringify(payload),
  };
}

/** Obtiene prompts desde DB con fallback a hardcodeados */
async function getPromptsFromDB(
  supabase: any,
  action: string,
  payload: Record<string, unknown>
): Promise<{ system: string; user: string }> {
  try {
    const promptConfig = await getPrompt(supabase, "portfolio", action);
    if (promptConfig.systemPrompt) {
      return {
        system: promptConfig.systemPrompt,
        user: promptConfig.userPrompt
          ? interpolatePrompt(promptConfig.userPrompt, payload as Record<string, string>)
          : JSON.stringify(payload),
      };
    }
  } catch (err) {
    console.warn(`[portfolio-ai] Error fetching prompt from DB, using fallback:`, err);
  }
  return getLocalPrompts(action, payload);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleKey = getAPIKey("gemini");
    const openaiKey = getAPIKey("openai");

    if (!googleKey && !openaiKey) {
      throw new Error("No AI API keys configured. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY");
    }

    // Crear cliente Supabase para leer prompts desde DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, payload, organizationId, prompts } = (await req.json()) as AIRequest;

    console.log(`[portfolio-ai] Action: ${action}, Org: ${organizationId}, promptsFromFrontend: ${!!prompts}`);

    let systemPrompt: string;
    let userPrompt: string;

    if (prompts?.system && prompts?.user) {
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
    } else {
      // Intentar obtener prompts desde DB primero
      const dbPrompts = await getPromptsFromDB(supabase, action, payload ?? {});
      systemPrompt = dbPrompts.system;
      userPrompt = dbPrompts.user;
    }

    let result: any;
    let usedProvider = "";

    const config = { systemPrompt, userPrompt, temperature: 0.7 };

    let aiResult = googleKey
      ? await makeAIRequest({ provider: "gemini", model: "gemini-2.5-flash", apiKey: googleKey, ...config })
      : { success: false as const, error: "No Gemini key" };

    if (!aiResult.success && openaiKey) {
      console.log("[portfolio-ai] Falling back to OpenAI");
      aiResult = await makeAIRequest({
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: openaiKey,
        ...config,
      });
      usedProvider = "openai";
    } else if (aiResult.success) {
      usedProvider = "gemini";
    }

    if (!aiResult.success) {
      const err = aiResult.error ?? "AI error";
      if (err.includes("429")) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (err.includes("402")) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[portfolio-ai] AI error:", err);
      throw new Error(err);
    }

    const content = aiResult.content ?? "";

    try {
      result = JSON.parse(content);
    } catch {
      console.error("[portfolio-ai] Failed to parse AI response:", content);
      result = { raw: content };
    }

    console.log(`[portfolio-ai] Success for action: ${action} using ${usedProvider}`);

    return new Response(JSON.stringify({ success: true, data: result, provider: usedProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[portfolio-ai] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
