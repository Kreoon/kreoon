// ============================================================
// STRIPE CONNECT — Create account (if not exists) + Onboard link
// ============================================================
//
// Esta edge function combina dos pasos del flujo de Connect V2:
//
//   1. Crea una `connected account` para el usuario si todavía no
//      tiene una asociada (1 cuenta Connect por user, aunque sea
//      owner de varias academias).
//   2. Genera un Account Link V2 (use_case: account_onboarding) y
//      devuelve la URL hosteada por Stripe a la que el owner debe
//      ir a completar su KYC y conectar su banco.
//
// El owner llega desde el panel admin de su academia con el JWT
// de su sesión Supabase. Validamos que sea owner de ALGUNA academia
// (no exigimos space_id específico porque la cuenta es por user).
//
// La URL del link es de un solo uso. Por eso siempre creamos uno
// nuevo en cada click del owner ("Conectar mi cuenta" / "Continuar
// onboarding").
//
// === ENV VARS REQUERIDAS ===
//   STRIPE_SECRET_KEY    Stripe secret key (modo TEST o LIVE).
//   FRONTEND_URL         Dominio público de KREOON (ej: https://kreoon.com).
//   SUPABASE_URL         Auto-inyectado por el runtime de edge functions.
//   SUPABASE_ANON_KEY    Auto-inyectado. Usado para auth.getUser(jwt).
//   STRIPE_SYNC_SECRET   Compartido con vault.stripe_sync_secret; pasamos
//                        este valor a los RPCs SECURITY DEFINER para
//                        que validen al caller.
// ============================================================

// Importamos via npm: specifier (recomendación oficial de stripe-node para Deno).
// esm.sh con target=deno re-empaqueta el módulo y rompía v2.core.accounts.create.
import Stripe from 'npm:stripe@20.1.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';

// La SDK toma la API preview activa automáticamente cuando no fijamos
// apiVersion. Así soportamos la versión latest (2026-05-27.dahlia) sin
// re-deployar cada vez que Stripe la actualice.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const STRIPE_SYNC_SECRET = Deno.env.get('STRIPE_SYNC_SECRET') ?? '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'https://kreoon.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  // Validación de env vars: si falta alguno, retornamos un error explícito
  // (no inventamos defaults silenciosos).
  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return corsJsonResponse(req, { error: 'stripe_not_configured' }, 500);
  }
  if (!STRIPE_SYNC_SECRET) {
    return corsJsonResponse(req, { error: 'sync_secret_not_configured' }, 500);
  }

  try {
    // ─── 1. Autenticación: tomamos el user del JWT entrante. ───
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return corsJsonResponse(req, { error: 'unauthorized' }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return corsJsonResponse(req, { error: 'unauthorized' }, 401);
    const user = userData.user;

    // Body opcional:
    //   - space_slug: para redirigir al admin de su academia tras onboarding.
    //   - return_origin: origin del frontend que inició la request (ej.
    //     "http://localhost:8080" o "https://kreoon.com"). Si está,
    //     tiene prioridad sobre la env var FRONTEND_URL — así el user
    //     siempre vuelve al mismo dominio del que partió.
    const body = await req.json().catch(() => ({})) as {
      space_slug?: string;
      return_origin?: string;
    };
    const spaceSlug = body.space_slug ?? null;
    // Validación del origin contra una allowlist explícita.
    // Sin esto un atacante podría usar la edge function como open redirect
    // (Stripe Account Link permite redirigir a la return_url sin más
    // validación). Por eso NO aceptamos wildcards de tenants compartidos
    // como `*.vercel.app` o `*.lovable.app` — cualquiera con un proyecto
    // ahí podría hostear un dominio que pase el check.
    const ALLOWED_HOSTS = new Set<string>([
      'localhost',
      '127.0.0.1',
      'kreoon.com',
      'www.kreoon.com',
    ]);
    let originBase = FRONTEND_URL;
    if (body.return_origin) {
      try {
        const u = new URL(body.return_origin);
        if (
          (u.protocol === 'http:' || u.protocol === 'https:') &&
          ALLOWED_HOSTS.has(u.hostname)
        ) {
          originBase = `${u.protocol}//${u.host}`;
        }
      } catch {
        // Origin inválido — caemos a FRONTEND_URL.
      }
    }

    // ─── 2. ¿Ya existe una cuenta Connect para este user? ───
    // Hacemos lookup directo en la tabla (RLS permite al user leer
    // su propio registro).
    const { data: existing } = await authClient
      .from('stripe_connected_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id as string | undefined;

    // ─── 3. Si no existe, la creamos con la V2 API. ───
    // Reglas del platform (definidas por el spec del usuario):
    //   - dashboard: 'express'  → el owner accede a un dashboard hosteado.
    //   - fees_collector: 'application'   → KREOON cobra los fees de Stripe.
    //   - losses_collector: 'application' → KREOON asume las pérdidas (disputes).
    //   - capability stripe_balance.stripe_transfers: para recibir destination charges.
    if (!accountId) {
      // País por defecto = 'US'.
      //
      // ⚠️ Limitación de Stripe Connect: el modelo de "destination charges"
      // que usamos (capability `stripe_balance.stripe_transfers`) NO está
      // disponible en Colombia ni en la mayoría de LATAM. Para que el
      // onboarding no falle con `capability_not_available_in_country`,
      // creamos las cuentas como US por defecto.
      //
      // Para soportar owners colombianos/LATAM en producción habrá que
      // migrar a "direct charges" (Products/Prices y la session en la
      // cuenta del owner, application_fee_amount cobrado al cargo).
      const SUPPORTED_COUNTRIES = new Set([
        'US', 'CA', 'GB', 'AU', 'NZ',
        'AT', 'BE', 'DE', 'DK', 'ES', 'FI', 'FR', 'IE', 'IT', 'LU',
        'NL', 'NO', 'PT', 'SE', 'CH',
        'JP', 'SG', 'HK',
      ]);
      const { data: profile } = await authClient
        .from('profiles')
        .select('country, full_name')
        .eq('id', user.id)
        .maybeSingle();
      const rawCountry = (profile?.country as string | undefined)?.toUpperCase();
      const country = rawCountry && SUPPORTED_COUNTRIES.has(rawCountry)
        ? rawCountry
        : 'US';
      const displayName = (profile?.full_name as string | undefined) || user.email || `KREOON ${user.id.slice(0, 8)}`;

      // En Colombia (y varios países LATAM) Stripe exige que el `merchant`
      // tenga la capability `card_payments` activa antes de habilitar
      // `recipient.stripe_balance.stripe_transfers`. Lo pedimos siempre —
      // es backward-compatible con los demás países y con el modelo de
      // destination charges (KREOON cobra, el owner recibe).
      const account = await stripe.v2.core.accounts.create({
        display_name: displayName,
        contact_email: user.email ?? undefined,
        identity: {
          country,
        },
        dashboard: 'express',
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
      });

      accountId = account.id;

      // Persistimos el mapping vía RPC SECURITY DEFINER (la tabla no
      // permite INSERT directo desde el cliente — solo el RPC valida
      // formato `acct_*` y hace upsert).
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_stripe_connect_account`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_caller_secret: STRIPE_SYNC_SECRET,
          p_user_id: user.id,
          p_stripe_account_id: accountId,
        }),
      });
      if (!rpcRes.ok) {
        const txt = await rpcRes.text();
        throw new Error(`rpc upsert_stripe_connect_account failed: ${txt.slice(0, 200)}`);
      }
    }

    // ─── 4. URLs de retorno y refresh. ───
    // Usamos `originBase` (origin del frontend) en lugar de FRONTEND_URL
    // para que el user vuelva al mismo dominio (localhost en dev,
    // kreoon.com en prod) sin importar cómo esté configurado el secret.
    const returnUrl = spaceSlug
      ? `${originBase}/academia/${spaceSlug}/admin?stripe_connect=done`
      : `${originBase}/settings?section=profile&stripe_connect=done`;
    const refreshUrl = spaceSlug
      ? `${originBase}/academia/${spaceSlug}/admin?stripe_connect=refresh`
      : `${originBase}/settings?section=profile&stripe_connect=refresh`;

    // ─── 5. Generamos el Account Link V2 de onboarding. ───
    // Incluimos `merchant` además de `recipient` para que el onboarding
    // recolecte también la info de comerciante exigida por Stripe en CO.
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          configurations: ['recipient', 'merchant'],
          refresh_url: refreshUrl,
          return_url: returnUrl,
        },
      },
    });

    return corsJsonResponse(req, {
      account_id: accountId,
      url: accountLink.url,
    });
  } catch (err: any) {
    // Logueamos en detalle: type, code, raw del error de Stripe + stack.
    console.error('stripe-connect-account-link error', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      param: err?.param,
      requestId: err?.requestId,
      statusCode: err?.statusCode,
      raw: err?.raw,
      stack: err?.stack,
    });
    return new Response(JSON.stringify({
      error: err?.message ?? 'internal_error',
      stripe_type: err?.type ?? null,
      stripe_code: err?.code ?? null,
      stripe_param: err?.param ?? null,
    }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
