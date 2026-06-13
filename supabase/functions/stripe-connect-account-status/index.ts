// ============================================================
// STRIPE CONNECT — Status del onboarding del owner.
// ============================================================
//
// Devuelve el estado actual de la cuenta Connect del owner (siempre
// fetcheado desde la API de Stripe, NUNCA cacheado en DB — para que
// los cambios remotos de Stripe se reflejen inmediatamente al
// refrescar la UI del panel admin).
//
// Respuesta:
//   {
//     has_account: boolean,
//     account_id: string | null,
//     onboarding_complete: boolean,
//     ready_to_receive_payments: boolean,
//     requirements_currently_due: string[],
//     dashboard_link: string | null  // login link al Express dashboard
//   }
// ============================================================

import Stripe from 'npm:stripe@20.1.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);

    // Lookup del mapping en DB (RLS deja al user leer su propio row).
    const { data: row } = await authClient
      .from('stripe_connected_accounts')
      .select('stripe_account_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const accountId = (row as any)?.stripe_account_id as string | undefined;

    if (!accountId) {
      return corsJsonResponse(req, {
        has_account: false,
        account_id: null,
        onboarding_complete: false,
        ready_to_receive_payments: false,
        requirements_currently_due: [],
        dashboard_link: null,
      });
    }

    // Fetch account de Stripe con los includes necesarios.
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.recipient', 'requirements'],
    });

    // Capability stripe_transfers debe estar activa para recibir
    // destination charges.
    const readyToReceivePayments =
      (account as any)?.configuration?.recipient?.capabilities?.stripe_balance
        ?.stripe_transfers?.status === 'active';

    // El onboarding está completo cuando no hay requirements
    // currently_due ni past_due (puede haber `eventually_due` que son
    // para más adelante y no bloquean cobros).
    const summaryStatus =
      (account as any)?.requirements?.summary?.minimum_deadline?.status;
    const onboardingComplete =
      summaryStatus !== 'currently_due' && summaryStatus !== 'past_due';

    // Requirements concretos pendientes (para mostrar al user qué falta).
    const entries = ((account as any)?.requirements?.entries ?? []) as Array<{
      requirement?: string;
      status?: string;
    }>;
    const requirementsCurrentlyDue = entries
      .filter((e) => e.status === 'currently_due' || e.status === 'past_due')
      .map((e) => e.requirement ?? 'unknown')
      .slice(0, 12);

    // Login link al Express dashboard del owner (V1 API, sigue siendo
    // el endpoint correcto para Express + V2 accounts).
    let dashboardLink: string | null = null;
    try {
      const loginLink = await (stripe.accounts as any).createLoginLink(accountId);
      dashboardLink = loginLink?.url ?? null;
    } catch (e) {
      // Si la cuenta aún no completó onboarding, createLoginLink falla.
      // Es esperado — devolvemos null sin romper la respuesta.
      console.warn('login link skipped:', (e as any)?.message ?? e);
    }

    return corsJsonResponse(req, {
      has_account: true,
      account_id: accountId,
      onboarding_complete: onboardingComplete,
      ready_to_receive_payments: readyToReceivePayments,
      requirements_currently_due: requirementsCurrentlyDue,
      dashboard_link: dashboardLink,
    });
  } catch (err: any) {
    console.error('stripe-connect-account-status error', err);
    return corsJsonResponse(req, { error: err?.message ?? 'internal_error' }, 500);
  }
});
