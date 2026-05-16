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
  PayoutStatus,
  PackagePayment,
  PackageInstallment,
  PackageCost,
  CreatorPackageAssignment,
  AgingRow,
  PackageProfitability,
  RecurringExpense,
} from '@/types/finance.types';

// ============================================
// PLATFORM FINANCE (Admin)
// ============================================

export async function getPlatformFinanceStats(days: number = 30): Promise<PlatformFinanceStats> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  const [subsRes, txRes, invoicesRes, payoutsRes] = await Promise.all([
    (supabase as any).from('platform_subscriptions').select('plan, amount_monthly, status'),
    (supabase as any)
      .from('platform_transactions')
      .select('amount, fee_amount, status, created_at')
      .gte('created_at', sinceISO),
    (supabase as any)
      .from('platform_invoices')
      .select('total, status, due_date'),
    (supabase as any)
      .from('platform_payouts')
      .select('net_amount, status, created_at')
      .gte('created_at', sinceISO),
  ]);

  const subs: any[] = subsRes.data ?? [];
  const txs: any[] = txRes.data ?? [];
  const invoices: any[] = invoicesRes.data ?? [];
  const payouts: any[] = payoutsRes.data ?? [];

  // MRR / ARR desde suscripciones activas
  const activeSubs = subs.filter(s => s.status === 'active');
  const mrr = activeSubs.reduce((s: number, sub: any) => s + (Number(sub.amount_monthly) || 0), 0);

  // Revenue del período (transacciones completadas)
  const revenue_period = txs
    .filter(t => t.status === 'completed' && t.amount > 0)
    .reduce((s: number, t: any) => s + Number(t.amount), 0);

  // Payouts
  const payouts_period = payouts
    .filter(p => p.status === 'completed')
    .reduce((s: number, p: any) => s + Number(p.net_amount), 0);
  const payouts_pending = payouts
    .filter(p => ['pending', 'approved', 'processing'].includes(p.status))
    .reduce((s: number, p: any) => s + Number(p.net_amount), 0);

  // Facturas
  const today = new Date().toISOString().split('T')[0];
  const pendingInvoices = invoices.filter(i => i.status === 'sent');
  const overdueInvoices = invoices.filter(i => i.status === 'sent' && i.due_date < today);

  // Subscriptions by plan (para el PieChart)
  const planMap = new Map<string, { count: number; mrr: number }>();
  for (const sub of activeSubs) {
    const plan = sub.plan ?? 'free';
    const entry = planMap.get(plan) ?? { count: 0, mrr: 0 };
    entry.count++;
    entry.mrr += Number(sub.amount_monthly) || 0;
    planMap.set(plan, entry);
  }
  const subscriptions_by_plan = [...planMap.entries()].map(([plan, v]) => ({
    plan: plan as any,
    count: v.count,
    mrr: v.mrr,
  }));

  const fees_earned = txs
    .filter(t => t.status === 'completed')
    .reduce((s: number, t: any) => s + (Number(t.fee_amount) || 0), 0);

  return {
    mrr,
    arr: mrr * 12,
    revenue_period,
    revenue_previous: 0,
    payouts_period,
    payouts_pending,
    invoices_pending_amount: pendingInvoices.reduce((s: number, i: any) => s + Number(i.total), 0),
    invoices_pending_count: pendingInvoices.length,
    invoices_overdue_amount: overdueInvoices.reduce((s: number, i: any) => s + Number(i.total), 0),
    invoices_overdue_count: overdueInvoices.length,
    subscriptions_by_plan,
    transactions_count: txs.length,
    fees_earned,
  };
}

export async function getRevenueByMonth(months: number = 12): Promise<RevenueByMonth[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [txRes, payoutRes] = await Promise.all([
    (supabase as any)
      .from('platform_transactions')
      .select('amount, created_at, status')
      .gte('created_at', since.toISOString())
      .eq('status', 'completed')
      .gt('amount', 0),
    (supabase as any)
      .from('platform_payouts')
      .select('net_amount, created_at, status')
      .gte('created_at', since.toISOString())
      .eq('status', 'completed'),
  ]);

  const txs: any[] = txRes.data ?? [];
  const payoutData: any[] = payoutRes.data ?? [];

  const monthMap = new Map<string, { revenue: number; payouts: number }>();

  for (const tx of txs) {
    const key = tx.created_at.substring(0, 7); // 'YYYY-MM'
    const entry = monthMap.get(key) ?? { revenue: 0, payouts: 0 };
    entry.revenue += Number(tx.amount);
    monthMap.set(key, entry);
  }

  for (const p of payoutData) {
    const key = p.created_at.substring(0, 7);
    const entry = monthMap.get(key) ?? { revenue: 0, payouts: 0 };
    entry.payouts += Number(p.net_amount);
    monthMap.set(key, entry);
  }

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month: month.substring(5), // 'MM'
      revenue: v.revenue,
      payouts: v.payouts,
    })) as RevenueByMonth[];
}

export async function getAllSubscriptions(): Promise<PlatformSubscription[]> {
  const { data, error } = await (supabase as any)
    .from('platform_subscriptions')
    .select('*, organizations!organization_id(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data || []) as any[]).map(row => ({
    ...row,
    organization_name: row.organizations?.name ?? null,
  })) as PlatformSubscription[];
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

// ============================================
// AGENCY FINANCE (client packages)
// ============================================

export type PackageCurrency = 'COP' | 'USD' | 'EUR' | 'MXN';

export interface CurrencyStats {
  currency: PackageCurrency;
  total_sold: number;
  total_collected: number;
  total_pending: number;
  active_packages: number;
  packages_count: number;
}

export interface AgencyPackageStats {
  currencies: CurrencyStats[];
  total_packages: number;
}

export interface ClientPackageRevenue {
  client_id: string;
  client_name: string;
  currency: PackageCurrency;
  packages_count: number;
  total_sold: number;
  total_collected: number;
  total_pending: number;
}

export interface ActiveClientPackage {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  currency: PackageCurrency;
  total_value: number;
  paid_amount: number;
  payment_status: 'pending' | 'partial' | 'paid';
  payment_due_date: string | null;
  content_quantity: number;
  created_at: string;
  is_barter: boolean;
}

export interface BarterPackage {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  content_quantity: number;
  created_at: string;
  is_active: boolean;
}

export async function getAgencyPackageStats(_orgId: string): Promise<AgencyPackageStats> {
  // Excluir canjes — is_barter = false
  const { data, error } = await (supabase as any)
    .from('client_packages')
    .select('total_value, paid_amount, is_active, currency')
    .eq('is_barter', false);

  if (error) throw error;
  const pkgs = (data || []) as { total_value: number; paid_amount: number; is_active: boolean; currency: PackageCurrency }[];

  const map = new Map<PackageCurrency, CurrencyStats>();
  for (const p of pkgs) {
    const cur = p.currency || 'COP';
    const existing = map.get(cur);
    const sold = p.total_value || 0;
    const collected = p.paid_amount || 0;
    if (existing) {
      existing.total_sold += sold;
      existing.total_collected += collected;
      existing.total_pending += sold - collected;
      existing.packages_count += 1;
      if (p.is_active) existing.active_packages += 1;
    } else {
      map.set(cur, {
        currency: cur,
        total_sold: sold,
        total_collected: collected,
        total_pending: sold - collected,
        packages_count: 1,
        active_packages: p.is_active ? 1 : 0,
      });
    }
  }

  return {
    currencies: Array.from(map.values()).sort((a, b) => b.total_sold - a.total_sold),
    total_packages: pkgs.length,
  };
}

export async function getClientPackagesRevenue(_orgId: string): Promise<ClientPackageRevenue[]> {
  // Excluir canjes — is_barter = false
  const { data, error } = await (supabase as any)
    .from('client_packages')
    .select('client_id, total_value, paid_amount, currency, clients(name)')
    .eq('is_barter', false);

  if (error) throw error;

  // Key: clientId+currency — never sum across currencies
  const map = new Map<string, ClientPackageRevenue>();
  for (const row of (data || []) as any[]) {
    const cur: PackageCurrency = row.currency || 'COP';
    const key = `${row.client_id}::${cur}`;
    const existing = map.get(key);
    const sold = row.total_value || 0;
    const collected = row.paid_amount || 0;
    if (existing) {
      existing.packages_count += 1;
      existing.total_sold += sold;
      existing.total_collected += collected;
      existing.total_pending += sold - collected;
    } else {
      map.set(key, {
        client_id: row.client_id,
        client_name: row.clients?.name || 'Sin nombre',
        currency: cur,
        packages_count: 1,
        total_sold: sold,
        total_collected: collected,
        total_pending: sold - collected,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.client_name.localeCompare(b.client_name) || a.currency.localeCompare(b.currency)
  );
}

export async function getActiveClientPackages(_orgId: string): Promise<ActiveClientPackage[]> {
  // Solo paquetes activos que NO son canje
  const { data, error } = await (supabase as any)
    .from('client_packages')
    .select('id, client_id, name, total_value, paid_amount, payment_status, payment_due_date, content_quantity, currency, created_at, is_barter, clients(name)')
    .eq('is_active', true)
    .eq('is_barter', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as any[]).map(row => ({
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.name || 'Sin nombre',
    name: row.name,
    currency: (row.currency || 'COP') as PackageCurrency,
    total_value: row.total_value || 0,
    paid_amount: row.paid_amount || 0,
    payment_status: row.payment_status,
    payment_due_date: row.payment_due_date || null,
    content_quantity: row.content_quantity || 0,
    created_at: row.created_at,
    is_barter: false,
  }));
}

export async function getBarterPackages(_orgId: string): Promise<BarterPackage[]> {
  const { data, error } = await (supabase as any)
    .from('client_packages')
    .select('id, client_id, name, content_quantity, created_at, is_active, clients(name)')
    .eq('is_barter', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as any[]).map(row => ({
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.name || 'Sin nombre',
    name: row.name,
    content_quantity: row.content_quantity || 0,
    created_at: row.created_at,
    is_active: row.is_active ?? false,
  }));
}

// ============================================
// ABONOS / PAGOS POR PAQUETE
// ============================================

export async function addPackagePayment(
  payment: Omit<PackagePayment, 'id' | 'created_at'>
): Promise<PackagePayment> {
  const { data, error } = await (supabase as any)
    .from('client_package_payments')
    .insert(payment)
    .select()
    .single();
  if (error) throw error;
  return data as PackagePayment;
}

export async function getPackagePayments(packageId: string): Promise<PackagePayment[]> {
  const { data, error } = await (supabase as any)
    .from('client_package_payments')
    .select('*')
    .eq('client_package_id', packageId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data || []) as PackagePayment[];
}

export async function deletePackagePayment(paymentId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('client_package_payments')
    .delete()
    .eq('id', paymentId);
  if (error) throw error;
}

// ============================================
// CUOTAS / INSTALLMENTS
// ============================================

export async function getPackageInstallments(packageId: string): Promise<PackageInstallment[]> {
  const { data, error } = await (supabase as any)
    .from('package_installments')
    .select('*')
    .eq('package_id', packageId)
    .order('installment_number', { ascending: true });
  if (error) throw error;
  return (data || []) as PackageInstallment[];
}

export async function addPackageInstallment(
  installment: Omit<PackageInstallment, 'id' | 'created_at' | 'updated_at' | 'reminder_sent_at' | 'reminder_count' | 'paid_amount' | 'paid_date' | 'paid_via_payment_id'>
): Promise<PackageInstallment> {
  const { data, error } = await (supabase as any)
    .from('package_installments')
    .insert(installment)
    .select()
    .single();
  if (error) throw error;
  return data as PackageInstallment;
}

export async function updateInstallmentStatus(
  installmentId: string,
  status: PackageInstallment['status'],
  paidAmount?: number
): Promise<void> {
  const { error } = await (supabase as any)
    .from('package_installments')
    .update({
      status,
      ...(paidAmount !== undefined ? { paid_amount: paidAmount, paid_date: new Date().toISOString().split('T')[0] } : {})
    })
    .eq('id', installmentId);
  if (error) throw error;
}

// ============================================
// AGING DE CARTERA
// ============================================

export async function getReceivablesAging(orgId: string): Promise<AgingRow[]> {
  const { data, error } = await (supabase as any).rpc('fn_receivables_aging', {
    p_organization_id: orgId,
  });
  if (error) throw error;
  return (data || []) as AgingRow[];
}

// ============================================
// RENTABILIDAD POR PAQUETE
// ============================================

export async function getPackageProfitability(orgId: string): Promise<PackageProfitability[]> {
  const { data, error } = await (supabase as any).rpc('fn_package_profitability', {
    p_organization_id: orgId,
  });
  if (error) throw error;
  return (data || []) as PackageProfitability[];
}

// ============================================
// COSTOS DE PAQUETE
// ============================================

export async function getPackageCosts(packageId: string): Promise<PackageCost[]> {
  const { data, error } = await (supabase as any)
    .from('package_costs')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PackageCost[];
}

export async function addPackageCost(
  cost: Omit<PackageCost, 'id' | 'created_at' | 'updated_at'>
): Promise<PackageCost> {
  const { data, error } = await (supabase as any)
    .from('package_costs')
    .insert(cost)
    .select()
    .single();
  if (error) throw error;
  return data as PackageCost;
}

// ============================================
// GASTOS RECURRENTES
// ============================================

export async function getRecurringExpenses(orgId: string): Promise<RecurringExpense[]> {
  const { data, error } = await (supabase as any)
    .from('recurring_expenses')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as RecurringExpense[];
}

export async function addRecurringExpense(
  expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>
): Promise<RecurringExpense> {
  const { data, error } = await (supabase as any)
    .from('recurring_expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data as RecurringExpense;
}

// ============================================
// ASIGNACIONES DE CREADORES A PAQUETES
// ============================================

export async function getCreatorAssignments(packageId: string): Promise<CreatorPackageAssignment[]> {
  const { data, error } = await (supabase as any)
    .from('creator_package_assignments')
    .select('*')
    .eq('client_package_id', packageId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as CreatorPackageAssignment[];
}

export async function addCreatorAssignment(
  assignment: Omit<CreatorPackageAssignment, 'id' | 'created_at' | 'updated_at'>
): Promise<CreatorPackageAssignment> {
  const { data, error } = await (supabase as any)
    .from('creator_package_assignments')
    .insert(assignment)
    .select()
    .single();
  if (error) throw error;
  return data as CreatorPackageAssignment;
}
