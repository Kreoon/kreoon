// ============================================================
// ACADEMY COURSE CHECKOUT (dual-mode Connect / central)
//
// Genera URL de Stripe Checkout one-time para que un usuario compre
// un curso. Si el owner tiene Connect activo → destination charge.
// Si NO → cobro central a KREOON (el webhook registra deuda al owner).
//
// Lecturas de DB vía RPC SECURITY DEFINER (mismo motivo que subscribe).
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
      Authorization: `Bearer ${userJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
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

    // Auth
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;

    const body = await req.json().catch(() => ({}));
    const course_id = body?.course_id;
    if (!course_id) return corsJsonResponse(req, { error: 'course_id_required' }, 400);

    // Payload via RPC (con JWT del user para validar auth.uid en el RPC).
    const payload = await callRpc<any>('get_course_checkout_payload', {
      p_caller_secret: STRIPE_SYNC_SECRET,
      p_course_id: course_id,
      p_user_id: callerId,
    }, jwt);

    if (!payload || payload.found === false) {
      return corsJsonResponse(req, { error: 'course_not_found' }, 404);
    }

    const course = payload.course;
    const space = payload.space;

    if (course.is_free) return corsJsonResponse(req, { error: 'course_is_free' }, 400);
    if (!course.price_usd || Number(course.price_usd) <= 0) {
      return corsJsonResponse(req, { error: 'invalid_price' }, 400);
    }
    if (payload.already_enrolled) {
      return corsJsonResponse(req, { error: 'already_enrolled' }, 409);
    }

    const ownerAccountId = payload.owner_stripe_account_id as string | undefined;
    const useConnect = ownerAccountId ? await ownerCanReceive(ownerAccountId) : false;
    const unitAmount = Math.round(Number(course.price_usd) * 100);
    const feePercent = platformFeePercent(space?.plan_slug);
    const applicationFeeAmount = Math.round((unitAmount * feePercent) / 100);

    const sessionParams: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: callerEmail ?? undefined,
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmount,
            product_data: {
              name: course.title,
              description: `Acceso al curso "${course.title}" en ${space?.name ?? 'Kreoon Academia'}`,
              images: course.cover_image_url ? [course.cover_image_url] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'academy_course_purchase',
        course_id,
        user_id: callerId,
        collection_mode: useConnect ? 'destination' : 'central',
        owner_user_id: space?.owner_id ?? '',
        space_id: space?.id ?? '',
        platform_fee_percent: String(feePercent),
      },
      success_url: `${FRONTEND_URL}/academia/${space?.slug}/${course.slug}/learn?paid=success`,
      cancel_url: `${FRONTEND_URL}/academia/${space?.slug}/${course.slug}?paid=cancel`,
    };

    if (useConnect && ownerAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: ownerAccountId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return corsJsonResponse(req, { url: session.url, session_id: session.id });
  } catch (err: any) {
    console.error('academy-course-checkout error', {
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
