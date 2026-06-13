// ============================================================
// academy-event-fanout
//
// Worker del event bus de CRION Academy v2.
// Lo invoca el RPC `academy_emit_event` vía pg_net con `{ event_id }`.
//
// Responsabilidades:
//   1. Leer evento de `academy_event_log` (idempotente — si ya está
//      procesado, no-op).
//   2. Hacer fan-out paralelo a:
//        - whatsapp-notify  (si hay template activo + phone del user)
//        - academy_notifications  (insert in-app)
//   3. Marcar el evento como `processed` o `failed` vía RPC
//      `academy_mark_event_processed`.
//
// Bloques futuros (S5-S7) agregan más sinks aquí:
//   - academy-trigger-integrations (Zapier/Webhook/Auto-DM)
//   - academy-funnel-engine (upsell/cart-recovery)
//   - Realtime broadcast (channel academy:space:{space_id})
//
// JWT verification: false (lo llama el RPC con SUPABASE_SERVICE_ROLE_KEY).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface EventRow {
  id: string;
  event_type: string;
  space_id: string | null;
  user_id: string | null;
  payload: Record<string, unknown>;
  status: string;
}

interface FanoutPayload {
  // Campos opcionales que el caller puede haber puesto en payload.
  // El fanout extrae los que necesita; los demás siguen viajando.
  title?: string;          // título in-app
  body?: string;           // cuerpo in-app
  link?: string;           // link in-app
  phone?: string;          // override de whatsapp_phone (si no, busca en profiles)
  variables?: string[];    // {{1}}, {{2}}, ... del template Meta
  button_variables?: string[];
  reference_id?: string;
  reference_type?: string;
  sender_id?: string;
  skip_whatsapp?: boolean; // útil para tests o eventos puramente in-app
  skip_in_app?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  const corsHeaders = getCorsHeaders(req);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
  }

  let body: { event_id?: string };
  try {
    body = await req.json();
  } catch {
    return corsJsonResponse(req, { error: 'invalid_json' }, 400);
  }

  const eventId = body.event_id;
  if (!eventId) {
    return corsJsonResponse(req, { error: 'event_id_required' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ─── 1. Leer evento ───
  const { data: event, error: eventErr } = await supabase
    .from('academy_event_log')
    .select('id, event_type, space_id, user_id, payload, status')
    .eq('id', eventId)
    .single<EventRow>();

  if (eventErr || !event) {
    console.error('[academy-event-fanout] event not found', eventId, eventErr);
    return corsJsonResponse(req, { error: 'event_not_found' }, 404);
  }

  // Idempotencia: si ya está procesado, salir limpio
  if (event.status === 'processed') {
    return corsJsonResponse(req, { ok: true, skipped: 'already_processed' });
  }

  // Marcar como processing para que reintentos concurrentes salgan
  await supabase
    .from('academy_event_log')
    .update({ status: 'processing' })
    .eq('id', eventId)
    .eq('status', 'pending'); // condición para no pisar concurrent processed

  const payload = (event.payload ?? {}) as FanoutPayload;
  const sinks: Promise<{ sink: string; ok: boolean; reason?: string }>[] = [];

  // ─── 2. Fan-out: in-app ───
  if (!payload.skip_in_app && event.user_id && event.space_id) {
    sinks.push(
      (async () => {
        const { error } = await supabase.from('academy_notifications').insert({
          space_id: event.space_id,
          recipient_id: event.user_id,
          sender_id: payload.sender_id ?? null,
          type: event.event_type,
          title: payload.title ?? defaultTitleFor(event.event_type),
          body: payload.body ?? null,
          link: payload.link ?? null,
          reference_id: payload.reference_id ?? null,
          reference_type: payload.reference_type ?? null,
        });
        return error
          ? { sink: 'in_app', ok: false, reason: error.message }
          : { sink: 'in_app', ok: true };
      })(),
    );
  }

  // ─── 3. Fan-out: WhatsApp ───
  if (!payload.skip_whatsapp && event.user_id) {
    sinks.push(
      (async () => {
        // Resolver teléfono: payload.phone tiene prioridad, si no busca en profiles
        let phone = payload.phone;
        if (!phone) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('whatsapp_phone, whatsapp_enabled')
            .eq('id', event.user_id!)
            .maybeSingle();
          if (profile?.whatsapp_enabled && profile?.whatsapp_phone) {
            phone = profile.whatsapp_phone;
          }
        }
        if (!phone) {
          return { sink: 'whatsapp', ok: false, reason: 'no_phone' };
        }

        // El edge whatsapp-notify hace el check de template activo internamente.
        const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-notify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone,
            event_type: event.event_type,
            variables: payload.variables ?? [],
            button_variables: payload.button_variables,
            entity_id: payload.reference_id,
            user_id: event.user_id,
          }),
        });
        const json = await res.json().catch(() => ({}));
        return res.ok && json?.success !== false
          ? { sink: 'whatsapp', ok: true }
          : { sink: 'whatsapp', ok: false, reason: json?.reason ?? 'send_failed' };
      })(),
    );
  }

  // ─── 4. Esperar sinks ───
  const results = await Promise.all(sinks);

  // Política: el evento se marca como `processed` aunque algún sink haya
  // fallado individualmente (se loggea cada uno). Solo lo dejamos `failed`
  // si TODOS los sinks fallaron, lo cual indica un problema sistémico.
  const anyOk = results.some((r) => r.ok);
  const finalStatus = sinks.length === 0 || anyOk ? 'processed' : 'failed';
  const errorSummary = results.filter((r) => !r.ok).map((r) => `${r.sink}:${r.reason}`).join('; ') || null;

  await supabase.rpc('academy_mark_event_processed', {
    p_event_id: eventId,
    p_status: finalStatus,
    p_error: errorSummary,
  });

  return corsJsonResponse(req, {
    ok: true,
    event_id: eventId,
    event_type: event.event_type,
    sinks: results,
    status: finalStatus,
  });
});

// ─── helpers ───

function defaultTitleFor(eventType: string): string {
  // Títulos default si el caller no pasa `payload.title`.
  // Esto es solo fallback — los handlers de cada feature deben pasar
  // títulos contextualizados (ej: "Has subido al nivel 4: Aprendiz Pro").
  const map: Record<string, string> = {
    welcome_to_space: 'Bienvenido a la comunidad',
    lesson_unlocked: 'Nueva lección disponible',
    badge_earned: 'Has ganado una insignia',
    level_up: 'Subiste de nivel',
    cohort_starting: 'Tu cohorte arranca pronto',
    cohort_started: 'Tu cohorte ya comenzó',
    cohort_finished: 'Tu cohorte ha finalizado',
    checkpoint_due: 'Tienes un checkpoint pendiente',
    checkpoint_approved: 'Tu checkpoint fue aprobado',
    challenge_completed: 'Completaste un reto',
    certificate_ready: 'Tu certificado está listo',
    cart_abandoned: 'Olvidaste algo en tu carrito',
    upsell_offer: 'Una oferta especial para ti',
  };
  return map[eventType] ?? eventType;
}
