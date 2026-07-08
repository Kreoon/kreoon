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
  campaign_number: number;
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
  campaign_number: number;
  content_quantity: number;
  created_at: string;
  is_active: boolean;
}

// FASE 3 · Bloque B: total_sold/total_collected/total_pending vienen SIEMPRE
// de get_client_billing_totals (RPC compartida con get_org_finance_overview,
// misma fórmula: client_packages + fillmaker_services + fallback de
// client_package_payments). Antes esta función solo sumaba
// client_packages.paid_amount directo, sin fillmaker ni el fallback.
export async function getAgencyPackageStats(_orgId: string): Promise<AgencyPackageStats> {
  const [totals, { data: pkgData, error: pkgError }] = await Promise.all([
    (supabase as any).rpc('get_client_billing_totals', { p_organization_id: _orgId }).then((r: any) => {
      if (r.error) throw r.error;
      return r.data as Array<{ currency: string; total_sold: number; total_collected: number; total_pending: number }>;
    }),
    (supabase as any)
      .from('client_packages')
      .select('is_active, currency')
      .eq('is_barter', false),
  ]);

  if (pkgError) throw pkgError;
  const pkgs = (pkgData || []) as { is_active: boolean; currency: PackageCurrency }[];

  const map = new Map<PackageCurrency, CurrencyStats>();
  for (const row of totals) {
    const cur = (row.currency || 'COP') as PackageCurrency;
    map.set(cur, {
      currency: cur,
      total_sold: row.total_sold,
      total_collected: row.total_collected,
      total_pending: row.total_pending,
      packages_count: 0,
      active_packages: 0,
    });
  }
  for (const p of pkgs) {
    const cur = (p.currency || 'COP') as PackageCurrency;
    const existing = map.get(cur) || {
      currency: cur, total_sold: 0, total_collected: 0, total_pending: 0, packages_count: 0, active_packages: 0,
    };
    existing.packages_count += 1;
    if (p.is_active) existing.active_packages += 1;
    map.set(cur, existing);
  }

  return {
    currencies: Array.from(map.values()).sort((a, b) => b.total_sold - a.total_sold),
    total_packages: pkgs.length,
  };
}

export async function getClientPackagesRevenue(_orgId: string): Promise<ClientPackageRevenue[]> {
  const [totalsResult, { data: pkgData, error: pkgError }] = await Promise.all([
    (supabase as any).rpc('get_client_billing_totals', { p_organization_id: _orgId }),
    (supabase as any)
      .from('client_packages')
      .select('client_id, currency')
      .eq('is_barter', false),
  ]);

  if (totalsResult.error) throw totalsResult.error;
  if (pkgError) throw pkgError;

  const totals = (totalsResult.data || []) as Array<{
    client_id: string; client_name: string; currency: string;
    total_sold: number; total_collected: number; total_pending: number;
  }>;

  const map = new Map<string, ClientPackageRevenue>();
  for (const row of totals) {
    const cur = (row.currency || 'COP') as PackageCurrency;
    const key = `${row.client_id}::${cur}`;
    map.set(key, {
      client_id: row.client_id,
      client_name: row.client_name || 'Sin nombre',
      currency: cur,
      packages_count: 0,
      total_sold: row.total_sold,
      total_collected: row.total_collected,
      total_pending: row.total_pending,
    });
  }

  for (const row of (pkgData || []) as { client_id: string; currency: PackageCurrency }[]) {
    const cur = (row.currency || 'COP') as PackageCurrency;
    const key = `${row.client_id}::${cur}`;
    const existing = map.get(key);
    if (existing) existing.packages_count += 1;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.client_name.localeCompare(b.client_name) || a.currency.localeCompare(b.currency)
  );
}

export async function getActiveClientPackages(_orgId: string): Promise<ActiveClientPackage[]> {
  // Solo paquetes activos que NO son canje
  const { data, error } = await (supabase as any)
    .from('client_packages')
    .select('id, client_id, name, campaign_number, total_value, paid_amount, payment_status, payment_due_date, content_quantity, currency, created_at, is_barter, clients(name)')
    .eq('is_active', true)
    .eq('is_barter', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as any[]).map(row => ({
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.name || 'Sin nombre',
    name: row.name,
    campaign_number: row.campaign_number || 0,
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
    .select('id, client_id, name, campaign_number, content_quantity, created_at, is_active, clients(name)')
    .eq('is_barter', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as any[]).map(row => ({
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.name || 'Sin nombre',
    name: row.name,
    campaign_number: row.campaign_number || 0,
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
// COSTOS OPERATIVOS
// ============================================

export interface OrgFinancialCost {
  id: string;
  organization_id: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  client_package_id: string | null;
  package_name?: string | null;
  cost_date: string;
  notes: string | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CostCategory =
  | 'operativo'
  | 'plataforma'
  | 'equipo'
  | 'agencia'
  | 'impuesto'
  | 'talento'
  | 'otro';

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  operativo: 'Operativo (arriendo, servicios)',
  plataforma: 'Plataformas (apps, suscripciones)',
  equipo: 'Equipo (cámaras, computadores)',
  agencia: 'Agencia / Marketing',
  impuesto: 'Impuestos',
  talento: 'Pagos a talento extra',
  otro: 'Otro',
};

export async function getFinancialCosts(
  orgId: string,
  filters?: { category?: string; currency?: string; packageId?: string }
): Promise<OrgFinancialCost[]> {
  let query = (supabase as any)
    .from('org_financial_costs')
    .select('*, client_packages(name, campaign_number)')
    .eq('organization_id', orgId)
    .order('cost_date', { ascending: false });

  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.currency) query = query.eq('currency', filters.currency);
  if (filters?.packageId) query = query.eq('client_package_id', filters.packageId);

  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as any[]).map(row => ({
    ...row,
    package_name: row.client_packages
      ? `#${String(row.client_packages.campaign_number).padStart(4, '0')} ${row.client_packages.name}`
      : null,
    client_packages: undefined,
  }));
}

export async function createFinancialCost(
  cost: Omit<OrgFinancialCost, 'id' | 'created_at' | 'updated_at' | 'package_name'>
): Promise<OrgFinancialCost> {
  const { data, error } = await (supabase as any)
    .from('org_financial_costs')
    .insert(cost)
    .select()
    .single();
  if (error) throw error;
  return data as OrgFinancialCost;
}

export async function updateFinancialCost(
  id: string,
  updates: Partial<Omit<OrgFinancialCost, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'package_name'>>
): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_financial_costs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFinancialCost(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_financial_costs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function uploadFinancialReceipt(
  orgId: string,
  file: File
): Promise<{ url: string; filename: string }> {
  const ext = file.name.split('.').pop();
  const path = `${orgId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('financial-receipts')
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('financial-receipts').getPublicUrl(path);
  return { url: data.publicUrl, filename: file.name };
}

export async function deleteFinancialReceipt(url: string): Promise<void> {
  const path = url.split('/financial-receipts/')[1];
  if (!path) return;
  await supabase.storage.from('financial-receipts').remove([path]);
}

// ============================================
// CIERRES FINANCIEROS
// ============================================

export interface OrgFinancialClosing {
  id: string;
  organization_id: string;
  name: string;
  period_start: string;
  period_end: string;
  total_income: number;
  total_costs: number;
  currency: string;
  status: 'open' | 'closed';
  notes: string | null;
  created_by: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialPeriodSummary {
  total_income: number;
  total_costs: number;
  net_profit: number;
  income_by_client: Array<{ client: string; total: number }>;
  costs_by_category: Array<{ category: string; total: number }>;
  packages_count: number;
}

export async function getFinancialClosings(orgId: string): Promise<OrgFinancialClosing[]> {
  const { data, error } = await (supabase as any)
    .from('org_financial_closings')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as OrgFinancialClosing[];
}

export async function createFinancialClosing(
  closing: Omit<OrgFinancialClosing, 'id' | 'created_at' | 'updated_at' | 'closed_by' | 'closed_at'>
): Promise<OrgFinancialClosing> {
  const { data, error } = await (supabase as any)
    .from('org_financial_closings')
    .insert(closing)
    .select()
    .single();
  if (error) throw error;
  return data as OrgFinancialClosing;
}

export async function updateFinancialClosing(
  id: string,
  updates: Partial<Pick<OrgFinancialClosing, 'name' | 'status' | 'notes' | 'total_income' | 'total_costs' | 'closed_by' | 'closed_at'>>
): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_financial_closings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteFinancialClosing(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('org_financial_closings')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function getFinancialPeriodSummary(
  orgId: string,
  start: string,
  end: string,
  currency: string = 'COP'
): Promise<FinancialPeriodSummary> {
  const { data, error } = await (supabase as any).rpc('get_financial_period_summary', {
    p_org_id: orgId,
    p_start: start,
    p_end: end,
    p_currency: currency,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_income: Number(row?.total_income ?? 0),
    total_costs: Number(row?.total_costs ?? 0),
    net_profit: Number(row?.net_profit ?? 0),
    income_by_client: row?.income_by_client ?? [],
    costs_by_category: row?.costs_by_category ?? [],
    packages_count: Number(row?.packages_count ?? 0),
  };
}

// ============================================
// CUOTAS DE PAQUETE (package_installments)
// ============================================

export interface PackageInstallmentRow {
  id: string;
  organization_id: string;
  package_id: string;
  installment_number: number;
  total_installments: number;
  due_date: string;
  expected_amount: number;
  currency: string;
  status: 'scheduled' | 'invoiced' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listPackageInstallments(packageId: string): Promise<PackageInstallmentRow[]> {
  const { data, error } = await (supabase as any)
    .from('package_installments')
    .select('*')
    .eq('package_id', packageId)
    .order('installment_number', { ascending: true });
  if (error) throw error;
  return (data || []) as PackageInstallmentRow[];
}

export async function createPackageInstallments(
  orgId: string,
  packageId: string,
  currency: string,
  installments: Array<{ due_date: string; expected_amount: number; notes?: string | null }>,
): Promise<void> {
  // Borrar las existentes primero (reemplazo completo)
  await (supabase as any).from('package_installments').delete().eq('package_id', packageId);

  const total = installments.length;
  const rows = installments.map((inst, i) => ({
    organization_id: orgId,
    package_id: packageId,
    installment_number: i + 1,
    total_installments: total,
    due_date: inst.due_date,
    expected_amount: inst.expected_amount,
    currency,
    status: 'scheduled',
    paid_amount: 0,
    notes: inst.notes ?? null,
  }));

  if (rows.length === 0) return;
  const { error } = await (supabase as any).from('package_installments').insert(rows);
  if (error) throw error;
}

export async function deletePackageInstallments(packageId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('package_installments')
    .delete()
    .eq('package_id', packageId);
  if (error) throw error;
}

// ============================================
// GASTOS RECURRENTES (recurring_expenses)
// ============================================

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface RecurringExpenseRow {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  next_due_date: string | null;
  payment_method: string | null;
  vendor: string | null;
  is_active: boolean;
  auto_renew: boolean;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual',
};

export async function listRecurringExpenses(orgId: string): Promise<RecurringExpenseRow[]> {
  const { data, error } = await (supabase as any)
    .from('recurring_expenses')
    .select('*')
    .eq('organization_id', orgId)
    .order('is_active', { ascending: false })
    .order('next_due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as RecurringExpenseRow[];
}

export async function createRecurringExpense(
  expense: Omit<RecurringExpenseRow, 'id' | 'created_at' | 'updated_at'>,
): Promise<RecurringExpenseRow> {
  const { data, error } = await (supabase as any)
    .from('recurring_expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data as RecurringExpenseRow;
}

export async function updateRecurringExpense(
  id: string,
  updates: Partial<Omit<RecurringExpenseRow, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from('recurring_expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('recurring_expenses')
    .delete()
    .eq('id', id);
  if (error) throw error;
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
