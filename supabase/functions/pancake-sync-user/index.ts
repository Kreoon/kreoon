// pancake-sync-user: Sincroniza un usuario individual de Kreoon hacia Pancake CRM
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANCAKE_API_URL = 'https://pos.pages.fm/api/v1'

// Mapeo de nivel UP basado en puntos
function getUpLevel(points: number): string {
  if (points >= 15000) return 'Legend'
  if (points >= 5000) return 'Master'
  if (points >= 2000) return 'Elite'
  if (points >= 500) return 'Pro'
  return 'Novato'
}

// Formatear fecha en español
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()
    if (!user_id) {
      throw new Error('user_id es requerido')
    }

    const PANCAKE_API_KEY = Deno.env.get('PANCAKE_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!PANCAKE_API_KEY) {
      throw new Error('PANCAKE_API_KEY no está configurado')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. Obtener configuración
    const { data: configRows } = await supabase
      .from('pancake_integration_config')
      .select('config_key, config_value')

    const config = Object.fromEntries(
      (configRows || []).map(c => [c.config_key, c.config_value])
    )

    const shopId = config.shop_id
    const syncEnabled = config.sync_users_enabled === 'true'

    if (!shopId) {
      console.log('Shop ID no configurado, saltando sync')
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'shop_id_not_configured'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!syncEnabled) {
      console.log('Sync de usuarios deshabilitado')
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'sync_users_disabled'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Obtener datos completos del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      throw new Error(`Perfil no encontrado: ${profileError?.message || 'usuario no existe'}`)
    }

    // 3. Obtener membresía de organización
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        organizations(name, organization_type)
      `)
      .eq('user_id', user_id)
      .limit(1)
      .maybeSingle()

    // 4. Obtener rol principal
    const { data: roleData } = await supabase
      .from('organization_member_roles')
      .select('role')
      .eq('user_id', user_id)
      .limit(1)
      .maybeSingle()

    // 5. Obtener suscripción
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('tier, status')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 6. Obtener puntos de reputación
    const { data: reputation } = await supabase
      .from('user_reputation_totals')
      .select('total_points')
      .eq('user_id', user_id)
      .maybeSingle()

    // 7. Preparar payload para Pancake
    const reputationPoints = reputation?.total_points || 0
    const orgInfo = orgMember?.organizations as { name?: string; organization_type?: string } | null
    const primaryRole = roleData?.role || profile.active_role || 'creator'

    const pancakePayload = {
      kreoon_user_id: profile.id,
      full_name: profile.full_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      role: primaryRole,
      subscription_plan: subscription?.tier || 'free',
      up_level: getUpLevel(reputationPoints),
      up_points: reputationPoints,
      registration_date: formatDate(profile.created_at),
      country: profile.country || '',
      city: profile.city || '',
      username: profile.username || '',
      profile_url: profile.username
        ? `https://kreoon.com/talent/${profile.username}`
        : `https://kreoon.com/user/${profile.id}`,
      organization_name: orgInfo?.name || '',
      organization_id: orgMember?.organization_id || '',
      account_status: subscription?.status === 'active'
        ? 'Activo'
        : (subscription?.status === 'trial' ? 'Trial' : 'Inactivo'),
      last_sync: new Date().toISOString()
    }

    // 8. Verificar si ya existe mapeo en Pancake
    const { data: existingMap } = await supabase
      .from('pancake_sync_map')
      .select('pancake_record_id')
      .eq('kreoon_entity_type', 'user')
      .eq('kreoon_entity_id', user_id)
      .maybeSingle()

    let pancakeRecordId = existingMap?.pancake_record_id
    let action = 'create'

    if (pancakeRecordId) {
      // UPDATE existente en Pancake
      action = 'update'
      console.log(`Actualizando usuario ${user_id} en Pancake (record: ${pancakeRecordId})`)

      const updateRes = await fetch(
        `${PANCAKE_API_URL}/shops/${shopId}/crm/kreoon_users/records/${pancakeRecordId}`,
        {
          method: 'PUT',
          headers: {
            'api_key': PANCAKE_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pancakePayload)
        }
      )

      const updateData = await updateRes.json()

      // Registrar en log
      await supabase.from('pancake_sync_log').insert({
        direction: 'kreoon_to_pancake',
        entity_type: 'user',
        entity_id: user_id,
        action: 'update',
        payload: pancakePayload,
        response: updateData,
        status: updateRes.ok ? 'success' : 'error',
        error_message: updateRes.ok ? null : JSON.stringify(updateData)
      })

      if (!updateRes.ok) {
        throw new Error(`Error al actualizar en Pancake: ${JSON.stringify(updateData)}`)
      }

    } else {
      // CREATE nuevo en Pancake
      console.log(`Creando usuario ${user_id} en Pancake`)

      const createRes = await fetch(
        `${PANCAKE_API_URL}/shops/${shopId}/crm/kreoon_users/records`,
        {
          method: 'POST',
          headers: {
            'api_key': PANCAKE_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pancakePayload)
        }
      )

      const createData = await createRes.json()
      pancakeRecordId = createData?.data?.id?.toString() || createData?.id?.toString()

      // Registrar en log
      await supabase.from('pancake_sync_log').insert({
        direction: 'kreoon_to_pancake',
        entity_type: 'user',
        entity_id: user_id,
        action: 'create',
        payload: pancakePayload,
        response: createData,
        status: createRes.ok ? 'success' : 'error',
        error_message: createRes.ok ? null : JSON.stringify(createData)
      })

      if (!createRes.ok) {
        throw new Error(`Error al crear en Pancake: ${JSON.stringify(createData)}`)
      }
    }

    // 9. Actualizar/crear mapeo
    await supabase.from('pancake_sync_map').upsert({
      kreoon_entity_type: 'user',
      kreoon_entity_id: user_id,
      pancake_record_id: pancakeRecordId,
      pancake_table_name: 'kreoon_users',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      error_message: null
    }, { onConflict: 'kreoon_entity_type,kreoon_entity_id' })

    return new Response(JSON.stringify({
      success: true,
      action,
      user_id,
      pancake_record_id: pancakeRecordId
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error en pancake-sync-user:', error)

    // Intentar registrar error en sync_map
    try {
      const body = await req.clone().json().catch(() => ({}))
      if (body.user_id) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        await supabase.from('pancake_sync_map').upsert({
          kreoon_entity_type: 'user',
          kreoon_entity_id: body.user_id,
          pancake_table_name: 'kreoon_users',
          sync_status: 'error',
          error_message: error.message
        }, { onConflict: 'kreoon_entity_type,kreoon_entity_id' })
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
