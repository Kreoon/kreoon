import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVENT_TYPE_PROMPTS: Record<string, string> = {
  informative: 'un evento informativo/educativo de streaming',
  shopping: 'un evento de live shopping/venta en directo',
  webinar: 'un webinar profesional',
  interview: 'una entrevista en vivo',
  entertainment: 'un evento de entretenimiento en vivo',
  educational: 'un evento educativo/formativo',
};

// Get AI config for the organization
async function getModuleAIConfig(supabase: any, organizationId: string | null, moduleKey: string) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  // If no organization, use lovable defaults
  if (!organizationId) {
    return {
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      apiKey: lovableApiKey,
      isActive: true
    };
  }
  
  const { data: moduleData } = await supabase
    .from("organization_ai_modules")
    .select("is_active, provider, model")
    .eq("organization_id", organizationId)
    .eq("module_key", moduleKey)
    .maybeSingle();
  
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
  
  return {
    provider,
    model,
    apiKey: apiKey || lovableApiKey,
    isActive: moduleData?.is_active !== false
  };
}

// Make AI request to the appropriate provider
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
    temperature: 0.7,
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
      generationConfig: { temperature: 0.7 }
    };
  } else {
    // Lovable AI Gateway (default)
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  console.log(`Making AI request to ${provider} with model ${model}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw { status: 429, message: "Rate limit exceeded" };
    }
    if (response.status === 402) {
      throw { status: 402, message: "Payment required" };
    }
    const errorText = await response.text();
    console.error(`AI API error (${provider}):`, response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
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
    const { 
      action, 
      eventType, 
      clientName, 
      product, 
      keywords, 
      currentTitle, 
      currentDescription,
      organizationId 
    } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI configuration for this organization
    const aiConfig = await getModuleAIConfig(supabase, organizationId, "streaming_ai");
    
    console.log(`Using AI config: provider=${aiConfig.provider}, model=${aiConfig.model}`);

    const typeDesc = EVENT_TYPE_PROMPTS[eventType] || 'un evento de streaming';
    const systemPrompt = 'Eres un experto en marketing digital y creación de contenido para streaming en vivo. Siempre respondes en español con contenido atractivo y profesional. SOLO respondes con JSON válido, sin texto adicional.';
    
    let userPrompt = '';

    switch (action) {
      case 'generate_event_content':
        userPrompt = `Genera un título atractivo y una descripción breve para ${typeDesc}.
${clientName ? `Cliente/Marca: ${clientName}` : ''}
${product ? `Producto/Tema: ${product}` : ''}
${keywords?.length ? `Palabras clave: ${keywords.join(', ')}` : ''}

Responde SOLO con un JSON válido con las claves "title" y "description". El título debe ser máximo 60 caracteres y la descripción máximo 200 caracteres. Deben ser llamativos y orientados a captar audiencia en español.

Ejemplo de respuesta:
{"title": "🔴 Ofertas Exclusivas en VIVO", "description": "Únete a nuestra transmisión y descubre productos increíbles con descuentos únicos. ¡No te lo pierdas!"}`;
        break;

      case 'improve_title':
        userPrompt = `Mejora este título para ${typeDesc}: "${currentTitle}"

El nuevo título debe ser más atractivo y llamativo, máximo 60 caracteres, en español.
Responde SOLO con un JSON válido: {"title": "tu título mejorado aquí"}`;
        break;

      case 'improve_description':
        userPrompt = `Mejora esta descripción para ${typeDesc}: "${currentDescription}"

La nueva descripción debe ser más atractiva y orientada a conversión, máximo 200 caracteres, en español.
Responde SOLO con un JSON válido: {"description": "tu descripción mejorada aquí"}`;
        break;

      default:
        throw new Error('Invalid action');
    }

    const content = await makeAIRequest(aiConfig, systemPrompt, userPrompt);
    
    console.log('AI Response content:', content);

    // Parse JSON from response
    let result = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      if (action === 'generate_event_content') {
        result = {
          title: `🔴 Live: ${clientName || eventType}`.substring(0, 60),
          description: `Únete a nuestra transmisión en vivo. ¡No te lo pierdas!`,
        };
      } else if (action === 'improve_title') {
        result = { title: `🔴 ${currentTitle}`.substring(0, 60) };
      } else {
        result = { description: `¡No te pierdas! ${currentDescription}`.substring(0, 200) };
      }
    }

    // Log AI usage
    if (organizationId) {
      try {
        await supabase.from("ai_usage_logs").insert({
          organization_id: organizationId,
          user_id: "00000000-0000-0000-0000-000000000000", // System user
          action: action,
          module: "streaming_ai",
          provider: aiConfig.provider,
          model: aiConfig.model,
          success: true,
        });
      } catch (logError) {
        console.error("Error logging AI usage:", logError);
      }
    }

    console.log('Final result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in streaming-ai-generate:', error);
    
    if (error.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (error.status === 402) {
      return new Response(JSON.stringify({ error: 'Payment required, please add funds.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
