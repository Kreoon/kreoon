// ============================================================
// academy-upsell-charge
//
// Post-purchase upsell one-click. Reusa el customer_id ya creado en
// Stripe en la compra primaria → cobro inmediato sin re-ingreso de
// tarjeta. Si el customer no existe o no tiene PaymentMethod por
// default, retorna error y el caller debe redirigir a checkout
// estándar.
//
// Caller flow:
//   1. Usuario completa compra primaria del curso A.
//   2. Sistema redirige a /academia/post-compra?session=X.
//   3. Página muestra recomendación (academy_upsells).
//   4. Click "Agregar con un clic" → invoca este edge.
//   5. Edge crea PaymentIntent off-session sobre el default PM.
//   6. Webhook stripe-webhook procesa el payment_intent.succeeded
//      como compra normal (crea enrollment).
//
// Auth: verify_jwt=true, valida ownership del session_id primario.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@20.1.0';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

const stripe = new Stripe(STRIPE_SECRET);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  if (!STRIPE_SECRET) return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);

  // Auth caller
  const auth = req.headers.get('Authorization') ?? '';
  const jwt = auth.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
  if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  let body: { upsell_id?: string; primary_session_id?: string };
  try {
    body = await req.json();
  } catch {
    return corsJsonResponse(req, { error: 'invalid_json' }, 400);
  }

  if (!body.upsell_id || !body.primary_session_id) {
    return corsJsonResponse(req, { error: 'missing_params' }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Validar el upsell
  const { data: upsell, error: upsellErr } = await admin
    .from('academy_upsells')
    .select(`
      id, headline, discount_percent, active,
      to_product:academy_courses!academy_upsells_to_product_id_fkey(
        id, title, price_usd, space_id, stripe_price_id
      )
    `)
    .eq('id', body.upsell_id)
    .single();

  if (upsellErr || !upsell || !upsell.active) {
    return corsJsonResponse(req, { error: 'upsell_not_found' }, 404);
  }

  const toProduct = (upsell as any).to_product;
  if (!toProduct) return corsJsonResponse(req, { error: 'product_missing' }, 400);

  // 2. Resolver el customer del primary session
  let primarySession;
  try {
    primarySession = await stripe.checkout.sessions.retrieve(body.primary_session_id, {
      expand: ['customer'],
    });
  } catch (e) {
    console.error('[upsell-charge] primary session retrieve failed', e);
    return corsJsonResponse(req, { error: 'primary_session_invalid' }, 400);
  }

  // FAIL CLOSED: el primary session DEBE tener metadata.user_id y DEBE
  // coincidir con el caller. Sin metadata, rechazamos (no permitir sessions
  // ajenas o externas a Kreoon).
  if (!primarySession.metadata?.user_id || primarySession.metadata.user_id !== userId) {
    return corsJsonResponse(req, { error: 'session_mismatch' }, 403);
  }

  // El session DEBE estar pagado. No permitimos reusar customers de sessions
  // sin completar (cancel, expired, abandoned) para evitar fraude.
  if (primarySession.payment_status !== 'paid') {
    return corsJsonResponse(req, { error: 'session_not_paid', status: primarySession.payment_status }, 400);
  }

  // El session DEBE pertenecer al mismo space que el upsell, para evitar
  // que un usuario reuse customer de un space para cobrar a otro.
  const sessionSpaceId = primarySession.metadata?.space_id;
  if (sessionSpaceId && sessionSpaceId !== toProduct.space_id) {
    return corsJsonResponse(req, { error: 'space_mismatch' }, 403);
  }

  const customerId = typeof primarySession.customer === 'string'
    ? primarySession.customer
    : primarySession.customer?.id;
  if (!customerId) return corsJsonResponse(req, { error: 'no_customer_on_session' }, 400);

  // 3. Calcular monto con descuento
  const basePrice = Number(toProduct.price_usd);
  const finalPrice = basePrice * (1 - upsell.discount_percent / 100);
  const amountCents = Math.round(finalPrice * 100);

  // 4. PaymentMethods del customer
  const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  if (!pms.data.length) {
    return corsJsonResponse(req, { error: 'no_payment_method' }, 400);
  }
  const pmId = pms.data[0].id;

  // 5. Crear PaymentIntent off-session
  try {
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: pmId,
      off_session: true,
      confirm: true,
      metadata: {
        type: 'academy_course_one_time',
        space_id: toProduct.space_id,
        course_id: toProduct.id,
        user_id: userId,
        source: 'upsell_one_click',
        upsell_id: upsell.id,
        original_session_id: body.primary_session_id,
      },
    });

    return corsJsonResponse(req, {
      ok: true,
      payment_intent_id: pi.id,
      status: pi.status,
      amount_cents: amountCents,
    });
  } catch (err: any) {
    console.error('[upsell-charge] PI failed', err?.message);
    return corsJsonResponse(req, { error: 'payment_failed', code: err?.code }, 400);
  }
});
