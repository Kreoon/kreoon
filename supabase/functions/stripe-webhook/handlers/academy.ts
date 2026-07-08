// ============================================================================
// HANDLERS DE ACADEMY (compra de cursos, membresias, ciclo de suscripcion)
// Extraido de index.ts sin cambiar logica.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";
import { stripe, callAcademyRpc, stripeSyncSecret } from "./_shared.ts";

// ============================================================================
// HELPER: registrar deuda al owner cuando el cobro fue en modo central
// (sin Stripe Connect). KREOON liquida manualmente y marca como pagado
// en pending_owner_payouts vía el panel admin.
// ============================================================================

async function recordOwnerPayoutDebtIfCentral(
  session: Stripe.Checkout.Session,
  invoiceId: string | null,
  sourceType: 'academy_membership_subscription' | 'academy_course_purchase',
  sourceId: string | null,
  ownerUserIdFallback: string | null,
  spaceIdFallback: string | null,
): Promise<void> {
  if (session.metadata?.collection_mode !== 'central') {
    return; // Modo destination → ya hay transfer_data, KREOON solo cobra la fee.
  }

  const ownerUserId = session.metadata?.owner_user_id || ownerUserIdFallback;
  const spaceId = session.metadata?.space_id || spaceIdFallback;
  const feePercent = Number(session.metadata?.platform_fee_percent ?? 10);
  const grossUsd = (session.amount_total ?? 0) / 100;
  const chargeId = session.metadata?.stripe_charge_id ?? null;
  const sessionId = session.id ?? null;
  const currency = (session.currency ?? 'usd').toLowerCase();

  if (!ownerUserId || grossUsd <= 0) {
    console.warn('[record_owner_payout] missing owner or amount', { sessionId, ownerUserId, grossUsd });
    return;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const callerSecret = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';
  if (!supabaseUrl || !anonKey || !callerSecret) {
    console.warn('[record_owner_payout] missing env (url/anon/secret)');
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_owner_payout`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_caller_secret: callerSecret,
        p_owner_user_id: ownerUserId,
        p_space_id: spaceId,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_stripe_session_id: sessionId,
        p_stripe_charge_id: chargeId,
        p_stripe_invoice_id: invoiceId,
        p_gross_amount_usd: grossUsd,
        p_platform_fee_percent: feePercent,
        p_currency: currency,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[record_owner_payout] RPC failed', res.status, txt.slice(0, 300));
    } else {
      console.log(`[record_owner_payout] ✓ registered ${sourceType} for owner ${ownerUserId} (gross $${grossUsd})`);
    }
  } catch (e) {
    console.error('[record_owner_payout] error', e);
  }
}

export async function handleAcademyCoursePurchase(supabase: any, session: Stripe.Checkout.Session) {
  const courseId = session.metadata?.course_id;
  const userId = session.metadata?.user_id;
  const amount = (session.amount_total ?? 0) / 100;

  if (!courseId || !userId) {
    console.warn('[academy_course_purchase] Missing metadata', session.id);
    return;
  }

  // Crear inscripción si no existe
  const { data: existing } = await supabase
    .from('academy_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    console.log(`[academy_course_purchase] User ${userId} already enrolled in ${courseId}`);
    return;
  }

  await supabase.from('academy_enrollments').insert({
    course_id: courseId,
    user_id: userId,
    enrolled_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
    amount_paid_usd: amount,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  });

  // Incrementar contador de inscritos (read+write, suficiente para pocos eventos por minuto)
  try {
    const { data: courseRow } = await supabase
      .from('academy_courses')
      .select('enrolled_count')
      .eq('id', courseId)
      .single();
    if (courseRow) {
      await supabase
        .from('academy_courses')
        .update({ enrolled_count: (courseRow.enrolled_count ?? 0) + 1 })
        .eq('id', courseId);
    }
  } catch (e) {
    console.warn('[academy_course_purchase] Could not increment enrolled_count', e);
  }

  console.log(`[academy_course_purchase] ✓ Enrolled user ${userId} in course ${courseId} ($${amount})`);

  // Si fue cobro central, registrar deuda al owner.
  await recordOwnerPayoutDebtIfCentral(
    session,
    null,                              // sin invoice (es one-time)
    'academy_course_purchase',
    courseId,
    null,                              // owner_user_id viene de metadata
    null,                              // space_id viene de metadata
  );
}

// ============================================================================
// HANDLER: crea/activa membresía desde un evento de suscripción
// (cuando checkout.session.completed no llega o no procesa).
// Idempotente — usa stripe_subscription_id como clave.
// ============================================================================

export async function handleAcademyMembershipFromSubscription(
  supabase: any,
  subscription: Stripe.Subscription,
) {
  const md = (subscription.metadata as any) ?? {};
  const userId = md.user_id;
  const spaceId = md.space_id;
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

  if (!userId || !spaceId) {
    console.warn("[academy_membership_from_sub] missing metadata", subscription.id, md);
    return;
  }

  const result = await callAcademyRpc('webhook_upsert_academy_membership', {
    p_caller_secret: stripeSyncSecret,
    p_space_id: spaceId,
    p_user_id: userId,
    p_subscription_id: subscriptionId,
    p_customer_id: customerId,
    p_should_be_active: true,
  });
  console.log(`[academy_membership_from_sub] ✓ user=${userId} space=${spaceId} sub=${subscriptionId} action=${result?.action ?? 'unknown'}`);
}

// ============================================================================
// HANDLER: SUSCRIPCIÓN A ACADEMIA DE PAGO (recurrente)
// Crea/activa academy_memberships con role='student' y guarda stripe_subscription_id.
// ============================================================================

export async function handleAcademyMembershipPurchase(supabase: any, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const spaceId = session.metadata?.space_id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!userId || !spaceId) {
    console.warn("[academy_membership_subscription] Missing metadata", session.id);
    return;
  }

  const result = await callAcademyRpc('webhook_upsert_academy_membership', {
    p_caller_secret: stripeSyncSecret,
    p_space_id: spaceId,
    p_user_id: userId,
    p_subscription_id: subscriptionId,
    p_customer_id: customerId,
    p_should_be_active: true,
  });
  console.log(`[academy_membership_subscription] ✓ user=${userId} space=${spaceId} sub=${subscriptionId} action=${result?.action ?? 'unknown'}`);

  // Si fue cobro central (sin Connect del owner), registrar deuda
  // del primer cobro. Las renovaciones posteriores también deberían
  // registrar deuda — eso lo manejamos en invoice.payment_succeeded más adelante.
  await recordOwnerPayoutDebtIfCentral(
    session,
    typeof session.invoice === 'string' ? session.invoice : null,
    'academy_membership_subscription',
    subscriptionId,
    null,
    spaceId,
  );

  // Si llegó con cupón gestionado por KREOON, registrar la redención.
  await recordCouponRedemptionIfPresent(
    session.metadata?.kreoon_coupon_id ?? null,
    userId,
    spaceId,
    (session.metadata?.plan as 'monthly' | 'yearly' | undefined) ?? 'monthly',
    subscriptionId,
  );
}

// ============================================================================
// HANDLERS: sincronización del estado activo según ciclo de Stripe.
// Cubrir todos los casos en que la suscripción ya no debería dar acceso:
//   - subscription.updated con status past_due / paused / unpaid / canceled
//   - invoice.payment_failed
//   - charge.refunded total
//   - account.application.deauthorized (cuenta Connect del owner)
//   - customer.deleted (cliente Stripe)
// ============================================================================

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

/**
 * Refleja el estado real de la suscripción en academy_memberships.
 * Si Stripe dice past_due / paused / unpaid → desactivamos.
 * Si vuelve a active → reactivamos.
 */
export async function syncAcademyMembershipStatus(_supabase: any, subscription: Stripe.Subscription) {
  const shouldBeActive = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  const md = (subscription.metadata as any) ?? {};
  const userId = md.user_id;
  const spaceId = md.space_id;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

  if (userId && spaceId) {
    await callAcademyRpc('webhook_upsert_academy_membership', {
      p_caller_secret: stripeSyncSecret,
      p_space_id: spaceId,
      p_user_id: userId,
      p_subscription_id: subscription.id,
      p_customer_id: customerId,
      p_should_be_active: shouldBeActive,
    });
    console.log(`[academy_sub_status] sub=${subscription.id} status=${subscription.status} → is_active=${shouldBeActive}`);
    return;
  }

  // Sin metadata no podemos resolver la membresía para activarla. Si la
  // suscripción ya no está activa, podemos al menos desactivar por sub_id.
  // Si debería estar activa pero no tenemos metadata, logueamos warning
  // (probablemente sub legacy creada antes de poblar metadata).
  if (!shouldBeActive) {
    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscription.id,
    });
    console.log(`[academy_sub_status] sub=${subscription.id} status=${subscription.status} → deactivated by sub_id (no metadata)`);
  } else {
    console.warn(`[academy_sub_status] sub=${subscription.id} active but missing user_id/space_id metadata — cannot reconcile`);
  }
}

/**
 * Pago fallido de una factura de academia → desactivar.
 * El user puede actualizar tarjeta desde el portal; cuando se cobre,
 * `invoice.payment_succeeded` reactivará si la suscripción vuelve a active.
 */
export async function handleAcademyInvoiceFailed(_supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string | null;
  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if ((subscription.metadata as any)?.type !== 'academy_membership_subscription') return;

    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscriptionId,
    });
    console.log(`[academy_invoice_failed] Deactivated membership for sub ${subscriptionId}`);
  } catch (e) {
    console.error('[academy_invoice_failed] error', e);
  }
}

/**
 * Refund total de un charge de academia → desactivar la membresía
 * y opcionalmente cancelar la subscription para que no siga cobrando.
 */
export async function handleAcademyChargeRefunded(supabase: any, charge: Stripe.Charge) {
  // Reembolso parcial: no desactivamos (el user pagó algo todavía).
  const fullyRefunded = charge.refunded || (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);
  if (!fullyRefunded) return;

  const invoiceId = typeof charge.invoice === 'string' ? charge.invoice : null;
  if (!invoiceId) return;

  try {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if ((subscription.metadata as any)?.type !== 'academy_membership_subscription') return;

    await callAcademyRpc('webhook_deactivate_by_subscription', {
      p_caller_secret: stripeSyncSecret,
      p_subscription_id: subscriptionId,
    });
    console.log(`[academy_refund] Deactivated membership for sub ${subscriptionId}`);

    // Cancelar la suscripción para que no siga cobrando.
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (e) {
      console.warn('[academy_refund] could not cancel subscription', e);
    }
  } catch (e) {
    console.error('[academy_refund] error', e);
  }
}

/**
 * Customer eliminado en Stripe → limpiar referencias y desactivar
 * cualquier membresía con ese customer_id.
 */
export async function handleAcademyCustomerDeleted(_supabase: any, customer: Stripe.Customer) {
  const customerId = customer.id;
  await callAcademyRpc('webhook_clear_by_customer', {
    p_caller_secret: stripeSyncSecret,
    p_customer_id: customerId,
  });
  console.log(`[customer_deleted] Cleaned memberships for customer ${customerId}`);
}

// ============================================================================
// HELPER: registrar redención de cupón si la sesión llegó con uno.
// ============================================================================

async function recordCouponRedemptionIfPresent(
  couponId: string | null,
  userId: string | null,
  spaceId: string | null,
  plan: 'monthly' | 'yearly',
  subscriptionId: string | null,
): Promise<void> {
  if (!couponId || !userId || !spaceId) return;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const callerSecret = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';
  if (!supabaseUrl || !anonKey || !callerSecret) return;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/record_coupon_redemption`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_caller_secret: callerSecret,
        p_coupon_id: couponId,
        p_user_id: userId,
        p_space_id: spaceId,
        p_plan: plan,
        p_stripe_subscription_id: subscriptionId,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn('[coupon_redemption] RPC failed', res.status, txt.slice(0, 200));
    }
  } catch (e) {
    console.warn('[coupon_redemption] error', e);
  }
}
