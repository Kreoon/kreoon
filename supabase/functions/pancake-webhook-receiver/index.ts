// pancake-webhook-receiver: Recibe cambios desde Pancake CRM hacia Kreoon
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pancake-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Validar secret del webhook
    const incomingSecret = req.headers.get('x-pancake-secret')

    const { data: secretConfig } = await supabase
      .from('pancake_integration_config')
      .select('config_value')
      .eq('config_key', 'webhook_secret')
      .single()

    if (!incomingSecret || incomingSecret !== secretConfig?.config_value) {
      console.warn('Webhook recibido con secret inválido')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Parsear payload
    const payload = await req.json()
    console.log('Webhook recibido de Pancake:', JSON.stringify(payload))

    const {
      table_name,
      record_id,
      action = 'update',
      data: recordData
    } = payload

    if (!table_name || !record_id) {
      return new Response(JSON.stringify({
        error: 'table_name y record_id son requeridos'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Registrar en log (siempre)
    await supabase.from('pancake_sync_log').insert({
      direction: 'pancake_to_kreoon',
      entity_type: table_name,
      entity_id: String(record_id),
      action: action,
      payload: recordData || payload,
      status: 'success'
    })

    // 4. Buscar la entidad Kreoon correspondiente en el mapeo
    const { data: syncMap } = await supabase
      .from('pancake_sync_map')
      .select('kreoon_entity_type, kreoon_entity_id')
      .eq('pancake_record_id', String(record_id))
      .eq('pancake_table_name', table_name)
      .maybeSingle()

    if (!syncMap) {
      console.log(`No se encontró mapeo para record_id=${record_id} en tabla=${table_name}`)
      return new Response(JSON.stringify({
        received: true,
        matched: false,
        message: 'No matching Kreoon entity found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Aplicar cambios en Kreoon según tipo de entidad
    let updatesApplied = false

    if (syncMap.kreoon_entity_type === 'user' && recordData) {
      // Campos permitidos para actualizar desde Pancake
      // (Solo campos de contacto, NO campos críticos como rol o plan)
      const allowedUserFields: Record<string, string> = {
        phone: 'phone',
        city: 'city',
        country: 'country',
        full_name: 'full_name'
      }

      const updates: Record<string, unknown> = {}
      for (const [pancakeKey, kreoonKey] of Object.entries(allowedUserFields)) {
        if (recordData[pancakeKey] !== undefined && recordData[pancakeKey] !== null) {
          updates[kreoonKey] = recordData[pancakeKey]
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log(`Actualizando perfil ${syncMap.kreoon_entity_id}:`, updates)
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', syncMap.kreoon_entity_id)

        if (updateError) {
          console.error('Error actualizando perfil:', updateError)
          throw new Error(`Error actualizando perfil: ${updateError.message}`)
        }
        updatesApplied = true
      }
    }

    if (syncMap.kreoon_entity_type === 'organization' && recordData) {
      // Campos permitidos para organizaciones
      const allowedOrgFields: Record<string, string> = {
        org_name: 'name',
        country: 'country'
      }

      const updates: Record<string, unknown> = {}
      for (const [pancakeKey, kreoonKey] of Object.entries(allowedOrgFields)) {
        if (recordData[pancakeKey] !== undefined && recordData[pancakeKey] !== null) {
          updates[kreoonKey] = recordData[pancakeKey]
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log(`Actualizando organización ${syncMap.kreoon_entity_id}:`, updates)
        const { error: updateError } = await supabase
          .from('organizations')
          .update(updates)
          .eq('id', syncMap.kreoon_entity_id)

        if (updateError) {
          console.error('Error actualizando organización:', updateError)
          throw new Error(`Error actualizando organización: ${updateError.message}`)
        }
        updatesApplied = true
      }
    }

    // 6. Actualizar timestamp de última sincronización
    await supabase
      .from('pancake_sync_map')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('kreoon_entity_type', syncMap.kreoon_entity_type)
      .eq('kreoon_entity_id', syncMap.kreoon_entity_id)

    return new Response(JSON.stringify({
      received: true,
      matched: true,
      entity_type: syncMap.kreoon_entity_type,
      entity_id: syncMap.kreoon_entity_id,
      updates_applied: updatesApplied
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en pancake-webhook-receiver:', error)

    // Intentar registrar error en log
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
      const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      await supabase.from('pancake_sync_log').insert({
        direction: 'pancake_to_kreoon',
        entity_type: 'unknown',
        entity_id: 'error',
        action: 'error',
        payload: { error: error.message },
        status: 'error',
        error_message: error.message
      })
    } catch { /* ignore */ }

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
