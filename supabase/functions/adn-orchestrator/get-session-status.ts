/**
 * get-session-status.ts
 * Endpoint ligero para polling del frontend — retorna solo el estado y progreso
 * sin cargar el resultado completo (que puede ser muy pesado).
 *
 * NOTA: Supabase Edge Functions solo soporta un archivo index.ts por función.
 * Este archivo se incluirá como handler alternativo dentro del index.ts principal,
 * o se desplegará como función separada: adn-session-status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  const organizationId = url.searchParams.get('organization_id')

  if (!sessionId || !organizationId) {
    return new Response(
      JSON.stringify({ error: 'session_id y organization_id requeridos' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  try {
    const { data: session, error } = await supabase
      .from('adn_research_sessions')
      .select(`
        id,
        status,
        current_step,
        total_steps,
        tokens_consumed,
        progress,
        error_message,
        started_at,
        completed_at,
        updated_at
      `)
      .eq('id', sessionId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !session) {
      return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calcular % de progreso
    const progressPct = session.total_steps > 0
      ? Math.round((session.current_step / session.total_steps) * 100)
      : 0

    // Calcular tiempo transcurrido
    const startedAt = new Date(session.started_at)
    const elapsedMs = Date.now() - startedAt.getTime()
    const elapsedMinutes = Math.round(elapsedMs / 60000)

    // Estimar tiempo restante
    const progressData = session.progress as Record<string, unknown> | null
    const steps = progressData?.steps as Record<string, unknown>[] | undefined
    const completedSteps = steps?.filter(s => s?.status === 'completed').length || 0
    const avgMsPerStep = completedSteps > 0
      ? elapsedMs / completedSteps
      : 25000 // 25s estimado por paso
    const remainingSteps = (session.total_steps - session.current_step)
    const estimatedRemainingMs = remainingSteps * avgMsPerStep
    const estimatedRemainingMinutes = Math.ceil(estimatedRemainingMs / 60000)

    // Nombre del paso actual
    const currentStepIndex = session.current_step - 3 // -3 porque hay 2 pasos previos + índice 0
    const currentStepName = currentStepIndex >= 0 && steps?.[currentStepIndex]
      ? (steps[currentStepIndex].name as string)
      : 'Procesando...'

    return new Response(
      JSON.stringify({
        id: session.id,
        status: session.status,
        current_step: session.current_step,
        total_steps: session.total_steps,
        progress_pct: progressPct,
        current_step_name: currentStepName,
        tokens_consumed: session.tokens_consumed,
        steps_detail: steps || [],
        elapsed_minutes: elapsedMinutes,
        estimated_remaining_minutes: estimatedRemainingMinutes,
        error_message: session.error_message,
        completed_at: session.completed_at,
        is_complete: session.status === 'completed' || session.status === 'completed_with_errors',
        is_error: session.status === 'error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error en get-session-status:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
