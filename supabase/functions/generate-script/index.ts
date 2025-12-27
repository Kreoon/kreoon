import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScriptRequest {
  organizationId: string;
  product_name: string;
  strategy: string;
  market_research: string;
  ideal_avatar: string;
  sales_angle: string;
  additional_context: string;
}

// Get module AI configuration with validation
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  if (!moduleData?.is_active) {
    throw new Error(`MODULE_INACTIVE:${moduleKey}`);
  }
  
  let provider = moduleData?.provider || "lovable";
  let model = moduleData?.model || "google/gemini-2.5-flash";
  let apiKey: string | null = null;
  
  if (provider !== "lovable") {
    const { data: providerData } = await supabase
      .from("organization_ai_providers")
      .select("api_key_encrypted")
      .eq("organization_id", organizationId)
      .eq("provider_key", provider)
      .eq("is_enabled", true)
      .maybeSingle();
    
    if (providerData?.api_key_encrypted) {
      apiKey = providerData.api_key_encrypted;
    } else {
      provider = "lovable";
      model = "google/gemini-2.5-flash";
    }
  }
  
  if (provider === "lovable") {
    apiKey = lovableApiKey || null;
  }
  
  if (!apiKey) {
    throw new Error("No hay API key configurada para el proveedor de IA");
  }
  
  return { provider, model, apiKey };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      organizationId,
      product_name, 
      strategy, 
      market_research, 
      ideal_avatar, 
      sales_angle, 
      additional_context 
    }: ScriptRequest = await req.json();

    console.log("Generating script for product:", product_name);

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate module is active
    let aiConfig;
    try {
      aiConfig = await getModuleAIConfig(supabase, organizationId, "scripts");
    } catch (error: any) {
      if (error.message?.startsWith("MODULE_INACTIVE:")) {
        return new Response(
          JSON.stringify({ 
            error: "MODULE_INACTIVE",
            module: "scripts",
            message: "El módulo de IA 'Generación de Guiones' no está habilitado. Actívalo en Configuración → IA & Modelos."
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    const systemPrompt = `Eres un experto copywriter especializado en crear guiones para videos UGC (User Generated Content) y anuncios en redes sociales. Tu objetivo es crear guiones persuasivos, naturales y que conecten emocionalmente con la audiencia.

Reglas para el guión:
1. Usa un tono conversacional y natural, como si hablaras con un amigo
2. Incluye un hook poderoso en los primeros 3 segundos
3. Estructura: Hook → Problema → Solución → Beneficios → CTA
4. Mantén el guión entre 30-60 segundos de lectura
5. Incluye indicaciones entre corchetes [ACCIÓN] para el creador
6. Evita sonar como publicidad tradicional
7. Usa storytelling cuando sea posible
8. El idioma debe ser español latinoamericano`;

    const userPrompt = `Crea un guión de video UGC para el siguiente producto:

**Producto:** ${product_name}

**Estrategia del producto:** ${strategy || 'No especificada'}

**Investigación de mercado:** ${market_research || 'No especificada'}

**Avatar ideal (cliente objetivo):** ${ideal_avatar || 'No especificado'}

**Ángulo de venta a usar:** ${sales_angle || 'General'}

${additional_context ? `**Indicaciones adicionales:** ${additional_context}` : ''}

Genera un guión completo listo para grabar, con indicaciones de acción para el creador.`;

    // Build request based on provider
    let url: string;
    let headers: Record<string, string>;
    let body: any;

    if (aiConfig.provider === "lovable") {
      url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };
    } else if (aiConfig.provider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      };
      body = {
        model: aiConfig.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };
    } else {
      // Fallback to lovable
      url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      };
      body = {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content || "";

    console.log("Script generated successfully with provider:", aiConfig.provider);

    // Log usage
    try {
      await supabase.from("ai_usage_logs").insert({
        organization_id: organizationId,
        user_id: "system",
        provider: aiConfig.provider,
        model: aiConfig.model,
        module: "scripts",
        action: "generate_script",
        success: true
      });
    } catch (e) {
      console.error("Failed to log AI usage:", e);
    }

    return new Response(
      JSON.stringify({ script, ai_provider: aiConfig.provider, ai_model: aiConfig.model }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
