// ============================================================
// Wompi (Colombia) adapter de PaymentGateway
//
// Docs: https://docs.wompi.co/docs/colombia/inicio/
//
// One-time → Widget URL con `transaction_amount` + `currency=COP`.
// Recurrente → NO nativo. Stub que tira `wompi_subscriptions_not_supported`.
// Webhook → POST con header X-Event firmado SHA256(payload + integrity_secret).
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

const WOMPI_API = 'https://production.wompi.co/v1';

export class WompiGateway implements PaymentGateway {
  readonly name: GatewayName = 'wompi';
  private privateKey: string;
  private eventsSecret: string;

  constructor(privateKey: string, eventsSecret: string) {
    if (!privateKey) throw new Error('wompi_private_key_missing');
    this.privateKey = privateKey;
    this.eventsSecret = eventsSecret;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.privateKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createCourseCheckout(params: CourseCheckoutParams): Promise<CheckoutResult> {
    // Wompi requiere monto en centavos. COP es la moneda principal.
    const total = params.items.reduce((sum, i) => sum + i.unit_amount * i.quantity, 0);
    const reference = params.metadata?.session_ref ?? `kreoon_${crypto.randomUUID()}`;

    // Generamos un transaction link
    const body = {
      name: params.items[0]?.name ?? 'Curso',
      description: params.items.map((i) => i.name).join(', ').slice(0, 250),
      single_use: true,
      collect_shipping: false,
      currency: 'COP',
      amount_in_cents: total,
      customer_data: params.customer_email
        ? { email: params.customer_email }
        : undefined,
      redirect_url: params.success_url,
    };

    const res = await fetch(`${WOMPI_API}/payment_links`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[wompi] createCourseCheckout failed', res.status, text);
      throw new Error(`wompi_checkout_failed:${res.status}`);
    }

    const data = await res.json();
    const linkId = data?.data?.id;
    return {
      url: `https://checkout.wompi.co/l/${linkId}`,
      session_id: linkId,
    };
  }

  createSubscriptionCheckout(_params: SubscriptionCheckoutParams): Promise<CheckoutResult> {
    return Promise.reject(new Error('wompi_subscriptions_not_supported'));
  }

  createPortal(_params: PortalParams): Promise<PortalResult> {
    return Promise.reject(new Error('wompi_no_portal'));
  }

  async verifyWebhook(req: Request): Promise<WebhookVerifyResult> {
    const rawBody = await req.text();
    const evt = JSON.parse(rawBody);
    const eventType = evt?.event ?? 'transaction.updated';

    // Verificación de integridad: SHA256(data.transaction.id + data.transaction.status + data.transaction.amount_in_cents + timestamp + events_secret)
    const tx = evt?.data?.transaction;
    if (!tx) throw new Error('wompi_webhook_no_transaction');

    const expectedSig = await sha256Hex(
      `${tx.id}${tx.status}${tx.amount_in_cents}${evt.timestamp}${this.eventsSecret}`,
    );
    const providedSig = evt?.signature?.checksum;
    if (expectedSig.toUpperCase() !== String(providedSig ?? '').toUpperCase()) {
      throw new Error('wompi_webhook_signature_mismatch');
    }

    return {
      event_type: `wompi.${eventType}`,
      raw_event_type: eventType,
      payload: evt,
      session_id: tx.reference,
      customer_id: tx.customer_email,
      amount: tx.amount_in_cents,
      currency: tx.currency,
      status: tx.status,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const res = await fetch(`${WOMPI_API}/transactions/${params.charge_id}/void`, {
      method: 'POST',
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`wompi_refund_failed:${res.status}`);
    const data = await res.json();
    return { refund_id: data?.data?.id ?? params.charge_id, status: 'voided' };
  }
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
