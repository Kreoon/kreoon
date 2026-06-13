// ============================================================
// Mercado Pago adapter de PaymentGateway
//
// Docs: https://www.mercadopago.com.co/developers/es/reference
//
// One-time → Preferences API (POST /checkout/preferences).
// Recurrente → Preapproval API (POST /preapproval).
// Webhook → notification_url firmada con x-signature header.
//
// Token: scope read+write desde Mercado Pago dashboard del partner.
// La implementación asume el access_token del PARTNER (no del owner)
// para fase 1; la integración split-money por owner queda para fase 2
// (requiere OAuth flow MP + cuentas conectadas).
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

const MP_API = 'https://api.mercadopago.com';

export class MercadoPagoGateway implements PaymentGateway {
  readonly name: GatewayName = 'mercadopago';
  private accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) throw new Error('mercadopago_token_missing');
    this.accessToken = accessToken;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async createCourseCheckout(params: CourseCheckoutParams): Promise<CheckoutResult> {
    const total = params.items.reduce((sum, i) => sum + i.unit_amount * i.quantity, 0);
    // MP usa unidades enteras de la moneda local (no centavos) en la mayoría de mercados.
    // Para COP/CLP/PYG ya son enteros; para USD/MXN/BRL hay decimals (2). Asumimos
    // que `unit_amount` viene en centavos y dividimos por 100 para MP.
    const items = params.items.map((i) => ({
      title: i.name,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_amount / 100,
      currency_id: i.currency,
      picture_url: i.image_url,
    }));

    const body: Record<string, unknown> = {
      items,
      back_urls: {
        success: params.success_url,
        failure: params.cancel_url,
        pending: params.success_url,
      },
      auto_return: 'approved',
      metadata: params.metadata,
      external_reference: params.metadata?.session_ref ?? undefined,
      notification_url: `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/mercadopago-webhook`,
    };

    if (params.customer_email) {
      body.payer = { email: params.customer_email };
    }

    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[MP] createCourseCheckout failed', res.status, text);
      throw new Error(`mp_checkout_failed:${res.status}`);
    }

    const data = await res.json();
    return {
      url: data.init_point ?? data.sandbox_init_point ?? '',
      session_id: data.id,
    };
  }

  async createSubscriptionCheckout(params: SubscriptionCheckoutParams): Promise<CheckoutResult> {
    // MP preapproval: requiere reason, auto_recurring (frequency, transaction_amount).
    const body = {
      reason: params.metadata?.space_name ?? 'Suscripción',
      external_reference: params.metadata?.session_ref ?? undefined,
      payer_email: params.customer_email,
      back_url: params.success_url,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(params.metadata?.amount_local ?? 0),
        currency_id: params.metadata?.currency ?? 'COP',
      },
    };

    const res = await fetch(`${MP_API}/preapproval`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[MP] createSubscriptionCheckout failed', res.status, text);
      throw new Error(`mp_subscribe_failed:${res.status}`);
    }

    const data = await res.json();
    return {
      url: data.init_point ?? '',
      session_id: data.id,
    };
  }

  async createPortal(_params: PortalParams): Promise<PortalResult> {
    // MP no tiene equivalente directo; el usuario gestiona sus suscripciones
    // desde mercadopago.com → Tus pagos → Suscripciones.
    return { url: 'https://www.mercadopago.com.co/subscriptions' };
  }

  async verifyWebhook(req: Request): Promise<WebhookVerifyResult> {
    // MP envía POST con { type, action, data: { id } }.
    // La verificación de firma requiere x-signature header con HMAC.
    // Aquí implementamos parse mínimo + lookup del payment a la API
    // para confirmar el estado real (anti-spoof: confiamos en la API,
    // no en el payload del webhook).
    const body = await req.json();
    const eventType = body?.type ?? body?.action ?? 'unknown';
    const resourceId = body?.data?.id;

    if (!resourceId) {
      throw new Error('mp_webhook_no_resource_id');
    }

    // Lookup defensivo a la API
    const isSubscription = String(eventType).includes('preapproval');
    const apiPath = isSubscription ? `/preapproval/${resourceId}` : `/v1/payments/${resourceId}`;
    const lookup = await fetch(`${MP_API}${apiPath}`, { headers: this.headers() });
    const payload = lookup.ok ? await lookup.json() : {};

    return {
      event_type: `mercadopago.${eventType}`,
      raw_event_type: eventType,
      payload,
      session_id: payload.external_reference ?? undefined,
      subscription_id: isSubscription ? String(resourceId) : undefined,
      customer_id: payload.payer?.id ?? payload.payer_email ?? undefined,
      amount: typeof payload.transaction_amount === 'number'
        ? Math.round(payload.transaction_amount * 100)
        : undefined,
      currency: (payload.currency_id ?? payload.auto_recurring?.currency_id) as Currency | undefined,
      status: payload.status,
      metadata: payload.metadata,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const body: Record<string, unknown> = {};
    if (params.amount) body.amount = params.amount / 100;

    const res = await fetch(`${MP_API}/v1/payments/${params.charge_id}/refunds`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`mp_refund_failed:${res.status}:${text}`);
    }

    const data = await res.json();
    return { refund_id: String(data.id), status: data.status ?? 'unknown' };
  }
}
