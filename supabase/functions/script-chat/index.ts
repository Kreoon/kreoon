import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAIWithFallback, getAPIKey, corsHeaders } from "../_shared/ai-providers.ts";
import { searchWithPerplexity } from "../_shared/perplexity-client.ts";
import { checkAndDeductTokens, insufficientTokensResponse } from "../_shared/ai-token-guard.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentScript, productName, spherePhase, organizationId, use_perplexity } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validar y deducir tokens de IA (si la org tiene organization_ai_tokens)
    if (organizationId) {
      const estimatedCost = use_perplexity ? 145 : 25; // script_chat (25) + research (120) si Perplexity
      const tokenCheck = await checkAndDeductTokens(
        supabase,
        organizationId,
        "script_chat",
        estimatedCost
      );
      if (!tokenCheck.allowed) {
        return insufficientTokensResponse(tokenCheck);
      }
    }

    const googleKey = getAPIKey("gemini");
    const openaiKey = getAPIKey("openai");
    const anthropicKey = getAPIKey("anthropic");
    const perplexityKey = getAPIKey("perplexity");

    const configs = [
      ...(googleKey ? [{ provider: "gemini", model: "gemini-2.5-flash", apiKey: googleKey }] : []),
      ...(openaiKey ? [{ provider: "openai", model: "gpt-4o-mini", apiKey: openaiKey }] : []),
      ...(anthropicKey ? [{ provider: "anthropic", model: "claude-sonnet-4-20250514", apiKey: anthropicKey }] : []),
      ...(perplexityKey ? [{ provider: "perplexity", model: "llama-3.1-sonar-large-128k-online", apiKey: perplexityKey }] : []),
    ];

    if (configs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No AI API keys configured. Set GOOGLE_AI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY or PERPLEXITY_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let perplexityContext = "";
    if (use_perplexity) {
      const userMessage = Array.isArray(messages) && messages.length > 0
        ? (messages[messages.length - 1] as any)?.content || ""
        : "";
      if (userMessage.trim()) {
        try {
          const result = await searchWithPerplexity(supabase, organizationId || "default", userMessage, {
            recencyFilter: "week",
            maxTokens: 1500,
          });
          if (result.content) {
            perplexityContext = `

INVESTIGACIÓN EN TIEMPO REAL (Perplexity):
${result.content}

USA esta información para responder con datos actuales y relevantes.`;
          }
        } catch (e) {
          console.warn("[script-chat] Perplexity search failed:", (e as Error).message);
        }
      }
    }

    const systemPrompt = `Eres un experto en copywriting y guiones de video UGC. 
Tu tarea es ayudar a mejorar y refinar guiones de video basándote en las instrucciones del usuario.

CONTEXTO:
- Producto: ${productName || "No especificado"}
- Fase del embudo: ${spherePhase || "No especificada"}
${perplexityContext}

GUIÓN ACTUAL:
${currentScript}

INSTRUCCIONES CRÍTICAS:
1. SIEMPRE devuelve el guión COMPLETO con las modificaciones integradas, nunca solo la parte cambiada
2. Si el usuario pide cambiar los hooks, modifica SOLO los hooks pero devuelve el guión completo
3. Si el usuario pide cambiar el CTA, modifica SOLO el CTA pero devuelve el guión completo
4. Mantén intactas las secciones que el usuario NO pidió cambiar
5. Mantén el formato HTML del guión original
6. Sé creativo pero mantén la esencia del mensaje original
7. Responde en español
8. El guión debe estar listo para usar directamente, sin explicaciones adicionales

IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE el guión completo modificado, sin comentarios ni explicaciones antes o después.`;

    const userPrompt =
      Array.isArray(messages) && messages.length > 0
        ? messages.map((m: any) => `${m.role}: ${m.content || ""}`).join("\n\n")
        : "Usuario: Por favor mejora el guión.";

    const { result, usedProvider } = await callAIWithFallback(configs, systemPrompt, userPrompt);
    const assistantContent = typeof result === "string" ? result : String(result ?? "No se pudo generar una respuesta");

    console.log(`[script-chat] Success using ${usedProvider}`);

    // Nota: los tokens ya se dedujeron al inicio con checkAndDeductTokens

    return new Response(
      JSON.stringify({ content: assistantContent, provider: usedProvider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const err = error as any;
    if (err?.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (err?.status === 402) {
      return new Response(
        JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.error("Error in script-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
