// ============================================================
// STRIPE CONNECT — Webhook V2 (thin events).
// ============================================================
//
// Stripe envía notifications "thin" sobre cambios en la cuenta del
// owner (KYC verificado, capability activada, requirements nuevos).
// Esta función las parsea y resuelve el `fetchEvent()` cuando necesita
// el payload completo.
//
// En esta integración NO cacheamos status en DB: el panel admin del
// owner siempre lo consulta vía `stripe-connect-account-status`. El
// webhook está aquí para:
//   - dejar la pista en logs cuando una cuenta queda lista para cobrar
//   - permitir extensiones futuras (notificaciones, alertas, etc.)
//
// === ENV VARS REQUERIDAS ===
//   STRIPE_SECRET_KEY               Stripe SDK
//   STRIPE_CONNECT_WEBHOOK_SECRET   "whsec_..." del Endpoint dedicado a
//                                   Connect (DISTINTO del webhook de
//                                   pagos). Configurarlo en Dashboard →
//                                   Webhooks → Add destination → Events
//                                   from "Connected accounts" → Thin
//                                   payload → v2.account[requirements].updated
//                                   y v2.account[recipient].capability_status_updated.
// ============================================================

import Stripe from 'https://esm.sh/stripe@20.1.0?target=deno';
import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '');
const WEBHOOK_SECRET = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req);

  if (!WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'connect_webhook_secret_not_configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let eventNotif: any;
  try {
    // parseEventNotification es el método nuevo para thin events V2.
    // Verifica firma + devuelve un objeto con `type`, `fetchEvent()`,
    // `fetchRelatedObject()`.
    eventNotif = (stripe as any).parseEventNotification(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.warn('stripe-connect-webhook signature verification failed:', err?.message ?? err);
    return new Response(JSON.stringify({ error: 'signature_verification_failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (eventNotif.type) {
      case 'v2.core.account.requirements_updated':
      case 'v2.account[requirements].updated': {
        // El thin event solo trae el id. fetchRelatedObject() trae el
        // account completo con sus requirements.
        const related = await eventNotif.fetchRelatedObject();
        const accountId = related?.id ?? '(unknown)';
        const summaryStatus =
          related?.requirements?.summary?.minimum_deadline?.status ?? '(none)';
        console.log(
          `[connect-webhook] requirements_updated: account=${accountId} status=${summaryStatus}`
        );
        break;
      }

      case 'v2.core.account.capability_status_updated':
      case 'v2.account[recipient].capability_status_updated': {
        const related = await eventNotif.fetchRelatedObject();
        const accountId = related?.id ?? '(unknown)';
        const transfersStatus =
          related?.configuration?.recipient?.capabilities?.stripe_balance
            ?.stripe_transfers?.status ?? '(none)';
        console.log(
          `[connect-webhook] capability_status_updated: account=${accountId} stripe_transfers=${transfersStatus}`
        );
        break;
      }

      default:
        console.log(`[connect-webhook] unhandled event type: ${eventNotif.type}`);
    }
  } catch (err: any) {
    console.error('stripe-connect-webhook handler error', err);
    // No respondemos 5xx al webhook (Stripe re-intentaría). El error
    // ya quedó loggeado para investigar más tarde.
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
  });
});
