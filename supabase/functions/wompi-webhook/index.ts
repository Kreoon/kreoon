// ============================================================
// wompi-webhook
//
// Recibe eventos de Wompi (Colombia). Verifica firma SHA256
// integrity contra events_secret y procesa transacciones aprobadas.
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
    const gw = getGateway('wompi');
    const event = await gw.verifyWebhook(req);

    if (event.status !== 'APPROVED') {
      return corsJsonResponse(req, { ok: true, ignored: true, status: event.status });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // El session_id (reference) lleva metadata que codifica space/course/user.
    // Para Wompi, la reference debe formatearse como `acad_<courseId>_<userId>` al crear el link.
    const ref = event.session_id ?? '';
    const match = ref.match(/^acad_([0-9a-f-]+)_([0-9a-f-]+)$/i);
    if (!match) {
      console.warn('[wompi-webhook] reference mismatch', ref);
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'ref_mismatch' });
    }
    const [, courseId, userId] = match;

    const { error } = await admin
      .from('academy_enrollments')
      .upsert({
        course_id: courseId,
        user_id: userId,
        amount_paid_usd: event.amount ? event.amount / 100 / 4000 : 0,  // COP/100 / 4000 ≈ USD approx
        stripe_payment_intent_id: ref,
      }, { onConflict: 'course_id,user_id' });

    if (error) {
      console.error('[wompi-webhook] enrollment upsert failed', error);
      return corsJsonResponse(req, { ok: false, error: error.message }, 500);
    }

    return corsJsonResponse(req, { ok: true, event_type: event.event_type });
  } catch (err: any) {
    console.error('[wompi-webhook] error', err?.message);
    return corsJsonResponse(req, { error: 'webhook_error', detail: err?.message }, 400);
  }
});
