// ============================================
// ENUMS Y UNION TYPES
// ============================================

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';

export type TransactionType =
  | 'subscription_payment'
  | 'subscription_refund'
  | 'campaign_payment'
  | 'creator_payout'
  | 'creator_payout_fee'
  | 'platform_fee'
  | 'bonus'
  | 'adjustment'
  | 'refund';

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded';

export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'paypal' | 'wise' | 'payoneer' | 'crypto' | 'other';

export type WalletTransactionType =
  | 'earning'
  | 'bonus'
  | 'referral_bonus'
  | 'payout_request'
  | 'payout_completed'
  | 'payout_failed'
  | 'adjustment'
  | 'fee';

// ============================================
// LABELS
// ============================================

export const SUBSCRIPTION_PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Gratis',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise'
};

export const SUBSCRIPTION_PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: 'bg-white/10 text-white/70',
  starter: 'bg-blue-500/20 text-blue-300',
  pro: 'bg-purple-500/20 text-purple-300',
  enterprise: 'bg-pink-500/20 text-pink-300'
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  cancelled: 'Cancelada',
  past_due: 'Pago vencido',
  trialing: 'Prueba',
  paused: 'Pausada'
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  subscription_payment: 'Pago de suscripción',
  subscription_refund: 'Reembolso suscripción',
  campaign_payment: 'Pago de campaña',
  creator_payout: 'Pago a creador',
  creator_payout_fee: 'Comisión pago creador',
  platform_fee: 'Comisión plataforma',
  bonus: 'Bonificación',
  adjustment: 'Ajuste',
  refund: 'Reembolso'
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pendiente',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado'
};

export const TRANSACTION_STATUS_COLORS: Record<TransactionStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  processing: 'bg-blue-500/20 text-blue-300',
  completed: 'bg-green-500/20 text-green-300',
  failed: 'bg-red-500/20 text-red-300',
  cancelled: 'bg-white/10 text-white/50',
  refunded: 'bg-orange-500/20 text-orange-300'
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  paid: 'Pagada',
  partially_paid: 'Pago parcial',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada'
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-white/10 text-white/50',
  sent: 'bg-blue-500/20 text-blue-300',
  paid: 'bg-green-500/20 text-green-300',
  partially_paid: 'bg-yellow-500/20 text-yellow-300',
  overdue: 'bg-red-500/20 text-red-300',
  cancelled: 'bg-white/10 text-white/50',
  refunded: 'bg-orange-500/20 text-orange-300'
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado'
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Transferencia bancaria',
  paypal: 'PayPal',
  wise: 'Wise',
  payoneer: 'Payoneer',
  crypto: 'Criptomoneda',
  other: 'Otro'
};

// ============================================
// INTERFACES
// ============================================

export interface PlatformSubscription {
  id: string;
  organization_id: string;
  plan: SubscriptionPlan;
  billing_cycle: BillingCycle;
  amount_monthly: number;
  amount_yearly: number | null;
  currency: string;
  status: SubscriptionStatus;
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  features: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PlatformTransaction {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  creator_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  fee_amount: number;
  net_amount: number;
  currency: string;
  status: TransactionStatus;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  subscription_id: string | null;
  campaign_id: string | null;
  invoice_id: string | null;
  payout_id: string | null;
  metadata: Record<string, any>;
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformInvoice {
  id: string;
  organization_id: string;
  subscription_id: string | null;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: string | null;
  due_date: string;
  paid_at: string | null;
  line_items: InvoiceLineItem[];
  notes: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_address: Record<string, any> | null;
  tax_id: string | null;
  pdf_url: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PlatformPayout {
  id: string;
  creator_id: string;
  gross_amount: number;
  platform_fee: number;
  payment_fee: number;
  net_amount: number;
  currency: string;
  status: PayoutStatus;
  payment_method: PaymentMethod | null;
  bank_info: Record<string, any> | null;
  payment_reference: string | null;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  processed_at: string | null;
  completed_at: string | null;
  source_campaigns: any[];
  source_bonuses: any[];
  notes: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorWallet {
  id: string;
  creator_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
  currency: string;
  minimum_payout: number;
  auto_payout: boolean;
  preferred_payment_method: string | null;
  payment_info_verified: boolean;
  payment_info: Record<string, any> | null;
  last_earning_at: string | null;
  last_payout_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorWalletTransaction {
  id: string;
  wallet_id: string;
  creator_id: string;
  transaction_type: WalletTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  campaign_id: string | null;
  payout_id: string | null;
  reference_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================
// STATS INTERFACES
// ============================================

export interface PlatformFinanceStats {
  mrr: number;
  arr: number;
  revenue_period: number;
  revenue_previous: number;
  payouts_period: number;
  payouts_pending: number;
  invoices_pending_amount: number;
  invoices_pending_count: number;
  invoices_overdue_amount: number;
  invoices_overdue_count: number;
  subscriptions_by_plan: { plan: SubscriptionPlan; count: number; mrr: number }[];
  transactions_count: number;
  fees_earned: number;
}

export interface OrgFinanceStats {
  total_spent: number;
  spent_period: number;
  total_paid_creators: number;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    amount_monthly: number;
    current_period_end: string;
    days_until_renewal: number;
  } | null;
  invoices_pending: number;
  invoices_pending_count: number;
  last_payment: { amount: number; paid_at: string } | null;
  transactions_count_period: number;
  campaigns_paid_count: number;
}

export interface CreatorFinanceStats {
  wallet: {
    available_balance: number;
    pending_balance: number;
    total_earned: number;
    total_withdrawn: number;
    minimum_payout: number;
    payment_info_verified: boolean;
  } | null;
  earnings_this_month: number;
  earnings_last_month: number;
  total_payouts: number;
  last_payout: { amount: number; completed_at: string; payment_method: string } | null;
  pending_payout: { id: string; amount: number; status: PayoutStatus; requested_at: string } | null;
  earnings_by_type: { type: WalletTransactionType; total: number }[];
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  payouts: number;
  net: number;
}
