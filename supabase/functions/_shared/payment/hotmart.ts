// ============================================================
// Hotmart adapter de PaymentGateway
//
// Modelo distinto al de Stripe/MP/Wompi:
//   - Hotmart es Merchant of Record (MoR).
//   - Productos viven en el dashboard de Hotmart, no en KREOON.
//   - NO hay API para crear "checkout sessions" programáticamente:
//     el creator crea el producto en Hotmart y el buyer compra en su
//     URL pre-existente (pay.hotmart.com/<productCode>).
//   - Co-producción nativa: KREOON se invita como co-productor con un
//     % y Hotmart hace el split automático cada venta. KREOON nunca
//     toca el dinero.
//
// Por eso este adapter:
//   - createCourseCheckout → throws hotmart_requires_redirect. La UI
//     debe llamar al edge function `academy-hotmart-redirect` que
//     usa el método específico `getRedirectUrl()`.
//   - createSubscriptionCheckout → idem (suscripción es solo product
//     flag en Hotmart, mismo flujo).
//   - verifyWebhook → valida el Hottok del productor (header
//     `x-hotmart-hottok`) contra la fila en
//     academy_hotmart_coproductions.
//   - refund → llamada a Hotmart Sales API si tenemos token; por
//     defecto throw not_supported (refunds suelen iniciarse desde
//     el dashboard del productor o por soporte Hotmart).
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
  Currency,
} from './types.ts';

const HOTMART_API = 'https://developers.hotmart.com';
const HOTMART_PAY_BASE = 'https://pay.hotmart.com';

export interface HotmartRedirectParams {
  product_code: string;        // ej "A12345678" (visible en URL Hotmart)
  offer_code?: string;          // offer code opcional (?off=)
  buyer_email?: string;         // pre-fill (?email=)
  tracking_code: string;        // sck — atado a academy_checkout_intents
}

export class HotmartGateway implements PaymentGateway {
  readonly name: GatewayName = 'hotmart';

  // Webhooks de Hotmart no usan secret global: cada productor tiene su
  // propio Hottok configurable. La validación se hace contra DB en el
  // handler del webhook (academy_hotmart_coproductions.producer_hottok).
  constructor() {}

  createCourseCheckout(_params: CourseCheckoutParams): Promise<CheckoutResult> {
    return Promise.reject(new Error('hotmart_requires_redirect'));
  }

  createSubscriptionCheckout(_params: SubscriptionCheckoutParams): Promise<CheckoutResult> {
    return Promise.reject(new Error('hotmart_requires_redirect'));
  }

  createPortal(_params: PortalParams): Promise<PortalResult> {
    // Buyers gestionan suscripciones desde https://app-vlc.hotmart.com/tools/subscriptions
    return Promise.resolve({ url: 'https://app-vlc.hotmart.com/tools/subscriptions' });
  }

  /**
   * Construye la URL de checkout de Hotmart con tracking.
   * Patrón: https://pay.hotmart.com/{product_code}?off={offer_code}&sck={tracking}&email={email}
   *
   * El parámetro `sck` (source code) llega de vuelta en el webhook
   * dentro de `purchase.tracking.source` o `purchase.tracking.source_sck`,
   * permitiendo correlacionar la compra con nuestro
   * academy_checkout_intent.
   */
  getRedirectUrl(params: HotmartRedirectParams): string {
    const url = new URL(`${HOTMART_PAY_BASE}/${params.product_code}`);
    if (params.offer_code) url.searchParams.set('off', params.offer_code);
    if (params.tracking_code) url.searchParams.set('sck', params.tracking_code);
    if (params.buyer_email) url.searchParams.set('email', params.buyer_email);
    return url.toString();
  }

  /**
   * Valida el Hottok del header y devuelve el evento normalizado.
   * IMPORTANT: la firma se valida contra DB en el HANDLER del webhook
   * (no aquí), porque cada producto tiene su Hottok diferente y
   * necesitamos lookup por product_id.
   *
   * Este método solo parsea el evento y deja la validación al caller.
   */
  async verifyWebhook(req: Request): Promise<WebhookVerifyResult> {
    const body = await req.json();

    // Hotmart envía formato:
    //  { id, creation_date, event, version, data: { ... } }
    // event ∈ { PURCHASE_APPROVED, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK,
    //          PURCHASE_COMPLETE, PURCHASE_PROTEST, PURCHASE_CANCELED,
    //          PURCHASE_EXPIRED, PURCHASE_OUT_OF_SHOPPING_CART,
    //          PURCHASE_DELAYED, PURCHASE_BILLET_PRINTED,
    //          SUBSCRIPTION_CANCELLATION, SWITCH_PLAN, UPDATE_SUBSCRIPTION_CHARGE_DATE }
    const eventType = String(body?.event ?? 'unknown');
    const data = body?.data ?? {};
    const purchase = data?.purchase ?? {};
    const product = data?.product ?? {};
    const buyer = data?.buyer ?? {};
    const subscription = data?.subscription ?? {};

    return {
      event_type: `hotmart.${eventType}`,
      raw_event_type: eventType,
      payload: body,
      session_id: purchase?.tracking?.source_sck ?? purchase?.tracking?.source ?? undefined,
      subscription_id: subscription?.subscriber?.code ?? undefined,
      customer_id: buyer?.email ?? undefined,
      amount: typeof purchase?.price?.value === 'number'
        ? Math.round(purchase.price.value * 100)
        : undefined,
      currency: (purchase?.price?.currency_value ?? purchase?.price?.currency) as Currency | undefined,
      status: purchase?.status ?? subscription?.status,
      metadata: {
        product_id: String(product?.id ?? ''),
        product_ucode: String(product?.ucode ?? ''),
        hottok: String(req.headers.get('x-hotmart-hottok') ?? ''),
        buyer_email: String(buyer?.email ?? ''),
        buyer_name: String(buyer?.name ?? ''),
      },
    };
  }

  async refund(_params: RefundParams): Promise<RefundResult> {
    // Refund vía API requiere OAuth token y consulta /payments/api/v1/refunds.
    // En MVP no exponemos refund programmático desde KREOON — los refunds
    // se inician desde el dashboard del productor.
    throw new Error('hotmart_refund_via_dashboard');
  }
}
