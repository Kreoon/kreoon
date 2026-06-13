// ============================================================
// STRIPE ACADEMY SUBSCRIBE (dual-mode Connect / central)
//
// Crea una Checkout Session de suscripción mensual.
//
//   - Si el owner tiene Stripe Connect activo (capability
//     stripe_transfers ACTIVE) → destination charge directo a su
//     cuenta, con application_fee_percent al platform.
//   - Si NO → cobro central a KREOON; el webhook registra la deuda
//     al owner en pending_owner_payouts para liquidación manual.
//
// Comisiones: 10 % (Hobby) / 2.9 % (Pro), según `plan_slug`.
//
// Lecturas de DB vía RPC SECURITY DEFINER (`get_subscribe_payload`)
// porque SUPABASE_SERVICE_ROLE_KEY no se inyecta confiablemente en
// edge functions con npm: imports — terminamos cayendo a anon role.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@20.1.0';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const STRIPE_SYNC_SECRET = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'https://kreoon.com';

function platformFeePercent(planSlug: string | null | undefined): number {
  return planSlug === 'pro' ? 2.9 : 10;
}

async function ownerCanReceive(stripeAccountId: string): Promise<boolean> {
  try {
    const account = await stripe.v2.core.accounts.retrieve(stripeAccountId, {
      include: ['configuration.recipient'],
    });
    return (
      (account as any)?.configuration?.recipient?.capabilities?.stripe_balance
        ?.stripe_transfers?.status === 'active'
    );
  } catch (e) {
    console.warn('ownerCanReceive lookup failed', e);
    return false;
  }
}

async function callRpc<T>(name: string, payload: Record<string, unknown>, userJwt: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      // JWT del user (no anon_key) — Postgrest lo verifica y el RPC
      // ejecuta como `authenticated` con auth.uid() bien seteado.
      Authorization: `Bearer ${userJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    // Log completo en server, error genérico al cliente para no filtrar
    // estructura interna (PG codes, RLS info, schema names, etc.).
    console.error('[callRpc] failed', name, res.status, text.slice(0, 500));
    throw new Error('internal_rpc_error');
  }
  return text ? (JSON.parse(text) as T) : (null as unknown as T);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STRIPE_SYNC_SECRET) {
      return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
    }

    // ─── 1. Auth ───
    // Usamos un cliente liviano solo para validar el JWT del user.
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;

    // ─── 2. Body ───
    const body = await req.json().catch(() => ({}));
    const space_slug = body?.space_slug;
    const plan = (body?.plan === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';
    const coupon_code = body?.coupon_code as string | undefined;
    if (!space_slug) return corsJsonResponse(req, { error: 'space_slug_required' }, 400);

    // ─── 3. Payload via RPC (bypassa el bug del SR key) ───
    // Pasamos el JWT del user para que el RPC pueda validar auth.uid().
    const payload = await callRpc<any>('get_subscribe_payload', {
      p_caller_secret: STRIPE_SYNC_SECRET,
      p_space_slug: space_slug,
      p_user_id: callerId,
    }, jwt);

    if (!payload || payload.found === false) {
      return corsJsonResponse(req, { error: 'space_not_found', slug: space_slug }, 404);
    }

    const space = payload.space;
    if (space.status !== 'active' || !space.is_public) {
      return corsJsonResponse(req, { error: 'space_unavailable' }, 400);
    }
    // Seleccionar price + monto según plan elegido.
    const priceUsd = plan === 'yearly'
      ? Number(space.yearly_price_usd ?? 0)
      : Number(space.membership_price_usd ?? 0);
    const stripePriceId = plan === 'yearly' ? space.stripe_yearly_price_id : space.stripe_price_id;
    if (priceUsd <= 0) {
      return corsJsonResponse(req, { error: plan === 'yearly' ? 'yearly_plan_unavailable' : 'space_is_free' }, 400);
    }
    if (!stripePriceId) {
      return corsJsonResponse(req, { error: 'stripe_price_id_missing' }, 400);
    }
    if (payload.membership_active) {
      return corsJsonResponse(req, { error: 'already_member' }, 409);
    }

    // ─── 3b. Cupón opcional ───
    let stripeCouponId: string | null = null;
    let couponInfo: any = null;
    if (coupon_code) {
      const validation = await callRpc<any>('validate_academy_coupon', {
        p_space_id: space.id,
        p_code: coupon_code,
        p_plan: plan,
      }, jwt);
      if (!validation?.valid) {
        return corsJsonResponse(req, { error: 'invalid_coupon', detail: validation?.error ?? 'unknown' }, 400);
      }
      couponInfo = validation;
      // Crear el Stripe Coupon al vuelo. Stripe nunca conoce el código KREOON,
      // solo recibe el descuento ya calculado con la duración correcta.
      const stripeCoupon = await stripe.coupons.create({
        ...(validation.discount_type === 'percentage'
          ? { percent_off: Number(validation.discount_value) }
          : { amount_off: Math.round(Number(validation.discount_value) * 100), currency: 'usd' }),
        duration: validation.duration,
        ...(validation.duration === 'repeating'
          ? { duration_in_months: validation.duration_in_months }
          : {}),
        // No metadata sensible: solo referencia al cupón de KREOON.
        metadata: {
          kreoon_coupon_id: validation.coupon_id,
          kreoon_space_id: space.id,
        },
      });
      stripeCouponId = stripeCoupon.id;
    }

    // ─── 4. Connect detection (NO bloqueamos) ───
    const ownerAccountId = payload.owner_stripe_account_id as string | undefined;
    const useConnect = ownerAccountId ? await ownerCanReceive(ownerAccountId) : false;
    const feePercent = platformFeePercent(space.plan_slug);

    const metadata = {
      type: 'academy_membership_subscription',
      space_id: space.id,
      user_id: callerId,
      space_slug: space.slug,
      plan,
      collection_mode: useConnect ? 'destination' : 'central',
      owner_user_id: space.owner_id ?? '',
      platform_fee_percent: String(feePercent),
      // Si hay cupón, guardamos el ID interno para que el webhook
      // registre la redención.
      ...(couponInfo ? { kreoon_coupon_id: couponInfo.coupon_id } : {}),
    };

    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: callerEmail ?? undefined,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${FRONTEND_URL}/academia/${space.slug}?paid=success`,
      cancel_url: `${FRONTEND_URL}/academia/${space.slug}?paid=cancel`,
    };

    // Si tenemos un cupón gestionado, lo aplicamos directamente y NO
    // mostramos el campo de "Promotion code" en Stripe (los códigos viven
    // en KREOON, no en Stripe). Si NO hay cupón, NO activamos
    // allow_promotion_codes para mantener consistencia.
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
    }

    if (useConnect && ownerAccountId) {
      sessionParams.subscription_data.application_fee_percent = feePercent;
      sessionParams.subscription_data.transfer_data = { destination: ownerAccountId };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return corsJsonResponse(req, { url: session.url, session_id: session.id });
  } catch (err: any) {
    // Loggeamos todo server-side pero NO filtramos detalle al cliente
    // (puede revelar tipos de Stripe, requestIds, etc.).
    console.error('stripe-academy-subscribe error', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      stack: err?.stack,
    });
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
