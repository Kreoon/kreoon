// ============================================================
// STRIPE ACADEMY PORTAL
// Crea una sesión del Stripe Customer Billing Portal para que el
// estudiante administre su suscripción a una academia (cancelar,
// cambiar método de pago, ver facturas).
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

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const callerId = userData.user.id;

    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);
    }

    const body = await req.json().catch(() => ({})) as { space_slug?: string };
    const spaceSlug = body.space_slug;

    // Buscamos la membresía activa del user. Si se pasó space_slug, filtramos a esa academia;
    // si no, tomamos cualquier membresía paga del user.
    let query = (supabase as any)
      .from('academy_memberships')
      .select('id, stripe_customer_id, space_id, academy_spaces!inner(slug)')
      .eq('user_id', callerId)
      .not('stripe_customer_id', 'is', null)
      .eq('is_active', true);

    if (spaceSlug) {
      query = query.eq('academy_spaces.slug', spaceSlug);
    }

    const { data: membership, error: memErr } = await query.maybeSingle();

    if (memErr || !membership?.stripe_customer_id) {
      return corsJsonResponse(req, { error: 'no_paid_membership' }, 404);
    }

    const returnSlug = spaceSlug || (membership as any).academy_spaces?.slug || '';
    const returnUrl = returnSlug
      ? `${FRONTEND_URL}/academia/${returnSlug}`
      : `${FRONTEND_URL}/academia`;

    const session = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id as string,
      return_url: returnUrl,
    });

    return corsJsonResponse(req, { url: session.url });
  } catch (err: any) {
    console.error('stripe-academy-portal error', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
