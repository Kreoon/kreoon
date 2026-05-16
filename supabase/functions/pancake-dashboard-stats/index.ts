// pancake-dashboard-stats: Stats del dashboard CRM unificado (Kreoon + Pancake)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANCAKE_API_BASE = 'https://crm.pancake.vn/api/workspaces'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth: JWT requerido
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Validar JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verificar rol admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ============ DATOS DE SYNC (Supabase local) ============

    // Conteos de sync_map por tipo y estado
    const { data: syncMap } = await supabase
      .from('pancake_sync_map')
      .select('kreoon_entity_type, sync_status, last_synced_at')

    const syncStats = {
      total_synced: 0,
      total_pending: 0,
      total_errors: 0,
      total_skipped: 0,
      synced_users: 0,
      synced_orgs: 0,
      pending_users: 0,
      pending_orgs: 0,
      error_users: 0,
      error_orgs: 0,
      last_sync_at: null as string | null,
    }

    let latestSync: string | null = null

    for (const entry of syncMap ?? []) {
      const isUser = entry.kreoon_entity_type === 'user'
      const isOrg = entry.kreoon_entity_type === 'organization'

      if (entry.sync_status === 'synced') {
        syncStats.total_synced++
        if (isUser) syncStats.synced_users++
        if (isOrg) syncStats.synced_orgs++
      } else if (entry.sync_status === 'pending') {
        syncStats.total_pending++
        if (isUser) syncStats.pending_users++
        if (isOrg) syncStats.pending_orgs++
      } else if (entry.sync_status === 'error') {
        syncStats.total_errors++
        if (isUser) syncStats.error_users++
        if (isOrg) syncStats.error_orgs++
      } else if (entry.sync_status === 'skip') {
        syncStats.total_skipped++
      }

      if (entry.last_synced_at) {
        if (!latestSync || entry.last_synced_at > latestSync) {
          latestSync = entry.last_synced_at
        }
      }
    }

    syncStats.last_sync_at = latestSync

    const total = syncStats.total_synced + syncStats.total_pending + syncStats.total_errors + syncStats.total_skipped
    const error_rate_pct = total > 0 ? Math.round((syncStats.total_errors / total) * 100) : 0

    // Log de actividad reciente (últimas 15 entradas)
    const { data: recentActivity } = await supabase
      .from('pancake_sync_log')
      .select('id, direction, entity_type, action, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(15)

    // Config de la integración
    const { data: configRows } = await supabase
      .from('pancake_integration_config')
      .select('config_key, config_value')

    const config: Record<string, string> = {}
    for (const row of configRows ?? []) {
      config[row.config_key] = row.config_value ?? ''
    }

    const integrationConfig = {
      sync_users_enabled: config.sync_users_enabled === 'true',
      sync_organizations_enabled: config.sync_organizations_enabled === 'true',
      shop_id: config.shop_id || null,
    }

    // ============ DATOS DE PANCAKE API (opcional, graceful fail) ============

    let pancake_contact_count: number | null = null
    let pancake_contact_breakdown: { creadores: number | null; marcas: number | null } = {
      creadores: null,
      marcas: null,
    }

    const PANCAKE_API_KEY = Deno.env.get('PANCAKE_API_KEY')
    const PANCAKE_WORKSPACE_ID = integrationConfig.shop_id ?? Deno.env.get('PANCAKE_WORKSPACE_ID') ?? '4708'

    if (PANCAKE_API_KEY && PANCAKE_WORKSPACE_ID) {
      try {
        // Intentar GET del total de contactos
        const contactsUrl = `${PANCAKE_API_BASE}/${PANCAKE_WORKSPACE_ID}/contact/records?api_key=${PANCAKE_API_KEY}&page=1&page_size=1`
        const contactsRes = await fetch(contactsUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
        })

        if (contactsRes.ok) {
          const contactsData = await contactsRes.json().catch(() => null)
          if (contactsData) {
            // Diferentes formatos posibles de Pancake API
            pancake_contact_count =
              contactsData?.data?.total ??
              contactsData?.total ??
              contactsData?.data?.count ??
              contactsData?.count ??
              null
          }
        }
      } catch (e) {
        console.warn('[pancake-dashboard-stats] No se pudo leer contactos de Pancake API:', e)
      }
    }

    // ============ RESPUESTA ============

    return new Response(
      JSON.stringify({
        sync_health: {
          ...syncStats,
          error_rate_pct,
          total_in_map: total,
        },
        recent_activity: recentActivity ?? [],
        pancake_contact_count,
        pancake_contact_breakdown,
        config: integrationConfig,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[pancake-dashboard-stats] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
