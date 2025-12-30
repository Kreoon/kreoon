import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get module AI configuration with validation
async function getModuleAIConfig(supabase: any, organizationId: string, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
  // If module not configured or inactive, use lovable as default
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
      // Fallback to lovable
      provider = "lovable";
      model = "google/gemini-2.5-flash";
    }
  }
  
  return {
    provider,
    model,
    apiKey: apiKey || lovableApiKey,
    isActive: moduleData?.is_active !== false // Default to active if not configured
  };
}

// Make AI request based on provider
async function makeAIRequest(aiConfig: any, systemPrompt: string, userPrompt: string) {
  const { provider, model, apiKey } = aiConfig;
  
  let apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  let body: any = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
  };

  if (provider === "openai") {
    apiUrl = "https://api.openai.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else if (provider === "anthropic") {
    apiUrl = "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    body = {
      model: model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    };
  } else if (provider === "gemini") {
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    delete headers["Authorization"];
    body = {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.3 }
    };
  } else {
    // Lovable AI Gateway (default)
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error (${provider}):`, response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract content based on provider
  let content: string;
  if (provider === "anthropic") {
    content = data.content?.[0]?.text || "";
  } else if (provider === "gemini") {
    content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    content = data.choices?.[0]?.message?.content || "";
  }
  
  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, bio, skills, experience, organizationId } = await req.json();
    
    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI configuration for registration module
    const aiConfig = await getModuleAIConfig(supabase, organizationId, "registration");
    
    console.log(`Using AI provider: ${aiConfig.provider}, model: ${aiConfig.model}`);

    const systemPrompt = "Eres un experto en análisis de perfiles para plataformas de contenido UGC. Tu trabajo es sugerir el rol más adecuado basándote en la información proporcionada. Siempre responde en JSON válido.";

    const userPrompt = `Analiza el siguiente perfil de usuario y sugiere el rol más adecuado para una plataforma de contenido UGC.

Información del usuario:
- Nombre: ${fullName || 'No proporcionado'}
- Email: ${email || 'No proporcionado'}
- Biografía/Descripción: ${bio || 'No proporcionado'}
- Habilidades: ${skills || 'No proporcionado'}
- Experiencia: ${experience || 'No proporcionado'}

Roles disponibles:
1. "creator" - Creadores de contenido (influencers, creadores UGC, personas que generan videos/fotos)
2. "editor" - Editores de video/foto (post-producción, motion graphics, diseño)
3. "client" - Marcas o empresas que buscan contenido

Analiza el perfil y responde SOLO con un JSON válido con esta estructura:
{
  "suggestedRole": "creator" | "editor" | "client",
  "confidence": 0.0 a 1.0,
  "reasoning": "Explicación breve de por qué se sugiere este rol"
}`;

    const content = await makeAIRequest(aiConfig, systemPrompt, userPrompt);

    // Parse JSON response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", content);
      result = {
        suggestedRole: "creator",
        confidence: 0.5,
        reasoning: "No se pudo analizar el perfil automáticamente"
      };
    }

    // Log AI usage
    try {
      await supabase.from("ai_usage_logs").insert({
        organization_id: organizationId,
        module: "registration",
        action: "suggest_role",
        provider: aiConfig.provider,
        model: aiConfig.model,
        user_id: "00000000-0000-0000-0000-000000000000", // System user for registration
        success: true
      });
    } catch (logError) {
      console.error("Error logging AI usage:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        provider: aiConfig.provider,
        model: aiConfig.model
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error suggesting role:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error al sugerir rol',
        suggestedRole: "creator",
        confidence: 0.3,
        reasoning: "Error en el análisis, sugerencia por defecto"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
