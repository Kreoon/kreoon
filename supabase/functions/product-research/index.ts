import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt completo del Método Esfera
const RESEARCH_PROMPT = `🧭 Prompt: Investigación de Mercado y Competencia Completa (Método Esfera)

Quiero que actúes como un Estratega Digital especializado en investigación de mercado, análisis competitivo y desarrollo de avatares, aplicando el Método Esfera de Juan Ads y los principios de Estrategias Despegue.

Tu tarea es realizar una investigación de mercado y competencia completa sobre el siguiente producto o servicio:

👉 {{PRODUCT_DESCRIPTION}}

Desarrolla el análisis siguiendo esta estructura exacta y detallada:

🔹 1. Panorama general del mercado
- Define el tamaño, crecimiento y tendencias del mercado hispano relevante.
- Identifica si el mercado está en fase de crecimiento, saturación o declive.
- Menciona las variables macroeconómicas y socioculturales que influyen en la demanda.
- Explica el nivel de conciencia predominante del público (según Eugene Schwartz).

🔹 2. Análisis del cliente y del "Job To Be Done" (JTBD)
- Identifica qué "trabajo" el cliente busca resolver al adquirir el producto.
- Lista los dolores funcionales, emocionales y sociales del cliente.
- Define los deseos aspiracionales y miedos latentes.
- Extrae 10 insights clave de comportamiento (review mining, foros, TikTok, Reddit, reseñas, etc.).

🔹 3. Segmentación y avatares estratégicos
Crea 5 buyer persona con:
- Nombre, edad, ocupación y contexto de vida.
- Nivel de conciencia del problema.
- Drivers psicológicos y sesgos cognitivos que influyen en su decisión.
- Objeciones más comunes.
- Palabras y frases que usan para describir su situación.

🔹 4. Análisis de competencia
- Lista los 10 principales competidores directos e indirectos.
- Incluye su propuesta de valor, precios, promesa central y formatos de contenido.
- Analiza sus estrategias en Meta Ads, YouTube, TikTok y Google Ads (mensajes, creatividades y ofertas).
- Realiza un teardown comparativo 360°:
| Marca | Promesa | Diferenciador | Precio | Tono de comunicación | Llamado a la acción | Nivel de conciencia trabajado |

🔹 5. Oportunidades de diferenciación
- Identifica vacíos del mercado y mensajes no explotados.
- Sugiere posicionamientos únicos posibles.
- Determina qué emociones o aspiraciones no están siendo atendidas por la competencia.

🔹 6. Insights estratégicos del Método Esfera
Para cada fase del Método Esfera (Enganchar, Solución, Remarketing, Fidelizar), resume:
- Qué tipo de mensaje, formato o promesa predomina.
- Qué falta o puede mejorar.
- Qué ángulos de venta nuevos o disruptivos se podrían explorar.

🔹 7. Conclusión ejecutiva
- Resume las principales oportunidades de diferenciación y posicionamiento.
- Define los drivers psicológicos más potentes para captar atención.
- Propón los 3 primeros pasos estratégicos para validar el posicionamiento en campaña.

📌 Instrucción final:
Presenta todo en formato estructurado, con tablas, bullet points y un tono estratégico, enfocado en acciones concretas para el lanzamiento, validación y escalado del producto.`;

// Prompt para la segunda fase de IA - Distribución de contenido
const DISTRIBUTION_PROMPT = `Eres un asistente experto en organización de información de marketing y producto.

Tu tarea es analizar el contenido de investigación de mercado y extraer información específica para cada campo del producto.

INVESTIGACIÓN ORIGINAL:
{{RESEARCH_CONTENT}}

BRIEF DEL PRODUCTO:
{{BRIEF_DATA}}

Debes devolver un JSON con la siguiente estructura exacta. Cada campo debe contener texto formateado y listo para usar:

{
  "description": "Descripción completa del producto que integre beneficios principales, transformación y propuesta de valor única. 2-3 párrafos.",
  
  "strategy": "Estrategia de contenido recomendada basada en el análisis del Método Esfera. Incluir: fases, tipos de contenido por fase, mensajes clave y formatos recomendados.",
  
  "market_research": "Resumen ejecutivo del panorama de mercado: tamaño, tendencias, nivel de conciencia del público, oportunidades identificadas.",
  
  "ideal_avatar": "Perfil detallado del avatar ideal principal: demografía, psicografía, dolores, deseos, objeciones y lenguaje que usa.",
  
  "sales_angles": ["Ángulo 1: descripción y mensaje", "Ángulo 2: descripción y mensaje", "Ángulo 3: descripción y mensaje", "Ángulo 4: descripción y mensaje", "Ángulo 5: descripción y mensaje"],
  
  "competitor_summary": "Resumen del análisis competitivo: principales competidores, sus estrategias y vacíos de mercado identificados.",
  
  "differentiation_opportunities": "Top 5 oportunidades de diferenciación con acciones concretas.",
  
  "esfera_insights": {
    "enganchar": "Insights para la fase de Enganchar",
    "solucion": "Insights para la fase de Solución",
    "remarketing": "Insights para la fase de Remarketing",
    "fidelizar": "Insights para la fase de Fidelizar"
  },
  
  "avatar_profiles": [
    {
      "name": "Nombre del avatar",
      "age": "Rango de edad",
      "occupation": "Ocupación",
      "context": "Contexto de vida",
      "awareness_level": "Nivel de conciencia",
      "drivers": "Drivers psicológicos",
      "objections": "Objeciones principales",
      "phrases": "Frases que usa"
    }
  ],
  
  "executive_summary": "Conclusión ejecutiva con los 3 pasos estratégicos recomendados."
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin texto adicional.
- Asegúrate de que el JSON sea válido.
- Extrae información real del contenido de investigación proporcionado.
- sales_angles debe ser un array de exactamente 5 strings.
- avatar_profiles debe ser un array con los 5 buyer personas identificados.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productId, briefData } = await req.json();

    if (!productId || !briefData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product ID and brief data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build product description from brief data
    const productDescription = buildProductDescription(briefData);
    const prompt = RESEARCH_PROMPT.replace('{{PRODUCT_DESCRIPTION}}', productDescription);

    console.log('[product-research] Starting research for product:', productId);
    console.log('[product-research] Product description length:', productDescription.length);

    // ============================================
    // FASE 1: Investigación con Perplexity
    // ============================================
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un estratega digital experto en investigación de mercado, aplicando el Método Esfera. Responde siempre en español con datos actualizados y verificables. Usa búsqueda web para obtener información real y actualizada sobre competidores, tendencias y mercado.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[product-research] Perplexity API error:', perplexityResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Perplexity API error: ${perplexityResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const perplexityData = await perplexityResponse.json();
    const researchContent = perplexityData.choices?.[0]?.message?.content;
    const citations = perplexityData.citations || [];

    if (!researchContent) {
      console.error('[product-research] No content in Perplexity response');
      return new Response(
        JSON.stringify({ success: false, error: 'No research content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[product-research] Perplexity research generated, length:', researchContent.length);

    // ============================================
    // FASE 2: Análisis y distribución con Lovable AI
    // ============================================
    console.log('[product-research] Starting AI analysis for field distribution...');

    const distributionPrompt = DISTRIBUTION_PROMPT
      .replace('{{RESEARCH_CONTENT}}', researchContent)
      .replace('{{BRIEF_DATA}}', JSON.stringify(briefData, null, 2));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Eres un asistente que extrae y organiza información de investigación de mercado en formato JSON estructurado. Responde SOLO con JSON válido.' 
          },
          { role: 'user', content: distributionPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[product-research] Lovable AI error:', aiResponse.status, errorText);
      // Continue with basic parsing if AI fails
    }

    let structuredData;
    try {
      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content || '';
      
      // Extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
        console.log('[product-research] AI distribution completed successfully');
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('[product-research] Error parsing AI response:', parseError);
      // Fallback to basic parsing
      structuredData = parseResearchContentFallback(researchContent, citations, briefData);
    }

    // ============================================
    // FASE 3: Guardar en base de datos
    // ============================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateData: any = {
      brief_status: 'completed',
      brief_completed_at: new Date().toISOString(),
      brief_data: briefData,
      research_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Distribute AI-analyzed content to product fields
    if (structuredData) {
      if (structuredData.description) {
        updateData.description = structuredData.description;
      }
      if (structuredData.strategy) {
        updateData.strategy = structuredData.strategy;
      }
      if (structuredData.market_research) {
        updateData.market_research = structuredData.market_research;
      }
      if (structuredData.ideal_avatar) {
        updateData.ideal_avatar = structuredData.ideal_avatar;
      }
      if (structuredData.sales_angles && Array.isArray(structuredData.sales_angles)) {
        updateData.sales_angles = structuredData.sales_angles;
      }
      
      // Store complex structured data in JSONB fields
      updateData.competitor_analysis = {
        summary: structuredData.competitor_summary || '',
        differentiation: structuredData.differentiation_opportunities || '',
        rawContent: researchContent.substring(
          researchContent.indexOf('4. Análisis de competencia'),
          researchContent.indexOf('5. Oportunidades')
        ),
        citations: citations.slice(0, 10),
        generatedAt: new Date().toISOString()
      };

      updateData.avatar_profiles = {
        profiles: structuredData.avatar_profiles || [],
        summary: structuredData.ideal_avatar || '',
        generatedAt: new Date().toISOString()
      };

      updateData.sales_angles_data = {
        angles: structuredData.sales_angles || [],
        esferaInsights: structuredData.esfera_insights || {},
        generatedAt: new Date().toISOString()
      };

      updateData.content_strategy = {
        strategy: structuredData.strategy || '',
        executiveSummary: structuredData.executive_summary || '',
        esferaInsights: structuredData.esfera_insights || {},
        generatedAt: new Date().toISOString()
      };
    }

    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (updateError) {
      console.error('[product-research] Database update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save research to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[product-research] Research saved successfully for product:', productId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          ...structuredData,
          rawContent: researchContent,
          citations
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[product-research] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildProductDescription(briefData: any): string {
  const parts = [];

  // Basic info
  if (briefData.productName) {
    parts.push(`**Nombre del producto:** ${briefData.productName}`);
  }
  if (briefData.category) {
    parts.push(`**Categoría:** ${briefData.category}${briefData.customCategory ? ` - ${briefData.customCategory}` : ''}`);
  }
  if (briefData.currentObjective) {
    parts.push(`**Objetivo actual:** ${briefData.currentObjective}`);
  }
  if (briefData.slogan) {
    parts.push(`**Slogan:** ${briefData.slogan}`);
  }

  // Value & Transformation
  if (briefData.mainBenefit) {
    parts.push(`**Beneficio principal:** ${briefData.mainBenefit}`);
  }
  if (briefData.transformation) {
    parts.push(`**Transformación que produce:** ${briefData.transformation}`);
  }
  if (briefData.differentiator) {
    parts.push(`**Diferenciador:** ${briefData.differentiator}`);
  }
  if (briefData.keyIngredients) {
    parts.push(`**Ingredientes/Componentes clave:** ${briefData.keyIngredients}`);
  }
  if (briefData.mustCommunicate) {
    parts.push(`**Lo que debe comunicarse:** ${briefData.mustCommunicate}`);
  }

  // Problem & Desire
  if (briefData.problemSolved) {
    parts.push(`**Problema que resuelve:** ${briefData.problemSolved}`);
  }
  if (briefData.mainDesire) {
    parts.push(`**Deseo principal que satisface:** ${briefData.mainDesire}`);
  }
  if (briefData.consequenceOfNotBuying) {
    parts.push(`**Consecuencia de no comprar:** ${briefData.consequenceOfNotBuying}`);
  }
  if (briefData.competitiveAdvantage) {
    parts.push(`**Ventaja competitiva:** ${briefData.competitiveAdvantage}`);
  }

  // Neuromarketing
  if (briefData.reptileBrain?.length > 0) {
    parts.push(`**Gatillos reptilianos:** ${briefData.reptileBrain.join(', ')}`);
  }
  if (briefData.limbicBrain?.length > 0) {
    parts.push(`**Emociones objetivo:** ${briefData.limbicBrain.join(', ')}`);
  }
  if (briefData.cortexBrain) {
    parts.push(`**Justificación racional:** ${briefData.cortexBrain}`);
  }

  // Target Audience
  const audienceParts = [];
  if (briefData.targetGender) audienceParts.push(`Género: ${briefData.targetGender}`);
  if (briefData.targetAgeRange) audienceParts.push(`Edad: ${briefData.targetAgeRange}`);
  if (briefData.targetOccupation) audienceParts.push(`Ocupación: ${briefData.targetOccupation}`);
  if (audienceParts.length > 0) {
    parts.push(`**Público objetivo:** ${audienceParts.join(', ')}`);
  }
  if (briefData.targetInterests?.length > 0) {
    parts.push(`**Intereses:** ${briefData.targetInterests.join(', ')}`);
  }
  if (briefData.targetHabits) {
    parts.push(`**Hábitos:** ${briefData.targetHabits}`);
  }
  if (briefData.commonObjections?.length > 0) {
    parts.push(`**Objeciones comunes:** ${briefData.commonObjections.join(', ')}`);
  }
  if (briefData.idealScenario) {
    parts.push(`**Escenario ideal post-compra:** ${briefData.idealScenario}`);
  }

  // Content Strategy
  if (briefData.contentTypes?.length > 0) {
    parts.push(`**Tipos de contenido:** ${briefData.contentTypes.join(', ')}`);
  }
  if (briefData.platforms?.length > 0) {
    parts.push(`**Plataformas:** ${briefData.platforms.join(', ')}`);
  }
  if (briefData.useForAds) {
    parts.push(`**Uso en Ads:** ${briefData.useForAds}`);
  }
  if (briefData.referenceContent) {
    parts.push(`**Contenido de referencia:** ${briefData.referenceContent}`);
  }
  if (briefData.brandStrengths) {
    parts.push(`**Puntos fuertes a comunicar:** ${briefData.brandStrengths}`);
  }
  if (briefData.brandRestrictions) {
    parts.push(`**Restricciones de marca:** ${briefData.brandRestrictions}`);
  }
  if (briefData.expectedResult) {
    parts.push(`**Resultado esperado:** ${briefData.expectedResult}`);
  }
  if (briefData.additionalNotes) {
    parts.push(`**Notas adicionales:** ${briefData.additionalNotes}`);
  }

  return parts.join('\n\n');
}

// Fallback parser if AI distribution fails
function parseResearchContentFallback(content: string, citations: string[], briefData: any): any {
  const extractSection = (startMarker: string, endMarker: string | null): string => {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    let endIndex = content.length;
    if (endMarker) {
      const foundEnd = content.indexOf(endMarker, startIndex + startMarker.length);
      if (foundEnd !== -1) {
        endIndex = foundEnd;
      }
    }
    
    return content.substring(startIndex, endIndex).trim();
  };

  return {
    description: `${briefData.mainBenefit || ''}\n\n${briefData.transformation || ''}\n\n${briefData.differentiator || ''}`.trim(),
    strategy: extractSection('6. Insights estratégicos', '7.'),
    market_research: extractSection('1. Panorama general', '2.'),
    ideal_avatar: extractSection('3. Segmentación y avatares', '4.'),
    sales_angles: briefData.aiSuggestedAngles || [],
    competitor_summary: extractSection('4. Análisis de competencia', '5.'),
    differentiation_opportunities: extractSection('5. Oportunidades de diferenciación', '6.'),
    esfera_insights: {
      enganchar: '',
      solucion: '',
      remarketing: '',
      fidelizar: ''
    },
    avatar_profiles: [],
    executive_summary: extractSection('7. Conclusión ejecutiva', null)
  };
}
