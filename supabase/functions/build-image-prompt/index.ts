import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System instruction for GPT as the prompt builder
const PROMPT_BUILDER_INSTRUCTION = `A partir de ahora, eres el ARQUITECTO DE PROMPTS para generación de imágenes IA.

Tu función es analizar TODA la información del proyecto, script y formulario, y construir prompts COMPLETOS, DETALLADOS y LISTOS PARA PRODUCCIÓN.

REGLAS OBLIGATORIAS:

1. LIMPIAR Y NORMALIZAR:
   - Eliminar HTML, etiquetas, emojis innecesarios
   - Eliminar metadata como "Tipo:", "a transmitir:", "[Hook A]"
   - Evitar textos truncados
   - Resumir sin perder intención

2. ANALIZAR TODO EL CONTEXTO:
   - Script completo (hooks, emoción, intención, escenas)
   - Información del producto
   - Avatar ideal y ángulos de venta
   - Configuración del formulario (CTA, formato, emoción, rol del producto)

3. CONSTRUIR EN JSON ESTRUCTURADO:
   - El output SIEMPRE es JSON válido
   - Incluye metadatos, contexto, dirección visual y prompt final
   - El campo "final_prompt" contiene el prompt COMPLETO listo para enviar

4. PRIORIZAR CLARIDAD VISUAL:
   - Una sola escena clara
   - Emoción definida
   - Composición específica
   - Sin listas largas en el prompt final

RESPONDE ÚNICAMENTE CON JSON VÁLIDO, sin texto adicional antes o después.`;

interface BuildPromptRequest {
  // Script context
  script?: string;
  salesAngle?: string;
  idealAvatar?: string;
  productName?: string;
  clientName?: string;
  hooksCount?: number;
  
  // Form inputs
  contentType: 'organic' | 'ads';
  productRole: 'protagonist' | 'secondary' | 'contextual';
  productVisibility: 'full' | 'partial';
  showBrand: boolean;
  includeText: boolean;
  thumbnailText?: string;
  textLanguage: string;
  textZone: 'superior' | 'centro' | 'inferior';
  highlightStyle: string;
  
  // Format
  outputFormat: string;
  
  // Image flags
  hasReferenceImage: boolean;
  hasProductImage: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: BuildPromptRequest = await req.json();
    
    console.log("Building image prompt with GPT...");
    console.log("Content type:", data.contentType);
    console.log("Product role:", data.productRole);
    console.log("Has reference image:", data.hasReferenceImage);
    console.log("Has product image:", data.hasProductImage);
    console.log("Output format:", data.outputFormat);

    // Parse format for dimensions
    const formatMatch = data.outputFormat.match(/^(\d+)x(\d+)$/);
    const width = formatMatch ? parseInt(formatMatch[1], 10) : 1080;
    const height = formatMatch ? parseInt(formatMatch[2], 10) : 1920;
    const aspectRatio = height > width ? "9:16" : (height === width ? "1:1" : "16:9");
    const orientation = height > width ? "vertical" : (height === width ? "square" : "horizontal");

    // Build the user prompt with ALL context
    const userPrompt = `CONSTRUYE UN PROMPT DE IMAGEN COMPLETO BASADO EN ESTA INFORMACIÓN:

=== INFORMACIÓN DEL PROYECTO ===
Producto: ${data.productName || "No especificado"}
Cliente: ${data.clientName || "No especificado"}
Avatar ideal: ${data.idealAvatar || "Emprendedor digital LATAM 27-40 años"}
Ángulo de venta: ${data.salesAngle || "No especificado"}

=== SCRIPT COMPLETO ===
${data.script || "No hay script disponible"}

=== CONFIGURACIÓN DEL FORMULARIO ===
Tipo de contenido: ${data.contentType === 'ads' ? 'Anuncio pagado' : 'Contenido orgánico'}
Rol del producto: ${data.productRole} (${
  data.productRole === 'protagonist' ? '40-60% del encuadre' :
  data.productRole === 'secondary' ? '15-30% del encuadre' :
  'En background contextual'
})
Visibilidad del producto: ${data.productVisibility === 'full' ? 'Completo 100% visible' : 'Parcialmente visible'}
Mostrar marca: ${data.showBrand ? 'Sí' : 'No'}
Número de hooks: ${data.hooksCount || 3}

=== TEXTO EN IMAGEN ===
Incluir texto: ${data.includeText ? 'Sí' : 'No'}
${data.includeText ? `Texto: "${data.thumbnailText}"
Idioma: ${data.textLanguage}
Zona: ${data.textZone}` : 'Sin texto overlay'}

=== FORMATO DE SALIDA ===
Dimensiones: ${width}x${height}
Orientación: ${orientation}
Aspect ratio: ${aspectRatio}
Plataformas objetivo: ${orientation === 'vertical' ? 'TikTok, Reels, Shorts' : orientation === 'square' ? 'Instagram Feed' : 'YouTube'}

=== IMÁGENES DISPONIBLES ===
Imagen de referencia (persona/creador): ${data.hasReferenceImage ? 'SÍ - Será proporcionada' : 'NO - Describir personaje genérico'}
Imagen del producto: ${data.hasProductImage ? 'SÍ - Será proporcionada' : 'NO - No incluir producto específico'}

GENERA EL JSON ESTRUCTURADO CON EL PROMPT COMPLETO.`;

    // Call GPT to build the prompt
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPT_BUILDER_INSTRUCTION },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("GPT response received, parsing JSON...");

    // Parse the JSON response from GPT
    let promptData;
    try {
      promptData = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse GPT JSON:", content.slice(0, 500));
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        promptData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON from GPT");
      }
    }

    // Ensure required fields exist
    if (!promptData.final_prompt) {
      // Build final_prompt from components if missing
      promptData.final_prompt = buildFinalPromptFromComponents(promptData, data, width, height, aspectRatio);
    }

    // Add meta if missing
    if (!promptData.meta) {
      promptData.meta = {
        prompt_type: "image_thumbnail",
        format: orientation,
        aspect_ratio: aspectRatio,
        resolution: `${width}x${height}`,
        content_type: data.contentType,
        platform: orientation === 'vertical' ? ["tiktok", "reels", "shorts"] : 
                  orientation === 'square' ? ["instagram"] : ["youtube"]
      };
    }

    console.log("Prompt built successfully");
    console.log("Final prompt length:", promptData.final_prompt?.length || 0);

    return new Response(
      JSON.stringify(promptData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in build-image-prompt:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Fallback function to build final_prompt if GPT doesn't include it
function buildFinalPromptFromComponents(
  promptData: any, 
  formData: BuildPromptRequest,
  width: number,
  height: number,
  aspectRatio: string
): string {
  const context = promptData.context || {};
  const visual = promptData.visual_direction || {};
  const style = promptData.style_rules || {};
  
  const hook = context.script_insights?.main_hook || "Engaging content";
  const emotion = context.script_insights?.core_emotion || "curiosity";
  const intent = context.script_insights?.video_intent || "Connect with audience";
  const scene = visual.scene?.environment || "home office setting";
  
  return `Create a ${aspectRatio} social media thumbnail for mobile-first experience.

CONTEXT FROM VIDEO SCRIPT:
- Main message: ${hook}
- Core emotion to express: ${emotion}
- Intent of the video: ${intent}
- Content type: ${formData.contentType === 'ads' ? 'paid social ad' : 'organic content'}

CHARACTER:
${formData.hasReferenceImage ? `- Based on reference image provided
- Maintain general physical traits without replicating exact identity` : `- Person representing target avatar`}
- Facial expression: ${emotion}, relatable and authentic
- Natural UGC appearance
- Looking directly at camera, engaging viewer

SCENE & COMPOSITION:
- Subject occupies ${formData.productRole === 'protagonist' ? '30-40%' : '60-70%'} of frame
${formData.hasProductImage ? `- Product is ${formData.productRole} (${formData.productRole === 'protagonist' ? '40-60%' : formData.productRole === 'secondary' ? '15-30%' : 'contextual'} of frame)` : ''}
- Scene: ${scene}
- Background: real environment, softly blurred
- Strong clean lighting on face
- Rule of thirds applied
- Safe margins 10-15% on all edges

${formData.hasProductImage ? `PRODUCT:
- Use EXACT product image provided
- Role: ${formData.productRole}
- Visibility: ${formData.productVisibility === 'full' ? 'Complete' : 'Partial'}
- Maintain original colors and branding
- Do NOT modify or stylize` : ''}

${formData.includeText && formData.thumbnailText ? `TEXT OVERLAY:
- Exact text: "${formData.thumbnailText.toUpperCase()}"
- Bold heavy typography
- Inside solid or semi-transparent black text box
- Position: ${formData.textZone} safe area
- Centered horizontally
- Must be fully visible and readable on mobile` : `TEXT OVERLAY:
- NONE - Do NOT add any text or typography`}

STYLE & MOOD:
- Authentic UGC style
- High contrast for mobile screens
- Scroll-stopping composition
- Professional yet human and approachable
- Realistic lighting

IMPORTANT RULES:
${!formData.includeText ? '- Do NOT add any text or typography\n' : ''}- Do NOT add logos or graphic elements unless specified
- Avoid cluttered compositions
- Avoid flyer, banner or corporate styles
- Avoid plain white backgrounds
- Image must feel real, relatable and emotionally engaging`;
}
