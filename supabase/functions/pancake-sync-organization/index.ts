// pancake-sync-organization: Sincroniza una organización de Kreoon hacia Pancake CRM
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PANCAKE_API_URL = 'https://pos.pages.fm/api/v1'

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

// Mapear tipo de organización a label legible
function getOrgTypeLabel(orgType: string | null): string {
  const labels: Record<string, string> = {
    agency: 'Agencia',
    brand: 'Marca',
    collective: 'Colectivo',
    studio: 'Estudio',
    production: 'Productora',
    default: 'Organización'
  }
  return labels[orgType || ''] || labels.default
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { organization_id } = await req.json()
    if (!organization_id) {
      throw new Error('organization_id es requerido')
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
    const syncEnabled = config.sync_organizations_enabled === 'true'

    if (!shopId) {
      console.log('Shop ID no configurado, saltando sync')
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'shop_id_not_configured'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!syncEnabled) {
      console.log('Sync de organizaciones deshabilitado')
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'sync_organizations_disabled'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // NOTA: La API de Pancake solo tiene la tabla Contact.
    // La sincronización de organizaciones no está soportada actualmente.
    console.log('Sync de organizaciones no soportado - Pancake CRM solo tiene tabla Contact')
    return new Response(JSON.stringify({
      skipped: true,
      reason: 'organizations_not_supported_in_pancake_contact_table',
      note: 'Pancake CRM solo tiene tabla Contact para usuarios. La sincronización de organizaciones requiere configuración adicional.'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 2. Obtener datos de la organización
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id)
      .single()

    if (orgError || !org) {
      throw new Error(`Organización no encontrada: ${orgError?.message || 'no existe'}`)
    }

    // 3. Obtener miembros de la organización
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, is_owner')
      .eq('organization_id', organization_id)

    const membersCount = members?.length || 0

    // 4. Obtener el owner (admin con is_owner=true o primer admin)
    const ownerMember = members?.find(m => m.is_owner) || members?.[0]
    let ownerProfile = null

    if (ownerMember) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', ownerMember.user_id)
        .single()

      ownerProfile = profile
    }

    // 5. Obtener suscripción de la organización
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('tier, status')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 6. Obtener tokens IA consumidos
    const { data: tokenBalances } = await supabase
      .from('ai_token_balances')
      .select('total_consumed')
      .eq('organization_id', organization_id)

    const tokensConsumed = (tokenBalances || []).reduce(
      (sum, t) => sum + (t.total_consumed || 0),
      0
    )

    // 7. Preparar payload para Pancake
    const pancakePayload = {
      kreoon_org_id: org.id,
      org_name: org.name || '',
      owner_email: ownerProfile?.email || org.admin_email || '',
      owner_phone: ownerProfile?.phone || '',
      owner_name: ownerProfile?.full_name || org.admin_name || '',
      subscription_plan: subscription?.tier || org.selected_plan || 'free',
      members_count: membersCount,
      creation_date: formatDate(org.created_at),
      country: org.country || '',
      org_type: getOrgTypeLabel(org.organization_type),
      workspace_url: org.slug
        ? `https://app.kreoon.com/${org.slug}`
        : 'https://app.kreoon.com',
      account_status: subscription?.status === 'active'
        ? 'Activo'
        : (subscription?.status === 'trial' || org.trial_active
          ? 'Trial'
          : 'Inactivo'),
      ai_tokens_consumed: tokensConsumed,
      last_sync: new Date().toISOString()
    }

    // 8. Verificar si ya existe mapeo
    const { data: existingMap } = await supabase
      .from('pancake_sync_map')
      .select('pancake_record_id')
      .eq('kreoon_entity_type', 'organization')
      .eq('kreoon_entity_id', organization_id)
      .maybeSingle()

    let pancakeRecordId = existingMap?.pancake_record_id
    let action = 'create'

    if (pancakeRecordId) {
      // UPDATE existente
      action = 'update'
      console.log(`Actualizando organización ${organization_id} en Pancake (record: ${pancakeRecordId})`)

      const updateRes = await fetch(
        `${PANCAKE_API_URL}/shops/${shopId}/crm/kreoon_organizations/records/${pancakeRecordId}?api_key=${PANCAKE_API_KEY}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pancakePayload)
        }
      )

      const updateData = await updateRes.json()

      await supabase.from('pancake_sync_log').insert({
        direction: 'kreoon_to_pancake',
        entity_type: 'organization',
        entity_id: organization_id,
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
      // CREATE nuevo
      console.log(`Creando organización ${organization_id} en Pancake`)

      const createRes = await fetch(
        `${PANCAKE_API_URL}/shops/${shopId}/crm/kreoon_organizations/records?api_key=${PANCAKE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pancakePayload)
        }
      )

      const createData = await createRes.json()
      pancakeRecordId = createData?.data?.id?.toString() || createData?.id?.toString()

      await supabase.from('pancake_sync_log').insert({
        direction: 'kreoon_to_pancake',
        entity_type: 'organization',
        entity_id: organization_id,
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

    // 9. Actualizar mapeo
    await supabase.from('pancake_sync_map').upsert({
      kreoon_entity_type: 'organization',
      kreoon_entity_id: organization_id,
      pancake_record_id: pancakeRecordId,
      pancake_table_name: 'kreoon_organizations',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      error_message: null
    }, { onConflict: 'kreoon_entity_type,kreoon_entity_id' })

    return new Response(JSON.stringify({
      success: true,
      action,
      organization_id,
      pancake_record_id: pancakeRecordId
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Error en pancake-sync-organization:', error)

    // Intentar registrar error
    try {
      const body = await req.clone().json().catch(() => ({}))
      if (body.organization_id) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

        await supabase.from('pancake_sync_map').upsert({
          kreoon_entity_type: 'organization',
          kreoon_entity_id: body.organization_id,
          pancake_table_name: 'kreoon_organizations',
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
