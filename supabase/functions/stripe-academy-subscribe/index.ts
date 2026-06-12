// ============================================================
// STRIPE ACADEMY SUBSCRIBE
// Crea una sesión de Stripe Checkout en modo subscription para
// que un usuario se suscriba a una academia de pago.
// El webhook (stripe-webhook → handleAcademyMembershipPurchase)
// crea/activa la fila en academy_memberships al completarse el pago.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
});

const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'https://kreoon.com';

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

    // Cargar space
    const { data: space, error: spaceErr } = await supabase
      .from('academy_spaces')
      .select('id, slug, name, membership_price_usd, stripe_price_id, status, is_public')
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

    // Ya es miembro activo
    const { data: existing } = await supabase
      .from('academy_memberships')
      .select('id, is_active')
      .eq('space_id', space.id)
      .eq('user_id', callerId)
      .maybeSingle();
    if (existing?.is_active) {
      return corsJsonResponse(req, { error: 'already_member' }, 409);
    }

    const metadata = {
      type: 'academy_membership_subscription',
      space_id: space.id,
      user_id: callerId,
      space_slug: space.slug,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: callerEmail ?? undefined,
      line_items: [
        {
          price: space.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${FRONTEND_URL}/academia/${space.slug}?paid=success`,
      cancel_url: `${FRONTEND_URL}/academia/${space.slug}?paid=cancel`,
    });

    return corsJsonResponse(req, { url: session.url, session_id: session.id });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
