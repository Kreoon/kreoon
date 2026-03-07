/**
 * ADN Research v3 - Edge Function
 * Orquestador principal de los 22 pasos del research
 *
 * ARQUITECTURA FIRE-AND-FORGET:
 * - Supabase cap es 150s, pero 22 pasos toman 8-15 min
 * - Usamos EdgeRuntime.waitUntil para responder inmediatamente
 * - Los pasos corren en background y persisten en DB
 * - Frontend hace polling de adn_research_sessions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildMasterContext } from './context-builder.ts'
import { RESEARCH_STEPS } from './steps/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── TIPOS PRINCIPALES ────────────────────────────────────

interface AdnResearchV3Input {
  session_id: string
  product_id: string
  product_dna_id: string
  client_dna_id?: string
  organization_id: string
  include_client_dna: boolean
  include_social_intelligence: boolean
  include_ad_intelligence: boolean
  // Para regenerar solo una tab específica
  regen_single_tab?: string
}

interface StepResult {
  step_id: string
  tab_key: string
  data: Record<string, unknown>
  tokens_used: number
  provider_used: 'perplexity' | 'gemini' | 'fallback'
  duration_ms: number
  error?: string
}

// ─── AI HELPERS ───────────────────────────────────────────

async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  useWebSearch = true
): Promise<{ text: string; tokens: number }> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY no configurada')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: useWebSearch ? 'sonar-pro' : 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Perplexity ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json()
  return {
    text: data.choices?.[0]?.message?.content || '',
    tokens: data.usage?.total_tokens || 0,
  }
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; tokens: number }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3500,
        },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini ${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json()
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    tokens: data.usageMetadata?.totalTokenCount || 0,
  }
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  useWebSearch = true
): Promise<{ text: string; tokens: number; provider: 'perplexity' | 'gemini' }> {
  // Intentar Perplexity (máximo 2 intentos)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await callPerplexity(systemPrompt, userPrompt, useWebSearch)
      return { ...result, provider: 'perplexity' }
    } catch (err) {
      console.warn(`Perplexity intento ${attempt + 1}/2 falló: ${(err as Error).message}`)
      if (attempt === 0) await new Promise(r => setTimeout(r, 5000))
    }
  }

  // Fallback Gemini
  console.log('→ Usando Gemini como fallback...')
  const result = await callGemini(systemPrompt, userPrompt)
  return { ...result, provider: 'gemini' }
}

export function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    return JSON.parse(clean)
  } catch {
    // Intentar extraer JSON con regex
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* noop */ }
    }
    console.error('safeParseJSON falló. Preview:', text.slice(0, 300))
    return fallback
  }
}

// ─── EJECUCIÓN DE UN PASO ─────────────────────────────────

async function executeStep(
  step: typeof RESEARCH_STEPS[0],
  masterContext: Record<string, unknown>,
  previousResults: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  productId: string
): Promise<StepResult> {
  const startTime = Date.now()
  console.log(`\n▶ Paso ${step.number}/22: ${step.name}`)

  // Marcar paso como 'running' en sesión
  await updateStepStatus(supabase, sessionId, step.stepId, 'running')

  try {
    // Construir prompts con el contexto disponible
    const { systemPrompt, userPrompt } = step.buildPrompts(masterContext, previousResults)

    // Llamar a AI con timeout de 55s
    const aiPromise = callAI(systemPrompt, userPrompt, step.useWebSearch)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de 55 segundos')), 55000)
    )

    const { text, tokens, provider } = await Promise.race([aiPromise, timeoutPromise])

    // Parsear resultado
    const parsed = safeParseJSON(text, { _raw: text, _parse_error: true })

    const duration = Date.now() - startTime
    console.log(`✅ Paso ${step.number} completado en ${duration}ms (${provider}, ${tokens} tokens)`)

    // Guardar tab en products.full_research_v3
    await saveTabResult(supabase, productId, step.tabKey, parsed, tokens)

    // Marcar paso como 'completed'
    await updateStepStatus(supabase, sessionId, step.stepId, 'completed', tokens, duration)

    return {
      step_id: step.stepId,
      tab_key: step.tabKey,
      data: parsed,
      tokens_used: tokens,
      provider_used: provider,
      duration_ms: duration,
    }

  } catch (err) {
    const duration = Date.now() - startTime
    console.error(`❌ Paso ${step.number} falló: ${(err as Error).message}`)

    await updateStepStatus(supabase, sessionId, step.stepId, 'error', 0, duration, (err as Error).message)

    return {
      step_id: step.stepId,
      tab_key: step.tabKey,
      data: { _error: (err as Error).message },
      tokens_used: 0,
      provider_used: 'fallback',
      duration_ms: duration,
      error: (err as Error).message,
    }
  }
}

// ─── HELPERS DE DB ────────────────────────────────────────

async function updateStepStatus(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  stepId: string,
  status: 'pending' | 'running' | 'completed' | 'error',
  tokensUsed = 0,
  durationMs = 0,
  errorMsg?: string
) {
  const { data: session } = await supabase
    .from('adn_research_sessions')
    .select('progress, current_step, tokens_consumed')
    .eq('id', sessionId)
    .single()

  if (!session) return

  const progress = (session.progress as Record<string, unknown>) || {}
  const steps = (progress.steps as Record<string, unknown>[]) || []

  const stepIndex = steps.findIndex((s: Record<string, unknown>) => s.id === stepId)
  const stepUpdate = {
    id: stepId,
    status,
    tokens_used: tokensUsed,
    duration_ms: durationMs,
    ...(status === 'running' ? { started_at: new Date().toISOString() } : {}),
    ...(status === 'completed' || status === 'error' ? { completed_at: new Date().toISOString() } : {}),
    ...(errorMsg ? { error: errorMsg } : {}),
  }

  if (stepIndex >= 0) {
    steps[stepIndex] = { ...steps[stepIndex], ...stepUpdate }
  } else {
    steps.push(stepUpdate)
  }

  const completedSteps = steps.filter((s: Record<string, unknown>) =>
    s.status === 'completed' || s.status === 'error'
  ).length

  await supabase
    .from('adn_research_sessions')
    .update({
      current_step: completedSteps + 2, // +2 por los pasos de init e intelligence
      tokens_consumed: (session.tokens_consumed || 0) + tokensUsed,
      progress: { ...progress, steps },
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
}

async function saveTabResult(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  tabKey: string,
  data: Record<string, unknown>,
  tokensUsed: number
) {
  // Obtener el full_research_v3 actual
  const { data: product } = await supabase
    .from('products')
    .select('full_research_v3')
    .eq('id', productId)
    .single()

  const current = (product?.full_research_v3 as Record<string, unknown>) || {
    version: 3,
    generated_at: new Date().toISOString(),
    tabs: {},
    metadata: { total_tokens: 0, completed_tabs: 0 },
  }

  const tabs = (current.tabs as Record<string, unknown>) || {}
  const metadata = (current.metadata as Record<string, unknown>) || { total_tokens: 0, completed_tabs: 0 }

  tabs[tabKey] = {
    ...data,
    _generated_at: new Date().toISOString(),
    _tokens_used: tokensUsed,
  }

  await supabase
    .from('products')
    .update({
      full_research_v3: {
        ...current,
        tabs,
        metadata: {
          ...metadata,
          total_tokens: ((metadata.total_tokens as number) || 0) + tokensUsed,
          completed_tabs: Object.keys(tabs).length,
          last_updated: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
}

// ─── REGENERAR UNA TAB ────────────────────────────────────

async function regenerateSingleTab(
  input: AdnResearchV3Input,
  tabKey: string,
  supabase: ReturnType<typeof createClient>
) {
  console.log(`🔄 Regenerando tab: ${tabKey}`)

  try {
    // 1. Cargar contexto
    const masterContext = await buildMasterContext(input, supabase)

    // 2. Encontrar el step correspondiente
    const step = RESEARCH_STEPS.find(s => s.tabKey === tabKey)
    if (!step) {
      console.error(`Tab ${tabKey} no encontrada`)
      return
    }

    // 3. Cargar resultados previos de otras tabs para el contexto
    const { data: product } = await supabase
      .from('products')
      .select('full_research_v3')
      .eq('id', input.product_id)
      .single()

    const existingTabs = (product?.full_research_v3 as Record<string, unknown>)?.tabs || {}
    const previousResults: Record<string, unknown> = {}

    // Usar los resultados existentes como contexto para la regeneración
    for (const [key, value] of Object.entries(existingTabs)) {
      if (key !== tabKey) {
        previousResults[key] = value
      }
    }

    // 4. Ejecutar el step
    const result = await executeStep(
      step,
      masterContext as unknown as Record<string, unknown>,
      previousResults,
      supabase,
      input.session_id,
      input.product_id
    )

    console.log(`✅ Tab ${tabKey} regenerada: ${result.tokens_used} tokens`)

  } catch (err) {
    console.error(`❌ Error regenerando tab ${tabKey}:`, err)
  }
}

// ─── PROCESO PRINCIPAL (corre en background) ─────────────

async function runResearchProcess(
  input: AdnResearchV3Input,
  supabase: ReturnType<typeof createClient>
) {
  // Si es regeneración de una sola tab
  if (input.regen_single_tab) {
    return regenerateSingleTab(input, input.regen_single_tab, supabase)
  }

  console.log('🧬 ADN Research v3 — iniciando proceso en background...')

  try {
    // 1. Cargar todos los inputs
    console.log('📥 Cargando contexto maestro...')
    const masterContext = await buildMasterContext(input, supabase)

    // 2. Inicializar el progreso de pasos en la sesión
    const initialSteps = RESEARCH_STEPS.map(s => ({
      id: s.stepId,
      name: s.name,
      tab_key: s.tabKey,
      status: 'pending',
    }))

    await supabase
      .from('adn_research_sessions')
      .update({
        status: 'researching',
        progress: { steps: initialSteps, initialized_at: new Date().toISOString() },
        total_steps: 22 + 2, // 22 research + 2 fases previas (init + intelligence)
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.session_id)

    // 3. Ejecutar los 22 pasos secuencialmente
    const previousResults: Record<string, unknown> = {}
    let totalTokens = 0
    let completedCount = 0
    let errorCount = 0

    for (const step of RESEARCH_STEPS) {
      const result = await executeStep(
        step,
        masterContext as unknown as Record<string, unknown>,
        previousResults,
        supabase,
        input.session_id,
        input.product_id
      )

      // Acumular resultados para pasos siguientes
      previousResults[step.tabKey] = result.data
      totalTokens += result.tokens_used

      if (result.error) {
        errorCount++
      } else {
        completedCount++
      }

      // Pequeña pausa entre pasos para evitar rate limits
      await new Promise(r => setTimeout(r, 1000))
    }

    // 4. Marcar sesión como completada
    const finalStatus = errorCount > 0 && completedCount < 20
      ? 'completed_with_errors'
      : 'completed'

    await supabase
      .from('adn_research_sessions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        tokens_consumed: totalTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.session_id)

    console.log(`\n🎉 ADN Research v3 completado!`)
    console.log(`✅ Pasos exitosos: ${completedCount}/22`)
    console.log(`❌ Pasos con error: ${errorCount}/22`)
    console.log(`🪙 Tokens totales: ${totalTokens}`)

  } catch (err) {
    console.error('❌ Error fatal en runResearchProcess:', err)
    await supabase
      .from('adn_research_sessions')
      .update({
        status: 'error',
        error_message: (err as Error).message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.session_id)
  }
}

// ─── HANDLER HTTP ─────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const input: AdnResearchV3Input = await req.json()

    if (!input.session_id || !input.product_id || !input.product_dna_id) {
      return new Response(
        JSON.stringify({ error: 'session_id, product_id y product_dna_id son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Responder INMEDIATAMENTE al orquestador (fire-and-forget)
    // El proceso corre en background con EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime es global en Supabase Edge Functions
    EdgeRuntime.waitUntil(runResearchProcess(input, supabase))

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Research iniciado en background',
        session_id: input.session_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error en handler:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
