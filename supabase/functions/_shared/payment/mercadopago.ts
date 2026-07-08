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
//
// Webhook firma: MP envía header `x-signature: ts=X,v1=HMAC` + header
// `x-request-id`. Manifest a firmar: `id:<resource>;request-id:<X>;ts:<ts>;`.
// Secret separado del access_token (MP_WEBHOOK_SECRET).
// ============================================================

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

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
    //
    // SECURITY: el caller (edge function de subscribe) DEBE pasar
    // `amount_local_cents` y `currency` desde una fuente server-side
    // autoritativa (academy_spaces.membership_price_usd o tabla local),
    // NUNCA desde body del cliente. Aquí solo consumimos lo que llega.
    const amountLocalCents = Number(params.metadata?.amount_local_cents ?? 0);
    const currency = String(params.metadata?.currency ?? 'COP');
    if (amountLocalCents <= 0) {
      throw new Error('mp_subscription_invalid_amount');
    }
    const body = {
      reason: params.metadata?.space_name ?? 'Suscripción',
      external_reference: params.metadata?.session_ref ?? undefined,
      payer_email: params.customer_email,
      back_url: params.success_url,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amountLocalCents / 100,
        currency_id: currency,
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
    // 1. Parse body
    const body = await req.json();
    const eventType = body?.type ?? body?.action ?? 'unknown';
    const resourceId = body?.data?.id;
    if (!resourceId) throw new Error('mp_webhook_no_resource_id');

    // 2. Verificar x-signature HMAC ANTES de cualquier I/O.
    // MP envía: x-signature: "ts=<unixms>,v1=<hmac>" + x-request-id: <uuid>
    // Manifest: `id:<resourceId>;request-id:<requestId>;ts:<ts>;`
    const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
    if (!webhookSecret) {
      throw new Error('mp_webhook_secret_not_configured');
    }
    const sigHeader = req.headers.get('x-signature') ?? '';
    const requestId = req.headers.get('x-request-id') ?? '';
    const parts = Object.fromEntries(
      sigHeader.split(',').map((p) => p.split('=').map((s) => s.trim())),
    ) as Record<string, string>;
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) throw new Error('mp_webhook_signature_missing');

    const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
    const expected = await hmacSha256Hex(webhookSecret, manifest);
    if (!timingSafeEqualStr(expected, v1)) {
      throw new Error('mp_webhook_signature_invalid');
    }

    // 3. Lookup defensivo a la API solo después de verificar firma.
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
