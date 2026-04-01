/**
 * ADN Research v3 - Edge Function
 * Orquestador principal de los 22 pasos del research
 *
 * ARQUITECTURA FIRE-AND-FORGET:
 * - Supabase cap es 150s, pero 22 pasos toman 8-15 min
 * - Usamos EdgeRuntime.waitUntil para responder inmediatamente
 * - Los pasos corren en background y persisten en DB
 * - Frontend hace polling de adn_research_sessions
 *
 * TIMEOUT GLOBAL:
 * - runResearchProcess tiene un AbortController de 120s
 * - regenerateSingleTab tiene un AbortController de 90s
 * - Todas las llamadas fetch y sleeps respetan el signal
 * - Al dispararse, persiste status: 'timeout' en la sesión de DB
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildMasterContext } from './context-builder.ts'
import { RESEARCH_STEPS, buildProductContextEnforcement } from './steps/index.ts'

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
  provider_used: 'perplexity' | 'gemini' | 'perplexity+gemini' | 'fallback'
  duration_ms: number
  error?: string
}

// ─── SLEEP CANCELABLE ─────────────────────────────────────

/**
 * Sleep que respeta un AbortSignal.
 * Si el signal se dispara antes de que termine el delay,
 * rechaza con AbortError en lugar de bloquear indefinidamente.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Operation aborted', 'AbortError'))
    }

    const timeoutId = setTimeout(resolve, ms)

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId)
        reject(new DOMException('Operation aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

// ─── AI HELPERS ───────────────────────────────────────────

async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  useWebSearch = true,
  signal?: AbortSignal
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
    signal,
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
  userPrompt: string,
  retries = 2,
  signal?: AbortSignal
): Promise<{ text: string; tokens: number }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada')

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Early exit si el signal ya fue abortado antes de intentar
    if (signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError')
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
              maxOutputTokens: 4000,
            },
          }),
          signal,
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
    } catch (err) {
      // Propagar AbortError inmediatamente sin reintentar
      if ((err as Error).name === 'AbortError') throw err

      console.warn(`Gemini intento ${attempt + 1}/${retries + 1} falló: ${(err as Error).message}`)
      if (attempt < retries) {
        await sleep(2000 * (attempt + 1), signal)
      } else {
        throw err
      }
    }
  }
  throw new Error('Gemini: todos los intentos fallaron')
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  useWebSearch = true,
  signal?: AbortSignal
): Promise<{ text: string; tokens: number; provider: 'perplexity' | 'gemini' | 'perplexity+gemini' }> {
  let perplexityData: string | null = null
  let totalTokens = 0
  let perplexityError: string | null = null

  // PASO 1: Perplexity busca datos reales con web search
  if (useWebSearch) {
    for (let attempt = 0; attempt < 3; attempt++) {
      // Early exit si el signal ya fue abortado
      if (signal?.aborted) {
        throw new DOMException('Operation aborted', 'AbortError')
      }

      try {
        console.log(`🔍 Paso 1: Perplexity buscando datos reales (intento ${attempt + 1}/3)...`)
        const perplexityResult = await callPerplexity(
          `Eres un investigador de mercados. Busca datos REALES y ACTUALIZADOS usando tu acceso a internet.
NO inventes datos. Cita fuentes cuando sea posible.
Responde con la información encontrada de forma estructurada.`,
          userPrompt,
          true,
          signal
        )
        perplexityData = perplexityResult.text
        totalTokens += perplexityResult.tokens
        console.log(`✅ Perplexity encontró datos (${perplexityResult.tokens} tokens)`)
        break
      } catch (err) {
        // Propagar AbortError inmediatamente sin reintentar
        if ((err as Error).name === 'AbortError') throw err

        perplexityError = (err as Error).message
        console.warn(`Perplexity intento ${attempt + 1}/3 falló: ${perplexityError}`)
        if (attempt < 2) await sleep(2000 * (attempt + 1), signal)
      }
    }
  }

  // PASO 2: Gemini organiza y formatea los datos
  console.log('📝 Paso 2: Gemini organizando datos en JSON...')

  const geminiSystemPrompt = `${systemPrompt}

⚠️ REGLAS ESTRICTAS:
1. Organiza y estructura la información en el formato JSON solicitado
2. NO inventes datos adicionales - usa SOLO la información proporcionada
3. NO omitas información relevante que se te proporcionó
4. Si falta algún dato, usa "No disponible" o valores vacíos apropiados
5. Mejora la redacción pero mantén el contenido fiel a los datos originales
6. Responde SOLO con JSON válido, sin markdown ni explicaciones`

  const geminiUserPrompt = perplexityData
    ? `DATOS RECOPILADOS DE FUENTES REALES (Perplexity):
═══════════════════════════════════════════════════════════════════════════════
${perplexityData}
═══════════════════════════════════════════════════════════════════════════════

INSTRUCCIONES ORIGINALES:
${userPrompt}

Organiza los datos anteriores en el formato JSON solicitado. NO inventes información adicional.`
    : userPrompt

  try {
    const geminiResult = await callGemini(geminiSystemPrompt, geminiUserPrompt, 2, signal)
    totalTokens += geminiResult.tokens

    return {
      text: geminiResult.text,
      tokens: totalTokens,
      provider: perplexityData ? 'perplexity+gemini' : 'gemini',
    }
  } catch (geminiErr) {
    // Propagar AbortError inmediatamente
    if ((geminiErr as Error).name === 'AbortError') throw geminiErr

    console.error('❌ Gemini falló después de reintentos:', (geminiErr as Error).message)

    // Si Gemini falla pero tenemos datos de Perplexity, intentar formatearlos básicamente
    if (perplexityData) {
      console.log('⚠️ Devolviendo datos de Perplexity con formato básico')
      const fallbackJson = JSON.stringify({
        _source: 'perplexity_fallback',
        _note: 'Gemini falló, datos sin formatear',
        content: perplexityData,
        summary: perplexityData.slice(0, 500)
      })
      return {
        text: fallbackJson,
        tokens: totalTokens,
        provider: 'perplexity',
      }
    }

    // Si ambos fallaron, devolver un error estructurado en lugar de lanzar excepción
    console.error('❌ Ambos proveedores fallaron')
    const errorJson = JSON.stringify({
      _error: true,
      _message: `Perplexity: ${perplexityError || 'no usado'}. Gemini: ${(geminiErr as Error).message}`,
      summary: 'Error al generar contenido. Intenta regenerar esta sección.'
    })
    return {
      text: errorJson,
      tokens: totalTokens,
      provider: 'gemini',
    }
  }
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
  productId: string,
  signal?: AbortSignal
): Promise<StepResult> {
  const startTime = Date.now()
  console.log(`\n▶ Paso ${step.number}/22: ${step.name}`)

  // Early exit antes de empezar si el signal ya fue abortado
  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError')
  }

  // Marcar paso como 'running' en sesión
  await updateStepStatus(supabase, sessionId, step.stepId, 'running')

  // Timeout adaptativo por paso: pasos de publicidad (14-18) necesitan más tiempo.
  // Este timeout es COMPLEMENTARIO al global — protege contra un paso individual
  // que se cuelgue, independientemente del tiempo acumulado total.
  const isHeavyStep = step.number >= 14 && step.number <= 18
  const stepTimeoutMs = isHeavyStep ? 120000 : 90000
  console.log(`⏱️ Timeout por paso: ${stepTimeoutMs / 1000}s ${isHeavyStep ? '(paso pesado)' : ''}`)

  try {
    // Construir prompts con el contexto disponible
    const { systemPrompt, userPrompt } = step.buildPrompts(masterContext, previousResults)

    // Inyectar contexto de producto para garantizar consistencia
    const productContext = buildProductContextEnforcement(masterContext as any)
    const enhancedUserPrompt = `${productContext}\n\n${userPrompt}`

    // Llamar a AI con timeout por paso (Promise.race) y signal global propagado.
    // El signal global corta inmediatamente si el AbortController dispara.
    // El timeout por paso actúa como guardia independiente por si un solo paso se cuelga.
    const aiPromise = callAI(systemPrompt, enhancedUserPrompt, step.useWebSearch, signal)
    const stepTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout de ${stepTimeoutMs / 1000} segundos`)), stepTimeoutMs)
    )

    const { text, tokens, provider } = await Promise.race([aiPromise, stepTimeoutPromise])

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
    // Propagar AbortError hacia arriba para que runResearchProcess lo maneje
    if ((err as Error).name === 'AbortError') throw err

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

  // Timeout propio para regeneración de una sola tab (90s)
  const REGEN_TIMEOUT_MS = 90_000
  const regenController = new AbortController()
  const regenTimeoutId = setTimeout(() => regenController.abort(), REGEN_TIMEOUT_MS)

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

    // 4. Ejecutar el step con el signal de timeout
    const result = await executeStep(
      step,
      masterContext as unknown as Record<string, unknown>,
      previousResults,
      supabase,
      input.session_id,
      input.product_id,
      regenController.signal
    )

    console.log(`✅ Tab ${tabKey} regenerada: ${result.tokens_used} tokens`)

  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.warn(`⏰ Timeout al regenerar tab ${tabKey} (${REGEN_TIMEOUT_MS / 1000}s)`)
      await supabase
        .from('adn_research_sessions')
        .update({
          status: 'timeout',
          error_message: `Timeout al regenerar tab '${tabKey}' (${REGEN_TIMEOUT_MS / 1000}s)`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.session_id)
      return
    }
    console.error(`❌ Error regenerando tab ${tabKey}:`, err)
  } finally {
    clearTimeout(regenTimeoutId)
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

  // Timeout global para el proceso completo de 22 pasos.
  // Supabase Edge Function cap es 150s; usamos 120s para tener margen de 30s
  // para las escrituras finales en DB antes de que Supabase corte la ejecución.
  const GLOBAL_TIMEOUT_MS = 120_000
  const globalController = new AbortController()
  const globalTimeoutId = setTimeout(() => {
    console.warn('⏰ AbortController global disparado — abortando research...')
    globalController.abort()
  }, GLOBAL_TIMEOUT_MS)

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
      // Early exit al inicio de cada iteración si el global ya abortó
      if (globalController.signal.aborted) {
        console.warn('⏰ Signal global abortado — deteniendo loop de pasos')
        break
      }

      const result = await executeStep(
        step,
        masterContext as unknown as Record<string, unknown>,
        previousResults,
        supabase,
        input.session_id,
        input.product_id,
        globalController.signal
      )

      // Acumular resultados para pasos siguientes
      previousResults[step.tabKey] = result.data
      totalTokens += result.tokens_used

      if (result.error) {
        errorCount++
        console.log(`⚠️ Paso ${step.number} falló pero continuamos con el siguiente...`)
      } else {
        completedCount++
      }

      // Pausa entre pasos — cancelable por el signal global.
      // Pasos de publicidad (14-18) necesitan más tiempo para evitar rate limits.
      const pauseTime = step.number >= 14 && step.number <= 18 ? 2000 : 1000
      await sleep(pauseTime, globalController.signal)
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
    // Manejar timeout global: persistir estado en DB con los pasos ya guardados.
    // Los partial_results ya están en products.full_research_v3 porque cada paso
    // los persiste individualmente al completarse — el frontend los lee por polling.
    if ((err as Error).name === 'AbortError') {
      console.warn('⏰ Research detenido por timeout global (120s) — guardando estado parcial')
      await supabase
        .from('adn_research_sessions')
        .update({
          status: 'timeout',
          error_message: 'Research detenido por timeout global (120s). Los pasos completados están disponibles.',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.session_id)
      return
    }

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

  } finally {
    // Limpiar el timeout global siempre, tanto en éxito como en error o timeout.
    // Esto evita que el setTimeout quede pendiente si el proceso termina antes de 120s.
    clearTimeout(globalTimeoutId)
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

    // Responder INMEDIATAMENTE al orquestador (fire-and-forget).
    // El proceso corre en background con EdgeRuntime.waitUntil.
    // El AbortController global vive dentro de runResearchProcess,
    // no aquí — el handler ya cerró su Response antes de que empiece el research.
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
