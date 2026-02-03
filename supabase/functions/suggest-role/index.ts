import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getModuleAIConfig } from "../_shared/get-module-ai-config.ts";
import { makeAIRequest, corsHeaders } from "../_shared/ai-providers.ts";

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

    const aiConfig = await getModuleAIConfig(supabase, organizationId, "registration", { requireActive: false });
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

    const result = await makeAIRequest({
      ...aiConfig,
      systemPrompt,
      userPrompt,
      temperature: 0.3,
    });

    if (!result.success) {
      console.error("AI API error:", result.error);
      throw new Error(result.error ?? "AI API error");
    }

    const content = result.content ?? "";

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
