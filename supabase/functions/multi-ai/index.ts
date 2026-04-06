import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage, calculateCost } from "../_shared/ai-usage-logger.ts";
import {
  checkRateLimit,
  RATE_LIMIT_PRESETS,
  rateLimitResponse,
  getClientIp,
} from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  model: string;
  content: string;
  success: boolean;
  error?: string;
  tokens_input?: number;
  tokens_output?: number;
  response_time_ms?: number;
}

interface ProviderStatus {
  gemini: boolean;
  openai: boolean;
  anthropic: boolean;
}

// Verificar qué APIs están disponibles
function getAvailableProviders(): ProviderStatus {
  return {
    gemini: !!Deno.env.get("GOOGLE_AI_API_KEY"),
    openai: !!Deno.env.get("OPENAI_API_KEY"),
    anthropic: !!Deno.env.get("ANTHROPIC_API_KEY"),
  };
}

// Llamar a Gemini directamente
async function callGemini(messages: Message[], model: string = "gemini-2.5-flash"): Promise<AIResponse> {
  const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
  const startTime = Date.now();

  if (!GOOGLE_AI_API_KEY) {
    return { model, content: "", success: false, error: "GOOGLE_AI_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    const response_time_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error with Gemini ${model}:`, errorText);
      return { model, content: "", success: false, error: `HTTP ${response.status}`, response_time_ms };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const tokens_input = data.usage?.prompt_tokens || 0;
    const tokens_output = data.usage?.completion_tokens || 0;

    return {
      model: `gemini/${model}`,
      content,
      success: true,
      tokens_input,
      tokens_output,
      response_time_ms,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error calling Gemini ${model}:`, error);
    return { model, content: "", success: false, error: errorMessage, response_time_ms: Date.now() - startTime };
  }
}

// Llamar a OpenAI directamente
async function callOpenAI(messages: Message[], model: string = "gpt-4o-mini"): Promise<AIResponse> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const startTime = Date.now();

  if (!OPENAI_API_KEY) {
    return { model, content: "", success: false, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    const response_time_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error with OpenAI ${model}:`, errorText);
      return { model, content: "", success: false, error: `HTTP ${response.status}`, response_time_ms };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const tokens_input = data.usage?.prompt_tokens || 0;
    const tokens_output = data.usage?.completion_tokens || 0;

    return {
      model: `openai/${model}`,
      content,
      success: true,
      tokens_input,
      tokens_output,
      response_time_ms,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error calling OpenAI ${model}:`, error);
    return { model, content: "", success: false, error: errorMessage, response_time_ms: Date.now() - startTime };
  }
}

// Llamar a Claude (Anthropic)
async function callClaude(messages: Message[]): Promise<AIResponse> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const startTime = Date.now();

  if (!ANTHROPIC_API_KEY) {
    return { model: "claude", content: "", success: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const conversationMessages = messages.filter(m => m.role !== "system").map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemMessage,
        messages: conversationMessages,
      }),
    });

    const response_time_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error with Claude:", errorText);
      return { model: "claude", content: "", success: false, error: `HTTP ${response.status}`, response_time_ms };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    const tokens_input = data.usage?.input_tokens || 0;
    const tokens_output = data.usage?.output_tokens || 0;

    return {
      model: "anthropic/claude-sonnet-4",
      content,
      success: true,
      tokens_input,
      tokens_output,
      response_time_ms,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error calling Claude:", error);
    return { model: "claude", content: "", success: false, error: errorMessage, response_time_ms: Date.now() - startTime };
  }
}

// Combinar respuestas de múltiples IAs usando Gemini
async function combineResponses(responses: AIResponse[], originalPrompt: string): Promise<string> {
  const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");

  const successfulResponses = responses.filter(r => r.success);

  if (successfulResponses.length === 0) {
    throw new Error("No AI models responded successfully");
  }

  if (successfulResponses.length === 1) {
    return successfulResponses[0].content;
  }

  if (!GOOGLE_AI_API_KEY) {
    // Si no hay Gemini API, concatenar las respuestas
    return successfulResponses.map(r => `**${r.model}:**\n${r.content}`).join("\n\n---\n\n");
  }

  const synthesisPrompt = `Eres un experto en síntesis de información. Se te proporcionan respuestas de múltiples modelos de IA a la misma pregunta. Tu tarea es combinar lo mejor de cada respuesta en una única respuesta coherente, completa y bien estructurada.

PREGUNTA ORIGINAL:
${originalPrompt}

RESPUESTAS DE LOS MODELOS:

${successfulResponses.map((r) => `--- ${r.model.toUpperCase()} ---\n${r.content}\n`).join("\n")}

INSTRUCCIONES:
1. Identifica los puntos clave únicos de cada respuesta
2. Combina la información de manera coherente
3. Elimina redundancias
4. Mantén el mejor formato y estructura
5. La respuesta final debe ser mejor que cualquiera individual

Proporciona la respuesta sintetizada:`;

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "user", content: synthesisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      return successfulResponses[0].content;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || successfulResponses[0].content;
  } catch (error) {
    console.error("Error in synthesis:", error);
    return successfulResponses[0].content;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Rate limiting por IP (función sin auth obligatoria) ──────────────────
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabaseForRL = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const clientIp = getClientIp(req);
      const rateLimitResult = await checkRateLimit(
        supabaseForRL,
        clientIp,
        RATE_LIMIT_PRESETS.ai,
      );
      if (!rateLimitResult.allowed) {
        return rateLimitResponse(req, rateLimitResult, RATE_LIMIT_PRESETS.ai.limit);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const {
      messages,
      models,
      mode = "combine",
      action // "status" para obtener estado de proveedores
    } = await req.json();

    // Endpoint para verificar estado de proveedores
    if (action === "status") {
      const providers = getAvailableProviders();
      return new Response(
        JSON.stringify({
          providers,
          availableModels: {
            gemini: providers.gemini ? ["gemini-2.5-flash", "gemini-2.5-pro"] : [],
            openai: providers.openai ? ["gpt-4o", "gpt-4o-mini"] : [],
            anthropic: providers.anthropic ? ["claude-sonnet-4"] : [],
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const providers = getAvailableProviders();
    console.log("Available providers:", providers);

    // Auto-detectar modelos disponibles si no se especifican
    const selectedModels = models || [];

    if (selectedModels.length === 0) {
      if (providers.gemini) {
        selectedModels.push("gemini", "gemini-pro");
      }
      if (providers.openai) {
        selectedModels.push("gpt");
      }
      if (providers.anthropic) {
        selectedModels.push("claude");
      }
    }

    console.log("Calling models:", selectedModels);
    console.log("Mode:", mode);

    // Call all selected models in parallel
    const promises: Promise<AIResponse>[] = [];

    for (const model of selectedModels) {
      switch (model) {
        case "gemini":
          if (providers.gemini) {
            promises.push(callGemini(messages, "gemini-2.5-flash"));
          }
          break;
        case "gemini-pro":
          if (providers.gemini) {
            promises.push(callGemini(messages, "gemini-2.5-pro"));
          }
          break;
        case "gpt":
          if (providers.openai) {
            promises.push(callOpenAI(messages, "gpt-4o-mini"));
          }
          break;
        case "gpt-pro":
          if (providers.openai) {
            promises.push(callOpenAI(messages, "gpt-4o"));
          }
          break;
        case "claude":
          if (providers.anthropic) {
            promises.push(callClaude(messages));
          }
          break;
      }
    }

    if (promises.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No AI providers available. Configure GOOGLE_AI_API_KEY or OPENAI_API_KEY.",
          providers
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responses = await Promise.all(promises);

    console.log("Responses received:", responses.map(r => ({ model: r.model, success: r.success, error: r.error })));

    // Log AI usage for each response (fire and forget)
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Log each model's response asynchronously
      for (const r of responses) {
        const provider = r.model.split("/")[0] || "unknown";
        const modelName = r.model.split("/")[1] || r.model;

        logAIUsage(supabase, {
          organization_id: "00000000-0000-0000-0000-000000000000", // System-level usage
          user_id: "00000000-0000-0000-0000-000000000000",
          module: "multi-ai",
          action: mode,
          provider,
          model: modelName,
          tokens_input: r.tokens_input,
          tokens_output: r.tokens_output,
          estimated_cost: r.tokens_input && r.tokens_output
            ? calculateCost(modelName, r.tokens_input, r.tokens_output)
            : undefined,
          success: r.success,
          error_message: r.error,
          edge_function: "multi-ai",
          response_time_ms: r.response_time_ms,
        }).catch(err => console.error("[multi-ai] Error logging usage:", err));
      }
    }

    const userMessage = messages.find(m => m.role === "user")?.content || "";

    if (mode === "combine") {
      const combinedResponse = await combineResponses(responses, userMessage);

      return new Response(
        JSON.stringify({
          response: combinedResponse,
          models_used: responses.filter(r => r.success).map(r => r.model),
          individual_responses: responses,
          providers,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (mode === "first") {
      const firstSuccess = responses.find(r => r.success);
      return new Response(
        JSON.stringify({
          response: firstSuccess?.content || "",
          model_used: firstSuccess?.model,
          providers,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // mode === "individual"
      return new Response(
        JSON.stringify({
          responses,
          models_used: responses.filter(r => r.success).map(r => r.model),
          providers,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in multi-ai function:", error);

    if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (errorMessage.includes("402")) {
      return new Response(
        JSON.stringify({ error: "Payment required. Please add credits to your account." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
