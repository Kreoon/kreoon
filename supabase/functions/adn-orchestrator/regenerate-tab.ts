/**
 * regenerate-tab.ts
 * Sub-función que permite regenerar un solo paso sin repetir todo el proceso.
 * El frontend la invoca cuando el usuario hace click en "Regenerar" en una pestaña específica.
 *
 * NOTA: Supabase Edge Functions solo soporta un archivo index.ts por función.
 * Este archivo se incluirá como handler alternativo dentro del index.ts principal,
 * o se desplegará como función separada: adn-orchestrator-regenerate-tab
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Costo de regenerar 1 paso
const REGEN_TOKEN_COST = 120

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { session_id, tab_key, organization_id } = await req.json()

    if (!session_id || !tab_key || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'session_id, tab_key y organization_id son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar pertenencia a org
    const { data: membership } = await supabaseUser
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Sin permisos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Obtener sesión original
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('adn_research_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('organization_id', organization_id)
      .single()

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar tokens
    const { data: tokenData } = await supabaseAdmin
      .from('ai_token_balances')
      .select('balance')
      .eq('organization_id', organization_id)
      .single()

    if (!tokenData || tokenData.balance < REGEN_TOKEN_COST) {
      return new Response(
        JSON.stringify({
          error: 'Tokens insuficientes para regenerar',
          code: 'INSUFFICIENT_TOKENS',
          required: REGEN_TOKEN_COST,
          current_balance: tokenData?.balance || 0,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Consumir tokens
    await supabaseAdmin.rpc('consume_ai_tokens', {
      p_organization_id: organization_id,
      p_amount: REGEN_TOKEN_COST,
      p_action: 'adn_regen_tab',
      p_reference_id: session_id,
      p_description: `Regenerar pestaña: ${tab_key}`,
    })

    // Llamar a adn-research-v3 con flag de regeneración
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const inputsConfig = session.inputs_config as Record<string, unknown>

    // Fire-and-forget para regenerar solo esa tab
    fetch(`${supabaseUrl}/functions/v1/adn-research-v3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        session_id,
        product_id: session.product_id,
        product_dna_id: session.product_dna_id,
        client_dna_id: session.client_dna_id,
        organization_id,
        include_client_dna: inputsConfig?.include_client_dna ?? false,
        include_social_intelligence: true,
        include_ad_intelligence: true,
        // Flag especial: regenerar solo esta tab
        regen_single_tab: tab_key,
      }),
    }).catch(console.error)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Regenerando ${tab_key}...`,
        tokens_used: REGEN_TOKEN_COST,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error en regenerate-tab:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
