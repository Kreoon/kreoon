// pancake-setup: Inicialización única — obtiene Shop ID y crea las tablas CRM en Pancake
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

    // 1. Obtener shops de Pancake
    console.log('Obteniendo shops de Pancake...')
    const shopsRes = await fetch(`${PANCAKE_API_URL}/shops`, {
      headers: {
        'api_key': PANCAKE_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!shopsRes.ok) {
      const errorText = await shopsRes.text()
      throw new Error(`Error al obtener shops: ${shopsRes.status} - ${errorText}`)
    }

    const shopsData = await shopsRes.json()

    if (!shopsData?.data?.length) {
      throw new Error('No se encontraron shops en Pancake. Verifica la API Key.')
    }

    const shopId = String(shopsData.data[0].id)
    const shopName = shopsData.data[0].name || 'Shop Principal'
    console.log(`Shop encontrado: ${shopName} (ID: ${shopId})`)

    // 2. Guardar Shop ID en config
    await supabase
      .from('pancake_integration_config')
      .upsert({
        config_key: 'shop_id',
        config_value: shopId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'config_key' })

    // 3. Definir campos para tabla kreoon_users
    const usersTableFields = [
      { key: 'kreoon_user_id', label: 'Kreoon User ID', type: 'text' },
      { key: 'full_name', label: 'Nombre Completo', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Teléfono', type: 'text' },
      { key: 'role', label: 'Rol Principal', type: 'text' },
      { key: 'subscription_plan', label: 'Plan Activo', type: 'text' },
      { key: 'up_level', label: 'Nivel UP', type: 'text' },
      { key: 'up_points', label: 'Puntos UP', type: 'number' },
      { key: 'registration_date', label: 'Fecha de Registro', type: 'text' },
      { key: 'country', label: 'País', type: 'text' },
      { key: 'city', label: 'Ciudad', type: 'text' },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'profile_url', label: 'URL Perfil Kreoon', type: 'text' },
      { key: 'organization_name', label: 'Organización', type: 'text' },
      { key: 'organization_id', label: 'Kreoon Org ID', type: 'text' },
      { key: 'account_status', label: 'Estado', type: 'text' },
      { key: 'last_sync', label: 'Última Sincronización', type: 'text' }
    ]

    // 4. Definir campos para tabla kreoon_organizations
    const orgsTableFields = [
      { key: 'kreoon_org_id', label: 'Kreoon Org ID', type: 'text' },
      { key: 'org_name', label: 'Nombre de la Organización', type: 'text' },
      { key: 'owner_email', label: 'Email del Owner', type: 'text' },
      { key: 'owner_phone', label: 'Teléfono del Owner', type: 'text' },
      { key: 'owner_name', label: 'Nombre del Owner', type: 'text' },
      { key: 'subscription_plan', label: 'Plan de Suscripción', type: 'text' },
      { key: 'members_count', label: 'Cantidad de Miembros', type: 'number' },
      { key: 'creation_date', label: 'Fecha de Creación', type: 'text' },
      { key: 'country', label: 'País', type: 'text' },
      { key: 'org_type', label: 'Tipo (agencia/marca/colectivo)', type: 'text' },
      { key: 'workspace_url', label: 'URL Workspace Kreoon', type: 'text' },
      { key: 'account_status', label: 'Estado', type: 'text' },
      { key: 'ai_tokens_consumed', label: 'Tokens IA Consumidos', type: 'number' },
      { key: 'last_sync', label: 'Última Sincronización', type: 'text' }
    ]

    // 5. Crear tabla kreoon_users en Pancake
    console.log('Creando tabla kreoon_users en Pancake...')
    const usersTableRes = await fetch(`${PANCAKE_API_URL}/shops/${shopId}/crm/tables`, {
      method: 'POST',
      headers: {
        'api_key': PANCAKE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'kreoon_users',
        display_name: 'Kreoon - Usuarios',
        fields: usersTableFields
      })
    })

    const usersTableData = await usersTableRes.json()
    console.log('Resultado tabla kreoon_users:', usersTableRes.status, usersTableData)

    // 6. Crear tabla kreoon_organizations en Pancake
    console.log('Creando tabla kreoon_organizations en Pancake...')
    const orgsTableRes = await fetch(`${PANCAKE_API_URL}/shops/${shopId}/crm/tables`, {
      method: 'POST',
      headers: {
        'api_key': PANCAKE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'kreoon_organizations',
        display_name: 'Kreoon - Organizaciones',
        fields: orgsTableFields
      })
    })

    const orgsTableData = await orgsTableRes.json()
    console.log('Resultado tabla kreoon_organizations:', orgsTableRes.status, orgsTableData)

    // 7. Obtener webhook secret para configuración
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
      tables_created: {
        kreoon_users: {
          status: usersTableRes.status,
          response: usersTableData
        },
        kreoon_organizations: {
          status: orgsTableRes.status,
          response: orgsTableData
        }
      },
      webhook_config: {
        url: webhookUrl,
        secret_header: 'x-pancake-secret',
        secret_value: webhookConfig?.config_value || '(ver en pancake_integration_config)'
      },
      next_steps: [
        '1. Verificar que las tablas se crearon en Pancake CRM',
        '2. Configurar webhook en Pancake apuntando a: ' + webhookUrl,
        '3. Ejecutar pancake-bulk-sync para sincronizar datos existentes'
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
