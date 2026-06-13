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

  // Diagnóstico temporal: el frontend recibe el detail para mostrarlo en el toast.
  let step = 'init';
  let detail: Record<string, unknown> = {};

  try {
    step = 'env_check';
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const STRIPE_SK = Deno.env.get('STRIPE_SECRET_KEY');
    detail = {
      has_supabase_url: !!SUPABASE_URL,
      has_service_role: !!SUPABASE_SRK,
      has_stripe_key: !!STRIPE_SK,
      stripe_key_mode: STRIPE_SK?.startsWith('sk_live_') ? 'live' : STRIPE_SK?.startsWith('sk_test_') ? 'test' : 'unknown',
    };
    if (!SUPABASE_URL || !SUPABASE_SRK) {
      return corsJsonResponse(req, { error: 'env_missing', step, detail }, 500);
    }
    if (!STRIPE_SK) {
      return corsJsonResponse(req, { error: 'stripe_not_configured', step, detail }, 500);
    }

    step = 'create_client';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SRK, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    step = 'auth_check';
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized', step, detail: { reason: 'no_jwt' } }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return corsJsonResponse(req, { error: 'unauthorized', step, detail: { jwt_err: userErr?.message } }, 401);
    }
    const callerId = userData.user.id;
    detail = { ...detail, caller_id: callerId };

    step = 'parse_body';
    const body = await req.json().catch(() => ({})) as { space_slug?: string };
    const spaceSlug = body.space_slug;
    detail = { ...detail, space_slug: spaceSlug ?? null };
    console.log('[stripe-academy-portal]', JSON.stringify(detail));

    step = 'lookup_space';
    let spaceId: string | null = null;
    let resolvedSlug = '';
    if (spaceSlug) {
      const { data: space, error: spErr } = await (supabase as any)
        .from('academy_spaces')
        .select('id, slug')
        .eq('slug', spaceSlug)
        .maybeSingle();
      if (spErr) {
        return corsJsonResponse(req, { error: 'space_query_failed', step, detail: { sp_err: spErr.message } }, 500);
      }
      if (!space) {
        return corsJsonResponse(req, { error: 'space_not_found', step, detail: { searched_slug: spaceSlug } }, 404);
      }
      spaceId = space.id;
      resolvedSlug = space.slug;
      detail = { ...detail, space_id: spaceId };
    }

    step = 'lookup_membership';
    let memQuery = (supabase as any)
      .from('academy_memberships')
      .select('id, stripe_customer_id, space_id')
      .eq('user_id', callerId)
      .eq('is_active', true)
      .not('stripe_customer_id', 'is', null);
    if (spaceId) memQuery = memQuery.eq('space_id', spaceId);

    const { data: memberships, error: memErr } = await memQuery.limit(1);
    if (memErr) {
      return corsJsonResponse(req, { error: 'membership_query_failed', step, detail: { mem_err: memErr.message } }, 500);
    }
    const membership = memberships?.[0];
    if (!membership?.stripe_customer_id) {
      return corsJsonResponse(
        req,
        { error: 'no_paid_membership', step, detail: { ...detail, found_count: memberships?.length ?? 0 } },
        404,
      );
    }

    if (!resolvedSlug) {
      const { data: sp } = await (supabase as any)
        .from('academy_spaces')
        .select('slug')
        .eq('id', membership.space_id)
        .maybeSingle();
      resolvedSlug = sp?.slug ?? '';
    }

    const returnUrl = resolvedSlug
      ? `${FRONTEND_URL}/academia/${resolvedSlug}`
      : `${FRONTEND_URL}/academia`;

    step = 'stripe_portal';
    const session = await stripe.billingPortal.sessions.create({
      customer: membership.stripe_customer_id as string,
      return_url: returnUrl,
    });

    return corsJsonResponse(req, { url: session.url });
  } catch (err: any) {
    console.error('[stripe-academy-portal] error at step', step, err);
    return new Response(
      JSON.stringify({
        error: 'internal_error',
        step,
        detail: { ...detail, message: err?.message, type: err?.type, code: err?.code },
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
