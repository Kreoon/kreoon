// ============================================================================
// STRIPE RECONCILE — ACADEMY SUBSCRIPTIONS
//
// Pregunta a Stripe el estado real de cada subscription_id en
// academy_memberships y desactiva las que no estén en active/trialing.
// Atrapa webhooks perdidos / endpoints mal configurados.
//
// Lecturas/escrituras vía RPC SECURITY DEFINER porque SUPABASE_SERVICE_ROLE_KEY
// no se inyecta confiablemente en edge functions con npm: imports.
// ============================================================================

import Stripe from 'npm:stripe@20.1.0';

// Fail-loud si falta cualquier secret. Mejor crashear el container que
// procesar requests con strings vacíos que silenciosamente fallarían
// el caller_secret check de los RPCs.
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const STRIPE_SYNC_SECRET = Deno.env.get('STRIPE_SYNC_SECRET');
const RECONCILE_SECRET = Deno.env.get('RECONCILE_SECRET');
for (const [k, v] of Object.entries({
  STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SYNC_SECRET, RECONCILE_SECRET,
})) {
  if (!v) throw new Error(`[stripe-reconcile] ${k} env var is required`);
}
const stripe = new Stripe(STRIPE_SECRET_KEY!);

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

interface Membership {
  id: string;
  user_id: string;
  space_id: string;
  is_active: boolean;
  stripe_subscription_id: string;
}

async function callRpc<T>(name: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[callRpc]', name, res.status, text.slice(0, 500));
    throw new Error(`rpc_failed:${name}`);
  }
  return text ? (JSON.parse(text) as T) : (null as unknown as T);
}

Deno.serve(async (req) => {
  // Auth: solo se invoca con bearer secret.
  const authHeader = req.headers.get('Authorization') ?? '';
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!RECONCILE_SECRET || providedSecret !== RECONCILE_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return new Response(JSON.stringify({ error: 'stripe_not_configured' }), { status: 500 });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !STRIPE_SYNC_SECRET) {
    return new Response(JSON.stringify({ error: 'supabase_env_missing' }), { status: 500 });
  }

  let memberships: Membership[];
  try {
    memberships = await callRpc<Membership[]>('list_subs_to_reconcile', {
      p_caller_secret: STRIPE_SYNC_SECRET,
    });
  } catch (e: any) {
    console.error('[reconcile] list rpc failed', e?.message);
    return new Response(JSON.stringify({ error: 'list_failed' }), { status: 500 });
  }

  let activated = 0;
  let deactivated = 0;
  let skipped = 0;
  let errors = 0;

  for (const m of memberships ?? []) {
    try {
      const sub = await stripe.subscriptions.retrieve(m.stripe_subscription_id);
      const shouldBeActive = ACTIVE_STATUSES.has(sub.status);

      if (shouldBeActive === m.is_active) {
        skipped++;
        continue;
      }

      await callRpc<void>('apply_reconcile_result', {
        p_caller_secret: STRIPE_SYNC_SECRET,
        p_membership_id: m.id,
        p_should_be_active: shouldBeActive,
      });

      if (shouldBeActive) activated++;
      else deactivated++;
    } catch (e: any) {
      if (e?.code === 'resource_missing') {
        try {
          await callRpc<void>('apply_reconcile_result', {
            p_caller_secret: STRIPE_SYNC_SECRET,
            p_membership_id: m.id,
            p_should_be_active: false,
          });
          deactivated++;
          continue;
        } catch (e2: any) {
          console.warn('[reconcile] apply_reconcile (missing) failed', m.id, e2?.message);
        }
      }
      console.warn('[reconcile] stripe retrieve failed', m.id, e?.message);
      errors++;
    }
  }

  return new Response(
    JSON.stringify({
      checked: (memberships ?? []).length,
      activated,
      deactivated,
      skipped,
      errors,
      at: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
