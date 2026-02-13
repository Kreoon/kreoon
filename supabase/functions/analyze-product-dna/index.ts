// ============================================
// FASE 3: Edge Function - Product DNA AI Analysis
// supabase/functions/analyze-product-dna/index.ts
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// CONFIGURACIÓN Y TIPOS
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductDNAInput {
  id: string;
  service_group: string;
  selected_services: string[];
  selected_goal: string;
  responses: Record<string, any>;
  audio_url?: string;
  product_links: string[];
  competitor_links: string[];
  inspiration_links: string[];
  client_id?: string;
}

interface AIAnalysisResult {
  executive_summary: string;
  market_analysis: {
    trends: string[];
    competitors: CompetitorAnalysis[];
    opportunities: string[];
    threats: string[];
    market_size_estimation: string;
  };
  target_audience: {
    primary: AudienceProfile;
    secondary?: AudienceProfile;
    pain_points: string[];
    desires: string[];
    buying_triggers: string[];
  };
  creative_brief: {
    tone: string;
    style: string;
    key_messages: string[];
    visual_direction: string;
    content_pillars: string[];
    hooks_suggestions: string[];
    cta_recommendations: string[];
  };
  recommendations: {
    immediate_actions: ActionItem[];
    short_term: ActionItem[];
    long_term: ActionItem[];
  };
  creator_profile: {
    ideal_traits: string[];
    content_types: string[];
    platforms: string[];
    collaboration_format: string;
  };
  budget_estimation: {
    range: { min: number; max: number; currency: string };
    breakdown: BudgetItem[];
  };
  timeline_suggestion: {
    total_duration: string;
    phases: TimelinePhase[];
  };
  kiro_insights: string[];
}

interface CompetitorAnalysis {
  name: string;
  strengths: string[];
  weaknesses: string[];
  differentiator: string;
}

interface AudienceProfile {
  demographic: string;
  psychographic: string;
  behaviors: string[];
  channels: string[];
}

interface ActionItem {
  action: string;
  priority: 'alta' | 'media' | 'baja';
  estimated_impact: string;
}

interface BudgetItem {
  category: string;
  percentage: number;
  description: string;
}

interface TimelinePhase {
  name: string;
  duration: string;
  deliverables: string[];
}

// ============================================
// PROMPTS POR GRUPO DE SERVICIO
// ============================================

const SERVICE_GROUP_CONTEXTS: Record<string, string> = {
  technology: `
Eres un experto en desarrollo de software, productos digitales y tecnología.
Contexto de la industria tech en LATAM:
- Mercado en crecimiento acelerado con adopción digital post-pandemia
- Preferencia por soluciones mobile-first
- Importancia de UX/UI para mercados hispanohablantes
- Ecosistema de startups en Colombia, México, Chile, Argentina
- Tendencias: IA, automatización, fintech, healthtech, edtech
`,

  content_creation: `
Eres un experto en creación de contenido UGC, marketing de contenidos y estrategia digital.
Contexto del mercado de contenido en LATAM:
- Boom de creadores de contenido y economía del creator
- TikTok, Instagram Reels y YouTube Shorts dominan
- Alto engagement con contenido auténtico vs producido
- Influencer marketing en evolución hacia micro/nano influencers
- Live shopping emergente en la región
`,

  post_production: `
Eres un experto en producción audiovisual, edición y post-producción.
Contexto de la industria audiovisual en LATAM:
- Crecimiento de producción local para streaming
- Demanda de contenido corto para redes sociales
- Tendencia hacia contenido vertical (9:16)
- Motion graphics y animación en alta demanda
- Podcast y audio content en crecimiento
`,

  strategy_marketing: `
Eres un experto en estrategia de marketing digital, growth y branding.
Contexto del marketing digital en LATAM:
- Meta (Facebook/Instagram) sigue siendo dominante
- TikTok con crecimiento explosivo
- Email marketing con altas tasas de apertura
- WhatsApp como canal de ventas crucial
- SEO en español con oportunidades de nicho
`,

  education_training: `
Eres un experto en educación digital, e-learning y desarrollo de formación.
Contexto de la educación digital en LATAM:
- Mercado de cursos online en expansión
- Preferencia por contenido en español nativo
- Microlearning y contenido bite-sized
- Certificaciones y credenciales digitales valoradas
- Comunidades de aprendizaje como diferenciador
`,

  general_services: `
Eres un experto en consultoría de negocios y servicios profesionales.
Contexto de servicios profesionales en LATAM:
- Digitalización acelerada de PYMES
- Demanda de soluciones integrales
- Importancia de relaciones personales en negocios
- Flexibilidad en modelos de trabajo
- Valor del acompañamiento y seguimiento
`
};

// ============================================
// PROMPTS POR OBJETIVO
// ============================================

const GOAL_CONTEXTS: Record<string, string> = {
  // Technology goals
  mvp: 'El cliente busca validar una idea rápidamente con un producto mínimo viable. Priorizar velocidad, funcionalidad core y feedback temprano.',
  full_app: 'El cliente necesita una aplicación completa y robusta. Considerar escalabilidad, mantenibilidad y experiencia de usuario completa.',
  landing_page: 'El cliente necesita una página de aterrizaje efectiva. Enfocarse en conversión, copywriting persuasivo y diseño orientado a acción.',
  ecommerce: 'El cliente quiere vender online. Considerar pasarelas de pago locales, logística, UX de compra y estrategias de conversión.',
  redesign: 'El cliente busca modernizar su presencia digital. Analizar qué funciona actualmente y qué necesita mejora.',
  integration: 'El cliente necesita conectar sistemas. Considerar APIs, automatizaciones y flujos de datos.',

  // Content creation goals
  brand_awareness: 'El objetivo es aumentar el reconocimiento de marca. Priorizar alcance, memorabilidad y consistencia de mensaje.',
  lead_generation: 'El objetivo es capturar leads cualificados. Enfocarse en contenido de valor, CTAs claros y nurturing.',
  sales: 'El objetivo es generar ventas directas. Priorizar contenido de conversión, urgencia y prueba social.',
  engagement: 'El objetivo es aumentar la interacción. Crear contenido que invite a participar, comentar y compartir.',
  education: 'El objetivo es educar a la audiencia. Priorizar claridad, valor práctico y progresión de conocimiento.',
  other_content: 'Objetivo personalizado de contenido. Adaptar la estrategia según las necesidades específicas.',

  // Post-production goals
  social_video: 'Contenido de video para redes sociales. Formato vertical, ganchos fuertes, subtítulos y duración optimizada.',
  corporate_video: 'Video corporativo profesional. Tono institucional, producción de calidad y mensaje claro.',
  commercial: 'Comercial publicitario. Impacto visual, storytelling persuasivo y call-to-action memorable.',
  documentary: 'Contenido documental. Narrativa envolvente, investigación profunda y producción cinematográfica.',
  animation: 'Motion graphics o animación. Estilo visual definido, ritmo dinámico y claridad de mensaje.',
  podcast_audio: 'Producción de audio/podcast. Calidad de sonido, edición fluida y formato atractivo.',

  // Strategy & Marketing goals
  content_strategy: 'Estrategia de contenido integral. Pilares, calendario editorial y métricas de éxito.',
  paid_ads: 'Estrategia de publicidad paga. Segmentación, creativos, presupuesto y optimización.',
  brand_strategy: 'Estrategia de marca. Posicionamiento, identidad verbal/visual y diferenciación.',
  launch_campaign: 'Campaña de lanzamiento. Generar expectativa, momentum y conversión inicial.',
  growth_consulting: 'Consultoría de crecimiento. Identificar palancas de growth y experimentos.',
  community_management: 'Gestión de comunidad. Engagement, moderación y construcción de relaciones.',

  // Education goals
  online_course: 'Curso online completo. Estructura modular, evaluaciones y certificación.',
  workshop: 'Taller práctico. Aprendizaje experiencial, ejercicios hands-on y resultados tangibles.',
  webinar: 'Webinar o masterclass. Contenido de valor, interacción en vivo y generación de leads.',
  learning_materials: 'Materiales de aprendizaje. Guías, plantillas y recursos descargables.',
  coaching_program: 'Programa de coaching. Acompañamiento personalizado, sesiones 1:1 y seguimiento.',
  corporate_training: 'Capacitación corporativa. Adaptado a cultura empresa, métricas de impacto.',

  // General services goals
  consulting: 'Consultoría especializada. Diagnóstico, recomendaciones y plan de acción.',
  audit: 'Auditoría y análisis. Evaluación profunda, hallazgos y oportunidades de mejora.',
  ongoing_support: 'Soporte continuo. Disponibilidad, tiempos de respuesta y escalamiento.',
  one_time_project: 'Proyecto único. Alcance definido, entregables claros y timeline acotado.',
  custom_request: 'Solicitud personalizada. Flexibilidad para adaptar servicios a necesidades específicas.'
};

// ============================================
// FUNCIÓN: Transcribir Audio con Whisper
// ============================================

async function transcribeAudio(audioUrl: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not configured');
    return '';
  }

  try {
    // Descargar el audio
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();

    // Preparar FormData para Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'es');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whisper API error:', error);
      return '';
    }

    const transcript = await response.text();
    return transcript;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return '';
  }
}

// ============================================
// FUNCIÓN: Análisis de Mercado con Perplexity
// ============================================

async function analyzeMarketWithPerplexity(
  serviceGroup: string,
  goal: string,
  productInfo: string,
  competitorLinks: string[]
): Promise<{
  trends: string[];
  competitors: CompetitorAnalysis[];
  opportunities: string[];
  market_insights: string;
}> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');

  if (!PERPLEXITY_API_KEY) {
    console.error('PERPLEXITY_API_KEY not configured');
    return {
      trends: [],
      competitors: [],
      opportunities: [],
      market_insights: ''
    };
  }

  const competitorContext = competitorLinks.length > 0
    ? `\nCompetidores a analizar: ${competitorLinks.join(', ')}`
    : '';

  const prompt = `
Analiza el mercado para un proyecto en la categoría "${serviceGroup}" con objetivo "${goal}" en Latinoamérica.

Información del producto/servicio:
${productInfo}
${competitorContext}

Proporciona un análisis actualizado incluyendo:
1. Las 5 tendencias más relevantes del mercado en 2024-2025
2. Análisis de los principales competidores (fortalezas, debilidades, diferenciadores)
3. Las 5 mejores oportunidades de mercado
4. Insights generales del mercado

Responde en español y sé específico para el mercado latinoamericano.
`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Eres un analista de mercado experto en Latinoamérica. Proporciona información actualizada y relevante.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Perplexity API error:', error);
      return {
        trends: [],
        competitors: [],
        opportunities: [],
        market_insights: ''
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parsear la respuesta (simplificado, en producción usar structured output)
    return {
      trends: extractListFromText(content, 'tendencias'),
      competitors: extractCompetitorsFromText(content),
      opportunities: extractListFromText(content, 'oportunidades'),
      market_insights: content
    };
  } catch (error) {
    console.error('Error with Perplexity:', error);
    return {
      trends: [],
      competitors: [],
      opportunities: [],
      market_insights: ''
    };
  }
}

// ============================================
// FUNCIÓN: Análisis Principal con Gemini
// ============================================

async function generateMainAnalysis(
  input: ProductDNAInput,
  audioTranscript: string,
  marketAnalysis: any
): Promise<AIAnalysisResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const serviceContext = SERVICE_GROUP_CONTEXTS[input.service_group] || SERVICE_GROUP_CONTEXTS.general_services;
  const goalContext = GOAL_CONTEXTS[input.selected_goal] || '';

  const systemPrompt = `
${serviceContext}

${goalContext}

Eres KIRO, el asistente de IA de Kreoon - una plataforma de UGC y creación de contenido en Latinoamérica.
Tu personalidad es profesional pero cercana, con un toque de humor inteligente. Usas ocasionalmente emojis relevantes.
Tu objetivo es generar un análisis profundo y accionable que ayude al equipo de Kreoon a entender perfectamente el proyecto del cliente.
`;

  const userPrompt = `
# DATOS DEL PROYECTO

## Categoría de Servicio
${input.service_group}

## Servicios Específicos Seleccionados
${input.selected_services.join(', ') || 'No especificados'}

## Objetivo Principal
${input.selected_goal}

## Respuestas del Cliente
${JSON.stringify(input.responses, null, 2)}

## Transcripción del Audio del Cliente
${audioTranscript || 'No se proporcionó audio'}

## Referencias del Cliente
- Producto/Servicio: ${input.product_links.join(', ') || 'Ninguno'}
- Competencia: ${input.competitor_links.join(', ') || 'Ninguno'}
- Inspiración: ${input.inspiration_links.join(', ') || 'Ninguno'}

## Análisis de Mercado Previo
${marketAnalysis.market_insights || 'No disponible'}

# INSTRUCCIONES

Genera un análisis completo en formato JSON con la siguiente estructura exacta:

{
  "executive_summary": "Resumen ejecutivo de 2-3 párrafos que capture la esencia del proyecto, el problema a resolver y la oportunidad",

  "market_analysis": {
    "trends": ["5 tendencias relevantes para este proyecto"],
    "competitors": [
      {
        "name": "Nombre del competidor",
        "strengths": ["fortaleza 1", "fortaleza 2"],
        "weaknesses": ["debilidad 1", "debilidad 2"],
        "differentiator": "Qué los hace únicos"
      }
    ],
    "opportunities": ["5 oportunidades de mercado"],
    "threats": ["3-5 amenazas o riesgos"],
    "market_size_estimation": "Estimación del tamaño de mercado relevante"
  },

  "target_audience": {
    "primary": {
      "demographic": "Descripción demográfica detallada",
      "psychographic": "Perfil psicográfico",
      "behaviors": ["comportamiento 1", "comportamiento 2"],
      "channels": ["canal preferido 1", "canal 2"]
    },
    "secondary": {
      "demographic": "...",
      "psychographic": "...",
      "behaviors": [],
      "channels": []
    },
    "pain_points": ["5 puntos de dolor principales"],
    "desires": ["5 deseos o aspiraciones"],
    "buying_triggers": ["3-5 disparadores de compra"]
  },

  "creative_brief": {
    "tone": "Descripción del tono de comunicación recomendado",
    "style": "Estilo visual y de contenido sugerido",
    "key_messages": ["3-5 mensajes clave a comunicar"],
    "visual_direction": "Dirección visual recomendada",
    "content_pillars": ["3-5 pilares de contenido"],
    "hooks_suggestions": ["5 ganchos creativos para contenido"],
    "cta_recommendations": ["3 CTAs recomendados"]
  },

  "recommendations": {
    "immediate_actions": [
      {"action": "Acción inmediata", "priority": "alta", "estimated_impact": "Descripción del impacto"}
    ],
    "short_term": [
      {"action": "Acción a corto plazo (1-3 meses)", "priority": "media", "estimated_impact": "..."}
    ],
    "long_term": [
      {"action": "Acción a largo plazo (3-6 meses)", "priority": "media", "estimated_impact": "..."}
    ]
  },

  "creator_profile": {
    "ideal_traits": ["5 características del creador ideal"],
    "content_types": ["tipos de contenido recomendados"],
    "platforms": ["plataformas prioritarias"],
    "collaboration_format": "Formato de colaboración sugerido"
  },

  "budget_estimation": {
    "range": {"min": 0, "max": 0, "currency": "USD"},
    "breakdown": [
      {"category": "Categoría", "percentage": 0, "description": "..."}
    ]
  },

  "timeline_suggestion": {
    "total_duration": "X semanas/meses",
    "phases": [
      {"name": "Fase 1", "duration": "X semanas", "deliverables": ["entregable 1"]}
    ]
  },

  "kiro_insights": [
    "5 insights únicos de KIRO con su toque personal y emojis ocasionales"
  ]
}

Responde SOLO con el JSON, sin texto adicional antes o después.
Asegúrate de que sea JSON válido y parseable.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000,
            responseMimeType: 'application/json'
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    // Limpiar y parsear JSON
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const analysis = JSON.parse(cleanedContent) as AIAnalysisResult;
    return analysis;
  } catch (error) {
    console.error('Error generating analysis:', error);
    throw error;
  }
}

// ============================================
// HELPERS
// ============================================

function extractListFromText(text: string, keyword: string): string[] {
  // Simplificado - en producción usar regex más robusto
  const lines = text.split('\n');
  const items: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (line.toLowerCase().includes(keyword)) {
      capturing = true;
      continue;
    }
    if (capturing && line.match(/^[\d\-\*]/)) {
      const item = line.replace(/^[\d\-\*\.\)]+\s*/, '').trim();
      if (item) items.push(item);
      if (items.length >= 5) break;
    }
    if (capturing && line.match(/^#|^\d+\./)) {
      capturing = false;
    }
  }

  return items;
}

function extractCompetitorsFromText(_text: string): CompetitorAnalysis[] {
  // Simplificado - retorna array vacío si no se puede parsear
  return [];
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { product_dna_id } = await req.json();

    if (!product_dna_id) {
      return new Response(
        JSON.stringify({ error: 'product_dna_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener datos del Product DNA
    const { data: productDna, error: fetchError } = await supabaseClient
      .from('product_dna')
      .select('*')
      .eq('id', product_dna_id)
      .single();

    if (fetchError || !productDna) {
      return new Response(
        JSON.stringify({ error: 'Product DNA not found', details: fetchError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Actualizar estado a 'processing'
    await supabaseClient
      .from('product_dna')
      .update({ status: 'processing' })
      .eq('id', product_dna_id);

    console.log(`Processing Product DNA: ${product_dna_id}`);

    // 3. Transcribir audio si existe
    let audioTranscript = '';
    if (productDna.audio_url) {
      console.log('Transcribing audio...');
      audioTranscript = await transcribeAudio(productDna.audio_url);

      // Guardar transcripción
      await supabaseClient
        .from('product_dna')
        .update({ audio_transcript: audioTranscript })
        .eq('id', product_dna_id);
    }

    // 4. Análisis de mercado con Perplexity
    console.log('Analyzing market with Perplexity...');
    const productInfo = `
      Servicios: ${productDna.selected_services?.join(', ') || 'N/A'}
      Objetivo: ${productDna.selected_goal}
      Descripción: ${productDna.responses?.product_description || productDna.responses?.project_description || 'N/A'}
    `;

    const marketAnalysis = await analyzeMarketWithPerplexity(
      productDna.service_group,
      productDna.selected_goal,
      productInfo,
      productDna.competitor_links || []
    );

    // 5. Generar análisis principal con Gemini
    console.log('Generating main analysis with Gemini...');
    const analysis = await generateMainAnalysis(
      productDna as ProductDNAInput,
      audioTranscript,
      marketAnalysis
    );

    // 6. Calcular scores
    const completenessScore = calculateCompletenessScore(productDna);
    const confidenceScore = calculateConfidenceScore(productDna, audioTranscript);

    // 7. Guardar resultados
    const { error: updateError } = await supabaseClient
      .from('product_dna')
      .update({
        ai_analysis: analysis,
        analysis_model: 'gemini-2.0-flash-exp',
        analysis_version: 1,
        analysis_generated_at: new Date().toISOString(),
        status: 'completed',
        completeness_score: completenessScore,
        confidence_score: confidenceScore,
        completed_at: new Date().toISOString()
      })
      .eq('id', product_dna_id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Analysis completed for Product DNA: ${product_dna_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        product_dna_id,
        analysis,
        completeness_score: completenessScore,
        confidence_score: confidenceScore
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-product-dna:', error);

    // Intentar marcar como failed
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Re-parse no es posible ya que el body ya fue consumido
      // El error handler se simplifica para solo loguear
      console.error('Could not update status to failed - request body already consumed');
    } catch (e) {
      console.error('Failed to update status to failed:', e);
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================
// FUNCIONES DE SCORING
// ============================================

function calculateCompletenessScore(productDna: any): number {
  let score = 0;
  const maxScore = 100;

  // Service group y goal (20 puntos)
  if (productDna.service_group && productDna.selected_goal) score += 20;

  // Respuestas (30 puntos)
  const responses = productDna.responses || {};
  const responseCount = Object.keys(responses).filter(k => responses[k]).length;
  score += Math.min(responseCount * 3, 30);

  // Audio (20 puntos)
  if (productDna.audio_url) score += 20;

  // Referencias (15 puntos)
  const linkCount =
    (productDna.product_links?.length || 0) +
    (productDna.competitor_links?.length || 0) +
    (productDna.inspiration_links?.length || 0);
  score += Math.min(linkCount * 3, 15);

  // Servicios seleccionados (15 puntos)
  const servicesCount = productDna.selected_services?.length || 0;
  score += Math.min(servicesCount * 5, 15);

  return Math.min(score, maxScore);
}

function calculateConfidenceScore(productDna: any, audioTranscript: string): number {
  let score = 50; // Base score

  // Audio transcript adds confidence
  if (audioTranscript && audioTranscript.length > 100) {
    score += 20;
  }

  // More responses = more confidence
  const responses = productDna.responses || {};
  const responseCount = Object.keys(responses).filter(k => responses[k]).length;
  score += Math.min(responseCount * 2, 20);

  // References add confidence
  if (productDna.competitor_links?.length > 0) score += 5;
  if (productDna.product_links?.length > 0) score += 5;

  return Math.min(score, 100);
}
