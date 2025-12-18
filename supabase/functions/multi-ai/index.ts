import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

interface ProviderStatus {
  lovable: boolean;
  anthropic: boolean;
  openrouter: boolean;
  google_drive: boolean;
}

// Verificar qué APIs están disponibles
function getAvailableProviders(): ProviderStatus {
  return {
    lovable: !!Deno.env.get("LOVABLE_API_KEY"),
    anthropic: !!Deno.env.get("ANTHROPIC_API_KEY"),
    openrouter: !!Deno.env.get("OPENROUTER_API_KEY"),
    google_drive: !!(Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") && Deno.env.get("GOOGLE_DRIVE_CLIENT_SECRET")),
  };
}

// Llamar a Lovable AI (Gemini, GPT)
async function callLovableAI(messages: Message[], model: string): Promise<AIResponse> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    return { model, content: "", success: false, error: "LOVABLE_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error with ${model}:`, errorText);
      return { model, content: "", success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    return { model, content, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error calling ${model}:`, error);
    return { model, content: "", success: false, error: errorMessage };
  }
}

// Llamar a Claude (Anthropic)
async function callClaude(messages: Message[]): Promise<AIResponse> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error with Claude:", errorText);
      return { model: "claude", content: "", success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    
    return { model: "claude", content, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error calling Claude:", error);
    return { model: "claude", content: "", success: false, error: errorMessage };
  }
}

// Llamar a OpenRouter (cualquier LLM)
async function callOpenRouter(messages: Message[], model: string): Promise<AIResponse> {
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  
  if (!OPENROUTER_API_KEY) {
    return { model: `openrouter/${model}`, content: "", success: false, error: "OPENROUTER_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://lovable.dev",
        "X-Title": "Content Studio",
      },
      body: JSON.stringify({
        model,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error with OpenRouter (${model}):`, errorText);
      return { model: `openrouter/${model}`, content: "", success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    return { model: `openrouter/${model}`, content, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error calling OpenRouter (${model}):`, error);
    return { model: `openrouter/${model}`, content: "", success: false, error: errorMessage };
  }
}

// Combinar respuestas de múltiples IAs
async function combineResponses(responses: AIResponse[], originalPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const successfulResponses = responses.filter(r => r.success);
  
  if (successfulResponses.length === 0) {
    throw new Error("No AI models responded successfully");
  }
  
  if (successfulResponses.length === 1) {
    return successfulResponses[0].content;
  }

  if (!LOVABLE_API_KEY) {
    // Si no hay Lovable AI, concatenar las respuestas
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
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    const { 
      messages, 
      models, 
      mode = "combine",
      openRouterModel, // Modelo específico de OpenRouter (ej: "anthropic/claude-3-opus", "meta-llama/llama-3-70b")
      action // "status" para obtener estado de proveedores
    } = await req.json();

    // Endpoint para verificar estado de proveedores
    if (action === "status") {
      const providers = getAvailableProviders();
      return new Response(
        JSON.stringify({ 
          providers,
          availableModels: {
            lovable: providers.lovable ? ["gemini", "gemini-pro", "gpt", "gpt-pro"] : [],
            anthropic: providers.anthropic ? ["claude"] : [],
            openrouter: providers.openrouter ? ["any model from openrouter.ai"] : [],
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
    let selectedModels = models || [];
    
    if (selectedModels.length === 0) {
      if (providers.lovable) {
        selectedModels.push("gemini", "gpt");
      }
      if (providers.anthropic) {
        selectedModels.push("claude");
      }
      if (providers.openrouter && openRouterModel) {
        selectedModels.push("openrouter");
      }
    }
    
    console.log("Calling models:", selectedModels);
    console.log("Mode:", mode);

    // Call all selected models in parallel
    const promises: Promise<AIResponse>[] = [];

    for (const model of selectedModels) {
      switch (model) {
        case "gemini":
          if (providers.lovable) {
            promises.push(callLovableAI(messages, "google/gemini-2.5-flash"));
          }
          break;
        case "gemini-pro":
          if (providers.lovable) {
            promises.push(callLovableAI(messages, "google/gemini-2.5-pro"));
          }
          break;
        case "gpt":
          if (providers.lovable) {
            promises.push(callLovableAI(messages, "openai/gpt-5-mini"));
          }
          break;
        case "gpt-pro":
          if (providers.lovable) {
            promises.push(callLovableAI(messages, "openai/gpt-5"));
          }
          break;
        case "claude":
          if (providers.anthropic) {
            promises.push(callClaude(messages));
          }
          break;
        case "openrouter":
          if (providers.openrouter && openRouterModel) {
            promises.push(callOpenRouter(messages, openRouterModel));
          }
          break;
        default:
          // Si el modelo empieza con "openrouter:", usar OpenRouter
          if (model.startsWith("openrouter:") && providers.openrouter) {
            const orModel = model.replace("openrouter:", "");
            promises.push(callOpenRouter(messages, orModel));
          }
      }
    }

    if (promises.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No AI providers available or configured. Add API keys in the backend settings.",
          providers
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responses = await Promise.all(promises);
    
    console.log("Responses received:", responses.map(r => ({ model: r.model, success: r.success, error: r.error })));

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
