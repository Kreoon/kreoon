// Organization Payments Types - Flujo de pagos internos de organizaciones

export type PaymentGatewayProvider =
  | 'stripe'
  | 'mercadopago'
  | 'paypal'
  | 'payu'
  | 'wompi'
  | 'bold'
  | 'manual';

export type OrgPayoutMethodType =
  | 'payoneer'
  | 'wise'
  | 'paypal'
  | 'bank_transfer'
  | 'nequi'
  | 'daviplata'
  | 'cash'
  | 'manual';

export type PaymentMode = 'external' | 'kreoon' | 'hybrid';

export type ClientPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type TeamPaymentStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Pasarela de cobro configurada por la org
export interface OrganizationPaymentGateway {
  id: string;
  organization_id: string;
  provider: PaymentGatewayProvider;
  credentials: Record<string, string>;
  is_active: boolean;
  is_default: boolean;
  supported_currencies: string[];
  webhook_url: string | null;
  webhook_secret: string | null;
  display_name: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Método de pago a equipo configurado por la org
export interface OrganizationPayoutMethod {
  id: string;
  organization_id: string;
  method_type: OrgPayoutMethodType;
  credentials: Record<string, string>;
  is_active: boolean;
  supported_currencies: string[];
  bank_info: Record<string, string>;
  display_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Configuración de pagos de la org
export interface OrganizationPaymentSettings {
  organization_id: string;
  client_payment_mode: PaymentMode;
  team_payment_mode: PaymentMode;
  default_currency: string;
  display_currency: string;
  default_creator_percentage: number;
  default_editor_percentage: number;
  default_org_percentage: number;
  payment_terms_days: number;
  payment_instructions: string | null;
  created_at: string;
  updated_at: string;
}

// Pago de cliente a organización
export interface OrganizationClientPayment {
  id: string;
  organization_id: string;
  client_id: string | null;
  client_organization_id: string | null;
  client_name: string | null;
  client_email: string | null;
  campaign_id: string | null;
  project_reference: string | null;
  amount: number;
  currency: string;
  payment_gateway_id: string | null;
  payment_method: string | null;
  external_payment_id: string | null;
  external_status: string | null;
  status: ClientPaymentStatus;
  receipt_url: string | null;
  invoice_url: string | null;
  proof_of_payment: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

// Pago de organización a miembro del equipo
export interface OrganizationTeamPayment {
  id: string;
  organization_id: string;
  recipient_user_id: string | null;
  recipient_name: string | null;
  recipient_role: string | null;
  campaign_id: string | null;
  deliverable_reference: string | null;
  amount: number;
  currency: string;
  payout_method_id: string | null;
  external_payment_id: string | null;
  external_status: string | null;
  status: TeamPaymentStatus;
  proof_of_payment: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
}

// Display types con relaciones
export interface OrganizationClientPaymentDisplay extends OrganizationClientPayment {
  campaign?: { id: string; name: string };
  client?: { id: string; email: string; full_name: string };
  gateway?: { provider: string; display_name: string };
  formattedAmount: string;
  statusLabel: string;
  statusColor: string;
}

export interface OrganizationTeamPaymentDisplay extends OrganizationTeamPayment {
  recipient?: { id: string; email: string; full_name: string; avatar_url: string };
  campaign?: { id: string; name: string };
  payout_method?: { method_type: string; display_name: string };
  approver?: { id: string; email: string; full_name: string };
  formattedAmount: string;
  statusLabel: string;
  statusColor: string;
}

// Labels
export const PAYMENT_GATEWAY_LABELS: Record<PaymentGatewayProvider, string> = {
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
  paypal: 'PayPal',
  payu: 'PayU',
  wompi: 'Wompi',
  bold: 'Bold',
  manual: 'Transferencia Manual',
};

export const PAYOUT_METHOD_LABELS: Record<OrgPayoutMethodType, string> = {
  payoneer: 'Payoneer',
  wise: 'Wise',
  paypal: 'PayPal',
  bank_transfer: 'Transferencia Bancaria',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  cash: 'Efectivo',
  manual: 'Manual',
};

export const CLIENT_PAYMENT_STATUS_LABELS: Record<ClientPaymentStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

export const TEAM_PAYMENT_STATUS_LABELS: Record<TeamPaymentStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  processing: 'Procesando',
  completed: 'Pagado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500',
  approved: 'bg-blue-500/10 text-blue-500',
  processing: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-emerald-500/10 text-emerald-500',
  failed: 'bg-red-500/10 text-red-500',
  refunded: 'bg-purple-500/10 text-purple-500',
  cancelled: 'bg-gray-500/10 text-gray-500',
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  external: 'Pagos directos (fuera de Kreoon)',
  kreoon: 'Usar sistema de Kreoon',
  hybrid: 'Híbrido (según proyecto)',
};
