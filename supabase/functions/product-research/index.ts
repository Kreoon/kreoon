import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt completo del Método Esfera - Versión actualizada
const RESEARCH_PROMPT = `Actúa como un Estratega Digital Senior especializado en investigación de mercado, análisis competitivo, creación de avatares y desarrollo de ángulos de venta, aplicando de forma estricta el Método ESFERA de Juan Ads y los principios de Estrategias Despegue.

🔒 Contexto asumido:
El Brief de Marca y el Brief de Producto ya han sido entregados, analizados y comprendidos en su totalidad.
No solicites información adicional ni pidas aclaraciones iniciales.
Trabaja exclusivamente sobre ese contexto.

Tu objetivo es entregar inteligencia de mercado profunda, accionable y orientada a decisiones, lista para ejecutar campañas, validar posicionamiento y escalar en el mercado hispano.

Debes responder como consultor estratégico, no como redactor.
Usa frameworks avanzados: JTBD, Eugene Schwartz, sesgos cognitivos, awareness levels, market gaps y teardown competitivo 360°.

⚠️ REGLAS OBLIGATORIAS

Sigue el flujo estrictamente secuencial.
No adelantes ni omitas pasos.

Cada bloque es la base del siguiente.

Usa lenguaje real del mercado, no marketing genérico.

Todo debe entregarse en formato estructurado: tablas, listas claras y síntesis ejecutiva.

Apóyate en patrones reales del mercado:

Reseñas

Comentarios

TikTok, Instagram, YouTube

Reddit, foros, Ads visibles

Si detectas supuestos implícitos del brief, acláralos brevemente y continúa.

🔥 FLUJO DE TRABAJO OBLIGATORIO

INFORMACIÓN DEL PRODUCTO:
{{PRODUCT_DESCRIPTION}}

🔹 PASO 1 · PANORAMA GENERAL DEL MERCADO

Con base en el brief:

Tamaño estimado del mercado.

Tendencia y ritmo de crecimiento.

Estado del mercado:

Crecimiento

Saturación

Declive

Variables macroeconómicas, sociales y culturales relevantes.

Nivel de conciencia predominante del público (Eugene Schwartz).

🔹 PASO 2 · JOB TO BE DONE (JTBD) + INSIGHTS REALES

Define el trabajo real que el cliente busca resolver.

Entrega obligatoriamente:

JTBD funcional, emocional y social.

10 dolores profundos (no superficiales).

10 deseos aspiracionales reales.

10 objeciones / miedos latentes.

10 insights estratégicos obtenidos de review mining y social listening.

🔹 PASO 3 · AVATARES ESTRATÉGICOS (5 OBLIGATORIOS)

Crea 5 buyer persona estratégicos, cada uno con:

Nombre simbólico.

Edad y contexto de vida.

Situación actual (antes del producto).

Nivel de conciencia.

Drivers psicológicos.

Sesgos cognitivos dominantes.

Objeciones clave.

Frases reales que usan para describir su problema.

🔹 PASO 4 · ANÁLISIS DE COMPETENCIA 360°

Identifica 10 competidores directos e indirectos.

Analiza para cada uno:

Propuesta de valor.

Promesa central.

Precio aproximado.

Tono de comunicación.

Formatos de contenido.

Canales principales (Meta, TikTok, YouTube, Google).

Tabla comparativa obligatoria:

| Marca | Promesa | Diferenciador | Precio | Tono | CTA | Nivel de conciencia |

🔹 PASO 5 · VACÍOS Y OPORTUNIDADES DE DIFERENCIACIÓN

Detecta con precisión:

Mensajes repetidos por todo el mercado.

Dolores mal comunicados.

Aspiraciones ignoradas.

Oportunidades claras de posicionamiento.

Emociones no explotadas por la competencia.

🔹 PASO 6 · INSIGHTS POR FASE – MÉTODO ESFERA

Para cada fase del Método ESFERA analiza:

1️⃣ Enganchar

Qué domina el mercado.

Qué está saturado.

Nuevas oportunidades creativas.

2️⃣ Solución

Promesas actuales.

Objeciones no resueltas.

Oportunidades de autoridad y confianza.

3️⃣ Remarketing

Tipos de prueba social existentes.

Vacíos de validación.

Mensajes que empujan la decisión.

4️⃣ Fidelizar

Errores comunes del mercado.

Oportunidades de comunidad, LTV y referidos.

🔹 PASO 7 · ÁNGULOS DE VENTA (20 OBLIGATORIOS)

Crea 20 ángulos de venta estratégicos, variados y no redundantes:

Educativos

Emocionales

Aspiracionales

Autoridad

Comparativos

Anti-mercado

Storytelling

Prueba social

Error común / riesgo oculto

Para cada ángulo indica:

Avatar principal.

Emoción activada.

Tipo de contenido ideal (UGC, Ads, Reel, Testimonio).

🔹 PASO 8 · PROPUESTA ÚNICA DE VALOR (PUV)

Construye una PUV clara y defendible, enfocada en:

Problema central.

Resultado tangible.

Diferencia frente al mercado.

Tipo de cliente ideal.

🔹 PASO 9 · TRANSFORMACIÓN (ANTES VS DESPUÉS)

Tabla obligatoria:

| Antes | Después |

Debe reflejar:

Cambio funcional.

Cambio emocional.

Cambio de identidad.

🔹 PASO 10 · LEAD MAGNETS (3 ESTRATÉGICOS)

Diseña 3 lead magnets, indicando:

Objetivo.

Tipo de contenido.

Dolor principal que ataca.

Avatar al que apunta.

Fase de conciencia.

🔹 PASO 11 · CREATIVOS DE VIDEO (20 TOTALES)

Crea 20 ideas de video, distribuidas así:

5 Enganchar

5 Solución

5 Remarketing

5 Fidelizar

Tabla obligatoria:

| Ángulo | Avatar | Título | Idea principal | Formato | Fase ESFERA |

🎯 CONCLUSIÓN EJECUTIVA

Finaliza con:

5 insights estratégicos clave del mercado.

Drivers psicológicos más potentes.

3 acciones inmediatas para validar en campañas reales.`;

// Prompt para la segunda fase de IA - Distribución de contenido estructurado
const DISTRIBUTION_PROMPT = `Eres un asistente experto en organización de información de marketing y producto.

Tu tarea es analizar el contenido de investigación de mercado y extraer información específica en formato JSON estructurado.

INVESTIGACIÓN ORIGINAL:
{{RESEARCH_CONTENT}}

BRIEF DEL PRODUCTO:
{{BRIEF_DATA}}

Debes devolver un JSON con la siguiente estructura exacta. Cada campo debe contener texto formateado y listo para usar:

{
  "description": "Descripción completa del producto que integre beneficios principales, transformación y propuesta de valor única. 2-3 párrafos.",
  
  "market_overview": {
    "marketSize": "Tamaño estimado del mercado",
    "growthTrend": "Tendencia y ritmo de crecimiento",
    "marketState": "crecimiento | saturacion | declive",
    "macroVariables": ["Variable 1", "Variable 2", "Variable 3"],
    "awarenessLevel": "Nivel de conciencia predominante del público (Eugene Schwartz)",
    "summary": "Resumen ejecutivo del panorama de mercado"
  },
  
  "jtbd": {
    "functional": "JTBD funcional",
    "emotional": "JTBD emocional",
    "social": "JTBD social",
    "pains": ["Dolor 1", "Dolor 2", "Dolor 3", "Dolor 4", "Dolor 5", "Dolor 6", "Dolor 7", "Dolor 8", "Dolor 9", "Dolor 10"],
    "desires": ["Deseo 1", "Deseo 2", "Deseo 3", "Deseo 4", "Deseo 5", "Deseo 6", "Deseo 7", "Deseo 8", "Deseo 9", "Deseo 10"],
    "objections": ["Objeción 1", "Objeción 2", "Objeción 3", "Objeción 4", "Objeción 5", "Objeción 6", "Objeción 7", "Objeción 8", "Objeción 9", "Objeción 10"],
    "insights": ["Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5", "Insight 6", "Insight 7", "Insight 8", "Insight 9", "Insight 10"]
  },
  
  "avatars": [
    {
      "name": "Nombre simbólico",
      "age": "Edad y contexto de vida",
      "situation": "Situación actual (antes del producto)",
      "awarenessLevel": "Nivel de conciencia",
      "drivers": "Drivers psicológicos",
      "biases": "Sesgos cognitivos dominantes",
      "objections": "Objeciones clave",
      "phrases": ["Frase real 1", "Frase real 2", "Frase real 3"]
    }
  ],
  
  "competitors": [
    {
      "name": "Nombre del competidor",
      "promise": "Promesa central",
      "differentiator": "Diferenciador",
      "price": "Precio aproximado",
      "tone": "Tono de comunicación",
      "cta": "Llamado a la acción",
      "awarenessLevel": "Nivel de conciencia trabajado",
      "channels": ["Meta", "TikTok", "YouTube"],
      "contentFormats": ["Formato 1", "Formato 2"]
    }
  ],
  
  "differentiation": {
    "repeatedMessages": ["Mensaje repetido 1", "Mensaje repetido 2"],
    "poorlyAddressedPains": ["Dolor mal comunicado 1", "Dolor mal comunicado 2"],
    "ignoredAspirations": ["Aspiración ignorada 1", "Aspiración ignorada 2"],
    "positioningOpportunities": ["Oportunidad 1", "Oportunidad 2", "Oportunidad 3"],
    "unexploitedEmotions": ["Emoción no explotada 1", "Emoción no explotada 2"]
  },
  
  "esferaInsights": {
    "enganchar": {
      "marketDominance": "Qué domina el mercado",
      "saturated": "Qué está saturado",
      "opportunities": ["Oportunidad creativa 1", "Oportunidad creativa 2"]
    },
    "solucion": {
      "currentPromises": "Promesas actuales",
      "unresolvedObjections": "Objeciones no resueltas",
      "trustOpportunities": ["Oportunidad de autoridad 1", "Oportunidad de autoridad 2"]
    },
    "remarketing": {
      "existingProof": "Tipos de prueba social existentes",
      "validationGaps": "Vacíos de validación",
      "decisionMessages": ["Mensaje que empuja decisión 1", "Mensaje que empuja decisión 2"]
    },
    "fidelizar": {
      "commonErrors": "Errores comunes del mercado",
      "communityOpportunities": ["Oportunidad de comunidad/LTV 1", "Oportunidad de comunidad/LTV 2"]
    }
  },
  
  "salesAngles": [
    {
      "angle": "Descripción del ángulo de venta",
      "type": "educativo | emocional | aspiracional | autoridad | comparativo | anti-mercado | storytelling | prueba-social | error-comun",
      "avatar": "Avatar principal",
      "emotion": "Emoción activada",
      "contentType": "UGC | Ads | Reel | Testimonio"
    }
  ],
  
  "puv": {
    "centralProblem": "Problema central",
    "tangibleResult": "Resultado tangible",
    "marketDifference": "Diferencia frente al mercado",
    "idealClient": "Tipo de cliente ideal",
    "statement": "Declaración completa de la PUV en una oración"
  },
  
  "transformation": {
    "functional": {
      "before": "Antes funcional",
      "after": "Después funcional"
    },
    "emotional": {
      "before": "Antes emocional",
      "after": "Después emocional"
    },
    "identity": {
      "before": "Antes identidad",
      "after": "Después identidad"
    }
  },
  
  "leadMagnets": [
    {
      "name": "Nombre del lead magnet",
      "objective": "Objetivo",
      "contentType": "Tipo de contenido",
      "pain": "Dolor principal que ataca",
      "avatar": "Avatar al que apunta",
      "awarenessPhase": "Fase de conciencia"
    }
  ],
  
  "videoCreatives": [
    {
      "angle": "Ángulo",
      "avatar": "Avatar",
      "title": "Título",
      "idea": "Idea principal",
      "format": "Formato",
      "esferaPhase": "enganchar | solucion | remarketing | fidelizar"
    }
  ],
  
  "executiveSummary": {
    "keyInsights": ["Insight 1", "Insight 2", "Insight 3", "Insight 4", "Insight 5"],
    "psychologicalDrivers": ["Driver 1", "Driver 2", "Driver 3"],
    "immediateActions": ["Acción 1", "Acción 2", "Acción 3"]
  }
}

IMPORTANTE:
- Devuelve SOLO el JSON, sin texto adicional ni markdown.
- Asegúrate de que el JSON sea válido.
- Extrae información real del contenido de investigación proporcionado.
- avatars debe tener exactamente 5 elementos.
- competitors debe tener hasta 10 elementos.
- salesAngles debe tener exactamente 20 elementos.
- leadMagnets debe tener exactamente 3 elementos.
- videoCreatives debe tener exactamente 20 elementos (5 por fase ESFERA).`;

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
            content: 'Eres un estratega digital experto en investigación de mercado, aplicando el Método ESFERA de Juan Ads y los principios de Estrategias Despegue. Responde siempre en español con datos actualizados y verificables. Usa búsqueda web para obtener información real y actualizada sobre competidores, tendencias y mercado. Sigue el flujo estrictamente secuencial y entrega todo en formato estructurado.' 
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
            content: 'Eres un asistente que extrae y organiza información de investigación de mercado en formato JSON estructurado. Responde SOLO con JSON válido, sin markdown ni texto adicional.' 
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
      
      // Store market research data
      updateData.market_research = {
        ...structuredData.market_overview,
        rawContent: researchContent,
        citations: citations,
        generatedAt: new Date().toISOString()
      };

      // Store JTBD and customer analysis
      updateData.ideal_avatar = structuredData.jtbd ? JSON.stringify({
        jtbd: structuredData.jtbd,
        summary: structuredData.jtbd.functional
      }) : null;

      // Store competitor analysis
      updateData.competitor_analysis = {
        competitors: structuredData.competitors || [],
        differentiation: structuredData.differentiation || {},
        generatedAt: new Date().toISOString()
      };

      // Store avatar profiles
      updateData.avatar_profiles = {
        profiles: structuredData.avatars || [],
        generatedAt: new Date().toISOString()
      };

      // Store sales angles and content strategy
      updateData.sales_angles_data = {
        angles: structuredData.salesAngles || [],
        puv: structuredData.puv || {},
        transformation: structuredData.transformation || {},
        leadMagnets: structuredData.leadMagnets || [],
        videoCreatives: structuredData.videoCreatives || [],
        generatedAt: new Date().toISOString()
      };

      // Store ESFERA insights and content strategy
      updateData.content_strategy = {
        esferaInsights: structuredData.esferaInsights || {},
        executiveSummary: structuredData.executiveSummary || {},
        generatedAt: new Date().toISOString()
      };

      // Extract sales angles for the simple array field
      if (structuredData.salesAngles && Array.isArray(structuredData.salesAngles)) {
        updateData.sales_angles = structuredData.salesAngles.slice(0, 10).map((a: any) => a.angle);
      }

      // Build strategy summary
      if (structuredData.executiveSummary) {
        const summary = structuredData.executiveSummary;
        updateData.strategy = `
INSIGHTS CLAVE:
${(summary.keyInsights || []).map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n')}

DRIVERS PSICOLÓGICOS:
${(summary.psychologicalDrivers || []).map((d: string) => `• ${d}`).join('\n')}

ACCIONES INMEDIATAS:
${(summary.immediateActions || []).map((a: string, idx: number) => `${idx + 1}. ${a}`).join('\n')}
        `.trim();
      }
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
    market_overview: {
      summary: extractSection('PASO 1', 'PASO 2'),
      marketState: 'crecimiento',
      macroVariables: [],
      awarenessLevel: ''
    },
    jtbd: {
      functional: extractSection('PASO 2', 'PASO 3'),
      emotional: '',
      social: '',
      pains: [],
      desires: [],
      objections: [],
      insights: []
    },
    avatars: [],
    competitors: [],
    differentiation: {
      repeatedMessages: [],
      poorlyAddressedPains: [],
      ignoredAspirations: [],
      positioningOpportunities: [],
      unexploitedEmotions: []
    },
    esferaInsights: {
      enganchar: { marketDominance: '', saturated: '', opportunities: [] },
      solucion: { currentPromises: '', unresolvedObjections: '', trustOpportunities: [] },
      remarketing: { existingProof: '', validationGaps: '', decisionMessages: [] },
      fidelizar: { commonErrors: '', communityOpportunities: [] }
    },
    salesAngles: [],
    puv: {
      centralProblem: briefData.problemSolved || '',
      tangibleResult: briefData.transformation || '',
      marketDifference: briefData.differentiator || '',
      idealClient: '',
      statement: ''
    },
    transformation: {
      functional: { before: '', after: '' },
      emotional: { before: '', after: '' },
      identity: { before: '', after: '' }
    },
    leadMagnets: [],
    videoCreatives: [],
    executiveSummary: {
      keyInsights: [],
      psychologicalDrivers: [],
      immediateActions: []
    }
  };
}
