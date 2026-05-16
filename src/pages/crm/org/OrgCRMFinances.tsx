import { useState, useMemo } from 'react';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, Clock, Package, AlertTriangle, CalendarClock, Gift,
  ShieldCheck, BarChart3, PlusCircle, Activity, Users, ChevronDown, ChevronRight,
  CheckCircle2, Loader2,
} from 'lucide-react';
import {
  LazyComposedChart,
  LazyChartContainer,
  Area,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from '@/components/ui/lazy-charts';
import { Card } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useAgencyPackageStats,
  useClientPackagesRevenue,
  useActiveClientPackages,
  useBarterPackages,
} from '@/hooks/useFinance';
import type { PackageCurrency, CurrencyStats } from '@/hooks/useFinance';
import {
  usePayrollSummary,
  useCreatePayment,
  usePaidClosuresByMonth,
  useOverduePayments,
  useTalentFinanceRealtime,
} from '@/hooks/useTalentPayments';
import type { PayrollEntry } from '@/hooks/useTalentPayments';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useRealtimeFinanceSync } from '@/hooks/realtime/useRealtimeFinanceSync';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================
// TIPOS INLINE — Aging & Profitability
// ============================================

type AgingBucket = 'current' | '1_30d' | '31_60d' | '61_90d' | 'bad_debt';

interface AgingRow {
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

interface AgingSummary {
  bucket: AgingBucket;
  total: number;
  count: number;
}

interface ProfitabilityRow {
  package_id: string;
  package_name: string;
  client_name: string;
  total_value: number;
  talent_cost: number;
  total_costs: number;
  gross_margin_pct: number;
  currency: string;
}

type PackagePaymentMethod =
  | 'Transferencia'
  | 'Nequi'
  | 'Daviplata'
  | 'Efectivo'
  | 'PayPal'
  | 'Wise'
  | 'Stripe'
  | 'Otro';

interface AbonoForm {
  amount: string;
  payment_method: PackagePaymentMethod;
  reference_number: string;
  payment_date: string;
  notes: string;
}

// ============================================
// TIPOS CASH FLOW
// ============================================

interface CashFlowWeek {
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

type CashFlowScenario = 'conservador' | 'base' | 'optimista';

const SCENARIO_LABELS: Record<CashFlowScenario, string> = {
  conservador: 'Conservador',
  base: 'Base',
  optimista: 'Optimista',
};

const SCENARIO_MULTIPLIERS: Record<CashFlowScenario, number> = {
  conservador: 0.70,
  base: 1.00,
  optimista: 1.10,
};

const SCENARIO_ACTIVE_STYLES: Record<CashFlowScenario, string> = {
  conservador: 'text-red-300 bg-red-500/20 border border-red-500/30',
  base: 'text-blue-300 bg-blue-500/20 border border-blue-500/30',
  optimista: 'text-green-300 bg-green-500/20 border border-green-500/30',
};

function confidenceBadgeClass(score: number): string {
  if (score >= 80) return 'bg-green-500/20 text-green-300';
  if (score >= 55) return 'bg-blue-500/20 text-blue-300';
  return 'bg-yellow-500/20 text-yellow-300';
}

// ============================================
// CONSTANTES DE AGING
// ============================================

const AGING_BUCKET_LABELS: Record<AgingBucket, string> = {
  current: 'Al corriente',
  '1_30d': '1 – 30 días',
  '31_60d': '31 – 60 días',
  '61_90d': '61 – 90 días',
  bad_debt: 'Cartera incobrable',
};

const AGING_BUCKET_COLORS: Record<AgingBucket, string> = {
  current: 'bg-green-500/20 text-green-300 border-green-500/30',
  '1_30d': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  '31_60d': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  '61_90d': 'bg-red-500/20 text-red-300 border-red-500/30',
  bad_debt: 'bg-red-900/30 text-red-200 border-red-700/60 border-2',
};

const AGING_CARD_STYLES: Record<AgingBucket, string> = {
  current: 'from-green-500/20 to-green-600/10 border-green-500/20',
  '1_30d': 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/20',
  '31_60d': 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
  '61_90d': 'from-red-500/20 to-red-600/10 border-red-500/20',
  bad_debt: 'from-red-900/30 to-red-800/20 border-red-700/40',
};

const BUCKET_ORDER: AgingBucket[] = ['current', '1_30d', '31_60d', '61_90d', 'bad_debt'];

// ============================================
// HELPERS DE MARGEN
// ============================================

function marginColor(pct: number): string {
  if (pct >= 50) return 'text-green-400';
  if (pct >= 35) return 'text-blue-400';
  if (pct >= 20) return 'text-yellow-400';
  if (pct >= 5) return 'text-orange-400';
  return 'text-red-400';
}

function marginBadgeClass(pct: number): string {
  if (pct >= 50) return 'bg-green-500/20 text-green-300';
  if (pct >= 35) return 'bg-blue-500/20 text-blue-300';
  if (pct >= 20) return 'bg-yellow-500/20 text-yellow-300';
  if (pct >= 5) return 'bg-orange-500/20 text-orange-300';
  return 'bg-red-500/20 text-red-300';
}

// ============================================
// HELPERS
// ============================================

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

function formatCurrency(value: number, currency: PackageCurrency | string = 'COP') {
  const loc = CURRENCY_LOCALES[currency as PackageCurrency] ?? 'es-CO';
  const dec = CURRENCY_DECIMALS[currency as PackageCurrency] ?? 0;
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency,
    maximumFractionDigits: dec,
  }).format(value);
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-300',
  partial: 'bg-yellow-500/20 text-yellow-300',
  pending: 'bg-red-500/20 text-red-300',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Pagado',
  partial: 'Parcial',
  pending: 'Pendiente',
};

const PAYMENT_METHODS: PackagePaymentMethod[] = [
  'Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'PayPal', 'Wise', 'Stripe', 'Otro',
];

// ============================================
// MAIN COMPONENT
// ============================================

const OrgCRMFinances = () => {
  const { currentOrgId } = useOrgOwner();

  if (!currentOrgId) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="text-center py-16">
          <AlertTriangle className="h-8 w-8 text-yellow-400/50 mx-auto mb-2" />
          <p className="text-sm text-white/40">Selecciona una organización para acceder</p>
        </div>
      </div>
    );
  }

  return <FinancesContent orgId={currentOrgId} />;
};

// ============================================
// CONTENT
// ============================================

const PAYMENT_STATUS_PRIORITY: Record<string, number> = { pending: 0, partial: 1, paid: 2 };

function DueDateBadge({ dueDate, paid }: { dueDate: string | null; paid: boolean }) {
  if (paid) return null;
  if (!dueDate) return (
    <span className="flex items-center gap-1 text-white/30 text-xs">
      <CalendarClock className="w-3 h-3" />
      Sin fecha
    </span>
  );

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
      : `${format(date, 'dd MMM yyyy', { locale: es })}`;

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <CalendarClock className="w-3 h-3" />
      {label}
    </span>
  );
}

// ============================================
// SECCIÓN AGING DE CARTERA
// ============================================

function useReceivablesAging(orgId: string) {
  return useQuery<AgingRow[]>({
    queryKey: ['receivables-aging', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_receivables_aging', { p_organization_id: orgId });
      if (error) throw error;
      return (data ?? []) as AgingRow[];
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

function AgingSection({ orgId, selectedCurrency }: { orgId: string; selectedCurrency: PackageCurrency }) {
  const { data: agingRows = [], isLoading } = useReceivablesAging(orgId);

  const filteredRows = useMemo(
    () => agingRows.filter(r => r.currency === selectedCurrency),
    [agingRows, selectedCurrency],
  );

  const overdueRows = useMemo(
    () => filteredRows.filter(r => r.aging_bucket !== 'current'),
    [filteredRows],
  );

  const summary = useMemo<AgingSummary[]>(() => {
    return BUCKET_ORDER.map(bucket => ({
      bucket,
      total: filteredRows.filter(r => r.aging_bucket === bucket).reduce((s, r) => s + r.pending_amount, 0),
      count: filteredRows.filter(r => r.aging_bucket === bucket).length,
    }));
  }, [filteredRows]);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Calculando cartera...
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <div className="p-6 pb-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-white">
            Aging de Cartera
            <span className="ml-2 text-sm font-normal text-white/40">— {selectedCurrency}</span>
          </h3>
          <p className="text-white/40 text-sm">Clasificación de cartera vencida por antigüedad</p>
        </div>
      </div>

      {/* Cards de resumen por bucket */}
      <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        {summary.map(({ bucket, total, count }) => (
          <div
            key={bucket}
            className={`bg-gradient-to-br ${AGING_CARD_STYLES[bucket]} border rounded-lg p-4`}
          >
            <p className="text-white/50 text-xs mb-1">{AGING_BUCKET_LABELS[bucket]}</p>
            <p className="text-white font-bold text-sm leading-tight">
              {total > 0 ? formatCurrency(total, selectedCurrency) : '—'}
            </p>
            <p className="text-white/40 text-xs mt-1">{count} paquete{count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Tabla de cartera vencida o banner verde */}
      {overdueRows.length === 0 ? (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
            <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-green-300 text-sm font-medium">
              Cartera al corriente — todos los pagos están dentro del plazo
            </p>
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead className="text-white/70">Cliente</TableHead>
              <TableHead className="text-white/70">Paquete</TableHead>
              <TableHead className="text-white/70 text-right">Pendiente</TableHead>
              <TableHead className="text-white/70">Vencimiento</TableHead>
              <TableHead className="text-white/70 text-center">Días vencido</TableHead>
              <TableHead className="text-white/70">Bucket</TableHead>
              <TableHead className="text-white/70 text-center">Risk score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overdueRows.map(row => (
              <TableRow key={row.package_id} className="border-white/10 hover:bg-white/5">
                <TableCell className="text-white font-medium">{row.client_name}</TableCell>
                <TableCell className="text-white/70">{row.package_name}</TableCell>
                <TableCell className="text-right text-orange-400 font-semibold">
                  {formatCurrency(row.pending_amount, selectedCurrency)}
                </TableCell>
                <TableCell className="text-white/50 text-sm">
                  {row.due_date
                    ? format(new Date(row.due_date), 'dd MMM yyyy', { locale: es })
                    : <span className="text-white/30">—</span>
                  }
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-semibold ${row.days_overdue > 60 ? 'text-red-400' : row.days_overdue > 30 ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {row.days_overdue > 0 ? `+${row.days_overdue}d` : '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs border ${AGING_BUCKET_COLORS[row.aging_bucket]}`}>
                    {AGING_BUCKET_LABELS[row.aging_bucket]}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-bold ${row.risk_score >= 80 ? 'text-red-400' : row.risk_score >= 50 ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {row.risk_score ?? '—'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

// ============================================
// SECCIÓN RENTABILIDAD POR PAQUETE
// ============================================

function usePackageProfitability(orgId: string) {
  return useQuery<ProfitabilityRow[]>({
    queryKey: ['package-profitability', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_package_profitability', { p_organization_id: orgId });
      if (error) throw error;
      return (data ?? []) as ProfitabilityRow[];
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
  });
}

function ProfitabilitySection({ orgId, selectedCurrency }: { orgId: string; selectedCurrency: PackageCurrency }) {
  const { data: rows = [], isLoading } = usePackageProfitability(orgId);

  const filteredRows = useMemo(
    () => rows.filter(r => r.currency === selectedCurrency).sort((a, b) => b.gross_margin_pct - a.gross_margin_pct),
    [rows, selectedCurrency],
  );

  const top3Best = useMemo(() => filteredRows.slice(0, 3), [filteredRows]);
  const top3Worst = useMemo(() => [...filteredRows].reverse().slice(0, 3), [filteredRows]);

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Calculando rentabilidad...
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <div className="p-6 pb-4 flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-white">
            Rentabilidad por Paquete
            <span className="ml-2 text-sm font-normal text-white/40">— {selectedCurrency}</span>
          </h3>
          <p className="text-white/40 text-sm">Margen real por paquete descontando costos de talento</p>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="px-6 pb-6">
          <p className="text-white/30 text-sm">Sin datos de rentabilidad para {selectedCurrency}</p>
        </div>
      ) : (
        <>
          {/* Top 3 mejor y peor */}
          <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top 3 más rentables */}
            <div>
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Más rentables
              </p>
              <div className="space-y-2">
                {top3Best.map((row, idx) => (
                  <div
                    key={row.package_id}
                    className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-green-400 text-xs font-bold shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{row.package_name}</p>
                        <p className="text-white/40 text-xs truncate">{row.client_name}</p>
                      </div>
                    </div>
                    <span className="text-green-300 text-sm font-bold shrink-0 ml-2">
                      {row.gross_margin_pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 menos rentables */}
            <div>
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Menos rentables
              </p>
              <div className="space-y-2">
                {top3Worst.map((row, idx) => (
                  <div
                    key={row.package_id}
                    className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-red-400 text-xs font-bold shrink-0">#{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{row.package_name}</p>
                        <p className="text-white/40 text-xs truncate">{row.client_name}</p>
                      </div>
                    </div>
                    <span className="text-red-300 text-sm font-bold shrink-0 ml-2">
                      {row.gross_margin_pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla completa */}
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/70">Paquete</TableHead>
                <TableHead className="text-white/70">Cliente</TableHead>
                <TableHead className="text-white/70 text-right">Valor</TableHead>
                <TableHead className="text-white/70 text-right">Costo talento</TableHead>
                <TableHead className="text-white/70 text-right">Costo total</TableHead>
                <TableHead className="text-white/70 text-center">Margen %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map(row => (
                <TableRow key={row.package_id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{row.package_name}</TableCell>
                  <TableCell className="text-white/70">{row.client_name}</TableCell>
                  <TableCell className="text-white text-right">
                    {formatCurrency(row.total_value, selectedCurrency)}
                  </TableCell>
                  <TableCell className="text-white/60 text-right">
                    {row.talent_cost > 0 ? formatCurrency(row.talent_cost, selectedCurrency) : <span className="text-white/30">—</span>}
                  </TableCell>
                  <TableCell className="text-white/60 text-right">
                    {row.total_costs > 0 ? formatCurrency(row.total_costs, selectedCurrency) : <span className="text-white/30">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${marginBadgeClass(row.gross_margin_pct)}`}>
                      <span className={marginColor(row.gross_margin_pct)}>
                        {row.gross_margin_pct.toFixed(1)}%
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}

// ============================================
// SECCIÓN FLUJO DE CAJA PROYECTADO
// ============================================

function useCashFlowForecast(orgId: string, currency: string) {
  return useQuery<CashFlowWeek[]>({
    queryKey: ['cash-flow-forecast', orgId, currency],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('fn_cash_flow_forecast', {
        p_organization_id: orgId,
        p_currency: currency,
        p_weeks: 12,
      });
      if (error) throw error;
      return (data ?? []) as CashFlowWeek[];
    },
    enabled: !!orgId && !!currency,
    staleTime: 5 * 60 * 1000,
  });
}

function CashFlowSection({ orgId, selectedCurrency }: { orgId: string; selectedCurrency: PackageCurrency }) {
  const { data: weeks = [], isLoading } = useCashFlowForecast(orgId, selectedCurrency);
  const [scenario, setScenario] = useState<CashFlowScenario>('base');
  const m = SCENARIO_MULTIPLIERS[scenario];

  const chartData = useMemo(() => weeks.map(w => {
    const inflow = Math.round((w.inflow_confirmed + w.inflow_estimated) * m);
    const outflow = Math.round(w.outflow_costs + w.outflow_recurring);
    return {
      label: `S${w.week_number}`,
      inflow,
      outflow,
      net: inflow - outflow,
      confidence: w.confidence_score,
    };
  }), [weeks, m]);

  const totalInflow = useMemo(() => chartData.reduce((s, w) => s + w.inflow, 0), [chartData]);
  const totalOutflow = useMemo(() => chartData.reduce((s, w) => s + w.outflow, 0), [chartData]);
  const totalNet = totalInflow - totalOutflow;

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Calculando flujo de caja...
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      {/* Header + toggle escenario */}
      <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white">
              Flujo de Caja Proyectado
              <span className="ml-2 text-sm font-normal text-white/40">— {selectedCurrency} · 12 semanas</span>
            </h3>
            <p className="text-white/40 text-sm">Ingresos esperados vs. egresos proyectados semana a semana</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md p-1 self-start sm:self-auto">
          {(['conservador', 'base', 'optimista'] as CashFlowScenario[]).map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                scenario === s
                  ? SCENARIO_ACTIVE_STYLES[s]
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {SCENARIO_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI resumen 12 semanas */}
      <div className="px-6 pb-4 grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-green-400 text-xs font-medium mb-1">Ingresos proyectados</p>
          <p className="text-white text-base font-bold leading-tight">{formatCurrency(totalInflow, selectedCurrency)}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs font-medium mb-1">Egresos proyectados</p>
          <p className="text-white text-base font-bold leading-tight">{formatCurrency(totalOutflow, selectedCurrency)}</p>
        </div>
        <div className={`border rounded-lg p-3 ${totalNet >= 0 ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-red-900/20 border-red-700/30'}`}>
          <p className={`text-xs font-medium mb-1 ${totalNet >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>Balance neto 12 sem.</p>
          <p className={`text-base font-bold leading-tight ${totalNet >= 0 ? 'text-white' : 'text-red-300'}`}>{formatCurrency(totalNet, selectedCurrency)}</p>
        </div>
      </div>

      {weeks.length === 0 ? (
        <div className="px-6 pb-6 space-y-1">
          <p className="text-white/30 text-sm">Sin datos para proyectar el flujo de caja en {selectedCurrency}.</p>
          <p className="text-white/20 text-xs">Agrega cuotas de pago a los paquetes para ver la proyección.</p>
        </div>
      ) : (
        <>
          {/* Gráfica de área + línea de balance */}
          <div className="px-6 pb-2">
            <LazyChartContainer height={220}>
              <ResponsiveContainer width="100%" height={220}>
              <LazyComposedChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v: number) => {
                    const abs = Math.abs(v);
                    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                    return String(v);
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'inflow' ? 'Ingresos' : name === 'outflow' ? 'Egresos' : 'Balance neto';
                    return [formatCurrency(value, selectedCurrency), label];
                  }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  fill="rgba(34,197,94,0.12)"
                  name="inflow"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="rgba(239,68,68,0.10)"
                  name="outflow"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth={2}
                  dot={{ fill: 'rgba(255,255,255,0.4)', r: 3, strokeWidth: 0 }}
                  name="net"
                />
              </LazyComposedChart>
              </ResponsiveContainer>
            </LazyChartContainer>
            <div className="flex items-center gap-5 mt-2 text-xs text-white/35 justify-center">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full inline-block bg-green-500" />
                Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full inline-block bg-red-500" />
                Egresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 rounded-full inline-block bg-white/60" />
                Balance neto
              </span>
            </div>
          </div>

          {/* Tabla semana a semana */}
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/70">Semana</TableHead>
                <TableHead className="text-white/70 text-right">Ingresos</TableHead>
                <TableHead className="text-white/70 text-right">Egresos</TableHead>
                <TableHead className="text-white/70 text-right">Neto</TableHead>
                <TableHead className="text-white/70 text-center">Confianza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeks.map((w, idx) => {
                const d = chartData[idx];
                const netPositive = d.net >= 0;
                return (
                  <TableRow key={w.week_number} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/70 text-sm">
                      <span className="font-medium text-white">S{w.week_number}</span>
                      <span className="text-white/30 ml-2 text-xs">
                        {format(new Date(w.week_start), 'dd MMM', { locale: es })} – {format(new Date(w.week_end), 'dd MMM', { locale: es })}
                      </span>
                    </TableCell>
                    <TableCell className="text-green-400 text-right">
                      {d.inflow > 0 ? formatCurrency(d.inflow, selectedCurrency) : <span className="text-white/20">—</span>}
                    </TableCell>
                    <TableCell className="text-red-400 text-right">
                      {d.outflow > 0 ? formatCurrency(d.outflow, selectedCurrency) : <span className="text-white/20">—</span>}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${netPositive ? 'text-white' : 'text-red-400'}`}>
                      {formatCurrency(d.net, selectedCurrency)}
                    </TableCell>
                    <TableCell className="text-center">
                      {d.inflow > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceBadgeClass(w.confidence_score)}`}>
                          {w.confidence_score}%
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}

// ============================================
// DIALOG: REGISTRAR ABONO
// ============================================

interface AbonoDialogProps {
  packageId: string;
  packageName: string;
  clientName: string;
  currency: PackageCurrency | string;
  pendingAmount: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM: AbonoForm = {
  amount: '',
  payment_method: 'Transferencia',
  reference_number: '',
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
};

function AbonoDialog({
  packageId,
  packageName,
  clientName,
  currency,
  pendingAmount,
  open,
  onClose,
  onSuccess,
}: AbonoDialogProps) {
  const [form, setForm] = useState<AbonoForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function handleField<K extends keyof AbonoForm>(key: K, value: AbonoForm[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      toast({ title: 'Monto requerido', description: 'Ingresa un monto mayor a 0', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('client_package_payments').insert({
        package_id: packageId,
        amount,
        payment_method: form.payment_method,
        reference_number: form.reference_number || null,
        payment_date: form.payment_date,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast({ title: 'Abono registrado', description: `${formatCurrency(amount, currency)} registrado correctamente` });
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el abono';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (!loading) {
      setForm(EMPTY_FORM);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-green-400" />
            Registrar Abono
          </DialogTitle>
          <div className="pt-1">
            <p className="text-white/60 text-sm">
              <span className="text-white font-medium">{packageName}</span>
              {' · '}{clientName}
            </p>
            <p className="text-orange-400 text-xs mt-0.5">
              Pendiente: {formatCurrency(pendingAmount, currency)}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Monto */}
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">
              Monto <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder={`Ej. ${currency === 'COP' ? '500000' : '500'}`}
              value={form.amount}
              onChange={e => handleField('amount', e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30"
            />
          </div>

          {/* Método de pago */}
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Método de pago</label>
            <select
              value={form.payment_method}
              onChange={e => handleField('payment_method', e.target.value as PackagePaymentMethod)}
              className="w-full bg-white/5 border border-white/15 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m} className="bg-[#111]">{m}</option>
              ))}
            </select>
          </div>

          {/* Referencia */}
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Número de referencia</label>
            <Input
              placeholder="Opcional"
              value={form.reference_number}
              onChange={e => handleField('reference_number', e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Fecha de pago</label>
            <Input
              type="date"
              value={form.payment_date}
              onChange={e => handleField('payment_date', e.target.value)}
              className="bg-white/5 border-white/15 text-white focus:border-white/30"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Notas</label>
            <Textarea
              placeholder="Opcional"
              rows={2}
              value={form.notes}
              onChange={e => handleField('notes', e.target.value)}
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30 resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.amount}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Registrando...' : 'Confirmar abono'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// DIALOG: REGISTRAR PAGO A TALENTO
// ============================================

interface TalentPaymentDialogProps {
  orgId: string;
  entry: PayrollEntry;
  open: boolean;
  onClose: () => void;
}

const TALENT_PAYMENT_METHODS = ['Nequi', 'Daviplata', 'Transferencia', 'Efectivo', 'PayPal', 'Otro'] as const;

function TalentPaymentDialog({ orgId, entry, open, onClose }: TalentPaymentDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(entry.items.map(i => i.id));
  const [method, setMethod] = useState<string>('Nequi');
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const createPayment = useCreatePayment(orgId);
  const qc = useQueryClient();

  const selectedAmount = useMemo(
    () => entry.items.filter(i => selectedIds.includes(i.id)).reduce((s, i) => s + i.amount, 0),
    [entry.items, selectedIds],
  );

  function toggleItem(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      toast({ title: 'Selecciona al menos un proyecto', variant: 'destructive' });
      return;
    }
    const description = [
      `Via ${method}`,
      notes || null,
    ].filter(Boolean).join(' — ');

    await createPayment.mutateAsync({
      user_id: entry.user_id,
      amount: selectedAmount,
      currency: 'COP',
      status: 'paid',
      payment_account_id: null,
      payment_date: payDate,
      content_ids: selectedIds,
      description: description || null,
      notes: null,
      receipt_url: null,
      created_by: null,
    });
    qc.invalidateQueries({ queryKey: ['payroll-summary', orgId] });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={open ? onClose : undefined}>
      <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Registrar pago a {entry.full_name}
          </DialogTitle>
          <p className="text-white/50 text-sm pt-1">
            Selecciona los proyectos incluidos en este pago
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-60 overflow-y-auto pr-1">
          {entry.items.map(item => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleItem(item.id)}
                  className="accent-green-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {item.sequence_number && (
                      <span className="text-white/40 mr-1">#{item.sequence_number}</span>
                    )}
                    {item.title}
                  </p>
                  <p className="text-white/40 text-xs capitalize">{item.role}</p>
                </div>
                <span className="text-green-400 text-sm font-medium shrink-0">
                  {formatCurrency(item.amount, 'COP')}
                </span>
              </label>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Método</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-white/5 border border-white/15 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
            >
              {TALENT_PAYMENT_METHODS.map(m => (
                <option key={m} value={m} className="bg-[#111]">{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/70 text-xs font-medium block mb-1">Fecha de pago</label>
            <Input
              type="date"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
              className="bg-white/5 border-white/15 text-white focus:border-white/30"
            />
          </div>
        </div>

        <div>
          <label className="text-white/70 text-xs font-medium block mb-1">Notas (opcional)</label>
          <Textarea
            placeholder="Referencia, comprobante, etc."
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-white/30 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-white/40 text-xs">{selectedIds.length} proyecto{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}</p>
            <p className="text-green-400 font-bold text-base">{formatCurrency(selectedAmount, 'COP')}</p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={createPayment.isPending}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPayment.isPending || selectedIds.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createPayment.isPending
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Registrando...</>
                : 'Confirmar pago'
              }
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// SECCIÓN PAGOS A CREADORES
// ============================================

function PayrollSection({ orgId }: { orgId: string }) {
  const { data: payroll = [], isLoading } = usePayrollSummary(orgId);
  const { data: overdue = [] } = useOverduePayments(orgId);
  const { data: paidByMonth = [] } = usePaidClosuresByMonth(orgId);
  useTalentFinanceRealtime(orgId);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [payTarget, setPayTarget] = useState<PayrollEntry | null>(null);

  function toggleExpanded(userId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  const totalPending = useMemo(
    () => payroll.reduce((s, e) => s + e.total_pending, 0),
    [payroll],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-white/40 text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        Calculando nómina pendiente...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs nómina */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-white/60 text-sm">Creadores con pago pendiente</span>
          </div>
          <p className="text-2xl font-bold text-white">{payroll.length}</p>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/20 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-white/60 text-sm">Total nómina pendiente</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalPending, 'COP')}</p>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/20 p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-white/60 text-sm">Pagos vencidos</span>
          </div>
          <p className="text-2xl font-bold text-white">{overdue.length}</p>
        </Card>
      </div>

      {/* Lista de nómina pendiente */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-6 pb-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white">Nómina Pendiente</h3>
            <p className="text-white/40 text-sm">Contenidos en status "approved" sin pago registrado</p>
          </div>
        </div>

        {payroll.length === 0 ? (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-green-300 text-sm font-medium">
                Nómina al día — no hay pagos pendientes
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {payroll.map(entry => {
              const expanded = expandedIds.has(entry.user_id);
              return (
                <div key={entry.user_id}>
                  <div className="px-6 py-4 flex items-center gap-4">
                    {/* Avatar + nombre */}
                    <button
                      onClick={() => toggleExpanded(entry.user_id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      {expanded
                        ? <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                      }
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={entry.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-purple-500/20 text-purple-300 text-xs">
                          {entry.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{entry.full_name}</p>
                        <p className="text-white/40 text-xs">{entry.project_count} proyecto{entry.project_count !== 1 ? 's' : ''}</p>
                      </div>
                    </button>

                    {/* Monto + botón pagar */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-orange-400 font-bold">
                        {formatCurrency(entry.total_pending, 'COP')}
                      </span>
                      <button
                        onClick={() => setPayTarget(entry)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/20 transition-colors"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Pagar
                      </button>
                    </div>
                  </div>

                  {/* Detalle de proyectos */}
                  {expanded && (
                    <div className="px-6 pb-4 pl-16">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10">
                            <TableHead className="text-white/50 text-xs">Proyecto</TableHead>
                            <TableHead className="text-white/50 text-xs">Rol</TableHead>
                            <TableHead className="text-white/50 text-xs text-right">Monto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entry.items.map(item => (
                            <TableRow key={item.id} className="border-white/10">
                              <TableCell className="text-white/70 text-sm py-2">
                                {item.sequence_number && (
                                  <span className="text-white/30 mr-1">#{item.sequence_number}</span>
                                )}
                                {item.title}
                              </TableCell>
                              <TableCell className="py-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 capitalize">
                                  {item.role}
                                </span>
                              </TableCell>
                              <TableCell className="text-green-400 text-sm text-right py-2 font-medium">
                                {formatCurrency(item.amount, 'COP')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Historial de pagos cerrados por mes */}
      {paidByMonth.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <div className="p-6 pb-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-white">Historial de Pagos</h3>
              <p className="text-white/40 text-sm">Pagos completados agrupados por mes</p>
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {paidByMonth.map(group => (
              <div key={group.month} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm">{group.label}</p>
                  <p className="text-white/40 text-xs">{group.payment_count} pago{group.payment_count !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-green-400 font-bold">{formatCurrency(group.total_paid, 'COP')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dialog pago a talento */}
      {payTarget && (
        <TalentPaymentDialog
          orgId={orgId}
          entry={payTarget}
          open={!!payTarget}
          onClose={() => setPayTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================
// FINANCES CONTENT
// ============================================

function FinancesContent({ orgId }: { orgId: string }) {
  const { data: stats } = useAgencyPackageStats(orgId);
  const { data: clientRevenue = [] } = useClientPackagesRevenue(orgId);
  const { data: activePackages = [], refetch: refetchPackages } = useActiveClientPackages(orgId);
  const { data: barterPackages = [] } = useBarterPackages(orgId);
  const { connected, lastUpdated } = useRealtimeFinanceSync({ orgId });

  const [activeTab, setActiveTab] = useState<'finanzas' | 'pagos'>('finanzas');

  const [abonoTarget, setAbonoTarget] = useState<{
    packageId: string;
    packageName: string;
    clientName: string;
    currency: string;
    pendingAmount: number;
  } | null>(null);

  const availableCurrencies = useMemo<PackageCurrency[]>(
    () => stats?.currencies?.map(c => c.currency) ?? ['COP'],
    [stats],
  );

  const [selectedCurrency, setSelectedCurrency] = useState<PackageCurrency>('COP');

  const activeCurrencyStats = useMemo<CurrencyStats | undefined>(
    () => stats?.currencies?.find(c => c.currency === selectedCurrency),
    [stats, selectedCurrency],
  );

  // Clients sorted: deuda DESC, luego por total vendido DESC, $0 al final
  const filteredRevenue = useMemo(
    () => clientRevenue
      .filter(r => r.currency === selectedCurrency)
      .sort((a, b) => {
        if (b.total_pending !== a.total_pending) return b.total_pending - a.total_pending;
        return b.total_sold - a.total_sold;
      }),
    [clientRevenue, selectedCurrency],
  );

  // Packages: pending > partial > paid, luego por fecha DESC
  const filteredPackages = useMemo(
    () => activePackages
      .filter(p => p.currency === selectedCurrency)
      .sort((a, b) => {
        const statusDiff = (PAYMENT_STATUS_PRIORITY[a.payment_status] ?? 9)
          - (PAYMENT_STATUS_PRIORITY[b.payment_status] ?? 9);
        if (statusDiff !== 0) return statusDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [activePackages, selectedCurrency],
  );

  // Solo paquetes pendientes/parciales para la sección de alertas
  const pendingPackages = useMemo(
    () => filteredPackages.filter(p => p.payment_status !== 'paid'),
    [filteredPackages],
  );

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">Finanzas Agencia</h1>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                connected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/10 text-white/30 border border-white/10'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
                {connected ? 'En vivo' : 'Conectando...'}
              </span>
            </div>
            <p className="text-white/60 text-sm">
              Ingresos de paquetes, cobros pendientes y flujo de caja
              {lastUpdated && (
                <span className="text-white/30 ml-2">
                  · Actualizado {format(lastUpdated, 'HH:mm:ss', { locale: es })}
                </span>
              )}
            </p>
          </div>

          {/* Currency selector — solo en tab finanzas */}
          {activeTab === 'finanzas' && availableCurrencies.length > 0 && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-sm p-1">
              {availableCurrencies.map(cur => (
                <button
                  key={cur}
                  onClick={() => setSelectedCurrency(cur)}
                  className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                    selectedCurrency === cur
                      ? 'bg-white/15 text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'finanzas' | 'pagos')}>
          <TabsList className="bg-white/5 border border-white/10 mb-4">
            <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
            <TabsTrigger value="pagos">Pagos a Creadores</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab: Pagos a Creadores */}
        {activeTab === 'pagos' && (
          <PayrollSection orgId={orgId} />
        )}

        {/* Tab: Finanzas */}
        {activeTab === 'finanzas' && (<>

        {/* KPIs — scoped to selected currency */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-sm">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-white/60 text-sm">Total Vendido</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(activeCurrencyStats?.total_sold ?? 0, selectedCurrency)}
            </p>
            <p className="text-green-400 text-sm mt-1">
              {activeCurrencyStats?.packages_count ?? 0} paquetes en {selectedCurrency}
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-sm">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-white/60 text-sm">Cobrado</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(activeCurrencyStats?.total_collected ?? 0, selectedCurrency)}
            </p>
            <p className="text-blue-400 text-sm mt-1">
              {activeCurrencyStats && activeCurrencyStats.total_sold > 0
                ? Math.round((activeCurrencyStats.total_collected / activeCurrencyStats.total_sold) * 100)
                : 0}% del total
            </p>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-sm">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <span className="text-white/60 text-sm">Pendiente de Cobro</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(activeCurrencyStats?.total_pending ?? 0, selectedCurrency)}
            </p>
            <p className="text-orange-400 text-sm mt-1">por recuperar</p>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-sm">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-white/60 text-sm">Paquetes Activos</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeCurrencyStats?.active_packages ?? 0}</p>
            <p className="text-purple-400 text-sm mt-1">en {selectedCurrency}</p>
          </Card>
        </div>

        {/* Alerta de cobros pendientes — con botón "+ Abono" */}
        {pendingPackages.length > 0 && (
          <Card className="bg-orange-500/10 border-orange-500/20">
            <div className="p-6 pb-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-white">
                  {pendingPackages.length} paquete{pendingPackages.length > 1 ? 's' : ''} con cobro pendiente
                  <span className="ml-2 text-sm font-normal text-orange-300">— {selectedCurrency}</span>
                </h3>
                <p className="text-orange-300/70 text-sm">
                  Total por recuperar:{' '}
                  <span className="font-semibold text-orange-300">
                    {formatCurrency(
                      pendingPackages.reduce((sum, p) => sum + (p.total_value - p.paid_amount), 0),
                      selectedCurrency,
                    )}
                  </span>
                </p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-orange-500/20">
                  <TableHead className="text-orange-300/70">Paquete</TableHead>
                  <TableHead className="text-orange-300/70">Cliente</TableHead>
                  <TableHead className="text-orange-300/70 text-right">Valor</TableHead>
                  <TableHead className="text-orange-300/70 text-right">Cobrado</TableHead>
                  <TableHead className="text-orange-300/70 text-right">Pendiente</TableHead>
                  <TableHead className="text-orange-300/70">Estado</TableHead>
                  <TableHead className="text-orange-300/70">Fecha Límite</TableHead>
                  <TableHead className="text-orange-300/70">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPackages.map(pkg => (
                  <TableRow key={pkg.id} className="border-orange-500/10 hover:bg-orange-500/5">
                    <TableCell className="text-white font-medium">{pkg.name}</TableCell>
                    <TableCell className="text-white/70">{pkg.client_name}</TableCell>
                    <TableCell className="text-white text-right">
                      {formatCurrency(pkg.total_value, pkg.currency)}
                    </TableCell>
                    <TableCell className="text-green-400 text-right">
                      {formatCurrency(pkg.paid_amount, pkg.currency)}
                    </TableCell>
                    <TableCell className="text-orange-400 text-right font-semibold">
                      {formatCurrency(pkg.total_value - pkg.paid_amount, pkg.currency)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${PAYMENT_STATUS_STYLES[pkg.payment_status] || 'bg-white/10 text-white/50'}`}>
                        {PAYMENT_STATUS_LABELS[pkg.payment_status] || pkg.payment_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DueDateBadge dueDate={pkg.payment_due_date} paid={false} />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setAbonoTarget({
                          packageId: pkg.id,
                          packageName: pkg.name,
                          clientName: pkg.client_name,
                          currency: pkg.currency,
                          pendingAmount: pkg.total_value - pkg.paid_amount,
                        })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/20"
                        aria-label={`Registrar abono para ${pkg.name}`}
                      >
                        <PlusCircle className="w-3 h-3" />
                        Abono
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* === TAREA 1: Aging de Cartera === */}
        <AgingSection orgId={orgId} selectedCurrency={selectedCurrency} />

        {/* === TAREA 2: Rentabilidad por Paquete === */}
        <ProfitabilitySection orgId={orgId} selectedCurrency={selectedCurrency} />

        {/* === TAREA 3: Flujo de Caja Proyectado === */}
        <CashFlowSection orgId={orgId} selectedCurrency={selectedCurrency} />

        {/* Ingresos por cliente */}
        <Card className="bg-white/5 border-white/10">
          <div className="p-6 pb-4">
            <h3 className="text-lg font-semibold text-white">
              Ingresos por Cliente
              <span className="ml-2 text-sm font-normal text-white/40">— {selectedCurrency}</span>
            </h3>
            <p className="text-white/40 text-sm">Ordenado por mayor deuda pendiente</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/70">Cliente</TableHead>
                <TableHead className="text-white/70 text-center">Paquetes</TableHead>
                <TableHead className="text-white/70 text-right">Total Vendido</TableHead>
                <TableHead className="text-white/70 text-right">Cobrado</TableHead>
                <TableHead className="text-white/70 text-right">Pendiente</TableHead>
                <TableHead className="text-white/70 text-right">% Cobrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRevenue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-white/30 py-8">
                    Sin paquetes en {selectedCurrency}
                  </TableCell>
                </TableRow>
              )}
              {filteredRevenue.map((client, idx) => {
                const pct = client.total_sold > 0
                  ? Math.round((client.total_collected / client.total_sold) * 100)
                  : 0;
                const isZero = client.total_sold === 0;
                return (
                  <TableRow
                    key={`${client.client_id}-${idx}`}
                    className={`border-white/10 hover:bg-white/5 ${isZero ? 'opacity-40' : ''}`}
                  >
                    <TableCell className="text-white font-medium">{client.client_name}</TableCell>
                    <TableCell className="text-white/70 text-center">{client.packages_count}</TableCell>
                    <TableCell className="text-white text-right">
                      {isZero ? <span className="text-white/30">—</span> : formatCurrency(client.total_sold, client.currency)}
                    </TableCell>
                    <TableCell className="text-green-400 text-right">
                      {isZero ? <span className="text-white/30">—</span> : formatCurrency(client.total_collected, client.currency)}
                    </TableCell>
                    <TableCell className={`text-right ${client.total_pending > 0 ? 'text-orange-400 font-semibold' : 'text-white/30'}`}>
                      {client.total_pending > 0 ? formatCurrency(client.total_pending, client.currency) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isZero ? (
                        <span className="text-white/30 text-sm">—</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-white/60 text-sm w-8 text-right">{pct}%</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Canjes */}
        {barterPackages.length > 0 && (
          <Card className="bg-purple-500/5 border-purple-500/20">
            <div className="p-6 pb-4 flex items-center gap-3">
              <Gift className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-white">
                  Canjes
                  <span className="ml-2 text-xs font-normal text-purple-300/70 bg-purple-500/10 px-2 py-0.5 rounded-full">
                    {barterPackages.length} paquete{barterPackages.length > 1 ? 's' : ''}
                  </span>
                </h3>
                <p className="text-purple-300/60 text-sm">No generan ingreso monetario · excluidos de KPIs</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/15">
                  <TableHead className="text-purple-300/60">Paquete</TableHead>
                  <TableHead className="text-purple-300/60">Cliente</TableHead>
                  <TableHead className="text-purple-300/60 text-center">Videos</TableHead>
                  <TableHead className="text-purple-300/60">Estado</TableHead>
                  <TableHead className="text-purple-300/60">Inicio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barterPackages.map(pkg => (
                  <TableRow key={pkg.id} className="border-purple-500/10 hover:bg-purple-500/5">
                    <TableCell className="text-white/80 font-medium">{pkg.name}</TableCell>
                    <TableCell className="text-white/60">{pkg.client_name}</TableCell>
                    <TableCell className="text-white/60 text-center">{pkg.content_quantity}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        pkg.is_active
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-white/10 text-white/30'
                      }`}>
                        {pkg.is_active ? 'Activo' : 'Cerrado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-white/40 text-sm">
                      {format(new Date(pkg.created_at), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Todos los paquetes activos */}
        {filteredPackages.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <div className="p-6 pb-4">
              <h3 className="text-lg font-semibold text-white">
                Todos los Paquetes
                <span className="ml-2 text-sm font-normal text-white/40">— {selectedCurrency}</span>
              </h3>
              <p className="text-white/40 text-sm">Pendientes y parciales primero, luego pagados</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/70">Paquete</TableHead>
                  <TableHead className="text-white/70">Cliente</TableHead>
                  <TableHead className="text-white/70 text-center">Videos</TableHead>
                  <TableHead className="text-white/70 text-right">Valor</TableHead>
                  <TableHead className="text-white/70 text-right">Cobrado</TableHead>
                  <TableHead className="text-white/70">Estado Pago</TableHead>
                  <TableHead className="text-white/70">Fecha Límite</TableHead>
                  <TableHead className="text-white/70">Inicio</TableHead>
                  <TableHead className="text-white/70"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map(pkg => {
                  const isPaid = pkg.payment_status === 'paid';
                  return (
                    <TableRow
                      key={pkg.id}
                      className={`border-white/10 hover:bg-white/5 ${pkg.total_value === 0 ? 'opacity-40' : ''}`}
                    >
                      <TableCell className="text-white font-medium">{pkg.name}</TableCell>
                      <TableCell className="text-white/70">{pkg.client_name}</TableCell>
                      <TableCell className="text-white/70 text-center">{pkg.content_quantity}</TableCell>
                      <TableCell className={`text-right ${pkg.total_value === 0 ? 'text-white/30' : 'text-white'}`}>
                        {pkg.total_value === 0 ? '—' : formatCurrency(pkg.total_value, pkg.currency)}
                      </TableCell>
                      <TableCell className={`text-right ${pkg.paid_amount > 0 ? 'text-green-400' : 'text-white/30'}`}>
                        {pkg.paid_amount > 0 ? formatCurrency(pkg.paid_amount, pkg.currency) : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${PAYMENT_STATUS_STYLES[pkg.payment_status] || 'bg-white/10 text-white/50'}`}>
                          {PAYMENT_STATUS_LABELS[pkg.payment_status] || pkg.payment_status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isPaid
                          ? <span className="text-white/20 text-xs">—</span>
                          : <DueDateBadge dueDate={pkg.payment_due_date} paid={false} />
                        }
                      </TableCell>
                      <TableCell className="text-white/50 text-sm">
                        {format(new Date(pkg.created_at), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {!isPaid && pkg.total_value > 0 && (
                          <button
                            onClick={() => setAbonoTarget({
                              packageId: pkg.id,
                              packageName: pkg.name,
                              clientName: pkg.client_name,
                              currency: pkg.currency,
                              pendingAmount: pkg.total_value - pkg.paid_amount,
                            })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/20"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Abono
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        </>)}
      </div>

      {/* Dialog Abono — fuera del scroll para evitar z-index issues */}
      {abonoTarget && (
        <AbonoDialog
          packageId={abonoTarget.packageId}
          packageName={abonoTarget.packageName}
          clientName={abonoTarget.clientName}
          currency={abonoTarget.currency}
          pendingAmount={abonoTarget.pendingAmount}
          open={!!abonoTarget}
          onClose={() => setAbonoTarget(null)}
          onSuccess={() => void refetchPackages()}
        />
      )}
    </div>
  );
}

export default OrgCRMFinances;
