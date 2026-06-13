// ============================================================
// STRIPE ACADEMY SUBSCRIBE (con Stripe Connect destination charges).
//
// Crea una Checkout Session de suscripción mensual para que un user
// se inscriba a una academia de pago. El cobro entra DIRECTO a la
// cuenta Connect del owner; KREOON cobra su comisión vía
// `application_fee_percent`.
//
// Comisiones (decisión de producto):
//   - plan_slug='pro'  → 2.9 % al platform
//   - cualquier otro    → 10 %
//
// Requisitos para que un cobro sea posible:
//   1. La academia tiene `stripe_price_id` (lo crea el auto-sync).
//   2. El owner tiene `stripe_connected_accounts.stripe_account_id`
//      con la capability `stripe_transfers` activa. Si no, devolvemos
//      'connect_pending' y el frontend muestra "Verificando cuenta…".
//
// El webhook (stripe-webhook → handleAcademyMembershipPurchase) crea
// la fila en academy_memberships al confirmarse el pago.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@20.1.0';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;

    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);
    }

    const { space_slug } = await req.json();
    if (!space_slug) return corsJsonResponse(req, { error: 'space_slug_required' }, 400);

    // Cargamos space + plan_slug + owner_id para resolver Connect después.
    const { data: space, error: spaceErr } = await supabase
      .from('academy_spaces')
      .select('id, slug, name, membership_price_usd, stripe_price_id, status, is_public, owner_id, plan_slug')
      .eq('slug', space_slug)
      .maybeSingle();

    if (spaceErr || !space) {
      return corsJsonResponse(req, { error: 'space_not_found' }, 404);
    }
    if (space.status !== 'active' || !space.is_public) {
      return corsJsonResponse(req, { error: 'space_unavailable' }, 400);
    }

    const priceUsd = Number(space.membership_price_usd ?? 0);
    if (priceUsd <= 0) {
      return corsJsonResponse(req, { error: 'space_is_free' }, 400);
    }
    if (!space.stripe_price_id) {
      return corsJsonResponse(req, { error: 'stripe_price_id_missing' }, 400);
    }

    // Ya es miembro activo: no permitimos doble cobro.
    const { data: existing } = await supabase
      .from('academy_memberships')
      .select('id, is_active')
      .eq('space_id', space.id)
      .eq('user_id', callerId)
      .maybeSingle();
    if (existing?.is_active) {
      return corsJsonResponse(req, { error: 'already_member' }, 409);
    }

    // ─── Connect detection (NO bloqueamos) ───
    // Si el owner YA terminó Connect y la capability está activa, usamos
    // destination charge (el cobro va directo a su cuenta, KREOON queda
    // con application_fee_percent).
    //
    // Si NO, hacemos cobro CENTRAL: todo entra a la cuenta de KREOON y
    // el webhook registra la deuda en `pending_owner_payouts`. KREOON
    // liquida manualmente una vez al mes.
    const { data: connect } = await (supabase as any)
      .from('stripe_connected_accounts')
      .select('stripe_account_id')
      .eq('user_id', space.owner_id)
      .maybeSingle();
    const ownerAccountId = connect?.stripe_account_id as string | undefined;
    const useConnect = ownerAccountId ? await ownerCanReceive(ownerAccountId) : false;
    const feePercent = platformFeePercent(space.plan_slug as any);

    const metadata = {
      type: 'academy_membership_subscription',
      space_id: space.id,
      user_id: callerId,
      space_slug: space.slug,
      // Info para el webhook: modo + datos para registrar deuda si es central.
      collection_mode: useConnect ? 'destination' : 'central',
      owner_user_id: space.owner_id ?? '',
      platform_fee_percent: String(feePercent),
    };

    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: callerEmail ?? undefined,
      line_items: [{ price: space.stripe_price_id, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
      success_url: `${FRONTEND_URL}/academia/${space.slug}?paid=success`,
      cancel_url: `${FRONTEND_URL}/academia/${space.slug}?paid=cancel`,
    };

    if (useConnect && ownerAccountId) {
      sessionParams.subscription_data.application_fee_percent = feePercent;
      sessionParams.subscription_data.transfer_data = { destination: ownerAccountId };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return corsJsonResponse(req, { url: session.url, session_id: session.id });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
