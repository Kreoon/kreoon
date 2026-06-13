// ============================================================================
// STRIPE RECONCILE — ACADEMY SUBSCRIPTIONS
//
// Job nightly que pregunta a Stripe el estado real de cada suscripción activa
// en academy_memberships y desactiva las que ya no estén en estados saludables
// (active | trialing). Atrapa webhooks perdidos / endpoints mal configurados.
//
// Idempotente: si la membresía ya está en el estado correcto, no hace nada.
// Diseñado para correr vía pg_cron 1x/día (ver migración complementaria).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@20.1.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RECONCILE_SECRET = Deno.env.get('RECONCILE_SECRET') ?? '';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

interface Membership {
  id: string;
  user_id: string;
  space_id: string;
  is_active: boolean;
  stripe_subscription_id: string | null;
}

Deno.serve(async (req) => {
  // Solo se invoca desde pg_cron o /admin manual con un bearer secret.
  const authHeader = req.headers.get('Authorization') ?? '';
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!RECONCILE_SECRET || providedSecret !== RECONCILE_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'service_role_missing' }), { status: 500 });
  }
  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return new Response(JSON.stringify({ error: 'stripe_not_configured' }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Solo reconciliamos las que tienen sub_id (las manuales se ignoran).
  const { data: memberships, error } = await supabase
    .from('academy_memberships')
    .select('id, user_id, space_id, is_active, stripe_subscription_id')
    .not('stripe_subscription_id', 'is', null);

  if (error) {
    console.error('[reconcile] query failed', error);
    return new Response(JSON.stringify({ error: 'query_failed' }), { status: 500 });
  }

  const rows = (memberships ?? []) as Membership[];
  let activated = 0;
  let deactivated = 0;
  let skipped = 0;
  let errors = 0;

  for (const m of rows) {
    try {
      const sub = await stripe.subscriptions.retrieve(m.stripe_subscription_id!);
      const shouldBeActive = ACTIVE_STATUSES.has(sub.status);

      if (shouldBeActive === m.is_active) {
        skipped++;
        continue;
      }

      const { error: updErr } = await supabase
        .from('academy_memberships')
        .update({ is_active: shouldBeActive })
        .eq('id', m.id);

      if (updErr) {
        console.warn('[reconcile] update failed', m.id, updErr);
        errors++;
        continue;
      }

      if (shouldBeActive) activated++;
      else deactivated++;
    } catch (e: any) {
      // Suscripción ya no existe en Stripe → desactivar
      if (e?.code === 'resource_missing') {
        await supabase
          .from('academy_memberships')
          .update({ is_active: false })
          .eq('id', m.id);
        deactivated++;
        continue;
      }
      console.warn('[reconcile] stripe retrieve failed', m.id, e?.message);
      errors++;
    }
  }

  // Refrescar member_count de cada space afectado
  const affectedSpaces = [...new Set(rows.map((r) => r.space_id))];
  for (const sid of affectedSpaces) {
    await supabase.rpc('recompute_academy_space_member_count', { p_space_id: sid })
      .catch(() => {});
  }

  return new Response(
    JSON.stringify({
      checked: rows.length,
      activated,
      deactivated,
      skipped,
      errors,
      at: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
