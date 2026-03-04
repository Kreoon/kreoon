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
      delay_ms = 300  // Delay entre cada request para no saturar Pancake
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
      console.log('Iniciando sincronización de usuarios...')

      // Obtener usuarios que no están sincronizados o con error
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: true })
        .range(offset, offset + batch_size - 1)

      if (profilesError) {
        throw new Error(`Error obteniendo perfiles: ${profilesError.message}`)
      }

      results.users.total = profiles?.length || 0
      console.log(`Encontrados ${results.users.total} usuarios para sincronizar`)

      for (const profile of profiles || []) {
        try {
          // Llamar a pancake-sync-user
          const { error: syncError } = await supabase.functions.invoke('pancake-sync-user', {
            body: { user_id: profile.id }
          })

          if (syncError) {
            throw new Error(syncError.message)
          }

          results.users.synced++
          console.log(`Usuario ${profile.id} sincronizado (${results.users.synced}/${results.users.total})`)

          // Delay para evitar rate limiting
          await delay(delay_ms)

        } catch (error: any) {
          results.users.errors++
          results.errors_detail.push({
            entity_type: 'user',
            entity_id: profile.id,
            error: error.message
          })
          console.error(`Error sincronizando usuario ${profile.id}:`, error.message)
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
