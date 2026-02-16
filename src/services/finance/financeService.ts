import { supabase } from '@/integrations/supabase/client';
import type {
  PlatformSubscription,
  PlatformTransaction,
  PlatformInvoice,
  PlatformPayout,
  CreatorWallet,
  CreatorWalletTransaction,
  PlatformFinanceStats,
  OrgFinanceStats,
  CreatorFinanceStats,
  RevenueByMonth,
  TransactionStatus,
  InvoiceStatus,
  PayoutStatus
} from '@/types/finance.types';

// ============================================
// PLATFORM FINANCE (Admin)
// ============================================

export async function getPlatformFinanceStats(days: number = 30): Promise<PlatformFinanceStats> {
  const { data, error } = await (supabase as any).rpc('get_platform_finance_stats', { p_days: days });
  if (error) throw error;
  return data as PlatformFinanceStats;
}

export async function getRevenueByMonth(months: number = 12): Promise<RevenueByMonth[]> {
  const { data, error } = await (supabase as any).rpc('get_revenue_by_month', { p_months: months });
  if (error) throw error;
  return (data || []) as RevenueByMonth[];
}

export async function getAllSubscriptions(): Promise<PlatformSubscription[]> {
  const { data, error } = await (supabase as any)
    .from('platform_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PlatformSubscription[];
}

export async function getAllTransactions(filters?: {
  type?: string;
  status?: TransactionStatus;
  limit?: number;
}): Promise<PlatformTransaction[]> {
  let query = (supabase as any)
    .from('platform_transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.type) query = query.eq('transaction_type', filters.type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PlatformTransaction[];
}

export async function getAllInvoices(filters?: {
  status?: InvoiceStatus;
  limit?: number;
}): Promise<PlatformInvoice[]> {
  let query = (supabase as any)
    .from('platform_invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PlatformInvoice[];
}

export async function getAllPayouts(filters?: {
  status?: PayoutStatus;
  limit?: number;
}): Promise<PlatformPayout[]> {
  let query = (supabase as any)
    .from('platform_payouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PlatformPayout[];
}

export async function approvePayout(payoutId: string, approvedBy: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('platform_payouts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy
    })
    .eq('id', payoutId);
  if (error) throw error;
}

export async function processPayout(payoutId: string, reference: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('platform_payouts')
    .update({
      status: 'processing',
      payment_reference: reference,
      processed_at: new Date().toISOString()
    })
    .eq('id', payoutId);
  if (error) throw error;
}

export async function completePayout(payoutId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('platform_payouts')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', payoutId);
  if (error) throw error;
}

// ============================================
// ORG FINANCE
// ============================================

export async function getOrgFinanceStats(orgId: string, days: number = 30): Promise<OrgFinanceStats> {
  const { data, error } = await (supabase as any).rpc('get_org_finance_stats', {
    p_org_id: orgId,
    p_days: days
  });
  if (error) throw error;
  return data as OrgFinanceStats;
}

export async function getOrgSubscription(orgId: string): Promise<PlatformSubscription | null> {
  const { data, error } = await (supabase as any)
    .from('platform_subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as PlatformSubscription | null;
}

export async function getOrgTransactions(orgId: string, limit?: number): Promise<PlatformTransaction[]> {
  let query = (supabase as any)
    .from('platform_transactions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PlatformTransaction[];
}

export async function getOrgInvoices(orgId: string): Promise<PlatformInvoice[]> {
  const { data, error } = await (supabase as any)
    .from('platform_invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PlatformInvoice[];
}

// ============================================
// CREATOR FINANCE
// ============================================

export async function getCreatorFinanceStats(creatorId: string): Promise<CreatorFinanceStats> {
  const { data, error } = await (supabase as any).rpc('get_creator_finance_stats', {
    p_creator_id: creatorId
  });
  if (error) throw error;
  return data as CreatorFinanceStats;
}

export async function getCreatorWallet(creatorId: string): Promise<CreatorWallet | null> {
  const { data, error } = await (supabase as any)
    .from('creator_wallets')
    .select('*')
    .eq('creator_id', creatorId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as CreatorWallet | null;
}

export async function getCreatorWalletTransactions(creatorId: string, limit?: number): Promise<CreatorWalletTransaction[]> {
  let query = (supabase as any)
    .from('creator_wallet_transactions')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as CreatorWalletTransaction[];
}

export async function getCreatorPayouts(creatorId: string): Promise<PlatformPayout[]> {
  const { data, error } = await (supabase as any)
    .from('platform_payouts')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PlatformPayout[];
}

export async function requestPayout(
  creatorId: string,
  amount: number,
  paymentMethod: string
): Promise<{ success: boolean; payout_id?: string; error?: string }> {
  const { data, error } = await (supabase as any).rpc('request_creator_payout', {
    p_creator_id: creatorId,
    p_amount: amount,
    p_payment_method: paymentMethod
  });
  if (error) throw error;
  return data as { success: boolean; payout_id?: string; error?: string };
}

export async function updatePaymentInfo(creatorId: string, paymentInfo: Record<string, any>): Promise<void> {
  const { error } = await (supabase as any)
    .from('creator_wallets')
    .update({
      payment_info: paymentInfo,
      payment_info_verified: false,
      updated_at: new Date().toISOString()
    })
    .eq('creator_id', creatorId);
  if (error) throw error;
}
