// ============================================================
// mercadopago-webhook
//
// Recibe notification de Mercado Pago. Verifica el evento contra la
// API de MP (lookup defensivo), normaliza y emite al bus para que
// downstream cree el enrollment / actualice suscripción.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGateway } from '../_shared/payment/index.ts';
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);
  if (req.method !== 'POST') return corsJsonResponse(req, { error: 'method_not_allowed' }, 405);

  try {
    const gw = getGateway('mercadopago');
    const event = await gw.verifyWebhook(req);

    // Solo procesamos eventos de pago aprobado
    if (event.status !== 'approved' && event.status !== 'authorized') {
      return corsJsonResponse(req, { ok: true, ignored: true, status: event.status });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // El external_reference (session_id) lleva metadata con space_id, course_id, user_id
    // según se haya configurado en createCourseCheckout.
    const meta = event.metadata ?? {};
    const courseId = meta.course_id;
    const userId = meta.user_id;

    if (!courseId || !userId) {
      console.warn('[mp-webhook] missing course_id or user_id in metadata');
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'no_meta' });
    }

    // Crea enrollment (idempotente por UNIQUE constraint course_id+user_id)
    const { error } = await admin
      .from('academy_enrollments')
      .upsert({
        course_id: courseId,
        user_id: userId,
        amount_paid_usd: event.amount ? event.amount / 100 : 0,
        // No tenemos stripe_payment_intent_id aquí; usamos columna análoga si existe
        stripe_payment_intent_id: event.session_id ?? null,
      }, { onConflict: 'course_id,user_id' });

    if (error) {
      console.error('[mp-webhook] enrollment upsert failed', error);
      return corsJsonResponse(req, { ok: false, error: error.message }, 500);
    }

    return corsJsonResponse(req, { ok: true, event_type: event.event_type });
  } catch (err: any) {
    console.error('[mp-webhook] error', err?.message);
    return corsJsonResponse(req, { error: 'webhook_error', detail: err?.message }, 400);
  }
});
