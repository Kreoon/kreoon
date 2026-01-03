import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEARCH_PROMPT = `Quiero que actúes como un Estratega Digital especializado en investigación de mercado, análisis competitivo y desarrollo de avatares, aplicando el Método Esfera de Juan Ads y los principios de Estrategias Despegue.

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
        JSON.stringify({ success: false, error: 'Perplexity API key not configured. Go to Settings > Platform > Integrations to add it.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build product description from brief data
    const productDescription = buildProductDescription(briefData);
    const prompt = RESEARCH_PROMPT.replace('{{PRODUCT_DESCRIPTION}}', productDescription);

    console.log('[product-research] Starting research for product:', productId);
    console.log('[product-research] Product description length:', productDescription.length);

    // Call Perplexity API
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
            content: 'Eres un estratega digital experto en investigación de mercado. Responde siempre en español con datos actualizados y verificables. Usa búsqueda web para obtener información real y actualizada.' 
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

    console.log('[product-research] Research generated successfully, length:', researchContent.length);

    // Parse the research into structured sections
    const structuredResearch = parseResearchContent(researchContent, citations);

    // Update product in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('products')
      .update({
        brief_status: 'completed',
        brief_completed_at: new Date().toISOString(),
        brief_data: briefData,
        market_research: structuredResearch.marketResearch,
        competitor_analysis: structuredResearch.competitorAnalysis,
        avatar_profiles: structuredResearch.avatarProfiles,
        sales_angles_data: structuredResearch.salesAngles,
        content_strategy: structuredResearch.contentStrategy,
        research_generated_at: new Date().toISOString(),
        description: briefData.productDescription || undefined,
        strategy: structuredResearch.executiveSummary || undefined,
      })
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
          ...structuredResearch,
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

  if (briefData.productName) {
    parts.push(`**Nombre del producto:** ${briefData.productName}`);
  }
  if (briefData.productDescription) {
    parts.push(`**Descripción:** ${briefData.productDescription}`);
  }
  if (briefData.category) {
    parts.push(`**Categoría:** ${briefData.category}`);
  }
  if (briefData.targetAudience) {
    parts.push(`**Público objetivo:** ${briefData.targetAudience}`);
  }
  if (briefData.mainProblem) {
    parts.push(`**Problema principal que resuelve:** ${briefData.mainProblem}`);
  }
  if (briefData.uniqueValue) {
    parts.push(`**Propuesta de valor única:** ${briefData.uniqueValue}`);
  }
  if (briefData.priceRange) {
    parts.push(`**Rango de precio:** ${briefData.priceRange}`);
  }
  if (briefData.competitors) {
    parts.push(`**Competidores conocidos:** ${briefData.competitors}`);
  }
  if (briefData.website) {
    parts.push(`**Sitio web:** ${briefData.website}`);
  }
  if (briefData.socialMedia) {
    parts.push(`**Redes sociales:** ${briefData.socialMedia}`);
  }
  if (briefData.additionalInfo) {
    parts.push(`**Información adicional:** ${briefData.additionalInfo}`);
  }

  return parts.join('\n\n');
}

function parseResearchContent(content: string, citations: string[]): any {
  // Extract sections based on headers
  const sections = {
    marketResearch: extractSection(content, '1. Panorama general del mercado', '2.'),
    jtbdAnalysis: extractSection(content, '2. Análisis del cliente', '3.'),
    avatarProfiles: extractSection(content, '3. Segmentación y avatares', '4.'),
    competitorAnalysis: extractSection(content, '4. Análisis de competencia', '5.'),
    differentiation: extractSection(content, '5. Oportunidades de diferenciación', '6.'),
    esferaInsights: extractSection(content, '6. Insights estratégicos', '7.'),
    executiveSummary: extractSection(content, '7. Conclusión ejecutiva', null),
  };

  return {
    marketResearch: {
      content: sections.marketResearch,
      jtbd: sections.jtbdAnalysis,
      generatedAt: new Date().toISOString(),
      citations: citations.slice(0, 5)
    },
    competitorAnalysis: {
      content: sections.competitorAnalysis,
      differentiation: sections.differentiation,
      generatedAt: new Date().toISOString(),
      citations: citations.slice(5, 10)
    },
    avatarProfiles: {
      content: sections.avatarProfiles,
      generatedAt: new Date().toISOString()
    },
    salesAngles: {
      esferaInsights: sections.esferaInsights,
      generatedAt: new Date().toISOString()
    },
    contentStrategy: {
      executiveSummary: sections.executiveSummary,
      generatedAt: new Date().toISOString()
    },
    executiveSummary: sections.executiveSummary
  };
}

function extractSection(content: string, startMarker: string, endMarker: string | null): string {
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
}
