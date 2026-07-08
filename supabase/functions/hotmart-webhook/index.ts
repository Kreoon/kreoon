// ============================================================
// hotmart-webhook
//
// Recibe eventos de Hotmart vía POST. Eventos soportados:
//   PURCHASE_APPROVED  → crea enrollment (auto-signup user si new)
//   PURCHASE_COMPLETE  → no-op (idempotente, alias del approved)
//   PURCHASE_REFUNDED  → revoca enrollment (revoked_at)
//   PURCHASE_CHARGEBACK → revoca enrollment
//   PURCHASE_CANCELED  → revoca enrollment
//   SUBSCRIPTION_CANCELLATION → revoca enrollment cuando aplica
//
// Validación de origen (anti-spoof):
//   1. Header x-hotmart-hottok DEBE existir.
//   2. Lookup en academy_hotmart_coproductions por hotmart_product_id.
//   3. Comparar producer_hottok con timing-safe compare.
//   4. Si no match → 401 (no procesar).
//
// Validación de monto (anti paywall bypass):
//   - El precio del producto vive en Hotmart, no en KREOON. NO podemos
//     validar amount como en MP/Wompi.
//   - Mitigación: lookup curso por hotmart_product_id (mapping de
//     confianza). El curso entregado SIEMPRE es el mapeado por owner,
//     nunca derivado del payload del webhook.
//
// Buyer email matching:
//   - Si buyer.email matchea profiles.email → enrollment directo.
//   - Si no matchea → auto-signup express + emit hotmart_purchase_claim
//     con link de claim (el user reclama el enrollment al hacer login).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getGateway } from '../_shared/payment/index.ts';
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'https://kreoon.com';

const PURCHASE_OK_EVENTS = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']);
const REVOKE_EVENTS = new Set([
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_CANCELED',
  'SUBSCRIPTION_CANCELLATION',
]);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);
  if (req.method !== 'POST') return corsJsonResponse(req, { error: 'method_not_allowed' }, 405);

  try {
    const gw = getGateway('hotmart');
    const event = await gw.verifyWebhook(req);  // parsea, NO valida hottok aún

    const rawEvent = event.raw_event_type;
    const meta = event.metadata ?? {};
    const hotmartProductId = String(meta.product_id ?? '');
    const incomingHottok = String(meta.hottok ?? '');

    if (!hotmartProductId) {
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'no_product_id' });
    }
    if (!incomingHottok) {
      return corsJsonResponse(req, { error: 'missing_hottok' }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Lookup coproduction config por hotmart_product_id.
    const { data: coprod, error: coprodErr } = await admin
      .from('academy_hotmart_coproductions')
      .select('id, space_id, course_id, producer_hottok, active, coproduction_status')
      .eq('hotmart_product_id', hotmartProductId)
      .maybeSingle();

    if (coprodErr || !coprod) {
      console.warn('[hotmart-webhook] product not mapped', hotmartProductId);
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'unmapped_product' });
    }

    // Anti-spoof: comparar Hottok con timing-safe compare.
    if (!timingSafeEqual(incomingHottok, coprod.producer_hottok)) {
      console.error('[hotmart-webhook] hottok mismatch', hotmartProductId);
      return corsJsonResponse(req, { error: 'invalid_hottok' }, 401);
    }

    if (!coprod.active || coprod.coproduction_status !== 'accepted') {
      return corsJsonResponse(req, {
        ok: true, ignored: true, reason: 'coproduction_not_active',
        status: coprod.coproduction_status,
      });
    }

    if (!coprod.course_id) {
      // Producto Hotmart mapeado pero sin curso — no podemos entregar acceso.
      return corsJsonResponse(req, { ok: true, ignored: true, reason: 'no_course_mapping' });
    }

    const buyerEmail = String(meta.buyer_email ?? '').toLowerCase().trim();
    if (!buyerEmail) {
      return corsJsonResponse(req, { error: 'no_buyer_email' }, 400);
    }

    // Resolver user_id por email (sin auto-signup en MVP — más seguro).
    // Si no existe, registramos un "claim pending" via academy_checkout_intents
    // con user_id=null para que el user pueda reclamar después.
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', buyerEmail)
      .maybeSingle();

    const resolvedUserId = profile?.id ?? null;

    // ─── Rama PURCHASE OK (crear enrollment) ────────────────────
    if (PURCHASE_OK_EVENTS.has(rawEvent)) {
      if (!resolvedUserId) {
        // Sin user → registramos como pending claim. El user lo reclama
        // al hacer signup/login con el mismo email (RPC
        // academy_claim_hotmart_purchases). Idempotente por
        // (coproduction_id, buyer_email, hotmart_transaction).
        const { error: claimErr } = await admin.from('academy_hotmart_pending_claims').insert({
          coproduction_id: coprod.id,
          course_id: coprod.course_id,
          space_id: coprod.space_id,
          buyer_email: buyerEmail,
          buyer_name: String(meta.buyer_name ?? ''),
          hotmart_transaction: event.session_id ?? null,
          amount_paid_usd: event.amount ? event.amount / 100 : 0,
        });
        if (claimErr) {
          console.warn('[hotmart-webhook] pending claim insert failed', claimErr);
        }

        return corsJsonResponse(req, {
          ok: true,
          claim_pending: true,
          buyer_email: buyerEmail,
          reason: 'user_not_in_kreoon',
        });
      }

      // Upsert enrollment con gateway='hotmart' para audit.
      const { error: enrollErr } = await admin
        .from('academy_enrollments')
        .upsert({
          course_id: coprod.course_id,
          user_id: resolvedUserId,
          amount_paid_usd: event.amount ? event.amount / 100 : 0,
          stripe_payment_intent_id: event.session_id ?? `hotmart_${crypto.randomUUID()}`,
          gateway: 'hotmart',
          revoked_at: null,                                    // re-enrollment limpia revoked
          revoked_reason: null,
        }, { onConflict: 'course_id,user_id' });

      if (enrollErr) {
        console.error('[hotmart-webhook] enrollment upsert failed', enrollErr);
        return corsJsonResponse(req, { ok: false, error: enrollErr.message }, 500);
      }

      // Emit welcome_to_space — el bus se encarga de WA + in-app.
      await admin.rpc('academy_emit_event_safe', {
        p_type: 'welcome_to_space',
        p_space_id: coprod.space_id,
        p_user_id: resolvedUserId,
        p_payload: {
          title: 'Tu acceso está listo',
          body: 'Tu compra fue procesada exitosamente.',
          link: `${FRONTEND_URL}/academia`,
          reference_id: coprod.course_id,
          reference_type: 'course',
        },
      });

      return corsJsonResponse(req, { ok: true, event: rawEvent, enrollment_created: true });
    }

    // ─── Rama REVOKE (refund/chargeback/cancel) ─────────────────
    if (REVOKE_EVENTS.has(rawEvent)) {
      if (!resolvedUserId) {
        return corsJsonResponse(req, { ok: true, ignored: true, reason: 'user_not_found_for_revoke' });
      }

      const { error: revokeErr } = await admin
        .from('academy_enrollments')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: rawEvent.toLowerCase(),
        })
        .eq('course_id', coprod.course_id)
        .eq('user_id', resolvedUserId)
        .is('revoked_at', null);

      if (revokeErr) {
        console.error('[hotmart-webhook] revoke failed', revokeErr);
        return corsJsonResponse(req, { ok: false, error: revokeErr.message }, 500);
      }

      await admin.rpc('academy_emit_event_safe', {
        p_type: 'enrollment_revoked',
        p_space_id: coprod.space_id,
        p_user_id: resolvedUserId,
        p_payload: {
          title: 'Tu acceso fue revocado',
          body: 'Se procesó un reembolso/cancelación de tu compra.',
          reference_id: coprod.course_id,
          reference_type: 'course',
        },
      });

      return corsJsonResponse(req, { ok: true, event: rawEvent, enrollment_revoked: true });
    }

    // Eventos no manejados (billet_printed, delayed, etc.) → 200 ok.
    return corsJsonResponse(req, { ok: true, ignored: true, event: rawEvent });
  } catch (err: any) {
    console.error('[hotmart-webhook] error', err?.message);
    return corsJsonResponse(req, { error: 'webhook_error', detail: err?.message }, 400);
  }
});
