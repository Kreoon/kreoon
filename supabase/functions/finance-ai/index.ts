// supabase/functions/finance-ai/index.ts
// Edge Function: pregunta a IA sobre finanzas de la org.
// Recibe contexto financiero pre-agregado (sin enviar datos de clientes individuales),
// devuelve respuesta en lenguaje natural + recomendaciones JSON.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  question: string;
  orgId: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
}

interface AIResponse {
  answer: string;
  recommendations: Array<{
    priority: 'critica' | 'alta' | 'media' | 'baja';
    action: string;
    reason: string;
  }>;
  related_kpis?: Record<string, number | string>;
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

async function buildFinanceContext(supabase: any, orgId: string, currency: string, start: string, end: string) {
  const [overviewRes, healthRes, anomaliesRes, costsRes] = await Promise.all([
    supabase.rpc('get_org_finance_overview', { p_org_id: orgId, p_start: start, p_end: end, p_currency: currency }),
    supabase.rpc('get_org_financial_health', { p_org_id: orgId, p_currency: currency }),
    supabase.rpc('get_org_financial_anomalies', { p_org_id: orgId, p_currency: currency }),
    supabase.rpc('get_org_costs_overview', { p_org_id: orgId, p_start: start, p_end: end, p_currency: currency }),
  ]);

  const overview = overviewRes.data?.[0] ?? null;
  const health = healthRes.data?.[0] ?? null;
  const anomalies = anomaliesRes.data ?? [];
  const costs = costsRes.data?.[0] ?? null;

  return {
    periodo: { inicio: start, fin: end, moneda: currency },
    finanzas: overview,
    salud: health,
    anomalias: anomalies,
    costos: costs,
  };
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<AIResponse | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
    if (!res.ok) {
      console.error('Gemini error:', await res.text());
      return null;
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error('Gemini failed:', e);
    return null;
  }
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<AIResponse | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.content?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { question, orgId } = body;
    const currency = body.currency ?? 'COP';
    const today = new Date().toISOString().substring(0, 10);
    const start = body.startDate ?? new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().substring(0, 10);
    const end = body.endDate ?? today;

    if (!question || !orgId) {
      return new Response(JSON.stringify({ error: 'question y orgId son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const context = await buildFinanceContext(supabase, orgId, currency, start, end);

    const systemPrompt = `Eres Jarvis Finanzas, un analista financiero experto en agencias UGC y marketplace creativo.
Tu rol: responder preguntas sobre las finanzas de la organización en español, claro y conciso.

REGLAS:
1. SIEMPRE responde en JSON con este shape exacto:
{
  "answer": "respuesta clara en español, máx 3 párrafos",
  "recommendations": [
    { "priority": "critica|alta|media|baja", "action": "acción concreta", "reason": "por qué" }
  ],
  "related_kpis": { "nombre_kpi": valor }
}

2. Sé directo, sin floreos. Habla en pesos colombianos (COP) o dólares (USD) según el contexto.
3. Si la pregunta no se puede responder con la data dada, dilo claramente.
4. Para recomendaciones: prioriza por impacto monetario. Sé específico ("Cobrar a Cliente X $2.5M antes del viernes" mejor que "cobrar deudas").
5. Usa lenguaje de niño de 10 años: nada de tecnicismos. "Cartera vencida" → "gente que te debe hace tiempo".
6. Si hay anomalías o salud crítica, mencionarlo SIEMPRE aunque no se pregunte por eso.`;

    const userPrompt = `PREGUNTA: ${question}

CONTEXTO FINANCIERO (período ${start} a ${end}, moneda ${currency}):

${JSON.stringify(context, null, 2)}

Responde la pregunta y agrega recomendaciones accionables.`;

    let result = await callGemini(systemPrompt, userPrompt);
    if (!result) result = await callClaude(systemPrompt, userPrompt);

    if (!result) {
      return new Response(
        JSON.stringify({
          error: 'No hay providers de IA disponibles. Configura GEMINI_API_KEY o ANTHROPIC_API_KEY.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('finance-ai error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
