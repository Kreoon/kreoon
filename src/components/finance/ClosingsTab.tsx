import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Lock, Unlock, Trash2, ChevronDown, ChevronUp, Loader2, FolderOpen,
  TrendingUp, TrendingDown, Minus, Download, FileText, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  useFinancialClosings,
  useCreateFinancialClosing,
  useUpdateFinancialClosing,
  useDeleteFinancialClosing,
  useFinancialPeriodSummary,
} from '@/hooks/useFinance';
import { useOrgFinanceOverview } from '@/hooks/useFinanceOverview';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import type { OrgFinancialClosing } from '@/hooks/useFinance';
import { COST_CATEGORY_LABELS } from '@/hooks/useFinance';
import { formatCurrency } from '@/lib/finance-format';
import { TabIntro, HelpTip, HealthBadge } from './FinanceHelp';

type StatusFilter = 'all' | 'open' | 'closed';

const fmt = (n: number, cur: string) => formatCurrency(n, cur);

// ─── Waterfall chart simple (CSS-based) ──────────────────────────────────────

interface WaterfallProps {
  income: number;
  costs: number;
  payroll: number;
  net: number;
  currency: string;
}

function WaterfallChart({ income, costs, payroll, net, currency }: WaterfallProps) {
  const maxAbs = Math.max(income, Math.abs(net), costs + payroll);
  const w = (v: number) => maxAbs > 0 ? (Math.abs(v) / maxAbs) * 100 : 0;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-white/70">Cobrado en período</span>
          <span className="text-sm font-semibold text-green-400">{fmt(income, currency)}</span>
        </div>
        <div className="h-3 bg-white/5 rounded overflow-hidden">
          <div className="h-full bg-green-500 rounded" style={{ width: `${w(income)}%` }} />
        </div>
      </div>

      {costs > 0 && (
        <div className="pl-4 border-l-2 border-red-500/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-white/70 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              Costos operativos
            </span>
            <span className="text-sm font-semibold text-red-400">−{fmt(costs, currency)}</span>
          </div>
          <div className="h-3 bg-white/5 rounded overflow-hidden">
            <div className="h-full bg-red-500/70 rounded" style={{ width: `${w(costs)}%` }} />
          </div>
        </div>
      )}

      {payroll > 0 && (
        <div className="pl-4 border-l-2 border-orange-500/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-white/70 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-orange-400" />
              Nómina talento
            </span>
            <span className="text-sm font-semibold text-orange-400">−{fmt(payroll, currency)}</span>
          </div>
          <div className="h-3 bg-white/5 rounded overflow-hidden">
            <div className="h-full bg-orange-500/70 rounded" style={{ width: `${w(payroll)}%` }} />
          </div>
        </div>
      )}

      <div className={`mt-4 p-3 rounded-md border ${net >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${net >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            Utilidad neta
          </span>
          <span className={`text-lg font-bold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(net, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Vista expandida del cierre ──────────────────────────────────────────────

function ExpandedClosing({ closing, orgId }: { closing: OrgFinancialClosing; orgId: string }) {
  const { data: summary, isLoading } = useFinancialPeriodSummary(
    orgId, closing.period_start, closing.period_end, closing.currency
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando detalle…
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="px-4 pb-4 pt-2 space-y-4 border-t border-white/5">
      {summary.income_by_client.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Ingresos por cliente</p>
          <div className="space-y-1">
            {summary.income_by_client.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.client}</span>
                <span className="font-medium text-green-400">{fmt(row.total, closing.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.costs_by_category.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Costos por categoría</p>
          <div className="space-y-1">
            {summary.costs_by_category.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {COST_CATEGORY_LABELS[row.category as keyof typeof COST_CATEGORY_LABELS] ?? row.category}
                </span>
                <span className="font-medium text-red-400">−{fmt(row.total, closing.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {closing.notes && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notas del cierre</p>
          <p className="text-sm text-muted-foreground">{closing.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Vista previa de un período ──────────────────────────────────────────────

function PeriodSummaryCard({
  orgId, start, end, currency,
}: { orgId: string; start: string; end: string; currency: string }) {
  const { data: summary, isLoading } = useFinancialPeriodSummary(
    orgId, start, end, currency,
    !!(start && end)
  );

  if (!start || !end) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculando…
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="rounded-sm border border-white/10 bg-white/3 p-4 space-y-3">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vista previa</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
          <p className="font-semibold text-green-400">{fmt(summary.total_income, currency)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{summary.packages_count} pago(s)</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Costos</p>
          <p className="font-semibold text-red-400">{fmt(summary.total_costs, currency)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Utilidad</p>
          <p className={`font-bold text-base ${summary.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(summary.net_profit, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Exportar CSV ────────────────────────────────────────────────────────────

async function exportClosingCSV(
  closing: OrgFinancialClosing,
  orgId: string,
) {
  const { data: payments } = await (supabase as any)
    .from('client_package_payments')
    .select('amount, payment_date, payment_method, reference_number, notes, client_packages(name, campaign_number, clients(name))')
    .eq('organization_id', orgId)
    .eq('currency', closing.currency)
    .gte('payment_date', closing.period_start)
    .lte('payment_date', closing.period_end)
    .order('payment_date');

  const { data: costs } = await (supabase as any)
    .from('org_financial_costs')
    .select('name, amount, category, cost_date, notes, client_packages(name, campaign_number)')
    .eq('organization_id', orgId)
    .eq('currency', closing.currency)
    .gte('cost_date', closing.period_start)
    .lte('cost_date', closing.period_end)
    .order('cost_date');

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: string[] = [];

  rows.push(esc(`Cierre Financiero — ${closing.name}`));
  rows.push(esc(`Período: ${closing.period_start} a ${closing.period_end} · Moneda: ${closing.currency}`));
  rows.push('');

  // Ingresos
  rows.push(esc('=== INGRESOS ==='));
  rows.push(['Fecha', 'Cliente', 'Campaña', 'Método', 'Referencia', 'Monto', 'Notas'].map(esc).join(','));
  let totalIngresos = 0;
  for (const p of (payments ?? []) as any[]) {
    const camp = p.client_packages
      ? `#${String(p.client_packages.campaign_number).padStart(4, '0')} ${p.client_packages.name}`
      : '';
    rows.push([
      esc(p.payment_date),
      esc(p.client_packages?.clients?.name ?? ''),
      esc(camp),
      esc(p.payment_method),
      esc(p.reference_number ?? ''),
      esc(p.amount),
      esc(p.notes ?? ''),
    ].join(','));
    totalIngresos += Number(p.amount);
  }
  rows.push([esc('Total ingresos'), esc(''), esc(''), esc(''), esc(''), esc(totalIngresos), esc('')].join(','));

  rows.push('');
  rows.push(esc('=== COSTOS ==='));
  rows.push(['Fecha', 'Concepto', 'Categoría', 'Campaña vinculada', 'Monto', 'Notas'].map(esc).join(','));
  let totalCostos = 0;
  for (const c of (costs ?? []) as any[]) {
    const camp = c.client_packages
      ? `#${String(c.client_packages.campaign_number).padStart(4, '0')} ${c.client_packages.name}`
      : '';
    rows.push([
      esc(c.cost_date),
      esc(c.name),
      esc(c.category),
      esc(camp),
      esc(c.amount),
      esc(c.notes ?? ''),
    ].join(','));
    totalCostos += Number(c.amount);
  }
  rows.push([esc('Total costos'), esc(''), esc(''), esc(''), esc(totalCostos), esc('')].join(','));

  rows.push('');
  rows.push(esc('=== RESUMEN ==='));
  rows.push([esc('Total ingresos'), esc(totalIngresos)].join(','));
  rows.push([esc('Total costos'), esc(totalCostos)].join(','));
  rows.push([esc('Utilidad neta'), esc(totalIngresos - totalCostos)].join(','));

  const csv = '﻿' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cierre_${closing.name.replace(/\s+/g, '_')}_${closing.period_start}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Componente principal ────────────────────────────────────────────────────

interface Props {
  orgId: string;
}

export function ClosingsTab({ orgId }: Props) {
  const { startDate, endDate, currency } = useFinanceFilters();
  const { data: globalOverview } = useOrgFinanceOverview(orgId, startDate, endDate, currency);

  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const [form, setForm] = useState({
    name: '',
    period_start: '',
    period_end: '',
    currency: 'COP',
    notes: '',
  });

  const { data: closings = [], isLoading } = useFinancialClosings(orgId);
  const createClosing = useCreateFinancialClosing();
  const updateClosing = useUpdateFinancialClosing();
  const deleteClosing = useDeleteFinancialClosing();

  const { data: previewSummary } = useFinancialPeriodSummary(
    orgId, form.period_start, form.period_end, form.currency,
    !!(form.period_start && form.period_end)
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const c of closings) {
      years.add(c.period_start.slice(0, 4));
    }
    return Array.from(years).sort().reverse();
  }, [closings]);

  const filteredClosings = useMemo(() => closings.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (yearFilter !== 'all' && !c.period_start.startsWith(yearFilter)) return false;
    return true;
  }), [closings, statusFilter, yearFilter]);

  function openCreate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    setForm({
      name: `Cierre ${now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`,
      period_start: `${y}-${m}-01`,
      period_end: new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0],
      currency,
      notes: '',
    });
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.period_start || !form.period_end) {
      toast({ title: 'Faltan datos', description: 'Nombre y período son requeridos.', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await createClosing.mutateAsync({
        organization_id: orgId,
        name: form.name.trim(),
        period_start: form.period_start,
        period_end: form.period_end,
        currency: form.currency,
        total_income: previewSummary?.total_income ?? 0,
        total_costs: previewSummary?.total_costs ?? 0,
        status: 'open',
        notes: form.notes.trim() || null,
        created_by: user?.id ?? null,
      });
      toast({ title: 'Cierre creado' });
      setCreateOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function handleToggleStatus(closing: OrgFinancialClosing) {
    setToggling(closing.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isClosing = closing.status === 'open';

      let totalIncome = closing.total_income;
      let totalCosts = closing.total_costs;
      if (isClosing) {
        try {
          const summary = await import('@/services/finance/financeService').then(mod =>
            mod.getFinancialPeriodSummary(orgId, closing.period_start, closing.period_end, closing.currency)
          );
          totalIncome = summary.total_income;
          totalCosts = summary.total_costs;
        } catch { /* fallback al valor stored */ }
      }

      await updateClosing.mutateAsync({
        id: closing.id,
        updates: {
          status: isClosing ? 'closed' : 'open',
          total_income: totalIncome,
          total_costs: totalCosts,
          closed_by: isClosing ? (user?.id ?? null) : null,
          closed_at: isClosing ? new Date().toISOString() : null,
        },
      });
      toast({ title: isClosing ? 'Período cerrado' : 'Período reabierto' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteClosing.mutateAsync(id);
      toast({ title: 'Cierre eliminado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  }

  async function handleExport(closing: OrgFinancialClosing) {
    setExporting(closing.id);
    try {
      await exportClosingCSV(closing, orgId);
      toast({ title: 'CSV descargado' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  }

  const f = (field: keyof typeof form, val: string) =>
    setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="space-y-6">
      {/* ─── Intro ──────────────────────────────────────────── */}
      <TabIntro
        emoji="📊"
        title="¿Cómo cerró el mes? ¿La agencia ganó o perdió?"
        subtitle="Aquí guardas el resumen de cada período: cuánto entró, cuánto se gastó y cuánto quedó de utilidad."
        accent="purple"
        bullets={[
          'Las 4 tarjetas de arriba son la foto del período actual: Ingresos − Costos − Nómina = Utilidad neta.',
          'La barra "Flujo del período" muestra visualmente de dónde sale y a dónde va el dinero.',
          'Crea un cierre para guardar la foto de un mes y poder exportarlo a Excel cuando lo necesites.',
        ]}
      />

      {/* ─── Hero KPIs del período global ─────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-white">{fmt(globalOverview?.total_revenue ?? 0, currency)}</p>
          <p className="text-green-400 text-xs mt-1">cobrado en el período</p>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">Costos</span>
          </div>
          <p className="text-2xl font-bold text-white">{fmt(globalOverview?.total_costs ?? 0, currency)}</p>
          <p className="text-red-400 text-xs mt-1">operativos + plataforma</p>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">Nómina</span>
          </div>
          <p className="text-2xl font-bold text-white">{fmt(globalOverview?.payroll ?? 0, currency)}</p>
          <p className="text-orange-400 text-xs mt-1">pagado a talento</p>
        </Card>

        <Card className={`bg-gradient-to-br p-5 ${
          (globalOverview?.net_profit ?? 0) >= 0
            ? 'from-purple-500/20 to-purple-600/10 border-purple-500/20'
            : 'from-red-500/30 to-red-600/20 border-red-500/30'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded ${(globalOverview?.net_profit ?? 0) >= 0 ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
              {(globalOverview?.net_profit ?? 0) >= 0
                ? <TrendingUp className="w-5 h-5 text-purple-400" />
                : <TrendingDown className="w-5 h-5 text-red-400" />}
            </div>
            <span className="text-white/60 text-xs uppercase tracking-wide">Utilidad neta</span>
          </div>
          <p className={`text-2xl font-bold ${(globalOverview?.net_profit ?? 0) >= 0 ? 'text-white' : 'text-red-300'}`}>
            {fmt(globalOverview?.net_profit ?? 0, currency)}
          </p>
          <p className={`text-xs mt-1 ${(globalOverview?.net_profit ?? 0) >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
            {globalOverview?.margin_pct ?? 0}% margen
          </p>
        </Card>
      </div>

      {/* ─── Waterfall del período actual ─────────────────── */}
      {globalOverview && (
        <Card className="bg-white/5 border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Flujo del período</h3>
            <span className="text-xs text-white/40 ml-2">
              {format(parseISO(startDate), 'd MMM', { locale: es })} — {format(parseISO(endDate), 'd MMM yyyy', { locale: es })}
            </span>
          </div>
          <WaterfallChart
            income={globalOverview.total_revenue}
            costs={globalOverview.total_costs}
            payroll={globalOverview.payroll}
            net={globalOverview.net_profit}
            currency={currency}
          />
        </Card>
      )}

      {/* ─── Lista de cierres ──────────────────────────────── */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-semibold text-white">Cierres registrados</h3>
            <p className="text-white/40 text-xs">
              {filteredClosings.length} cierre{filteredClosings.length !== 1 ? 's' : ''} de {closings.length}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
            >
              <option value="all" className="bg-[#111]">Todos</option>
              <option value="open" className="bg-[#111]">Abiertos</option>
              <option value="closed" className="bg-[#111]">Cerrados</option>
            </select>

            {availableYears.length > 1 && (
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
              >
                <option value="all" className="bg-[#111]">Todos los años</option>
                {availableYears.map(y => (
                  <option key={y} value={y} className="bg-[#111]">{y}</option>
                ))}
              </select>
            )}

            <Button size="sm" onClick={openCreate} className="gap-1.5 h-7">
              <Plus className="h-3.5 w-3.5" />
              Nuevo cierre
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClosings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <FolderOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {closings.length === 0
                ? 'No hay cierres financieros aún.'
                : 'Sin cierres con esos filtros'}
            </p>
            {closings.length === 0 && (
              <Button variant="outline" size="sm" onClick={openCreate} className="gap-2 mt-1">
                <Plus className="h-4 w-4" />
                Crear primer cierre
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 px-5 pb-5">
            {filteredClosings.map(closing => {
              const net = closing.total_income - closing.total_costs;
              const isExp = expanded === closing.id;
              return (
                <div key={closing.id} className="rounded-sm border border-white/10 bg-card overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-sm">{closing.name}</h4>
                        <Badge className={closing.status === 'closed'
                          ? 'bg-green-500/15 text-green-400 border-green-500/30 text-xs'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs'
                        }>
                          {closing.status === 'closed' ? 'Cerrado' : 'Abierto'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(closing.period_start), 'd MMM yyyy', { locale: es })}
                        {' — '}
                        {format(parseISO(closing.period_end), 'd MMM yyyy', { locale: es })}
                        {' · '}
                        {closing.currency}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                        <p className="font-medium text-green-400">{fmt(closing.total_income, closing.currency)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Costos</p>
                        <p className="font-medium text-red-400">{fmt(closing.total_costs, closing.currency)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Utilidad</p>
                        <p className={`font-bold flex items-center gap-1 ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {net > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : net < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                          {fmt(net, closing.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Expandir / contraer"
                        onClick={() => setExpanded(isExp ? null : closing.id)}
                      >
                        {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Exportar CSV"
                        onClick={() => handleExport(closing)}
                        disabled={exporting === closing.id}
                      >
                        {exporting === closing.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Download className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={closing.status === 'open' ? 'Cerrar período' : 'Reabrir período'}
                        onClick={() => handleToggleStatus(closing)}
                        disabled={toggling === closing.id}
                      >
                        {toggling === closing.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : closing.status === 'open'
                            ? <Lock className="h-4 w-4" />
                            : <Unlock className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Eliminar cierre"
                        onClick={() => handleDelete(closing.id)}
                        disabled={deleting === closing.id}
                      >
                        {deleting === closing.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExp && <ExpandedClosing closing={closing} orgId={orgId} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Dialog nuevo cierre */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e0e0e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Nuevo cierre financiero</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nombre del cierre *</label>
              <Input
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="Ej. Cierre Mayo 2026"
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha inicio *</label>
                <Input type="date" value={form.period_start} onChange={e => f('period_start', e.target.value)} className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha fin *</label>
                <Input type="date" value={form.period_end} onChange={e => f('period_end', e.target.value)} className="bg-white/5 border-white/10" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Moneda</label>
              <select
                value={form.currency}
                onChange={e => f('currency', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-white"
              >
                <option value="COP" className="bg-[#111]">COP</option>
                <option value="USD" className="bg-[#111]">USD</option>
                <option value="EUR" className="bg-[#111]">EUR</option>
                <option value="MXN" className="bg-[#111]">MXN</option>
              </select>
            </div>

            {form.period_start && form.period_end && (
              <PeriodSummaryCard orgId={orgId} start={form.period_start} end={form.period_end} currency={form.currency} />
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas del cierre</label>
              <Textarea
                value={form.notes}
                onChange={e => f('notes', e.target.value)}
                placeholder="Observaciones, acuerdos…"
                rows={2}
                className="bg-white/5 border-white/10 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createClosing.isPending} className="gap-2">
              {createClosing.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
