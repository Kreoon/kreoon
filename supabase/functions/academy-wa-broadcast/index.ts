// ============================================================
// academy-wa-broadcast
//
// Worker que envía un broadcast masivo de WhatsApp template a los
// miembros de un space, filtrado por audiencia.
//
// Flujo:
//   1. Owner crea un registro en academy_wa_broadcasts (status=pending)
//      desde el UI.
//   2. UI llama este edge con `{ broadcast_id }`.
//   3. Worker valida ownership + lee filtros + itera miembros.
//   4. Por cada miembro con whatsapp_enabled, llama whatsapp-notify
//      con el template `academy_broadcast` (MARKETING).
//   5. Actualiza contadores en tiempo real.
//
// Rate limiting: 500ms entre llamadas para no saturar Botcake/Meta.
//
// Auth: verify_jwt=true. El owner debe estar autenticado y ser dueño
// del space; el worker valida usando el JWT del caller.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface AudienceFilter {
  tier?: string;
  min_level?: number;
  max_inactive_days?: number;
  course_id?: string;
}

interface BroadcastRow {
  id: string;
  space_id: string;
  sender_user_id: string;
  audience_filter: AudienceFilter;
  message_text: string;
  variables: string[];
  status: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
  }

  // Auth: validamos el JWT del caller (es el owner que dispara el broadcast)
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return corsJsonResponse(req, { error: 'unauthorized' }, 401);
  }
  const callerId = userData.user.id;

  let body: { broadcast_id?: string };
  try {
    body = await req.json();
  } catch {
    return corsJsonResponse(req, { error: 'invalid_json' }, 400);
  }
  const broadcastId = body.broadcast_id;
  if (!broadcastId) return corsJsonResponse(req, { error: 'broadcast_id_required' }, 400);

  // service client para el resto (bypass RLS controlado por ownership check abajo)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: broadcast, error: bErr } = await admin
    .from('academy_wa_broadcasts')
    .select('id, space_id, sender_user_id, audience_filter, message_text, variables, status')
    .eq('id', broadcastId)
    .single<BroadcastRow>();

  if (bErr || !broadcast) {
    return corsJsonResponse(req, { error: 'broadcast_not_found' }, 404);
  }

  // Ownership check explícito: caller debe ser el sender del broadcast
  // Y el owner del space.
  if (broadcast.sender_user_id !== callerId) {
    return corsJsonResponse(req, { error: 'forbidden' }, 403);
  }
  const { data: space } = await admin
    .from('academy_spaces')
    .select('id, owner_id, name')
    .eq('id', broadcast.space_id)
    .single();
  if (!space || space.owner_id !== callerId) {
    return corsJsonResponse(req, { error: 'forbidden' }, 403);
  }

  if (broadcast.status !== 'pending') {
    return corsJsonResponse(req, { error: 'broadcast_not_pending', status: broadcast.status }, 409);
  }

  // Claim
  await admin
    .from('academy_wa_broadcasts')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', broadcastId);

  // Resolver audiencia. Patrón base: members activos del space + filtros.
  let membersQuery = admin
    .from('academy_memberships')
    .select(`
      user_id,
      tier_slug,
      profiles!inner (whatsapp_phone, whatsapp_enabled),
      academy_space_points (level, total_points)
    `)
    .eq('space_id', broadcast.space_id)
    .eq('is_active', true);

  if (broadcast.audience_filter.tier) {
    membersQuery = membersQuery.eq('tier_slug', broadcast.audience_filter.tier);
  }

  const { data: members } = await membersQuery;
  const filtered = (members ?? []).filter((m: any) => {
    if (!m.profiles?.whatsapp_enabled || !m.profiles?.whatsapp_phone) return false;
    if (broadcast.audience_filter.min_level != null) {
      const lvl = m.academy_space_points?.[0]?.level ?? 1;
      if (lvl < broadcast.audience_filter.min_level) return false;
    }
    return true;
  });

  let sent = 0;
  let failed = 0;

  for (const m of filtered as any[]) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: m.profiles.whatsapp_phone,
          event_type: 'academy_broadcast',
          variables: broadcast.variables,
          entity_id: broadcast.id,
          user_id: m.user_id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success !== false) {
        sent += 1;
      } else {
        failed += 1;
      }
      // Update contadores cada 10 envíos
      if ((sent + failed) % 10 === 0) {
        await admin
          .from('academy_wa_broadcasts')
          .update({ sent_count: sent, failed_count: failed })
          .eq('id', broadcastId);
      }
    } catch (err) {
      failed += 1;
      console.error('[wa-broadcast] send failed', err);
    }
    // Throttle 500ms para no saturar
    await sleep(500);
  }

  await admin
    .from('academy_wa_broadcasts')
    .update({
      sent_count: sent,
      failed_count: failed,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', broadcastId);

  return corsJsonResponse(req, {
    ok: true,
    broadcast_id: broadcastId,
    sent,
    failed,
    audience_size: filtered.length,
  });
});
