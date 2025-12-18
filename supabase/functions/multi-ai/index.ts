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

async function callClaude(messages: Message[]): Promise<AIResponse> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    return { model: "claude", content: "", success: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    // Convert messages format for Claude API
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

async function combineResponses(responses: AIResponse[], originalPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const successfulResponses = responses.filter(r => r.success);
  
  if (successfulResponses.length === 0) {
    throw new Error("No AI models responded successfully");
  }
  
  if (successfulResponses.length === 1) {
    return successfulResponses[0].content;
  }

  // Use Gemini to synthesize the best response from multiple models
  const synthesisPrompt = `Eres un experto en síntesis de información. Se te proporcionan respuestas de múltiples modelos de IA a la misma pregunta. Tu tarea es combinar lo mejor de cada respuesta en una única respuesta coherente, completa y bien estructurada.

PREGUNTA ORIGINAL:
${originalPrompt}

RESPUESTAS DE LOS MODELOS:

${successfulResponses.map((r, i) => `--- ${r.model.toUpperCase()} ---\n${r.content}\n`).join("\n")}

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
      // If synthesis fails, return the first successful response
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
    const { messages, models, mode = "combine" } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    // Default models if not specified
    const selectedModels = models || ["gemini", "gpt", "claude"];
    
    console.log("Calling models:", selectedModels);
    console.log("Mode:", mode);

    // Call all selected models in parallel
    const promises: Promise<AIResponse>[] = [];

    if (selectedModels.includes("gemini")) {
      promises.push(callLovableAI(messages, "google/gemini-2.5-flash"));
    }
    if (selectedModels.includes("gemini-pro")) {
      promises.push(callLovableAI(messages, "google/gemini-2.5-pro"));
    }
    if (selectedModels.includes("gpt")) {
      promises.push(callLovableAI(messages, "openai/gpt-5-mini"));
    }
    if (selectedModels.includes("gpt-pro")) {
      promises.push(callLovableAI(messages, "openai/gpt-5"));
    }
    if (selectedModels.includes("claude")) {
      promises.push(callClaude(messages));
    }

    const responses = await Promise.all(promises);
    
    console.log("Responses received:", responses.map(r => ({ model: r.model, success: r.success })));

    // Get the user's question for synthesis context
    const userMessage = messages.find(m => m.role === "user")?.content || "";

    if (mode === "combine") {
      // Combine all responses into one synthesized response
      const combinedResponse = await combineResponses(responses, userMessage);
      
      return new Response(
        JSON.stringify({
          response: combinedResponse,
          models_used: responses.filter(r => r.success).map(r => r.model),
          individual_responses: responses,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Return all responses separately
      return new Response(
        JSON.stringify({
          responses,
          models_used: responses.filter(r => r.success).map(r => r.model),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in multi-ai function:", error);
    
    // Handle rate limit errors
    if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
