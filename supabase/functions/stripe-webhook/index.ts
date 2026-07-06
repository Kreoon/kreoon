// ============================================================================
// KREOON STRIPE WEBHOOK HANDLER
// Edge Function para procesar eventos de Stripe
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { stripe, supabaseUrl, supabaseServiceKey } from "./handlers/_shared.ts";
import { handleSubscriptionChange, handleSubscriptionCancelled } from "./handlers/subscriptions.ts";
import {
  handleInvoicePaid,
  handleInvoiceFailed,
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
} from "./handlers/payments.ts";
import {
  handleConnectAccountUpdated,
  handlePayoutCompleted,
  handlePayoutFailed,
  handleConnectAccountDeauthorized,
} from "./handlers/connect.ts";
import { handleRefund } from "./handlers/refunds.ts";
import {
  handleAcademyCoursePurchase,
  handleAcademyMembershipFromSubscription,
  handleAcademyMembershipPurchase,
  syncAcademyMembershipStatus,
  handleAcademyInvoiceFailed,
  handleAcademyChargeRefunded,
  handleAcademyCustomerDeleted,
} from "./handlers/academy.ts";
import {
  handleOrgAccessPurchase,
  handleClientPackagePaymentCompleted,
  handleManagedCampaignPaymentCompleted,
  handleCreatorHirePaymentCompleted,
} from "./handlers/marketplace.ts";
import { handleCampaignCheckoutCompleted } from "./handlers/campaigns.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  const corsHeaders = { ...getCorsHeaders(req), "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature" };

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response(
      JSON.stringify({ error: "Missing signature or webhook secret" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      // ========================================
      // SUSCRIPCIONES
      // ========================================

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        // Si es suscripción a una academia: además de crear la
        // membresía si falta, sincronizamos su estado activo según
        // el status real de Stripe (past_due, paused, etc → inactivo).
        if ((subscription.metadata as any)?.type === "academy_membership_subscription") {
          await handleAcademyMembershipFromSubscription(supabase, subscription);
          await syncAcademyMembershipStatus(supabase, subscription);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await handleInvoicePaid(supabase, invoice);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceFailed(supabase, invoice);
        await handleAcademyInvoiceFailed(supabase, invoice);
        break;
      }

      // ========================================
      // PAGOS ÚNICOS (Escrow, Tokens)
      // ========================================

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[checkout.session.completed]', {
          session_id: session.id,
          mode: session.mode,
          payment_status: session.payment_status,
          metadata: session.metadata,
          customer: session.customer,
          subscription: session.subscription,
          amount_total: session.amount_total,
        });
        if (session.metadata?.type?.startsWith("campaign_")) {
          await handleCampaignCheckoutCompleted(supabase, session);
        } else if (session.metadata?.type === "client_package_payment") {
          await handleClientPackagePaymentCompleted(supabase, session);
        } else if (session.metadata?.type === "managed_campaign_payment") {
          await handleManagedCampaignPaymentCompleted(supabase, session);
        } else if (session.metadata?.type === "creator_hire_payment") {
          await handleCreatorHirePaymentCompleted(supabase, session);
        } else if (session.metadata?.type === "academy_course_purchase") {
          await handleAcademyCoursePurchase(supabase, session);
        } else if (session.metadata?.type === "academy_membership_subscription") {
          await handleAcademyMembershipPurchase(supabase, session);
        } else if (session.metadata?.type === "org_access_purchase") {
          await handleOrgAccessPurchase(supabase, session);
        } else {
          console.warn('[checkout.session.completed] unhandled metadata.type', session.metadata?.type);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(supabase, paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(supabase, paymentIntent);
        break;
      }

      // ========================================
      // STRIPE CONNECT (Payouts)
      // ========================================

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleConnectAccountUpdated(supabase, account);
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutCompleted(supabase, payout);
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        await handlePayoutFailed(supabase, payout);
        break;
      }

      // ========================================
      // REFUNDS
      // ========================================

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(supabase, charge);
        await handleAcademyChargeRefunded(supabase, charge);
        break;
      }

      // Owner desautoriza su cuenta Connect desde Stripe Dashboard.
      // Limpiamos el mapping para que el código caiga a "modo central".
      case "account.application.deauthorized": {
        const account = event.data.object as Stripe.Account;
        await handleConnectAccountDeauthorized(supabase, account);
        break;
      }

      // Customer eliminado en Stripe (caso raro, solo si lo borran
      // a mano). Limpiamos referencias en academy_memberships.
      case "customer.deleted": {
        const customer = event.data.object as Stripe.Customer;
        await handleAcademyCustomerDeleted(supabase, customer);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true, type: event.type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
