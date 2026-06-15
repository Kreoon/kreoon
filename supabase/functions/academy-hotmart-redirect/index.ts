// ============================================================
// academy-hotmart-redirect
//
// Invocado por la UI Kreoon cuando un buyer hace click "Comprar" en
// un curso cuyo gateway es Hotmart.
//
// Flujo:
//   1. Valida que el course tenga una academy_hotmart_coproductions
//      active + accepted.
//   2. Genera un tracking_code único (sck).
//   3. INSERT academy_checkout_intents para correlacionar la compra.
//   4. Devuelve la URL de Hotmart con ?off=&sck=&email= para que la UI
//      haga window.location.href.
//
// Auth: verify_jwt=true (caller debe estar autenticado). Si el user no
// quiere registrarse antes de comprar, la UI puede ofrecer un flujo de
// compra sin login y crear pending_claim al webhook (rama del email
// matching).
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HotmartGateway } from '../_shared/payment/index.ts';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return corsJsonResponse(req, { error: 'supabase_env_missing' }, 500);
  }

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
  if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
  const userId = userData.user.id;
  const userEmail = userData.user.email ?? null;

  let body: { course_id?: string };
  try {
    body = await req.json();
  } catch {
    return corsJsonResponse(req, { error: 'invalid_json' }, 400);
  }
  if (!body.course_id) return corsJsonResponse(req, { error: 'course_id_required' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Lookup coproduction config + curso
  const { data: coprod, error: coprodErr } = await admin
    .from('academy_hotmart_coproductions')
    .select(`
      id, space_id, course_id, hotmart_product_id, hotmart_offer_code,
      active, coproduction_status
    `)
    .eq('course_id', body.course_id)
    .maybeSingle();

  if (coprodErr || !coprod) {
    return corsJsonResponse(req, { error: 'no_hotmart_mapping' }, 404);
  }
  if (!coprod.active || coprod.coproduction_status !== 'accepted') {
    return corsJsonResponse(req, {
      error: 'coproduction_not_active',
      status: coprod.coproduction_status,
    }, 400);
  }

  // Precio autoritativo desde DB
  const { data: priceJson } = await admin.rpc('academy_get_course_price_authoritative', {
    p_course_id: body.course_id,
    p_currency: 'USD',
  });
  const expectedAmountCents = priceJson?.amount_cents ?? 0;
  const currency = priceJson?.currency ?? 'USD';

  // Generar tracking_code único (sck) y crear intent
  const trackingCode = `kreoon_${crypto.randomUUID()}`;

  const { error: intentErr } = await admin.from('academy_checkout_intents').insert({
    reference: trackingCode,
    gateway: 'hotmart',
    course_id: body.course_id,
    space_id: coprod.space_id,
    user_id: userId,
    expected_amount_cents: expectedAmountCents > 0 ? expectedAmountCents : 1,  // CHECK > 0
    currency,
    intent_type: 'course_purchase',
    metadata: { hotmart_product_id: coprod.hotmart_product_id },
  });

  if (intentErr) {
    console.error('[hotmart-redirect] intent insert failed', intentErr);
    return corsJsonResponse(req, { error: 'intent_insert_failed' }, 500);
  }

  // Construir URL de Hotmart
  const gw = new HotmartGateway();
  const url = gw.getRedirectUrl({
    product_code: coprod.hotmart_product_id,
    offer_code: coprod.hotmart_offer_code ?? undefined,
    buyer_email: userEmail ?? undefined,
    tracking_code: trackingCode,
  });

  return corsJsonResponse(req, { ok: true, url, tracking_code: trackingCode });
});
