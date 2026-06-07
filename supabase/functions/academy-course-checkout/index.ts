// ============================================================
// ACADEMY COURSE CHECKOUT
// Genera URL de Stripe Checkout para que un usuario compre un curso.
// Al completar el pago, el webhook (academy-stripe-webhook) crea
// la inscripción real en academy_enrollments.
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

    // Cargar curso + space
    const { data: course } = await supabase
      .from('academy_courses')
      .select('id, title, price_usd, is_free, slug, cover_image_url, space:academy_spaces(slug, name)')
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

    const spaceSlug = (course.space as any)?.slug ?? '';

    // Crear Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: callerEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(course.price_usd * 100),
            product_data: {
              name: course.title,
              description: `Acceso al curso "${course.title}" en ${(course.space as any)?.name ?? 'Kreoon Academia'}`,
              images: course.cover_image_url ? [course.cover_image_url] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      // Metadatos: usados por el webhook para crear la inscripción
      metadata: {
        type: 'academy_course_purchase',
        course_id,
        user_id: callerId,
      },
      success_url: `${FRONTEND_URL}/academia/${spaceSlug}/${course.slug}/learn?paid=success`,
      cancel_url: `${FRONTEND_URL}/academia/${spaceSlug}/${course.slug}?paid=cancel`,
    });

    return corsJsonResponse(req, { url: session.url, session_id: session.id });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'internal_error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
