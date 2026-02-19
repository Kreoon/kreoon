// ============================================================================
// KREOON UNIFIED FINANCIAL SYSTEM - TYPES
// Tipos TypeScript para todo el sistema financiero
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type WalletType = 
  | 'creator'
  | 'editor'
  | 'brand'
  | 'organization'
  | 'agency'
  | 'platform';

export type TransactionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

export type TransactionType = 
  | 'deposit'
  | 'withdrawal'
  | 'escrow_hold'
  | 'escrow_release'
  | 'escrow_refund'
  | 'escrow_partial_release'
  | 'platform_fee'
  | 'referral_commission'
  | 'subscription_payment'
  | 'subscription_refund'
  | 'token_purchase'
  | 'token_consumption'
  | 'token_bonus'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'chargeback';

export type EscrowStatus = 
  | 'created'
  | 'funded'
  | 'partially_funded'
  | 'in_progress'
  | 'pending_approval'
  | 'approved'
  | 'disputed'
  | 'resolved'
  | 'released'
  | 'refunded'
  | 'cancelled';

export type ProjectType = 
  | 'marketplace_direct'
  | 'campaign_managed'
  | 'live_shopping'
  | 'professional_service'
  | 'corporate_package';

export type WithdrawalMethod = 
  | 'bank_col'
  | 'bank_international'
  | 'paypal'
  | 'payoneer'
  | 'nequi'
  | 'daviplata'
  | 'mercadopago'
  | 'crypto'
  | 'zelle'
  | 'wise';

export type WithdrawalStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SubscriptionTier = 
  | 'brand_free'
  | 'brand_starter'
  | 'brand_pro'
  | 'brand_business'
  | 'creator_free'
  | 'creator_pro'
  | 'org_starter'
  | 'org_pro'
  | 'org_enterprise';

export type SubscriptionStatus = 
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'expired';

export type BillingCycle = 'monthly' | 'annual';

export type ReferralSourceType = 'subscription' | 'transaction';

export type ReferralStatus = 'active' | 'paused' | 'terminated';

export type TokenTransactionType = 
  | 'consumption'
  | 'purchase'
  | 'subscription_credit'
  | 'bonus'
  | 'refund'
  | 'reset';

// ============================================================================
// INTERFACES - WALLETS
// ============================================================================

export interface UnifiedWallet {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  wallet_type: WalletType;
  available_balance: number;
  pending_balance: number;
  reserved_balance: number;
  total_earned: number;
  total_withdrawn: number;
  total_spent: number;
  currency: string;
  status: string;
  settings: Record<string, unknown>;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INTERFACES - TRANSACTIONS
// ============================================================================

export interface UnifiedTransaction {
  id: string;
  wallet_id: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  net_amount: number;
  currency: string;
  exchange_rate: number;
  amount_original: number | null;
  currency_original: string | null;
  escrow_id: string | null;
  subscription_id: string | null;
  project_id: string | null;
  referral_id: string | null;
  related_transaction_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  stripe_charge_id: string | null;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  processed_at: string | null;
  idempotency_key: string | null;
}

// ============================================================================
// INTERFACES - ESCROW
// ============================================================================

export interface EscrowDistribution {
  wallet_id: string;
  user_id: string;
  role: 'creator' | 'editor' | 'organization';
  percentage: number;
  amount: number;
  released: boolean;
  released_at: string | null;
}

export interface EscrowMilestone {
  id: string;
  title: string;
  percentage: number;
  amount: number;
  status: 'pending' | 'approved' | 'disputed';
  due_date: string | null;
  completed_at: string | null;
}

export interface EscrowHold {
  id: string;
  project_id: string | null;
  project_type: ProjectType;
  project_title: string | null;
  client_id: string;
  client_wallet_id: string | null;
  total_amount: number;
  currency: string;
  platform_fee_rate: number;
  platform_fee_amount: number;
  referral_id: string | null;
  referral_fee_rate: number;
  referral_fee_amount: number;
  distributions: EscrowDistribution[];
  milestones: EscrowMilestone[] | null;
  status: EscrowStatus;
  stripe_payment_intent_id: string | null;
  stripe_payment_status: string | null;
  funded_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  expires_at: string | null;
  auto_approve_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  dispute_resolved_at: string | null;
  dispute_resolution: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INTERFACES - SUBSCRIPTIONS
// ============================================================================

export interface PlanLimits {
  max_users: number;
  max_content_per_month: number;
  ai_tokens_monthly: number;
  storage_gb: number;
  features: string[];
}

export interface PlatformSubscription {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  wallet_id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  price_monthly: number;
  price_annual: number | null;
  billing_cycle: BillingCycle;
  current_price: number;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  referred_by: string | null;
  plan_limits: PlanLimits;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INTERFACES - WITHDRAWALS
// ============================================================================

export interface WithdrawalPaymentDetails {
  // Bank Colombia
  bank_name?: string;
  account_type?: 'savings' | 'checking';
  account_number?: string;
  account_holder?: string;
  
  // Bank International
  swift_code?: string;
  iban?: string;
  bank_address?: string;
  
  // PayPal / Zelle
  email?: string;
  
  // Crypto
  network?: string;
  wallet_address?: string;
  currency?: string;
  
  // Payoneer
  payoneer_email?: string;
  
  // Nequi / Daviplata
  phone_number?: string;
}

export interface WithdrawalRequest {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  currency: string;
  fee_fixed: number;
  fee_percentage: number;
  fee_total: number;
  net_amount: number;
  method: WithdrawalMethod;
  payment_details: WithdrawalPaymentDetails;
  status: WithdrawalStatus;
  processed_by: string | null;
  processed_at: string | null;
  stripe_payout_id: string | null;
  external_reference: string | null;
  failure_reason: string | null;
  transaction_id: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INTERFACES - REFERRALS
// ============================================================================

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  target_type: 'all' | 'brand' | 'creator' | 'organization';
  clicks: number;
  registrations: number;
  conversions: number;
  max_uses: number | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralRelationship {
  id: string;
  referrer_id: string;
  referrer_wallet_id: string | null;
  referred_id: string;
  referred_wallet_id: string | null;
  referral_code: string;
  referred_type: 'brand' | 'creator' | 'organization';
  status: ReferralStatus;
  subscription_rate: number;
  transaction_rate: number;
  total_subscription_earned: number;
  total_transaction_earned: number;
  total_earned: number;
  referrer_last_active: string | null;
  referred_last_active: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ReferralEarning {
  id: string;
  relationship_id: string;
  referrer_id: string;
  referrer_wallet_id: string | null;
  source_type: ReferralSourceType;
  source_id: string;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'credited' | 'paid' | 'cancelled';
  transaction_id: string | null;
  credited_at: string | null;
  paid_at: string | null;
  created_at: string;
}

// ============================================================================
// INTERFACES - AI TOKENS
// ============================================================================

export interface AITokenBalance {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  balance_subscription: number;
  balance_purchased: number;
  balance_bonus: number;
  balance_total: number;
  subscription_tier: SubscriptionTier | null;
  monthly_allowance: number;
  last_reset_at: string;
  next_reset_at: string | null;
  total_consumed: number;
  total_purchased: number;
  created_at: string;
  updated_at: string;
}

export interface AITokenTransaction {
  id: string;
  balance_id: string;
  transaction_type: TokenTransactionType;
  tokens: number;
  balance_after: number;
  action_type: string | null;
  action_metadata: Record<string, any>;
  purchase_amount: number | null;
  stripe_payment_id: string | null;
  executed_by: string | null;
  created_at: string;
}

// ============================================================================
// INTERFACES - PRICING
// ============================================================================

export interface CommissionRates {
  marketplace_direct: { default: number; min: number; max: number };
  campaign_managed: { default: number; min: number; max: number };
  live_shopping: { default: number; min: number; max: number };
  professional_service: { default: number; min: number; max: number };
  corporate_package: { default: number; min: number; max: number };
}

export interface DistributionSplits {
  creator: number;
  editor: number;
  organization: number;
}

export interface ReferralRates {
  subscription: number;
  transaction: number;
  ai_tokens: number;
}

export interface TokenPackage {
  tokens: number;
  price: number;
  discount: number;
}

export interface WithdrawalFee {
  fixed: number;
  percentage: number;
  minimum: number;
  currency: string;
}

export interface PlanConfig {
  name: string;
  price_monthly: number;
  price_annual: number | null;
  max_users?: number;
  max_content_per_month?: number;
  max_clients?: number;
  max_team?: number;
  ai_tokens_monthly: number;
  storage_gb?: number;
  features: string[];
}

export interface CustomPricingAgreement {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  marketplace_fee_override: number | null;
  campaign_fee_override: number | null;
  live_shopping_fee_override: number | null;
  professional_fee_override: number | null;
  corporate_fee_override: number | null;
  referral_subscription_rate: number | null;
  referral_transaction_rate: number | null;
  token_discount_percent: number | null;
  bonus_tokens_monthly: number | null;
  subscription_discount_percent: number | null;
  custom_plan_limits: Partial<PlanLimits> | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  negotiated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INTERFACES - ROLES SIMPLIFICADOS
// ============================================================================

export type CreatorRoleId = 
  | 'ugc_creator'
  | 'influencer'
  | 'post_production'
  | 'strategist'
  | 'producer'
  | 'tech'
  | 'educator'
  | 'brand';

export type RoleCategory = 
  | 'content_creation'
  | 'post_production'
  | 'strategy'
  | 'tech'
  | 'education'
  | 'client';

export interface CreatorRole {
  id: CreatorRoleId;
  label: string;
  category: RoleCategory;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface RoleSpecialty {
  id: string;
  role_id: CreatorRoleId;
  label: string;
  icon: string | null;
  is_active: boolean;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateEscrowRequest {
  project_type: ProjectType;
  project_id?: string;
  project_title: string;
  total_amount: number;
  currency?: string;
  distributions: {
    user_id: string;
    role: 'creator' | 'editor' | 'organization';
    percentage: number;
  }[];
  milestones?: {
    title: string;
    percentage: number;
    due_date?: string;
  }[];
  referral_code?: string;
}

export interface CreateEscrowResponse {
  success: boolean;
  escrow_id: string;
  total_amount: number;
  platform_fee: number;
  platform_fee_rate: number;
  amount_to_distribute: number;
  distributions: EscrowDistribution[];
  referral_applied: boolean;
  next_step: 'fund';
}

export interface FundEscrowResponse {
  success: boolean;
  escrow_id: string;
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

export interface SubscribeRequest {
  tier: SubscriptionTier;
  billing_cycle: BillingCycle;
  organization_id?: string;
  referral_code?: string;
}

export interface CheckoutResponse {
  success: boolean;
  checkout_url: string;
  session_id: string;
}

export interface ConsumeTokensRequest {
  organization_id?: string;
  action_type: string;
  metadata?: Record<string, any>;
}

export interface ConsumeTokensResponse {
  success: boolean;
  tokens_consumed?: number;
  balance_remaining?: number;
  source?: string;
  error?: string;
  required?: number;
  available?: number;
}

// ============================================================================
// INTERFACES - REFERRAL TIERS & LEADERBOARD
// ============================================================================

export interface ReferralTier {
  tier_key: string;
  label: string;
  min_referrals: number;
  bonus_subscription_percent: number;
  badge_emoji: string;
  badge_color: string;
  sort_order: number;
}

export interface ReferralLeaderboardEntry {
  id: string;
  user_id: string;
  period_month: string;
  referrals_count: number;
  earnings_amount: number;
  rank_position: number;
  is_featured: boolean;
  // Joined from profiles
  full_name?: string;
  avatar_url?: string;
  referral_tier?: string;
}

export interface PromotionalCampaign {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  referred_discount_percent: number;
  referred_bonus_coins: number;
  referrer_bonus_coins: number;
  referral_extra_free_months: number;
  max_redemptions: number | null;
  current_redemptions: number;
  promo_badge_text: string | null;
  promo_badge_color: string | null;
}

export interface NurtureStatus {
  has_creator_profile: boolean;
  has_avatar: boolean;
  has_portfolio: boolean;
  is_qualified: boolean;
  completed_at: string | null;
}

export interface ReferralDashboard {
  success: boolean;
  codes: ReferralCode[];
  referrals: ReferralRelationship[];
  recent_earnings: ReferralEarning[];
  metrics: {
    total_clicks: number;
    total_registrations: number;
    conversion_rate: string;
    total_referrals: number;
    active_referrals: number;
    total_earned: number;
    this_month_earned: number;
    available_for_withdrawal: number;
    by_type: {
      brand: number;
      creator: number;
      organization: number;
    };
    earnings_by_source: {
      subscriptions: number;
      transactions: number;
    };
  };
  rates: {
    subscription: string;
    transaction: string;
    duration: string;
  };
  // Enhanced fields
  tier?: {
    current: string;
    label: string;
    effective_rate: number;
    bonus_percent: number;
  };
  next_tier?: {
    key: string;
    label: string;
    referrals_needed: number;
    bonus_percent: number;
  } | null;
  leaderboard_rank?: number | null;
  active_promo?: PromotionalCampaign | null;
}
