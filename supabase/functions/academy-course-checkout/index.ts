// ============================================================
// ACADEMY COURSE CHECKOUT
// Genera URL de Stripe Checkout para que un usuario compre un curso.
// Al completar el pago, el webhook (academy-stripe-webhook) crea
// la inscripción real en academy_enrollments.
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

    // Autenticación
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

    const { course_id } = await req.json();
    if (!course_id) return corsJsonResponse(req, { error: 'course_id_required' }, 400);

    // Cargar curso + space (con owner y plan para Connect)
    const { data: course } = await supabase
      .from('academy_courses')
      .select('id, title, price_usd, is_free, slug, cover_image_url, space:academy_spaces(id, slug, name, owner_id, plan_slug)')
      .eq('id', course_id)
      .single();

    if (!course) return corsJsonResponse(req, { error: 'course_not_found' }, 404);
    if (course.is_free) return corsJsonResponse(req, { error: 'course_is_free' }, 400);
    if (!course.price_usd || course.price_usd <= 0) {
      return corsJsonResponse(req, { error: 'invalid_price' }, 400);
    }

    // Verificar que no esté ya inscrito
    const { data: existing } = await supabase
      .from('academy_enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('user_id', callerId)
      .maybeSingle();
    if (existing) {
      return corsJsonResponse(req, { error: 'already_enrolled' }, 409);
    }

    const space = (course.space as any);
    const spaceSlug = space?.slug ?? '';

    // ─── Connect detection (NO bloqueamos) ───
    // Si el owner tiene Connect activo → destination charge.
    // Si no → cobro central a KREOON; el webhook registra deuda al owner.
    const { data: connect } = await (supabase as any)
      .from('stripe_connected_accounts')
      .select('stripe_account_id')
      .eq('user_id', space?.owner_id)
      .maybeSingle();
    const ownerAccountId = connect?.stripe_account_id as string | undefined;
    const useConnect = ownerAccountId ? await ownerCanReceive(ownerAccountId) : false;

    const unitAmount = Math.round(Number(course.price_usd) * 100);
    const feePercent = platformFeePercent(space?.plan_slug);
    const applicationFeeAmount = Math.round((unitAmount * feePercent) / 100);

    const sessionParams: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: callerEmail ?? undefined,
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
        // Info para el webhook: modo + datos para registrar deuda si es central.
        collection_mode: useConnect ? 'destination' : 'central',
        owner_user_id: space?.owner_id ?? '',
        space_id: space?.id ?? '',
        platform_fee_percent: String(feePercent),
      },
      success_url: `${FRONTEND_URL}/academia/${spaceSlug}/${course.slug}/learn?paid=success`,
      cancel_url: `${FRONTEND_URL}/academia/${spaceSlug}/${course.slug}?paid=cancel`,
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
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
