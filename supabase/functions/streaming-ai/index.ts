/**
 * streaming-ai - IA para streaming v2
 * Generación de guiones, dinámicas, sugerencias y análisis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Nuevo: Prompts desde DB con cache y fallback
import { getPrompt, interpolatePrompt } from "../_shared/prompts/db-prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Provider configuration (fallback chain)
const AI_PROVIDERS = [
  { name: 'gemini', envKey: 'GEMINI_API_KEY', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent' },
  { name: 'openai', envKey: 'OPENAI_API_KEY', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { name: 'anthropic', envKey: 'ANTHROPIC_API_KEY', endpoint: 'https://api.anthropic.com/v1/messages' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No authorization header' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    const { action, ...params } = await req.json();
    console.log(`[streaming-ai] Action: ${action}, User: ${user.id}`);

    switch (action) {
      case 'generate_script': {
        const { session_type, context, organization_id } = params;

        // Check AI tokens
        const hasTokens = await checkAndConsumeTokens(supabase, organization_id, 500);
        if (!hasTokens) {
          return jsonResponse({ error: 'No hay tokens de IA disponibles' }, 402);
        }

        const prompt = await buildScriptPrompt(supabase, session_type, context);
        const result = await callAI(prompt);

        // Parse structured response
        const script = parseScriptResponse(result, session_type);

        return jsonResponse(script);
      }

      case 'generate_dynamics': {
        const { count, audience, organization_id } = params;

        const hasTokens = await checkAndConsumeTokens(supabase, organization_id, 200);
        if (!hasTokens) {
          return jsonResponse({ error: 'No hay tokens de IA disponibles' }, 402);
        }

        const prompt = await buildDynamicsPrompt(supabase, count, audience);
        const result = await callAI(prompt);

        const dynamics = parseDynamicsResponse(result, count);

        return jsonResponse({ dynamics });
      }

      case 'get_suggestions': {
        const { session_id } = params;

        // Get session data for context
        const { data: session } = await supabase
          .from('streaming_sessions_v2')
          .select('*, analytics:streaming_analytics_v2(*)')
          .eq('id', session_id)
          .single();

        if (!session) {
          return jsonResponse({ error: 'Sesión no encontrada' }, 404);
        }

        // Generate real-time suggestions based on metrics
        const suggestions = generateRealTimeSuggestions(session);

        return jsonResponse({ suggestions });
      }

      case 'analyze_performance': {
        const { session_id, organization_id } = params;

        const hasTokens = await checkAndConsumeTokens(supabase, organization_id, 300);
        if (!hasTokens) {
          return jsonResponse({ error: 'No hay tokens de IA disponibles' }, 402);
        }

        // Get session with analytics
        const { data: session } = await supabase
          .from('streaming_sessions_v2')
          .select(`
            *,
            analytics:streaming_analytics_v2(*),
            products:streaming_products_v2(*),
            channels:streaming_session_channels_v2(*)
          `)
          .eq('id', session_id)
          .single();

        if (!session) {
          return jsonResponse({ error: 'Sesión no encontrada' }, 404);
        }

        const prompt = await buildAnalysisPrompt(supabase, session);
        const result = await callAI(prompt);

        const analysis = parseAnalysisResponse(result);

        return jsonResponse(analysis);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error('[streaming-ai] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================
// AI CALL WITH FALLBACK
// ============================================

async function callAI(prompt: string): Promise<string> {
  for (const provider of AI_PROVIDERS) {
    const apiKey = Deno.env.get(provider.envKey);
    if (!apiKey) continue;

    try {
      let response: Response;
      let result: string;

      if (provider.name === 'gemini') {
        response = await fetch(`${provider.endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        });

        const data = await response.json();
        result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (provider.name === 'openai') {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048,
          }),
        });

        const data = await response.json();
        result = data.choices?.[0]?.message?.content || '';
      } else if (provider.name === 'anthropic') {
        response = await fetch(provider.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const data = await response.json();
        result = data.content?.[0]?.text || '';
      } else {
        continue;
      }

      if (result) {
        console.log(`[streaming-ai] Used provider: ${provider.name}`);
        return result;
      }
    } catch (err) {
      console.error(`[streaming-ai] ${provider.name} failed:`, err);
      continue;
    }
  }

  throw new Error('Todos los proveedores de IA fallaron');
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

async function checkAndConsumeTokens(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  tokensNeeded: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('consume_ai_tokens', {
      p_organization_id: organizationId,
      p_tokens_to_consume: tokensNeeded,
    });

    if (error) {
      console.error('[streaming-ai] Token check error:', error);
      return false;
    }

    return data === true;
  } catch {
    // If RPC doesn't exist, allow the request (for testing)
    return true;
  }
}

// ============================================
// PROMPT BUILDERS
// ============================================

async function buildScriptPrompt(supabase: ReturnType<typeof createClient>, sessionType: string, context: Record<string, unknown>): Promise<string> {
  const typeLabels: Record<string, string> = {
    standard: 'transmisión en vivo estándar',
    live_shopping: 'live shopping con venta de productos',
    interview: 'entrevista con invitados',
    webinar: 'webinar educativo',
    launch: 'lanzamiento de producto',
    multi_creator: 'colaboración entre creadores',
  };

  const typeLabel = typeLabels[sessionType] || 'transmisión en vivo';

  // Intentar obtener prompt desde DB
  try {
    const promptConfig = await getPrompt(supabase, "streaming", "generate_script");
    if (promptConfig.systemPrompt && promptConfig.userPrompt) {
      return promptConfig.systemPrompt + "\n\n" + interpolatePrompt(promptConfig.userPrompt, {
        session_type: typeLabel,
        duration_minutes: String(context.duration_minutes || 60),
        product_count: String((context.products as unknown[])?.length || 0),
        audience: String(context.audience || 'general'),
        tone: String(context.tone || 'profesional pero cercano'),
        brand_name: context.brand_name ? `- Marca: ${context.brand_name}` : '',
        special_offers: context.special_offers ? `- Ofertas especiales: ${context.special_offers}` : '',
      });
    }
  } catch {
    // Fallback
  }

  return `Eres un experto en live streaming y ventas en vivo para LATAM.
Genera un guión estructurado para una ${typeLabel}.

CONTEXTO:
- Duración aproximada: ${context.duration_minutes || 60} minutos
- Productos a mostrar: ${(context.products as unknown[])?.length || 0}
- Audiencia objetivo: ${context.audience || 'general'}
- Tono: ${context.tone || 'profesional pero cercano'}
${context.brand_name ? `- Marca: ${context.brand_name}` : ''}
${context.special_offers ? `- Ofertas especiales: ${context.special_offers}` : ''}

RESPONDE EN FORMATO JSON con esta estructura:
{
  "total_duration_minutes": number,
  "intro": "texto de bienvenida (30-60 segundos)",
  "sections": [
    {
      "id": "section_1",
      "title": "nombre de la sección",
      "duration_minutes": number,
      "content": "descripción detallada",
      "talking_points": ["punto 1", "punto 2"],
      "products_to_feature": ["producto1"] // si aplica
    }
  ],
  "outro": "texto de despedida",
  "emergency_fills": ["frase de relleno 1", "frase de relleno 2"]
}

El guión debe:
- Mantener engagement constante
- Incluir llamadas a la acción claras
- Tener transiciones suaves entre secciones
- Incluir momentos de interacción con audiencia`;
}

async function buildDynamicsPrompt(supabase: ReturnType<typeof createClient>, count: number, audience: string): Promise<string> {
  // Intentar obtener prompt desde DB
  try {
    const promptConfig = await getPrompt(supabase, "streaming", "generate_dynamics");
    if (promptConfig.systemPrompt && promptConfig.userPrompt) {
      return promptConfig.systemPrompt + "\n\n" + interpolatePrompt(promptConfig.userPrompt, {
        count: String(count),
        audience: audience,
      });
    }
  } catch {
    // Fallback
  }

  return `Genera ${count} dinámicas interactivas para un live streaming en español.

Audiencia: ${audience}

RESPONDE EN FORMATO JSON con array de dinámicas:
[
  {
    "id": "dynamic_1",
    "type": "poll" | "trivia" | "giveaway" | "countdown" | "challenge" | "qa",
    "title": "título corto",
    "description": "descripción de la dinámica",
    "duration_seconds": number,
    "config": {
      // Para poll: { "question": "", "options": ["", ""] }
      // Para trivia: { "question": "", "correct_answer": "", "options": ["", ""] }
      // Para giveaway: { "prize": "", "conditions": "" }
      // Para challenge: { "task": "", "reward": "" }
    }
  }
]

Las dinámicas deben ser:
- Fáciles de ejecutar en vivo
- Entretenidas y participativas
- Apropiadas para LATAM`;
}

async function buildAnalysisPrompt(supabase: ReturnType<typeof createClient>, session: Record<string, unknown>): Promise<string> {
  const analytics = session.analytics as Array<Record<string, unknown>> || [];
  const products = session.products as Array<Record<string, unknown>> || [];

  const peakViewers = session.peak_viewers || 0;
  const totalMessages = session.total_messages || 0;
  const totalRevenue = session.total_revenue_usd || 0;
  const duration = session.ended_at && session.started_at
    ? Math.round((new Date(session.ended_at as string).getTime() - new Date(session.started_at as string).getTime()) / 60000)
    : 0;

  const productsDetail = products.length > 0
    ? `PRODUCTOS:\n${products.map((p: Record<string, unknown>) => `- ${p.title}: ${p.purchase_count || 0} ventas, $${p.revenue_usd || 0}`).join('\n')}`
    : '';

  // Intentar obtener prompt desde DB
  try {
    const promptConfig = await getPrompt(supabase, "streaming", "analyze_performance");
    if (promptConfig.systemPrompt && promptConfig.userPrompt) {
      return promptConfig.systemPrompt + "\n\n" + interpolatePrompt(promptConfig.userPrompt, {
        duration: String(duration),
        peak_viewers: String(peakViewers),
        total_messages: String(totalMessages),
        total_revenue: String(totalRevenue),
        product_count: String(products.length),
        analytics_count: String(analytics.length),
        products_detail: productsDetail,
      });
    }
  } catch {
    // Fallback
  }

  return `Analiza el rendimiento de esta sesión de live streaming:

MÉTRICAS:
- Duración: ${duration} minutos
- Viewers máximos: ${peakViewers}
- Mensajes totales: ${totalMessages}
- Revenue total: $${totalRevenue} USD
- Productos mostrados: ${products.length}
- Puntos de datos: ${analytics.length}

${productsDetail}

RESPONDE EN FORMATO JSON:
{
  "summary": "resumen ejecutivo de 2-3 oraciones",
  "recommendations": [
    "recomendación específica 1",
    "recomendación específica 2",
    "recomendación específica 3"
  ],
  "highlights": ["momento destacado 1", "momento destacado 2"],
  "areas_to_improve": ["área de mejora 1", "área de mejora 2"]
}

Sé específico y accionable en las recomendaciones.`;
}

// ============================================
// RESPONSE PARSERS
// ============================================

function parseScriptResponse(result: string, sessionType: string): Record<string, unknown> {
  try {
    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: crypto.randomUUID(),
        session_type: sessionType,
        ...parsed,
        created_at: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('[streaming-ai] Parse script error:', e);
  }

  // Fallback structure
  return {
    id: crypto.randomUUID(),
    session_type: sessionType,
    total_duration_minutes: 60,
    intro: 'Bienvenidos a nuestra transmisión en vivo.',
    sections: [
      {
        id: 'section_1',
        title: 'Introducción',
        duration_minutes: 10,
        content: result.slice(0, 500),
        talking_points: [],
      },
    ],
    outro: 'Gracias por acompañarnos.',
    emergency_fills: [],
    created_at: new Date().toISOString(),
  };
}

function parseDynamicsResponse(result: string, count: number): Array<Record<string, unknown>> {
  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[streaming-ai] Parse dynamics error:', e);
  }

  // Fallback dynamics
  return Array.from({ length: count }, (_, i) => ({
    id: `dynamic_${i + 1}`,
    type: 'poll',
    title: `Dinámica ${i + 1}`,
    description: 'Dinámica interactiva',
    duration_seconds: 60,
    config: { question: '¿Te está gustando el live?', options: ['Sí', 'No'] },
  }));
}

function parseAnalysisResponse(result: string): Record<string, unknown> {
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('[streaming-ai] Parse analysis error:', e);
  }

  return {
    summary: result.slice(0, 300),
    recommendations: ['Mejorar la interacción con la audiencia', 'Optimizar horarios de transmisión'],
    highlights: [],
    areas_to_improve: [],
  };
}

// ============================================
// REAL-TIME SUGGESTIONS
// ============================================

function generateRealTimeSuggestions(session: Record<string, unknown>): Array<Record<string, unknown>> {
  const suggestions: Array<Record<string, unknown>> = [];
  const analytics = session.analytics as Array<Record<string, unknown>> || [];
  const status = session.status as string;

  if (status !== 'live') {
    return [];
  }

  // Check viewer trend
  if (analytics.length >= 3) {
    const recent = analytics.slice(-3);
    const viewerTrend = recent.map((a) => a.concurrent_viewers as number);

    if (viewerTrend[2] < viewerTrend[0] * 0.7) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'engagement',
        title: 'Audiencia bajando',
        description: 'Considera hacer una dinámica interactiva o sorteo para recuperar engagement',
        priority: 'high',
        created_at: new Date().toISOString(),
        applied: false,
      });
    }
  }

  // Check message frequency
  const totalMessages = session.total_messages as number || 0;
  const started = new Date(session.started_at as string);
  const minutesLive = (Date.now() - started.getTime()) / 60000;

  if (minutesLive > 10 && totalMessages / minutesLive < 1) {
    suggestions.push({
      id: crypto.randomUUID(),
      type: 'engagement',
      title: 'Poca interacción en chat',
      description: 'Haz preguntas directas a la audiencia para aumentar participación',
      priority: 'medium',
      created_at: new Date().toISOString(),
      applied: false,
    });
  }

  // Check shopping metrics
  if (session.is_shopping_enabled) {
    const products = session.products as Array<Record<string, unknown>> || [];
    const featuredProduct = products.find((p) => p.is_featured);

    if (featuredProduct) {
      const featuredTime = new Date(featuredProduct.featured_at as string);
      const minutesFeatured = (Date.now() - featuredTime.getTime()) / 60000;

      if (minutesFeatured > 5) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'product_order',
          title: 'Cambiar producto destacado',
          description: 'El producto lleva más de 5 minutos en pantalla, considera rotar',
          priority: 'low',
          created_at: new Date().toISOString(),
          applied: false,
        });
      }
    }
  }

  return suggestions;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
