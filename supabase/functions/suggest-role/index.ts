import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, bio, skills, experience } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analiza el siguiente perfil de usuario y sugiere el rol más adecuado para una plataforma de contenido UGC.

Roles disponibles:
- creator: Crea contenido original, graba videos, es influencer o tiene presencia en redes sociales
- editor: Edita videos, tiene habilidades técnicas de postproducción, maneja software de edición
- client: Es marca, empresa, emprendedor que busca contenido para su negocio

Información del usuario:
- Nombre: ${fullName || 'No especificado'}
- Email: ${email || 'No especificado'}
- Bio/Descripción: ${bio || 'No especificado'}
- Habilidades: ${skills || 'No especificadas'}
- Experiencia: ${experience || 'No especificada'}

Responde ÚNICAMENTE con un objeto JSON con este formato exacto:
{
  "suggested_role": "creator" | "editor" | "client",
  "confidence": número del 0 al 100,
  "reasoning": "breve explicación de 1-2 oraciones"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Eres un experto en análisis de perfiles para plataformas de contenido UGC. Tu trabajo es sugerir el rol más adecuado basándote en la información proporcionada. Siempre responde en JSON válido." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      // Return default suggestion on error
      return new Response(JSON.stringify({
        suggested_role: "creator",
        confidence: 50,
        reasoning: "Sugerencia por defecto - no se pudo analizar el perfil"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let suggestion;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, content);
      suggestion = {
        suggested_role: "creator",
        confidence: 50,
        reasoning: "No se pudo determinar el rol ideal"
      };
    }

    // Validate role
    const validRoles = ['creator', 'editor', 'client'];
    if (!validRoles.includes(suggestion.suggested_role)) {
      suggestion.suggested_role = 'creator';
    }

    console.log("Role suggestion:", suggestion);

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in suggest-role function:", error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      suggested_role: "creator",
      confidence: 0,
      reasoning: "Error al analizar el perfil"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
