// pancake-bulk-sync: Sincronización masiva de usuarios y organizaciones existentes
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Delay para evitar rate limiting de Pancake
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const {
      entity_type = 'both',  // 'users', 'organizations', 'both'
      batch_size = 50,
      offset = 0,
      delay_ms = 300,  // Delay entre cada request para no saturar Pancake
      user_type_filter = null  // 'org_client', 'org_talent', 'freelancer', 'independent_client' - filtra por tipo
    } = body

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Verificar que shop_id esté configurado
    const { data: shopConfig } = await supabase
      .from('pancake_integration_config')
      .select('config_value')
      .eq('config_key', 'shop_id')
      .single()

    if (!shopConfig?.config_value) {
      throw new Error('Shop ID no configurado. Ejecuta pancake-setup primero.')
    }

    const results = {
      users: { synced: 0, errors: 0, total: 0 },
      organizations: { synced: 0, errors: 0, total: 0 },
      errors_detail: [] as { entity_type: string; entity_id: string; error: string }[]
    }

    // Sincronizar usuarios
    if (entity_type === 'users' || entity_type === 'both') {
      console.log(`Iniciando sincronización de usuarios${user_type_filter ? ` (filtro: ${user_type_filter})` : ''}...`)

      let userIds: string[] = []

      // Si hay filtro de tipo, obtener usuarios específicos
      if (user_type_filter === 'org_client') {
        // Clientes de organizaciones: rol 'client', 'brand_manager', o 'marketing_director'
        // Buscar en organization_member_roles que tiene todos los roles
        const { data: orgClients, error: ocError } = await supabase
          .from('organization_member_roles')
          .select('user_id')
          .in('role', ['client', 'brand_manager', 'marketing_director'])
          .range(offset, offset + batch_size - 1)

        if (ocError) throw new Error(`Error obteniendo clientes de org: ${ocError.message}`)
        // Eliminar duplicados (un usuario puede tener múltiples roles)
        userIds = [...new Set((orgClients || []).map(c => c.user_id))]

      } else if (user_type_filter === 'org_talent') {
        // Talentos de org (NO clientes): creator, editor, strategist, trafficker, team_leader, admin
        // Solo usuarios que existan en profiles y tengan current_organization_id
        const { data: talentProfiles, error: tpError } = await supabase
          .from('profiles')
          .select('id, current_organization_id')
          .not('current_organization_id', 'is', null)
          .range(offset, offset + batch_size - 1)

        if (tpError) throw new Error(`Error obteniendo perfiles de talentos: ${tpError.message}`)

        // Filtrar los que tienen roles de talento (no cliente)
        const clientRoles = ['client', 'brand_manager', 'marketing_director']
        const validTalentIds: string[] = []

        for (const profile of talentProfiles || []) {
          const { data: rolesData } = await supabase
            .from('organization_member_roles')
            .select('role')
            .eq('user_id', profile.id)
            .eq('organization_id', profile.current_organization_id)

          const roles = (rolesData || []).map(r => r.role?.toLowerCase()).filter(Boolean)
          const isClient = roles.some(r => clientRoles.includes(r))

          // Si NO es cliente, es talento
          if (!isClient && roles.length > 0) {
            validTalentIds.push(profile.id)
          }
        }

        userIds = validTalentIds

      } else if (user_type_filter === 'freelancer') {
        // Freelancers: tienen creator_profile, NO están en org, NO son brand
        // 1. Obtener todos los creator_profiles
        const { data: creators, error: cError } = await supabase
          .from('creator_profiles')
          .select('user_id')

        if (cError) throw new Error(`Error obteniendo creator_profiles: ${cError.message}`)

        const creatorUserIds = (creators || []).map(c => c.user_id)

        // 2. Obtener los user_ids que son brand (para excluirlos)
        const { data: authUsers, error: auError } = await supabase.auth.admin.listUsers({
          perPage: 1000
        })

        if (auError) throw new Error(`Error obteniendo auth users: ${auError.message}`)

        const brandUserIds = new Set(
          (authUsers?.users || [])
            .filter(u => u.user_metadata?.user_type === 'brand')
            .map(u => u.id)
        )

        // 3. Filtrar: creator_profile + sin org + NO brand
        const { data: freelancerProfiles, error: fpError } = await supabase
          .from('profiles')
          .select('id')
          .in('id', creatorUserIds)
          .is('current_organization_id', null)

        if (fpError) throw new Error(`Error obteniendo freelancers: ${fpError.message}`)

        // Excluir brands y aplicar paginación
        const filteredIds = (freelancerProfiles || [])
          .filter(p => !brandUserIds.has(p.id))
          .map(p => p.id)
          .slice(offset, offset + batch_size)

        userIds = filteredIds

      } else if (user_type_filter === 'independent_client') {
        // Clientes independientes: user_type='brand' en auth.users SIN organización
        // Consultar auth.users para obtener los que tienen user_type='brand'
        const { data: authUsers, error: auError } = await supabase.auth.admin.listUsers({
          perPage: 1000
        })

        if (auError) throw new Error(`Error obteniendo auth users: ${auError.message}`)

        // Filtrar solo los que tienen user_type='brand'
        const brandUserIds = (authUsers?.users || [])
          .filter(u => u.user_metadata?.user_type === 'brand')
          .map(u => u.id)

        if (brandUserIds.length === 0) {
          userIds = []
        } else {
          // Verificar cuáles NO tienen organización
          const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id')
            .in('id', brandUserIds)
            .is('current_organization_id', null)
            .range(offset, offset + batch_size - 1)

          if (pError) throw new Error(`Error obteniendo clientes independientes: ${pError.message}`)
          userIds = (profiles || []).map(p => p.id)
        }

      } else {
        // Sin filtro: todos los usuarios
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .order('created_at', { ascending: true })
          .range(offset, offset + batch_size - 1)

        if (profilesError) throw new Error(`Error obteniendo perfiles: ${profilesError.message}`)
        userIds = (profiles || []).map(p => p.id)
      }

      results.users.total = userIds.length
      console.log(`Encontrados ${results.users.total} usuarios para sincronizar`)

      for (const userId of userIds) {
        try {
          // Llamar a pancake-sync-user
          const { error: syncError } = await supabase.functions.invoke('pancake-sync-user', {
            body: { user_id: userId }
          })

          if (syncError) {
            throw new Error(syncError.message)
          }

          results.users.synced++
          console.log(`Usuario ${userId} sincronizado (${results.users.synced}/${results.users.total})`)

          // Delay para evitar rate limiting
          await delay(delay_ms)

        } catch (error: any) {
          results.users.errors++
          results.errors_detail.push({
            entity_type: 'user',
            entity_id: userId,
            error: error.message
          })
          console.error(`Error sincronizando usuario ${userId}:`, error.message)
        }
      }
    }

    // Sincronizar organizaciones
    if (entity_type === 'organizations' || entity_type === 'both') {
      console.log('Iniciando sincronización de organizaciones...')

      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id')
        .order('created_at', { ascending: true })
        .range(offset, offset + batch_size - 1)

      if (orgsError) {
        throw new Error(`Error obteniendo organizaciones: ${orgsError.message}`)
      }

      results.organizations.total = orgs?.length || 0
      console.log(`Encontradas ${results.organizations.total} organizaciones para sincronizar`)

      for (const org of orgs || []) {
        try {
          const { error: syncError } = await supabase.functions.invoke('pancake-sync-organization', {
            body: { organization_id: org.id }
          })

          if (syncError) {
            throw new Error(syncError.message)
          }

          results.organizations.synced++
          console.log(`Organización ${org.id} sincronizada (${results.organizations.synced}/${results.organizations.total})`)

          await delay(delay_ms)

        } catch (error: any) {
          results.organizations.errors++
          results.errors_detail.push({
            entity_type: 'organization',
            entity_id: org.id,
            error: error.message
          })
          console.error(`Error sincronizando organización ${org.id}:`, error.message)
        }
      }
    }

    // Calcular estadísticas generales
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    const { count: syncedUsers } = await supabase
      .from('pancake_sync_map')
      .select('*', { count: 'exact', head: true })
      .eq('kreoon_entity_type', 'user')
      .eq('sync_status', 'synced')

    const { count: syncedOrgs } = await supabase
      .from('pancake_sync_map')
      .select('*', { count: 'exact', head: true })
      .eq('kreoon_entity_type', 'organization')
      .eq('sync_status', 'synced')

    const hasMore = (results.users.total === batch_size || results.organizations.total === batch_size)

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        total_users_in_kreoon: totalUsers,
        total_orgs_in_kreoon: totalOrgs,
        synced_users: syncedUsers,
        synced_orgs: syncedOrgs,
        pending_users: (totalUsers || 0) - (syncedUsers || 0),
        pending_orgs: (totalOrgs || 0) - (syncedOrgs || 0)
      },
      pagination: {
        offset,
        batch_size,
        has_more: hasMore,
        next_offset: hasMore ? offset + batch_size : null
      },
      hint: hasMore
        ? `Hay más registros. Llama de nuevo con offset=${offset + batch_size} para continuar.`
        : 'Sincronización completa para este batch.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en pancake-bulk-sync:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
