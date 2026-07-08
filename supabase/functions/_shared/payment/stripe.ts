// ============================================================
// Stripe adapter de PaymentGateway
//
// Por ahora envuelve la lógica que ya existe en stripe-academy-*.
// La intención NO es reemplazar esos edge functions en S1 — es tener
// la interface lista para S7 cuando agreguemos Mercado Pago y Wompi.
//
// Cuando un edge function adopte este adapter:
//   import { getGateway } from '../_shared/payment/index.ts';
//   const gw = getGateway('stripe');
//   const { url } = await gw.createSubscriptionCheckout({ ... });
//
// SECURITY: TODO edge function que cree un checkout (Stripe, MP, Wompi)
// DEBE insertar previamente una fila en `academy_checkout_intents` con
// (reference, gateway, course_id, user_id, expected_amount_cents,
// currency). Los webhooks lookup por reference y rechazan si:
//   - El intent no existe (atacante con su propio checkout).
//   - El amount cobrado < expected_amount_cents.
//   - El intent ya está paid (anti-replay).
// Stripe usa `session.id` como reference; MP usa `external_reference`;
// Wompi usa el `reference` que pasamos al payment_link.
// ============================================================

import Stripe from 'npm:stripe@20.1.0';
import type {
  PaymentGateway,
  CourseCheckoutParams,
  SubscriptionCheckoutParams,
  CheckoutResult,
  PortalParams,
  PortalResult,
  WebhookVerifyResult,
  RefundParams,
  RefundResult,
  GatewayName,
} from './types.ts';

export class StripeGateway implements PaymentGateway {
  readonly name: GatewayName = 'stripe';
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    if (!secretKey) throw new Error('stripe_secret_missing');
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createCourseCheckout(params: CourseCheckoutParams): Promise<CheckoutResult> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: params.customer_email,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      metadata: params.metadata,
      line_items: params.items.map((item) => {
        if (item.external_price_id) {
          return { price: item.external_price_id, quantity: item.quantity };
        }
        return {
          price_data: {
            currency: item.currency.toLowerCase(),
            unit_amount: item.unit_amount,
            product_data: {
              name: item.name,
              description: item.description,
              images: item.image_url ? [item.image_url] : undefined,
            },
          },
          quantity: item.quantity,
        };
      }),
    };

    if (params.destination_account_id && params.application_fee_percent != null) {
      // Para one-time charges: payment_intent_data con transfer_data + application_fee_amount
      // Calculamos application_fee_amount sobre el total
      const total = params.items.reduce((sum, i) => sum + i.unit_amount * i.quantity, 0);
      const feeAmount = Math.round((total * params.application_fee_percent) / 100);
      sessionParams.payment_intent_data = {
        application_fee_amount: feeAmount,
        transfer_data: { destination: params.destination_account_id },
      };
    }

    if (params.coupon) {
      const coupon = await this.stripe.coupons.create({
        ...(params.coupon.percent_off
          ? { percent_off: params.coupon.percent_off }
          : { amount_off: params.coupon.amount_off, currency: (params.coupon.currency ?? 'USD').toLowerCase() }),
        duration: 'once',
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return { url: session.url ?? '', session_id: session.id };
  }

  async createSubscriptionCheckout(params: SubscriptionCheckoutParams): Promise<CheckoutResult> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: params.customer_email,
      success_url: params.success_url,
      cancel_url: params.cancel_url,
      metadata: params.metadata,
      line_items: [{ price: params.price_external_id, quantity: 1 }],
      subscription_data: {
        metadata: params.metadata,
        ...(params.trial_days ? { trial_period_days: params.trial_days } : {}),
      },
    };

    if (params.destination_account_id && params.application_fee_percent != null) {
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        application_fee_percent: params.application_fee_percent,
        transfer_data: { destination: params.destination_account_id },
      };
    }

    if (params.coupon) {
      const coupon = await this.stripe.coupons.create({
        ...(params.coupon.percent_off
          ? { percent_off: params.coupon.percent_off }
          : { amount_off: params.coupon.amount_off, currency: (params.coupon.currency ?? 'USD').toLowerCase() }),
        duration: 'once',
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return { url: session.url ?? '', session_id: session.id };
  }

  async createPortal(params: PortalParams): Promise<PortalResult> {
    const portal = await this.stripe.billingPortal.sessions.create({
      customer: params.customer_id,
      return_url: params.return_url,
    });
    return { url: portal.url };
  }

  async verifyWebhook(req: Request): Promise<WebhookVerifyResult> {
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('missing_stripe_signature');
    const body = await req.text();
    const event = await this.stripe.webhooks.constructEventAsync(body, signature, this.webhookSecret);

    // Extract common fields for downstream handlers
    const obj = event.data.object as Record<string, unknown>;
    return {
      event_type: `stripe.${event.type}`,
      raw_event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      session_id: typeof obj.id === 'string' && event.type.startsWith('checkout.session') ? obj.id : undefined,
      subscription_id: typeof obj.subscription === 'string' ? obj.subscription : undefined,
      customer_id: typeof obj.customer === 'string' ? obj.customer : undefined,
      amount: typeof obj.amount_total === 'number' ? obj.amount_total : undefined,
      currency: typeof obj.currency === 'string' ? (obj.currency.toUpperCase() as WebhookVerifyResult['currency']) : undefined,
      status: typeof obj.status === 'string' ? obj.status : undefined,
      metadata: (obj.metadata as Record<string, string>) ?? undefined,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const refund = await this.stripe.refunds.create({
      charge: params.charge_id,
      ...(params.amount ? { amount: params.amount } : {}),
      ...(params.reason ? { reason: params.reason as Stripe.RefundCreateParams.Reason } : {}),
    });
    return { refund_id: refund.id, status: refund.status ?? 'unknown' };
  }
}
