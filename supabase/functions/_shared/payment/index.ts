// ============================================================
// Payment Gateway Factory
//
// Uso desde un edge function:
//
//   import { getGateway } from '../_shared/payment/index.ts';
//   const gw = getGateway('stripe');
//   const { url } = await gw.createSubscriptionCheckout({ ... });
//
// La factory lee las API keys desde env vars del edge function.
// Cada gateway expone su nombre como `gw.name` para downstream switching.
// ============================================================

import { StripeGateway } from './stripe.ts';
import { MercadoPagoGateway } from './mercadopago.ts';
import { WompiGateway } from './wompi.ts';
import type { GatewayName, PaymentGateway } from './types.ts';

export * from './types.ts';

export function getGateway(name: GatewayName): PaymentGateway {
  switch (name) {
    case 'stripe': {
      const secret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
      const whSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
      return new StripeGateway(secret, whSecret);
    }
    case 'mercadopago': {
      const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '';
      return new MercadoPagoGateway(token);
    }
    case 'wompi': {
      const privateKey = Deno.env.get('WOMPI_PRIVATE_KEY') ?? '';
      const eventsSecret = Deno.env.get('WOMPI_EVENTS_SECRET') ?? '';
      return new WompiGateway(privateKey, eventsSecret);
    }
    default:
      throw new Error(`unknown_gateway:${name}`);
  }
}
