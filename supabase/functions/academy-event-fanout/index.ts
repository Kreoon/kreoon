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
// Auth en dos capas:
//   1. verify_jwt = true (config.toml): Supabase rechaza requests sin
//      JWT firmado por el proyecto antes de invocar este handler.
//   2. Header `x-academy-fanout-secret`: shared secret entre el RPC y
//      este worker. Validado con timing-safe compare. Defensa contra
//      replay/forced-reprocess.
//
// Anti-replay: solo se procesan eventos con status='pending'. Si ya
// está processed/processing/failed, se devuelve 409.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FANOUT_SECRET = Deno.env.get('ACADEMY_FANOUT_SECRET') ?? '';

/** Constant-time string compare (Deno no expone crypto.timingSafeEqual). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

interface EventRow {
  id: string;
  event_type: string;
  space_id: string | null;
  user_id: string | null;
  payload: Record<string, unknown>;
  status: string;
}

// Campos que el caller (RPC academy_emit_event) puede poner en payload.
// IMPORTANTE: solo el RPC (que es SECURITY DEFINER y solo callable por
// service_role/postgres) escribe en academy_event_log, así que el
// payload se considera trusted SI Y SOLO SI el GRANT a authenticated
// fue revocado (migración 20260614000003_academy_v2_bus_harden.sql).
//
// Aún así, NO aceptamos `phone` desde payload — para evitar relay abuse
// del cupo WhatsApp (template enviado a número arbitrario), el phone
// se resuelve SIEMPRE desde profiles.whatsapp_phone vía event.user_id.
// Si en el futuro un caso admin requiere "phone override", debe vivir
// en un edge function dedicado con check de rol, NUNCA aquí.
interface FanoutPayload {
  title?: string;          // título in-app (default: defaultTitleFor)
  body?: string;           // cuerpo in-app
  link?: string;           // link in-app
  variables?: string[];    // {{1}}, {{2}}, ... del template Meta
  button_variables?: string[];
  reference_id?: string;
  reference_type?: string;
  sender_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  const corsHeaders = getCorsHeaders(req);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
  }

  // En producción ACADEMY_FANOUT_SECRET es obligatorio. Si no está
  // configurado, fallamos cerrado en lugar de aceptar requests sin
  // shared secret (defensa contra deploys mal configurados).
  if (!FANOUT_SECRET) {
    console.error('[academy-event-fanout] ACADEMY_FANOUT_SECRET not configured');
    return corsJsonResponse(req, { error: 'fanout_secret_not_configured' }, 500);
  }

  // Shared secret check con timing-safe compare. El RPC envía el secret
  // en este header desde el GUC `app.settings.academy_fanout_secret`.
  const providedSecret = req.headers.get('x-academy-fanout-secret') ?? '';
  if (!timingSafeEqual(providedSecret, FANOUT_SECRET)) {
    return corsJsonResponse(req, { error: 'unauthorized' }, 401);
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

  // Anti-replay: rechazar cualquier estado distinto de `pending`.
  // Idempotencia (processed) → 200 con skipped.
  // Otros estados (processing/failed) → 409 — el reprocess explícito
  // debe hacerse desde un edge separado por un admin, no aquí.
  if (event.status !== 'pending') {
    return corsJsonResponse(
      req,
      {
        ok: event.status === 'processed',
        skipped: event.status === 'processed' ? 'already_processed' : 'invalid_status',
        status: event.status,
      },
      event.status === 'processed' ? 200 : 409,
    );
  }

  // Claim el evento con UPDATE condicional. Si otro worker concurrente
  // ya lo claimeó, rowcount=0 y salimos sin reprocesar.
  const { data: claimed } = await supabase
    .from('academy_event_log')
    .update({ status: 'processing' })
    .eq('id', eventId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (!claimed) {
    return corsJsonResponse(req, { ok: false, skipped: 'lost_race' }, 409);
  }

  const payload = (event.payload ?? {}) as FanoutPayload;
  const sinks: Promise<{ sink: string; ok: boolean; reason?: string }>[] = [];

  // ─── 2. Fan-out: in-app ───
  if (event.user_id && event.space_id) {
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
  // SIEMPRE resolvemos el phone desde profiles del event.user_id.
  // Nunca aceptamos un override desde payload — anti relay abuse del
  // cupo WhatsApp de Kreoon/Botcake (template no puede enviarse a
  // números arbitrarios distintos del recipient real del evento).
  if (event.user_id) {
    sinks.push(
      (async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('whatsapp_phone, whatsapp_enabled')
          .eq('id', event.user_id!)
          .maybeSingle();
        const phone = profile?.whatsapp_enabled && profile?.whatsapp_phone
          ? profile.whatsapp_phone
          : null;
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
