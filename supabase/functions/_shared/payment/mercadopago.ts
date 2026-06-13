// ============================================================
// Mercado Pago adapter de PaymentGateway — STUB (S7)
//
// Implementación pendiente para S7 (Pasarelas LATAM).
// API: https://www.mercadopago.com.co/developers/es/reference
//
// Suscripciones: usar "preapproval" API.
// One-time: usar "preference" API.
// Webhook: notification URL + IPN.
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

export class MercadoPagoGateway implements PaymentGateway {
  readonly name: GatewayName = 'mercadopago';

  constructor(_accessToken: string) {
    // S7: validar y guardar accessToken
  }

  createCourseCheckout(_params: CourseCheckoutParams): Promise<CheckoutResult> {
    throw new Error('mercadopago_not_implemented');
  }

  createSubscriptionCheckout(_params: SubscriptionCheckoutParams): Promise<CheckoutResult> {
    throw new Error('mercadopago_not_implemented');
  }

  createPortal(_params: PortalParams): Promise<PortalResult> {
    // MP no tiene equivalente exacto de "billing portal" — en S7 se redirige
    // a la página de gestión de suscripciones del usuario en MP.
    throw new Error('mercadopago_not_implemented');
  }

  verifyWebhook(_req: Request): Promise<WebhookVerifyResult> {
    throw new Error('mercadopago_not_implemented');
  }

  refund(_params: RefundParams): Promise<RefundResult> {
    throw new Error('mercadopago_not_implemented');
  }
}
