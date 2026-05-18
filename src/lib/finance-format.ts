import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import type { ReactElement } from 'react';
import { createElement } from 'react';

export type PackageCurrency = 'COP' | 'USD' | 'EUR' | 'MXN';

const CURRENCY_LOCALES: Record<PackageCurrency, string> = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'de-DE',
  MXN: 'es-MX',
};

const CURRENCY_DECIMALS: Record<PackageCurrency, number> = {
  COP: 0,
  USD: 2,
  EUR: 2,
  MXN: 0,
};

export function formatCurrency(value: number, currency: PackageCurrency | string = 'COP'): string {
  const loc = CURRENCY_LOCALES[currency as PackageCurrency] ?? 'es-CO';
  const dec = CURRENCY_DECIMALS[currency as PackageCurrency] ?? 0;
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency,
    maximumFractionDigits: dec,
  }).format(value);
}

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-300',
  partial: 'bg-yellow-500/20 text-yellow-300',
  pending: 'bg-red-500/20 text-red-300',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  partial: 'Parcial',
  pending: 'Pendiente',
};

export const PAYMENT_STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  partial: 1,
  paid: 2,
};

export type PackagePaymentMethod =
  | 'Transferencia' | 'Nequi' | 'Daviplata' | 'Efectivo'
  | 'PayPal' | 'Wise' | 'Stripe' | 'Otro';

export const PAYMENT_METHODS: PackagePaymentMethod[] = [
  'Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'PayPal', 'Wise', 'Stripe', 'Otro',
];

// ============================================
// AGING
// ============================================

export type AgingBucket = 'current' | '1_30d' | '31_60d' | '61_90d' | 'bad_debt';

export const AGING_BUCKET_LABELS: Record<AgingBucket, string> = {
  current: 'Al corriente',
  '1_30d': '1 – 30 días',
  '31_60d': '31 – 60 días',
  '61_90d': '61 – 90 días',
  bad_debt: 'Cartera incobrable',
};

export const AGING_BUCKET_COLORS: Record<AgingBucket, string> = {
  current: 'bg-green-500/20 text-green-300 border-green-500/30',
  '1_30d': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  '31_60d': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  '61_90d': 'bg-red-500/20 text-red-300 border-red-500/30',
  bad_debt: 'bg-red-900/30 text-red-200 border-red-700/60 border-2',
};

export const AGING_CARD_STYLES: Record<AgingBucket, string> = {
  current: 'from-green-500/20 to-green-600/10 border-green-500/20',
  '1_30d': 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20',
  '31_60d': 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
  '61_90d': 'from-red-500/20 to-red-600/10 border-red-500/20',
  bad_debt: 'from-red-900/30 to-red-800/20 border-red-700/40',
};

export const BUCKET_ORDER: AgingBucket[] = ['current', '1_30d', '31_60d', '61_90d', 'bad_debt'];

// ============================================
// MARGEN
// ============================================

export function marginColor(pct: number): string {
  if (pct >= 50) return 'text-green-400';
  if (pct >= 35) return 'text-blue-400';
  if (pct >= 20) return 'text-yellow-400';
  if (pct >= 5) return 'text-orange-400';
  return 'text-red-400';
}

export function marginBadgeClass(pct: number): string {
  if (pct >= 50) return 'bg-green-500/20 text-green-300';
  if (pct >= 35) return 'bg-blue-500/20 text-blue-300';
  if (pct >= 20) return 'bg-yellow-500/20 text-yellow-300';
  if (pct >= 5) return 'bg-orange-500/20 text-orange-300';
  return 'bg-red-500/20 text-red-300';
}

// ============================================
// CASH FLOW
// ============================================

export type CashFlowScenario = 'conservador' | 'base' | 'optimista';

export const SCENARIO_LABELS: Record<CashFlowScenario, string> = {
  conservador: 'Conservador',
  base: 'Base',
  optimista: 'Optimista',
};

export const SCENARIO_MULTIPLIERS: Record<CashFlowScenario, number> = {
  conservador: 0.70,
  base: 1.00,
  optimista: 1.10,
};

export const SCENARIO_ACTIVE_STYLES: Record<CashFlowScenario, string> = {
  conservador: 'text-red-300 bg-red-500/20 border border-red-500/30',
  base: 'text-blue-300 bg-blue-500/20 border border-blue-500/30',
  optimista: 'text-green-300 bg-green-500/20 border border-green-500/30',
};

export function confidenceBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-500/20 text-green-300';
  if (score >= 55) return 'bg-blue-500/20 text-blue-300';
  return 'bg-yellow-500/20 text-yellow-300';
}

// ============================================
// DUE DATE BADGE
// ============================================

export interface DueDateBadgeProps {
  dueDate: string | null;
  paid: boolean;
}

export function DueDateBadge({ dueDate, paid }: DueDateBadgeProps): ReactElement | null {
  if (paid) return null;
  if (!dueDate) {
    return createElement(
      'span',
      { className: 'flex items-center gap-1 text-white/30 text-xs' },
      createElement(CalendarClock, { className: 'w-3 h-3' }),
      'Sin fecha',
    );
  }

  const date = new Date(dueDate);
  const days = differenceInDays(date, new Date());
  const overdue = isPast(date) && !isToday(date);
  const today = isToday(date);
  const urgent = !overdue && days <= 3;

  const color = overdue
    ? 'text-red-400'
    : today
      ? 'text-red-300'
      : urgent
        ? 'text-orange-400'
        : 'text-white/60';

  const label = overdue
    ? `Vencido hace ${Math.abs(days)}d`
    : today
      ? 'Vence hoy'
      : format(date, 'dd MMM yyyy', { locale: es });

  return createElement(
    'span',
    { className: `flex items-center gap-1 text-xs font-medium ${color}` },
    createElement(CalendarClock, { className: 'w-3 h-3' }),
    label,
  );
}

// ============================================
// SHARED TYPES
// ============================================

export interface AgingRow {
  package_id: string;
  client_id: string;
  client_name: string;
  package_name: string;
  pending_amount: number;
  total_value: number;
  paid_amount: number;
  due_date: string | null;
  days_overdue: number;
  aging_bucket: AgingBucket;
  risk_score: number;
  currency: string;
}

export interface ProfitabilityRow {
  package_id: string;
  package_name: string;
  campaign_number: number;
  client_name: string;
  total_value: number;
  talent_cost: number;
  other_costs: number;
  external_costs?: number;
  total_costs: number;
  gross_margin: number;
  gross_margin_pct: number;
  currency: string;
  content_count: number;
  content_quantity: number;
}

export interface CashFlowWeek {
  week_number: number;
  week_start: string;
  week_end: string;
  inflow_confirmed: number;
  inflow_estimated: number;
  outflow_costs: number;
  outflow_recurring: number;
  net_week: number;
  confidence_score: number;
}

export interface AbonoForm {
  amount: string;
  payment_method: PackagePaymentMethod;
  reference_number: string;
  payment_date: string;
  notes: string;
}
