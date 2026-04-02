import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIUsage, calculateCost } from "../_shared/ai-usage-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System instruction for GPT as the prompt builder - PROJECT-AWARE
const PROMPT_BUILDER_INSTRUCTION = `Actúa como un Image Prompt Engineer Senior especializado en publicidad, UGC y social media.
Tu tarea es crear un prompt de imagen profesional, usando TODO el contexto del proyecto y referencias visuales reales.

NO generes la imagen.
SOLO genera un JSON estructurado, extremadamente detallado, listo para ser enviado a un generador de imágenes (Gemini / NanoBanana / OpenAI).

REGLAS OBLIGATORIAS:

1. LIMPIAR Y NORMALIZAR:
   - Eliminar HTML, etiquetas, emojis innecesarios
   - Eliminar metadata como "Tipo:", "a transmitir:", "[Hook A]"
   - Evitar textos truncados
   - Resumir sin perder intención

2. ANALIZAR TODO EL CONTEXTO:
   - Script completo (hooks, emoción, intención, escenas)
   - Información del producto y cliente
   - Avatar ideal y ángulos de venta
   - Configuración del formulario (CTA, formato, emoción, rol del producto)
   - Guidelines de cada rol (estrategista, editor, diseñador, etc.)

3. USAR ALIASES DE IMÁGENES:
   - Las imágenes se referencian por @img1, @img2, @img3, etc.
   - @img1 = Imagen del personaje/creador
   - @img2 = Imagen del producto
   - @img3+ = Referencias de estilo/mood
   - NO describir manualmente las imágenes, solo referenciarlas
   - La IA debe inferir rasgos desde ellas

4. CONSTRUIR EN JSON ESTRUCTURADO:
   - El output SIEMPRE es JSON válido con la estructura especificada
   - Incluye meta, references, scene_context, composition, visual_style, text_overlay, negative_prompt
   - El campo "final_prompt" contiene el prompt COMPLETO listo para enviar

5. PRIORIZAR CLARIDAD VISUAL:
   - Una sola escena clara
   - Emoción definida
   - Composición específica
   - Sin listas largas en el prompt final

6. RESPETAR ORIENTACIÓN Y FORMATO:
   - Si es VERTICAL (9:16), el prompt DEBE enfatizar PORTRAIT orientation
   - Incluir dimensiones exactas y orientación en el prompt final

RESPONDE ÚNICAMENTE CON JSON VÁLIDO siguiendo esta estructura exacta:

{
  "meta": {
    "project_id": "string",
    "content_type": "paid_ad | organic | internal_brand",
    "platform": "tiktok | reels | shorts | instagram | youtube",
    "orientation": "vertical | horizontal | square",
    "aspect_ratio": "9:16 | 16:9 | 1:1",
    "resolution": "WIDTHxHEIGHT"
  },
  "references": {
    "character_image": "@img1 or null",
    "product_image": "@img2 or null",
    "style_references": ["@img3", "@img4"] or []
  },
  "scene_context": {
    "script_hook": "Texto exacto del hook principal",
    "core_emotion": ["array de emociones"],
    "strategic_intent": "Objetivo estratégico resumido",
    "funnel_stage": "enganche | solucion | conversion | fidelizacion",
    "key_visual_moment": "Descripción de la escena clave"
  },
  "composition": {
    "main_subject": {
      "source": "@img1 or 'generic_avatar'",
      "role": "protagonist",
      "frame_coverage": "55-65%",
      "expression": "alineada a la emoción principal",
      "pose": "natural, UGC style",
      "gaze": "looking at camera"
    },
    "product": {
      "source": "@img2 or null",
      "role": "protagonist | secondary | contextual",
      "frame_coverage": "15-60% depending on role",
      "visibility": "complete | partial",
      "integrity_rules": ["do not alter shape", "do not change colors", "do not invent branding"]
    },
    "layout_rules": {
      "rule_of_thirds": true,
      "safe_margins": "10-15%",
      "single_focal_point": true
    }
  },
  "visual_style": {
    "style": "UGC professional | cinematic | minimal | bold",
    "lighting": "description",
    "depth": "slight background blur | sharp | etc",
    "color_grading": "vibrant but natural | warm | cool | etc",
    "realism_level": "high | medium",
    "avoid_stock_look": true
  },
  "text_overlay": {
    "enabled": true/false,
    "text": "TEXTO EXACTO DEFINIDO",
    "language": "es | en | pt",
    "position": "top | center | bottom",
    "typography": {
      "weight": "bold",
      "contrast": "high",
      "container": "solid or semi-transparent box"
    },
    "rules": ["must be fully visible", "no cropped letters", "inside safe margins"]
  },
  "negative_prompt": ["array of things to avoid"],
  "final_prompt": "THE COMPLETE, DETAILED PROMPT READY FOR IMAGE GENERATION"
}`;

interface ImageReference {
  alias: string;
  type: 'character' | 'product' | 'style';
  hasImage: boolean;
}

interface BuildPromptRequest {
  // Script context
  script?: string;
  salesAngle?: string;
  idealAvatar?: string;
  productName?: string;
  clientName?: string;
  hooksCount?: number;
  
  // Extended project context
  contentType: 'organic' | 'ads' | 'internal_brand';
  platform?: string;
  
  // Script blocks (if available)
  strategistGuidelines?: string;
  editorGuidelines?: string;
  designerGuidelines?: string;
  adminGuidelines?: string;
  traffickerGuidelines?: string;
  
  // Form inputs
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
  
  // Image references with aliases
  imageReferences: ImageReference[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: BuildPromptRequest = await req.json();
    
    console.log("Building image prompt with GPT...");
    console.log("Content type:", data.contentType);
    console.log("Product role:", data.productRole);
    console.log("Image references:", JSON.stringify(data.imageReferences));
    console.log("Output format:", data.outputFormat);

    // Parse format for dimensions
    const formatMatch = data.outputFormat.match(/^(\d+)x(\d+)$/);
    const width = formatMatch ? parseInt(formatMatch[1], 10) : 1080;
    const height = formatMatch ? parseInt(formatMatch[2], 10) : 1920;
    const aspectRatio = height > width ? "9:16" : (height === width ? "1:1" : "16:9");
    const orientation = height > width ? "vertical" : (height === width ? "square" : "horizontal");

    // Build image references section
    const imageRefsText = data.imageReferences && data.imageReferences.length > 0 
      ? data.imageReferences.map(ref => 
          `${ref.alias} (${ref.type}): ${ref.hasImage ? 'IMAGEN DISPONIBLE - Usar para inferir rasgos' : 'NO DISPONIBLE'}`
        ).join('\n')
      : 'Sin imágenes de referencia';

    // Determine platform based on format
    const getPlatform = () => {
      if (data.platform) return data.platform;
      if (orientation === 'vertical') return 'tiktok, reels, shorts';
      if (orientation === 'square') return 'instagram feed';
      return 'youtube';
    };

    // Build the comprehensive user prompt with ALL context
    const userPrompt = `CONSTRUYE UN PROMPT DE IMAGEN PROFESIONAL BASADO EN TODA ESTA INFORMACIÓN:

═══════════════════════════════════════════
📄 INFORMACIÓN DEL PROYECTO
═══════════════════════════════════════════
Producto: ${data.productName || "No especificado"}
Cliente: ${data.clientName || "No especificado"}
Tipo de contenido: ${data.contentType === 'ads' ? 'Anuncio pagado (Paid Ad)' : data.contentType === 'internal_brand' ? 'Marca interna' : 'Contenido orgánico'}
Plataforma destino: ${getPlatform()}
Avatar ideal: ${data.idealAvatar || "Emprendedor digital LATAM 27-40 años"}
Ángulo de venta: ${data.salesAngle || "No especificado"}

═══════════════════════════════════════════
📝 GUION COMPLETO
═══════════════════════════════════════════
${data.script || "No hay script disponible"}

${data.strategistGuidelines ? `═══════════════════════════════════════════
🧠 GUIDELINES DE ESTRATEGIA
═══════════════════════════════════════════
${data.strategistGuidelines}` : ''}

${data.editorGuidelines ? `═══════════════════════════════════════════
🎬 GUIDELINES DE EDICIÓN
═══════════════════════════════════════════
${data.editorGuidelines}` : ''}

${data.designerGuidelines ? `═══════════════════════════════════════════
🎨 GUIDELINES DE DISEÑO
═══════════════════════════════════════════
${data.designerGuidelines}` : ''}

${data.traffickerGuidelines ? `═══════════════════════════════════════════
📊 GUIDELINES DE TRAFFICKER
═══════════════════════════════════════════
${data.traffickerGuidelines}` : ''}

${data.adminGuidelines ? `═══════════════════════════════════════════
📋 GUIDELINES DE ADMIN
═══════════════════════════════════════════
${data.adminGuidelines}` : ''}

═══════════════════════════════════════════
🖼️ IMÁGENES DE REFERENCIA (ALIASES)
═══════════════════════════════════════════
${imageRefsText}

⚠️ IMPORTANTE: 
- Las imágenes NO se describen manualmente
- El prompt debe referenciarlas por alias (@img1, @img2, etc.)
- La IA debe inferir rasgos físicos y visuales desde ellas

═══════════════════════════════════════════
⚙️ CONFIGURACIÓN DEL FORMULARIO
═══════════════════════════════════════════
Rol del producto: ${data.productRole} (${
  data.productRole === 'protagonist' ? '40-60% del encuadre' :
  data.productRole === 'secondary' ? '15-30% del encuadre' :
  'En background contextual'
})
Visibilidad del producto: ${data.productVisibility === 'full' ? 'Completo 100% visible' : 'Parcialmente visible'}
Mostrar marca: ${data.showBrand ? 'Sí' : 'No'}
Estilo a resaltar: ${data.highlightStyle}
Número de hooks: ${data.hooksCount || 3}

═══════════════════════════════════════════
📝 TEXTO EN IMAGEN
═══════════════════════════════════════════
Incluir texto: ${data.includeText ? 'Sí' : 'No'}
${data.includeText ? `Texto exacto: "${data.thumbnailText}"
Idioma: ${data.textLanguage}
Posición: ${data.textZone}` : 'Sin texto overlay'}

═══════════════════════════════════════════
📐 FORMATO DE SALIDA (CRÍTICO)
═══════════════════════════════════════════
Dimensiones: ${width}x${height}
Orientación: ${orientation.toUpperCase()}
Aspect ratio: ${aspectRatio}
Plataformas: ${getPlatform()}

${orientation === 'vertical' ? `⚠️ CRÍTICO: La imagen DEBE ser VERTICAL (portrait). 
El ALTO (${height}px) debe ser MAYOR que el ANCHO (${width}px).
El prompt DEBE comenzar especificando "vertical portrait orientation" o "9:16 aspect ratio".
NO generar imagen horizontal bajo ninguna circunstancia.` : ''}

═══════════════════════════════════════════
🎯 INSTRUCCIONES FINALES
═══════════════════════════════════════════
1. Analiza TODO el contexto del proyecto
2. Usa los aliases de imágenes (@img1, @img2, etc.) en el JSON
3. Genera un JSON estructurado extremadamente detallado
4. El objetivo es generar imágenes profesionales, coherentes y reutilizables
5. NO generar imágenes decorativas simples

GENERA EL JSON ESTRUCTURADO COMPLETO.`;

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user/org info from auth header if available
    let userId = "00000000-0000-0000-0000-000000000000";
    let organizationId = "00000000-0000-0000-0000-000000000000";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (user?.id) userId = user.id;
      } catch (_) { /* ignore auth errors for logging */ }
    }

    const startTime = Date.now();

    // Call Gemini API to build the prompt
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPT_BUILDER_INSTRUCTION },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorTimeMs = Date.now() - startTime;
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      // Log failed AI call
      logAIUsage(supabase, {
        organization_id: organizationId,
        user_id: userId,
        module: "build-image-prompt",
        action: "build-prompt",
        provider: "gemini",
        model: "gemini-2.5-flash",
        success: false,
        error_message: `AI Gateway error: ${response.status}`,
        edge_function: "build-image-prompt",
        response_time_ms: errorTimeMs,
      }).catch(console.error);

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

    const responseTimeMs = Date.now() - startTime;
    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    // Log AI usage
    const usage = aiResponse.usage;
    logAIUsage(supabase, {
      organization_id: organizationId,
      user_id: userId,
      module: "build-image-prompt",
      action: "build-prompt",
      provider: "gemini",
      model: "gemini-2.5-flash",
      tokens_input: usage?.prompt_tokens || 0,
      tokens_output: usage?.completion_tokens || 0,
      estimated_cost: usage ? calculateCost("gemini-2.5-flash", usage.prompt_tokens || 0, usage.completion_tokens || 0) : undefined,
      success: !!content,
      error_message: content ? undefined : "No content in AI response",
      edge_function: "build-image-prompt",
      response_time_ms: responseTimeMs,
    }).catch(console.error);

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

    // Ensure required fields exist and are complete
    promptData = ensureCompleteStructure(promptData, data, width, height, aspectRatio, orientation);

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

// Ensure the response has all required fields
function ensureCompleteStructure(
  promptData: any, 
  formData: BuildPromptRequest,
  width: number,
  height: number,
  aspectRatio: string,
  orientation: string
): any {
  // Ensure meta exists
  if (!promptData.meta) {
    promptData.meta = {
      project_id: "generated",
      content_type: formData.contentType,
      platform: orientation === 'vertical' ? 'tiktok' : orientation === 'square' ? 'instagram' : 'youtube',
      orientation: orientation,
      aspect_ratio: aspectRatio,
      resolution: `${width}x${height}`
    };
  }

  // Ensure references exists
  if (!promptData.references) {
    const hasCharacter = formData.imageReferences?.some(r => r.type === 'character' && r.hasImage);
    const hasProduct = formData.imageReferences?.some(r => r.type === 'product' && r.hasImage);
    const styleRefs = formData.imageReferences?.filter(r => r.type === 'style' && r.hasImage).map(r => r.alias) || [];
    
    promptData.references = {
      character_image: hasCharacter ? "@img1" : null,
      product_image: hasProduct ? "@img2" : null,
      style_references: styleRefs
    };
  }

  // Ensure scene_context exists
  if (!promptData.scene_context) {
    promptData.scene_context = {
      script_hook: extractHookFromScript(formData.script),
      core_emotion: [formData.highlightStyle || "curiosidad"],
      strategic_intent: formData.salesAngle || "Connect with audience",
      funnel_stage: "enganche",
      key_visual_moment: "Person engaging with camera in relatable setting"
    };
  }

  // Ensure composition exists
  if (!promptData.composition) {
    const hasProduct = formData.imageReferences?.some(r => r.type === 'product' && r.hasImage);
    promptData.composition = {
      main_subject: {
        source: formData.imageReferences?.some(r => r.type === 'character' && r.hasImage) ? "@img1" : "generic_avatar",
        role: "protagonist",
        frame_coverage: "55-65%",
        expression: "authentic, relatable",
        pose: "natural, UGC style",
        gaze: "looking at camera"
      },
      product: hasProduct ? {
        source: "@img2",
        role: formData.productRole,
        frame_coverage: formData.productRole === 'protagonist' ? '40-60%' : formData.productRole === 'secondary' ? '15-30%' : '5-15%',
        visibility: formData.productVisibility,
        integrity_rules: ["do not alter shape", "do not change colors", "do not invent branding"]
      } : null,
      layout_rules: {
        rule_of_thirds: true,
        safe_margins: "10-15%",
        single_focal_point: true
      }
    };
  }

  // Ensure visual_style exists
  if (!promptData.visual_style) {
    promptData.visual_style = {
      style: "UGC professional",
      lighting: "high contrast, face-focused",
      depth: "slight background blur",
      color_grading: "vibrant but natural",
      realism_level: "high",
      avoid_stock_look: true
    };
  }

  // Ensure text_overlay exists
  if (!promptData.text_overlay) {
    promptData.text_overlay = {
      enabled: formData.includeText,
      text: formData.thumbnailText || null,
      language: formData.textLanguage,
      position: formData.textZone === 'superior' ? 'top' : formData.textZone === 'inferior' ? 'bottom' : 'center',
      typography: formData.includeText ? {
        weight: "bold",
        contrast: "high",
        container: "solid or semi-transparent box"
      } : null,
      rules: formData.includeText ? ["must be fully visible", "no cropped letters", "inside safe margins"] : []
    };
  }

  // Ensure negative_prompt exists
  if (!promptData.negative_prompt || !Array.isArray(promptData.negative_prompt)) {
    promptData.negative_prompt = [
      orientation === 'vertical' ? "horizontal format" : "vertical format",
      "cropped text",
      "small typography",
      "visual clutter",
      "flyer or banner look",
      "plain white background",
      "generic stock photo",
      "altered product colors"
    ];
  }

  // Ensure final_prompt exists
  if (!promptData.final_prompt) {
    promptData.final_prompt = buildFinalPromptFromStructure(promptData, formData, width, height, aspectRatio, orientation);
  }

  return promptData;
}

// Extract hook from script
function extractHookFromScript(script?: string): string {
  if (!script) return "Engaging content that captures attention";
  
  // Clean HTML
  const cleaned = script.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  
  // Get first sentence or first 100 chars
  const firstSentence = cleaned.split(/[.!?]/)[0];
  return firstSentence.slice(0, 150).trim() || "Engaging content";
}

// Build final prompt from the structured JSON
function buildFinalPromptFromStructure(
  promptData: any, 
  formData: BuildPromptRequest,
  width: number,
  height: number,
  aspectRatio: string,
  orientation: string
): string {
  const refs = promptData.references || {};
  const scene = promptData.scene_context || {};
  const comp = promptData.composition || {};
  const style = promptData.visual_style || {};
  const text = promptData.text_overlay || {};
  const negative = promptData.negative_prompt || [];

  let prompt = '';

  // Start with format requirements
  if (orientation === 'vertical') {
    prompt += `CRITICAL: Generate a VERTICAL PORTRAIT image with ${aspectRatio} aspect ratio (${width}x${height} pixels). Height MUST be greater than width.\n\n`;
  } else if (orientation === 'square') {
    prompt += `CRITICAL: Generate a SQUARE image with 1:1 aspect ratio (${width}x${height} pixels).\n\n`;
  } else {
    prompt += `CRITICAL: Generate a HORIZONTAL LANDSCAPE image with ${aspectRatio} aspect ratio (${width}x${height} pixels).\n\n`;
  }

  // Context from script
  prompt += `CONTEXT FROM VIDEO SCRIPT:\n`;
  prompt += `- Main hook: ${scene.script_hook || 'Engaging content'}\n`;
  prompt += `- Core emotion: ${Array.isArray(scene.core_emotion) ? scene.core_emotion.join(', ') : scene.core_emotion || 'curiosity'}\n`;
  prompt += `- Strategic intent: ${scene.strategic_intent || 'Connect with audience'}\n`;
  prompt += `- Key visual moment: ${scene.key_visual_moment || 'Person engaging with camera'}\n\n`;

  // Character
  prompt += `CHARACTER:\n`;
  if (refs.character_image) {
    prompt += `- Based on reference image ${refs.character_image}\n`;
    prompt += `- Maintain general physical traits from reference\n`;
  } else {
    prompt += `- Person representing: ${formData.idealAvatar || 'Digital entrepreneur LATAM 27-40'}\n`;
  }
  const mainSubject = comp.main_subject || {};
  prompt += `- Expression: ${mainSubject.expression || 'authentic, relatable'}\n`;
  prompt += `- Pose: ${mainSubject.pose || 'natural, UGC style'}\n`;
  prompt += `- Gaze: ${mainSubject.gaze || 'looking at camera'}\n`;
  prompt += `- Frame coverage: ${mainSubject.frame_coverage || '55-65%'}\n\n`;

  // Product
  if (refs.product_image && comp.product) {
    prompt += `PRODUCT:\n`;
    prompt += `- Use reference image ${refs.product_image}\n`;
    prompt += `- Role: ${comp.product.role || formData.productRole}\n`;
    prompt += `- Frame coverage: ${comp.product.frame_coverage}\n`;
    prompt += `- Visibility: ${comp.product.visibility || formData.productVisibility}\n`;
    prompt += `- CRITICAL: Do NOT alter product colors, shape or branding\n\n`;
  }

  // Style references
  if (refs.style_references && refs.style_references.length > 0) {
    prompt += `STYLE REFERENCES:\n`;
    prompt += `- Use visual style/mood from: ${refs.style_references.join(', ')}\n\n`;
  }

  // Scene composition
  prompt += `SCENE & COMPOSITION:\n`;
  const layout = comp.layout_rules || {};
  prompt += `- Rule of thirds: ${layout.rule_of_thirds ? 'Applied' : 'Not required'}\n`;
  prompt += `- Safe margins: ${layout.safe_margins || '10-15%'} on all edges\n`;
  prompt += `- Single focal point: ${layout.single_focal_point ? 'Yes' : 'No'}\n`;
  prompt += `- Background: Real environment, softly blurred\n`;
  prompt += `- Lighting: ${style.lighting || 'high contrast, face-focused'}\n\n`;

  // Visual style
  prompt += `VISUAL STYLE:\n`;
  prompt += `- Style: ${style.style || 'UGC professional'}\n`;
  prompt += `- Color grading: ${style.color_grading || 'vibrant but natural'}\n`;
  prompt += `- Depth: ${style.depth || 'slight background blur'}\n`;
  prompt += `- Realism: ${style.realism_level || 'high'}\n`;
  if (style.avoid_stock_look) prompt += `- AVOID generic stock photo look\n`;
  prompt += '\n';

  // Text overlay
  if (text.enabled && text.text) {
    prompt += `TEXT OVERLAY:\n`;
    prompt += `- Exact text: "${text.text.toUpperCase()}"\n`;
    prompt += `- Position: ${text.position || 'top'} safe area\n`;
    prompt += `- Typography: ${text.typography?.weight || 'bold'}, ${text.typography?.contrast || 'high'} contrast\n`;
    prompt += `- Container: ${text.typography?.container || 'solid or semi-transparent box'}\n`;
    prompt += `- Rules: Fully visible, no cropped letters, inside safe margins\n\n`;
  } else {
    prompt += `TEXT OVERLAY: NONE - Do NOT add any text or typography\n\n`;
  }

  // Negative prompt
  if (negative.length > 0) {
    prompt += `AVOID:\n`;
    negative.forEach((item: string) => {
      prompt += `- ${item}\n`;
    });
  }

  return prompt.trim();
}
