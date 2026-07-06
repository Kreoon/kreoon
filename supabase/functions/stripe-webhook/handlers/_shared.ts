// ============================================================================
// KREOON STRIPE WEBHOOK — Shared setup (cliente Stripe, env vars, RPC helper)
// Extraido de index.ts sin cambiar logica. Evita ciclo de imports entre
// index.ts y los handlers/*.ts.
// ============================================================================

import Stripe from "https://esm.sh/stripe@14.14.0";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

export const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
export const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fail-loud al arrancar si falta alguno de estos. Sin ellos, los RPCs
// SECURITY DEFINER fallarán con 401 unauthorized (caller_secret check)
// pero retornaríamos 200 al webhook, dejando la BD desincronizada sin
// que nadie se entere. Mejor que el container no arranque.
export const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
export const stripeSyncSecret = Deno.env.get("STRIPE_SYNC_SECRET");
if (!supabaseAnonKey) {
  throw new Error("[stripe-webhook] SUPABASE_ANON_KEY env var is required");
}
if (!stripeSyncSecret) {
  throw new Error("[stripe-webhook] STRIPE_SYNC_SECRET env var is required");
}

// Helper para llamar RPCs SECURITY DEFINER. Sortea el bug del SR key
// inyectado erráticamente en edge functions: con anon key + caller secret
// el escrito siempre llega a la BD.
//
// IMPORTANTE: tira excepción ante cualquier error. Los callers DEBEN dejar
// propagar el throw para que el webhook responda 5xx → Stripe reintenta
// con backoff. Tragar errores aquí causaría que la BD quede desincronizada
// silenciosamente mientras Stripe cree que todo está OK.
export async function callAcademyRpc(name: string, payload: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey!,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[webhook_rpc] ${name} failed ${res.status}`, text.slice(0, 300));
    throw new Error(`webhook_rpc_failed:${name}:${res.status}`);
  }
  return text ? JSON.parse(text) : null;
}
