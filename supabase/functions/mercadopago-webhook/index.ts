// ============================================================
// mercadopago-webhook  (HARDENED)
//
// Cambios vs versión anterior:
//   - Adapter MP ahora verifica x-signature HMAC con MP_WEBHOOK_SECRET.
//   - YA NO se confía en `event.metadata.course_id/user_id` (atacante
//     puede crear su propia preference apuntando a victima).
//   - LOOKUP de academy_checkout_intents por external_reference.
//   - Valida amount >= expected_amount_cents + currency match.
//   - Anti-replay: si intent ya está paid, idempotente.
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
    // Esto YA valida la firma HMAC antes de hacer el lookup a la API.
    const event = await gw.verifyWebhook(req);

    if (event.status !== 'approved' && event.status !== 'authorized') {
      return corsJsonResponse(req, { ok: true, ignored: true, status: event.status });
    }

    // external_reference es nuestro reference (lo seteamos al crear el preference).
    const reference = event.session_id ?? '';
    if (!reference) {
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'no_external_reference' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: intent, error: intentErr } = await admin
      .from('academy_checkout_intents')
      .select('reference, course_id, user_id, expected_amount_cents, currency, status')
      .eq('reference', reference)
      .eq('gateway', 'mercadopago')
      .maybeSingle();

    if (intentErr || !intent) {
      console.warn('[mp-webhook] reference not in checkout_intents', reference);
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'unknown_reference' });
    }

    if (intent.status === 'paid') {
      return corsJsonResponse(req, { ok: true, skipped: 'already_paid' });
    }

    // Validar amount + currency contra DB (no contra metadata del webhook).
    const txAmount = Number(event.amount ?? 0);
    const txCurrency = String(event.currency ?? '');
    if (txCurrency !== intent.currency || txAmount < intent.expected_amount_cents) {
      await admin.from('academy_checkout_intents').update({
        status: 'rejected',
        rejected_reason: `amount_or_currency_mismatch:${txCurrency}:${txAmount}`,
      }).eq('reference', reference);
      console.error('[mp-webhook] amount/currency mismatch', {
        reference, txAmount, txCurrency, expected: intent.expected_amount_cents, expectedCurrency: intent.currency,
      });
      return corsJsonResponse(req, { error: 'amount_mismatch' }, 400);
    }

    if (intent.course_id) {
      const { error: enrollErr } = await admin
        .from('academy_enrollments')
        .upsert({
          course_id: intent.course_id,
          user_id: intent.user_id,
          amount_paid_usd: intent.currency === 'USD' ? txAmount / 100 : 0,
          stripe_payment_intent_id: reference,
        }, { onConflict: 'course_id,user_id' });

      if (enrollErr) {
        console.error('[mp-webhook] enrollment upsert failed', enrollErr);
        return corsJsonResponse(req, { ok: false, error: enrollErr.message }, 500);
      }
    }

    await admin.from('academy_checkout_intents').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('reference', reference);

    return corsJsonResponse(req, { ok: true, event_type: event.event_type, reference });
  } catch (err: any) {
    console.error('[mp-webhook] error', err?.message);
    return corsJsonResponse(req, { error: 'webhook_error', detail: err?.message }, 400);
  }
});
