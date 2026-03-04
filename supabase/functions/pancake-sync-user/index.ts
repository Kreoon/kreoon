// pancake-sync-user: Sincroniza un usuario individual de Kreoon hacia Pancake CRM
// Clasifica usuarios en tablas separadas: freelancerskreoon, marcaskreoon, organizacioneskreoon
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANCAKE_API_URL = 'https://pos.pages.fm/api/v1'

// Tablas disponibles en Pancake (nombres exactos)
const PANCAKE_TABLES = {
  freelancer: 'freelancerskreoon',           // Freelancers independientes (sin org)
  brand: 'Marcas_Kreoon',                    // Marcas/empresas independientes
  org_member: 'Organizaciones_Kreoon',       // Miembros de org (admin, creator, etc.)
  org_client: 'Clientes_Organizaciones_Kreoon' // Clientes dentro de organizaciones
} as const

type UserType = keyof typeof PANCAKE_TABLES

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

    // 3. Verificar si tiene creator_profile
    const { data: creatorProfile } = await supabase
      .from('creator_profiles')
      .select('id, categories, marketplace_roles')
      .eq('user_id', user_id)
      .maybeSingle()

    // 4. Obtener datos de organización y rol si pertenece a una
    let orgInfo: { name?: string; organization_type?: string } | null = null
    let orgRole: string | null = null

    if (profile.current_organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, organization_type')
        .eq('id', profile.current_organization_id)
        .single()
      orgInfo = org

      // Obtener rol en la organización
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user_id)
        .eq('organization_id', profile.current_organization_id)
        .single()

      orgRole = memberData?.role || null
    }

    // 5. Obtener marca/empresa asociada (para clientes de org)
    let brandInfo: { name?: string; id?: string } | null = null
    if (profile.active_brand_id) {
      const { data: brand } = await supabase
        .from('brands')
        .select('id, name')
        .eq('id', profile.active_brand_id)
        .single()
      brandInfo = brand
    }

    // =========================================
    // CLASIFICACIÓN DE USUARIO
    // =========================================
    // 1. Si está en org con rol 'client' → org_client (Clientes de Organizaciones)
    // 2. Si está en org con otro rol → org_member (Miembros de Organizaciones)
    // 3. Si user_type === 'brand' (sin org) → brand (Marcas independientes)
    // 4. Si tiene creator_profile (sin org, sin brand) → freelancer
    // 5. Si no tiene nada → skip

    let userType: UserType | null = null
    const belongsToOrg = !!profile.current_organization_id
    const isBrand = profile.user_type === 'brand'
    const isOrgClient = belongsToOrg && orgRole === 'client'

    if (isOrgClient) {
      userType = 'org_client'
    } else if (belongsToOrg) {
      userType = 'org_member'
    } else if (isBrand) {
      userType = 'brand'
    } else if (creatorProfile) {
      userType = 'freelancer'
    }

    // Si no se puede clasificar, saltar
    if (!userType) {
      console.log(`Usuario ${user_id} no clasificable (sin org, sin marca, sin creator_profile), saltando`)
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'user_not_classifiable',
        user_id
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const pancakeTable = PANCAKE_TABLES[userType]
    console.log(`Usuario ${user_id} clasificado como: ${userType} → tabla: ${pancakeTable}`)

    // 6. Obtener datos adicionales
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('tier, status')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: reputation } = await supabase
      .from('user_reputation_totals')
      .select('total_points')
      .eq('user_id', user_id)
      .maybeSingle()

    const reputationPoints = reputation?.total_points || 0

    // Obtener categorías/especialidades
    let categories: string[] = []
    if (creatorProfile) {
      categories = [
        ...(creatorProfile.categories || []),
        ...(creatorProfile.marketplace_roles || [])
      ]
    }

    // Si es miembro de org, agregar info de la organización
    if (belongsToOrg && orgInfo?.name) {
      categories.unshift(`Org: ${orgInfo.name}`)
    }

    // Determinar estado de cuenta
    const accountStatus = subscription?.status === 'active'
      ? 'Activo'
      : (subscription?.status === 'trial' ? 'Trial' : 'Inactivo')

    // Validar campos opcionales
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmail = profile.email && emailRegex.test(profile.email) ? profile.email : null
    const validPhone = profile.phone && profile.phone.trim().length > 5 ? profile.phone : null
    const location = profile.country && profile.city
      ? `${profile.city}, ${profile.country}`
      : (profile.country || profile.city || null)

    // Payload base para Pancake
    const pancakePayload: Record<string, any> = {
      Name: profile.full_name || profile.email || 'Sin nombre',
      estado_de_cuenta: accountStatus,
      Untitled5: subscription?.tier || 'free',
      url_del_perfil: profile.username
        ? `https://kreoon.com/talent/${profile.username}`
        : `https://kreoon.com/user/${profile.id}`
    }

    // Campos opcionales comunes
    if (validPhone) pancakePayload.telefono = validPhone
    if (validEmail) pancakePayload.email = validEmail
    if (location) pancakePayload.Untitled2 = location

    // Campos específicos según tipo de usuario
    if (userType === 'org_client') {
      // Cliente de organización: incluir nombre de org y empresa
      if (orgInfo?.name) pancakePayload.nombre_de_la_organizacion = orgInfo.name
      if (brandInfo?.name) pancakePayload.nombre_de_la_empresamarca = brandInfo.name
    } else if (userType === 'org_member') {
      // Miembro de org: incluir nombre de org
      if (orgInfo?.name) pancakePayload.nombre_de_la_organizacion = orgInfo.name
      if (categories.length > 0) pancakePayload.especialidadescategorias = categories.join(', ')
    } else {
      // Freelancer o Marca: incluir campos de creator
      pancakePayload.username_de_kreoon = profile.username || profile.id
      pancakePayload.nivel_up_reputacion = `${getUpLevel(reputationPoints)} (${reputationPoints} pts)`
      if (categories.length > 0) pancakePayload.especialidadescategorias = categories.join(', ')
    }

    // 7. Verificar mapeo existente
    const { data: existingMap } = await supabase
      .from('pancake_sync_map')
      .select('pancake_record_id, pancake_table_name')
      .eq('kreoon_entity_type', 'user')
      .eq('kreoon_entity_id', user_id)
      .maybeSingle()

    let pancakeRecordId = existingMap?.pancake_record_id
    const previousTable = existingMap?.pancake_table_name
    let action = 'create'

    // =========================================
    // DETECTAR CAMBIO DE TABLA (usuario movido)
    // =========================================
    if (previousTable && previousTable !== pancakeTable && pancakeRecordId) {
      console.log(`Usuario ${user_id} cambió de ${previousTable} → ${pancakeTable}. Eliminando de tabla anterior...`)

      // Eliminar de la tabla anterior
      try {
        const deleteRes = await fetch(
          `${PANCAKE_API_URL}/shops/${shopId}/crm/${previousTable}/records/${pancakeRecordId}?api_key=${PANCAKE_API_KEY}`,
          { method: 'DELETE' }
        )

        const deleteData = await deleteRes.json().catch(() => ({}))

        await supabase.from('pancake_sync_log').insert({
          direction: 'kreoon_to_pancake',
          entity_type: 'user',
          entity_id: user_id,
          action: 'delete',
          payload: { previous_table: previousTable, reason: 'user_moved_to_different_table' },
          response: deleteData,
          status: deleteRes.ok ? 'success' : 'error',
          error_message: deleteRes.ok ? null : JSON.stringify(deleteData)
        })

        if (deleteRes.ok) {
          console.log(`Eliminado de ${previousTable} exitosamente`)
        } else {
          console.warn(`No se pudo eliminar de ${previousTable}:`, deleteData)
        }
      } catch (err) {
        console.warn(`Error eliminando de tabla anterior:`, err)
      }

      // Reset para crear nuevo registro
      pancakeRecordId = null
      action = 'move'
    }

    // =========================================
    // CREAR O ACTUALIZAR EN PANCAKE
    // =========================================
    if (pancakeRecordId && previousTable === pancakeTable) {
      // UPDATE existente en la misma tabla
      action = 'update'
      console.log(`Actualizando ${userType} ${user_id} en ${pancakeTable} (record: ${pancakeRecordId})`)

      const updateRes = await fetch(
        `${PANCAKE_API_URL}/shops/${shopId}/crm/${pancakeTable}/records/${pancakeRecordId}?api_key=${PANCAKE_API_KEY}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pancakePayload)
        }
      )

      const updateData = await updateRes.json()

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
      // CREATE nuevo registro
      const actionLabel = action === 'move' ? 'Moviendo' : 'Creando'
      console.log(`${actionLabel} ${userType} ${user_id} en ${pancakeTable}`)

      let createRes = await fetch(
        `${PANCAKE_API_URL}/shops/${shopId}/crm/${pancakeTable}/records?api_key=${PANCAKE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pancakePayload)
        }
      )

      let createData = await createRes.json()

      // Si falla por campo inválido, reintentar sin ese campo
      if (!createRes.ok) {
        const errorStr = JSON.stringify(createData)

        if (errorStr.includes('email')) {
          console.log('Error de email, reintentando sin campo email...')
          delete pancakePayload.email
        }
        if (errorStr.includes('telefono')) {
          console.log('Error de teléfono, reintentando sin campo telefono...')
          delete pancakePayload.telefono
        }

        createRes = await fetch(
          `${PANCAKE_API_URL}/shops/${shopId}/crm/${pancakeTable}/records?api_key=${PANCAKE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pancakePayload)
          }
        )
        createData = await createRes.json()
      }

      pancakeRecordId = createData?.record?.id?.toString() || createData?.data?.id?.toString() || createData?.id?.toString()

      await supabase.from('pancake_sync_log').insert({
        direction: 'kreoon_to_pancake',
        entity_type: 'user',
        entity_id: user_id,
        action: action === 'move' ? 'move' : 'create',
        payload: { ...pancakePayload, target_table: pancakeTable, previous_table: previousTable || null },
        response: createData,
        status: createRes.ok ? 'success' : 'error',
        error_message: createRes.ok ? null : JSON.stringify(createData)
      })

      if (!createRes.ok) {
        throw new Error(`Error al crear en Pancake: ${JSON.stringify(createData)}`)
      }
    }

    // 8. Actualizar mapeo
    await supabase.from('pancake_sync_map').upsert({
      kreoon_entity_type: 'user',
      kreoon_entity_id: user_id,
      pancake_record_id: pancakeRecordId,
      pancake_table_name: pancakeTable,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      error_message: null
    }, { onConflict: 'kreoon_entity_type,kreoon_entity_id' })

    return new Response(JSON.stringify({
      success: true,
      action,
      user_type: userType,
      user_id,
      pancake_table: pancakeTable,
      pancake_record_id: pancakeRecordId,
      moved_from: action === 'move' ? previousTable : null
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error en pancake-sync-user:', error)

    // Intentar registrar error
    try {
      const body = await req.clone().json().catch(() => ({}))
      if (body.user_id) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        await supabase.from('pancake_sync_map').upsert({
          kreoon_entity_type: 'user',
          kreoon_entity_id: body.user_id,
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
