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
    console.log('[stripe-academy-portal] caller:', callerId, 'space_slug:', spaceSlug);

    // 1) Resolver space_id desde slug (si vino slug). Hacemos lookup separado
    //    en lugar de join inline porque el join PostgREST .eq('rel.col', ...)
    //    con .maybeSingle() ha dado falsos negativos en producción.
    let spaceId: string | null = null;
    let resolvedSlug = '';
    if (spaceSlug) {
      const { data: space, error: spErr } = await (supabase as any)
        .from('academy_spaces')
        .select('id, slug')
        .eq('slug', spaceSlug)
        .maybeSingle();
      if (spErr) console.warn('[stripe-academy-portal] space lookup error:', spErr);
      if (!space) {
        console.warn('[stripe-academy-portal] space not found for slug:', spaceSlug);
        return corsJsonResponse(req, { error: 'space_not_found' }, 404);
      }
      spaceId = space.id;
      resolvedSlug = space.slug;
    }

    // 2) Buscar membresía paga del user en ese space (o cualquier space si no se pidió slug).
    let memQuery = (supabase as any)
      .from('academy_memberships')
      .select('id, stripe_customer_id, space_id')
      .eq('user_id', callerId)
      .eq('is_active', true)
      .not('stripe_customer_id', 'is', null);
    if (spaceId) memQuery = memQuery.eq('space_id', spaceId);

    const { data: memberships, error: memErr } = await memQuery.limit(1);
    if (memErr) console.error('[stripe-academy-portal] membership query error:', memErr);
    const membership = memberships?.[0];

    if (!membership?.stripe_customer_id) {
      console.warn('[stripe-academy-portal] no paid membership for user', callerId, 'in space', spaceId);
      return corsJsonResponse(req, { error: 'no_paid_membership' }, 404);
    }

    // Si no teníamos slug, buscamos el slug del space ahora (para el return_url).
    if (!resolvedSlug) {
      const { data: sp } = await (supabase as any)
        .from('academy_spaces')
        .select('slug')
        .eq('id', membership.space_id)
        .maybeSingle();
      resolvedSlug = sp?.slug ?? '';
    }

    const returnSlug = resolvedSlug;
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
