/**
 * Types for Marketplace Payment System with Escrow
 */

// Payment status flow
export type PaymentStatus =
  | 'pending'         // Payment created but not funded
  | 'funded'          // Money in escrow (company paid)
  | 'in_progress'     // Work started
  | 'review'          // Work submitted, awaiting review
  | 'released'        // Payment released to creator
  | 'disputed'        // In dispute resolution
  | 'refunded'        // Refunded to company
  | 'cancelled';      // Cancelled before funding

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_company'    // Resolved in favor of company
  | 'resolved_creator'    // Resolved in favor of creator
  | 'resolved_split';     // Split resolution

export type PayoutMethod =
  | 'stripe'
  | 'paypal'
  | 'bank_transfer';

// Main payment/escrow record
export interface MarketplacePayment {
  id: string;
  proposal_id: string;
  company_user_id: string;
  creator_user_id: string;

  // Amounts
  gross_amount: number;          // Total amount before fees
  platform_fee: number;          // Kreoon's fee (10%)
  net_amount: number;            // Amount to creator after fees
  currency: string;              // ISO currency code (USD)

  // Status
  status: PaymentStatus;
  funded_at: string | null;
  released_at: string | null;

  // Stripe integration
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;

  // Milestones (for phased payments)
  milestones: PaymentMilestone[];
  current_milestone_index: number;

  // Metadata
  description: string | null;
  created_at: string;
  updated_at: string;

  // Relations
  proposal?: any;
  company_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  creator_user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface PaymentMilestone {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  percentage: number;
  status: 'pending' | 'funded' | 'completed' | 'released';
  due_date: string | null;
  completed_at: string | null;
  released_at: string | null;
}

// Dispute record
export interface PaymentDispute {
  id: string;
  payment_id: string;
  opened_by: 'company' | 'creator';
  opener_user_id: string;

  reason: DisputeReason;
  description: string;
  evidence_urls: string[];

  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;

  // If split resolution
  company_refund_amount: number | null;
  creator_payout_amount: number | null;

  created_at: string;
  updated_at: string;

  // Relations
  payment?: MarketplacePayment;
  opener_user?: {
    id: string;
    full_name: string;
  };
}

export type DisputeReason =
  | 'work_not_delivered'
  | 'work_not_as_described'
  | 'quality_issues'
  | 'missed_deadline'
  | 'communication_issues'
  | 'payment_issues'
  | 'other';

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  work_not_delivered: 'Trabajo no entregado',
  work_not_as_described: 'Trabajo diferente a lo acordado',
  quality_issues: 'Problemas de calidad',
  missed_deadline: 'Fecha límite no cumplida',
  communication_issues: 'Problemas de comunicación',
  payment_issues: 'Problemas con el pago',
  other: 'Otro',
};

// Creator payout preferences
export interface CreatorPayoutSettings {
  id: string;
  user_id: string;

  // Preferred method
  payout_method: PayoutMethod;

  // Stripe Connect
  stripe_account_id: string | null;
  stripe_account_status: 'pending' | 'active' | 'restricted' | null;

  // PayPal
  paypal_email: string | null;

  // Bank transfer
  bank_account_last4: string | null;
  bank_name: string | null;
  bank_country: string | null;

  // Settings
  auto_payout: boolean;
  min_payout_amount: number;
  payout_schedule: 'immediate' | 'weekly' | 'monthly';

  created_at: string;
  updated_at: string;
}

// Transaction history entry
export interface PaymentTransaction {
  id: string;
  payment_id: string;
  type: TransactionType;
  amount: number;
  currency: string;

  // Stripe references
  stripe_charge_id: string | null;
  stripe_refund_id: string | null;
  stripe_transfer_id: string | null;

  description: string | null;
  status: 'pending' | 'completed' | 'failed';
  failed_reason: string | null;

  created_at: string;
}

export type TransactionType =
  | 'escrow_deposit'      // Company funds escrow
  | 'milestone_release'   // Milestone payment released
  | 'full_release'        // Full payment released
  | 'refund'              // Refund to company
  | 'partial_refund'      // Partial refund (dispute)
  | 'fee_collection';     // Platform fee collected

// Input types
export interface CreatePaymentInput {
  proposal_id: string;
  gross_amount: number;
  currency?: string;
  description?: string;
  milestones?: {
    title: string;
    description?: string;
    percentage: number;
    due_date?: string;
  }[];
}

export interface OpenDisputeInput {
  payment_id: string;
  reason: DisputeReason;
  description: string;
  evidence_urls?: string[];
}

export interface UpdatePayoutSettingsInput {
  payout_method: PayoutMethod;
  paypal_email?: string;
  auto_payout?: boolean;
  min_payout_amount?: number;
  payout_schedule?: 'immediate' | 'weekly' | 'monthly';
}

// API response types
export interface PaymentIntentResponse {
  client_secret: string;
  payment_id: string;
  amount: number;
  currency: string;
}

export interface StripeConnectResponse {
  account_link_url: string;
  account_id: string;
}

// Stats
export interface CreatorEarningsStats {
  total_earned: number;
  pending_release: number;
  available_balance: number;
  this_month: number;
  last_month: number;
  total_projects: number;
  average_project_value: number;
}

export interface CompanySpendingStats {
  total_spent: number;
  in_escrow: number;
  this_month: number;
  last_month: number;
  total_projects: number;
  average_project_value: number;
}

// Platform fee configuration — imports from single source of truth
import { COMMISSION_RATES, PAYMENT_PROVIDER_FEES, ESCROW_MIN_PAYMENT_USD } from '@/lib/finance/constants';

export const PLATFORM_FEE_PERCENTAGE = COMMISSION_RATES.marketplace_direct.base / 100;
export const MIN_PAYMENT_AMOUNT = ESCROW_MIN_PAYMENT_USD;
export const STRIPE_PROCESSING_FEE = PAYMENT_PROVIDER_FEES.stripe.percentage / 100;
export const STRIPE_FIXED_FEE = PAYMENT_PROVIDER_FEES.stripe.fixed;
