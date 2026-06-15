// ============================================================
// CRION Academy v2 — Payment Gateway abstraction
//
// Interfaz unificada para múltiples pasarelas (Stripe, Mercado Pago,
// Wompi, dLocal, ...). Cada edge function de checkout/portal/refund
// elige el adapter según `space.preferred_gateways[0]` o un override
// pasado en el body.
//
// Ver supabase/functions/_shared/payment/index.ts para la factory.
// ============================================================

export type GatewayName = 'stripe' | 'hotmart' | 'mercadopago' | 'wompi' | 'dlocal';

export type Currency = 'USD' | 'COP' | 'MXN' | 'BRL' | 'ARS' | 'PEN' | 'CLP' | 'EUR';

export interface CheckoutItem {
  name: string;
  description?: string;
  unit_amount: number;   // entero en menor unidad (ej: centavos para USD/COP/MXN, no para BRL/CLP que también son centavos)
  currency: Currency;
  quantity: number;
  image_url?: string;
  // Si la pasarela soporta priceId pre-creado (Stripe, MP preapproval), úsalo.
  external_price_id?: string;
}

export interface CourseCheckoutParams {
  items: CheckoutItem[];                  // primario + order bumps en line_items extra
  customer_email?: string;
  customer_id?: string;                   // id del customer en el gateway (si ya existe)
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;      // se persiste en el webhook
  // Para Stripe Connect / split de fondos
  destination_account_id?: string | null;
  application_fee_percent?: number | null;
  // Cupón ya validado y traducido al formato del gateway
  coupon?: { amount_off?: number; percent_off?: number; currency?: Currency } | null;
}

export interface SubscriptionCheckoutParams extends Omit<CourseCheckoutParams, 'items'> {
  price_external_id: string;              // precio recurrente pre-creado
  trial_days?: number;
}

export interface CheckoutResult {
  url: string;
  session_id: string;
}

export interface PortalParams {
  customer_id: string;
  return_url: string;
}

export interface PortalResult {
  url: string;
}

export interface WebhookVerifyResult {
  event_type: string;            // normalizado al vocabulario interno (ver normalizeEventType)
  raw_event_type: string;        // tal cual viene del proveedor
  payload: Record<string, unknown>;
  // Datos extraídos comunes para que el handler downstream no parsee proveedor-específico
  session_id?: string;
  subscription_id?: string;
  customer_id?: string;
  amount?: number;
  currency?: Currency;
  status?: string;
  metadata?: Record<string, string>;
}

export interface RefundParams {
  charge_id: string;
  amount?: number;               // parcial; omitir = full
  reason?: string;
}

export interface RefundResult {
  refund_id: string;
  status: string;
}

// ============================================================
// Interface principal
// ============================================================

export interface PaymentGateway {
  readonly name: GatewayName;

  /** One-time payment (compra de curso, bundle, evento). */
  createCourseCheckout(params: CourseCheckoutParams): Promise<CheckoutResult>;

  /** Recurrente (membresía mensual/anual de space). */
  createSubscriptionCheckout(params: SubscriptionCheckoutParams): Promise<CheckoutResult>;

  /** Customer portal (gestión de suscripción, método de pago, facturas). */
  createPortal(params: PortalParams): Promise<PortalResult>;

  /** Verifica firma del webhook y normaliza el evento. */
  verifyWebhook(req: Request): Promise<WebhookVerifyResult>;

  /** Refund full o parcial. */
  refund(params: RefundParams): Promise<RefundResult>;
}

// ============================================================
// Helpers de mapeo
// ============================================================

/** Normaliza event types proveedor-específicos al vocabulario interno. */
export function normalizeEventType(gateway: GatewayName, raw: string): string {
  // Stripe → ya viene normalizado: payment_intent.succeeded, checkout.session.completed, etc.
  // MP/Wompi se mapean cuando se implementen.
  return `${gateway}.${raw}`;
}
