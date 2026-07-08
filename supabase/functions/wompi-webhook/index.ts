// ============================================================
// wompi-webhook  (HARDENED)
//
// Cambios vs versión anterior:
//   - YA NO deriva course_id/user_id del `reference` (atacker-controlled).
//   - LOOKUP de academy_checkout_intents por reference. Si no existe →
//     200 ignored (no es nuestro checkout, posible atacante intentando
//     explotar el endpoint con su propio reference).
//   - Valida tx.amount_in_cents >= expected_amount_cents (anti-pague-$1-
//     y-llevate-el-curso).
//   - Valida tx.currency === intent.currency.
//   - Anti-replay: si intent.status == 'paid' ignora (idempotente).
//   - Firma SHA256 integrity sigue verificada por el adapter.
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
    const event = await gw.verifyWebhook(req);  // verifica firma SHA256

    if (event.status !== 'APPROVED') {
      return corsJsonResponse(req, { ok: true, ignored: true, status: event.status });
    }

    const reference = event.session_id ?? '';
    if (!reference) {
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'no_reference' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Source of truth: el intent que creamos al iniciar el checkout.
    // Si no existe → no es nuestro checkout (atacante con su propio link).
    const { data: intent, error: intentErr } = await admin
      .from('academy_checkout_intents')
      .select('reference, course_id, user_id, expected_amount_cents, currency, status')
      .eq('reference', reference)
      .eq('gateway', 'wompi')
      .maybeSingle();

    if (intentErr || !intent) {
      console.warn('[wompi-webhook] reference not found in checkout_intents', reference);
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'unknown_reference' });
    }

    // Anti-replay
    if (intent.status === 'paid') {
      return corsJsonResponse(req, { ok: true, skipped: 'already_paid' });
    }

    // Validar amount + currency exactos vs lo que esperamos cobrar.
    // Wompi entrega amount_in_cents en moneda local (COP es entera *100).
    const txAmount = Number(event.amount ?? 0);
    const txCurrency = event.currency ?? '';
    if (txCurrency !== intent.currency || txAmount < intent.expected_amount_cents) {
      await admin.from('academy_checkout_intents').update({
        status: 'rejected',
        rejected_reason: `amount_or_currency_mismatch:${txCurrency}:${txAmount}`,
      }).eq('reference', reference);
      console.error('[wompi-webhook] amount/currency mismatch', {
        reference, txAmount, txCurrency, expected: intent.expected_amount_cents, expectedCurrency: intent.currency,
      });
      return corsJsonResponse(req, { error: 'amount_mismatch' }, 400);
    }

    // OK: crear enrollment con datos del INTENT (no del payload).
    if (intent.course_id) {
      const { error: enrollErr } = await admin
        .from('academy_enrollments')
        .upsert({
          course_id: intent.course_id,
          user_id: intent.user_id,
          amount_paid_usd: intent.currency === 'USD' ? txAmount / 100 : 0,  // conversion fuera de scope
          stripe_payment_intent_id: reference,
        }, { onConflict: 'course_id,user_id' });

      if (enrollErr) {
        console.error('[wompi-webhook] enrollment upsert failed', enrollErr);
        return corsJsonResponse(req, { ok: false, error: enrollErr.message }, 500);
      }
    }

    await admin.from('academy_checkout_intents').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('reference', reference);

    return corsJsonResponse(req, { ok: true, event_type: event.event_type, reference });
  } catch (err: any) {
    console.error('[wompi-webhook] error', err?.message);
    return corsJsonResponse(req, { error: 'webhook_error', detail: err?.message }, 400);
  }
});
