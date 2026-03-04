// pancake-setup: Inicialización — obtiene Shop ID y verifica conexión con Pancake
// NOTA: La creación de tablas CRM no funciona vía API, se usa la tabla Contact existente
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANCAKE_API_URL = 'https://pos.pages.fm/api/v1'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PANCAKE_API_KEY = Deno.env.get('PANCAKE_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!PANCAKE_API_KEY) {
      throw new Error('PANCAKE_API_KEY no está configurado en los secrets')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Obtener shops de Pancake (api_key va como query parameter)
    console.log('Obteniendo shops de Pancake...')
    const shopsRes = await fetch(`${PANCAKE_API_URL}/shops?api_key=${PANCAKE_API_KEY}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!shopsRes.ok) {
      const errorText = await shopsRes.text()
      throw new Error(`Error al obtener shops: ${shopsRes.status} - ${errorText}`)
    }

    const shopsData = await shopsRes.json()

    // La API de Pancake responde con { shops: [...], success: true }
    if (!shopsData?.shops?.length) {
      throw new Error('No se encontraron shops en Pancake. Verifica la API Key.')
    }

    const shopId = String(shopsData.shops[0].id)
    const shopName = shopsData.shops[0].name || 'Shop Principal'
    console.log(`Shop encontrado: ${shopName} (ID: ${shopId})`)

    // 2. Guardar Shop ID en config
    await supabase
      .from('pancake_integration_config')
      .upsert({
        config_key: 'shop_id',
        config_value: shopId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'config_key' })

    // 3. Verificar tablas CRM existentes
    console.log('Verificando tablas CRM existentes...')
    const tablesRes = await fetch(`${PANCAKE_API_URL}/shops/${shopId}/crm/tables?api_key=${PANCAKE_API_KEY}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const tablesData = await tablesRes.json()
    const existingTables = (tablesData?.tables || []).map((t: any) => ({
      name: t.name,
      label: t.label
    }))

    // 4. Obtener webhook secret para configuración
    const { data: webhookConfig } = await supabase
      .from('pancake_integration_config')
      .select('config_value')
      .eq('config_key', 'webhook_secret')
      .single()

    const webhookUrl = `${SUPABASE_URL}/functions/v1/pancake-webhook-receiver`

    return new Response(JSON.stringify({
      success: true,
      shop_id: shopId,
      shop_name: shopName,
      existing_crm_tables: existingTables,
      note: 'La API de Pancake no permite crear tablas CRM. Se usará la tabla Contact existente para sincronizar usuarios.',
      sync_strategy: {
        users: 'Tabla Contact - Campo Name para nombre, Phone para teléfono, Note para datos adicionales de Kreoon (JSON)',
        organizations: 'No soportado en esta versión - Pancake CRM solo tiene tabla Contact'
      },
      webhook_config: {
        url: webhookUrl,
        secret_header: 'x-pancake-secret',
        secret_value: webhookConfig?.config_value || '(ver en pancake_integration_config)'
      },
      next_steps: [
        '1. La conexión con Pancake está verificada',
        '2. Configurar webhook en Pancake apuntando a: ' + webhookUrl,
        '3. Ejecutar pancake-bulk-sync para sincronizar usuarios existentes'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en pancake-setup:', error)
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
