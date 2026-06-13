// ============================================================
// Wompi adapter de PaymentGateway — STUB (S7)
//
// Implementación pendiente para S7 (Pasarelas LATAM).
// API: https://docs.wompi.co/docs/colombia/inicio/
//
// Wompi (Colombia) soporta: PSE, Nequi, tarjeta, Bancolombia.
// Suscripciones limitadas → solo one-time recurrente manual.
// Webhook: events.url con firma SHA256 del payload.
// ============================================================

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

export class WompiGateway implements PaymentGateway {
  readonly name: GatewayName = 'wompi';

  constructor(_privateKey: string, _eventsSecret: string) {
    // S7
  }

  createCourseCheckout(_params: CourseCheckoutParams): Promise<CheckoutResult> {
    throw new Error('wompi_not_implemented');
  }

  createSubscriptionCheckout(_params: SubscriptionCheckoutParams): Promise<CheckoutResult> {
    // Wompi no tiene suscripciones nativas — se simula con tokenización + cobros recurrentes desde KREOON.
    throw new Error('wompi_subscriptions_not_supported');
  }

  createPortal(_params: PortalParams): Promise<PortalResult> {
    throw new Error('wompi_no_portal');
  }

  verifyWebhook(_req: Request): Promise<WebhookVerifyResult> {
    throw new Error('wompi_not_implemented');
  }

  refund(_params: RefundParams): Promise<RefundResult> {
    throw new Error('wompi_not_implemented');
  }
}
