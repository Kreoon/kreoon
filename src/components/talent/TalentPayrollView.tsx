import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Loader2, Download, Users, AlertCircle, Play, RefreshCw,
  Clock, CheckCircle, FileText, Zap,
  AlertTriangle, History, Search, TrendingUp, Activity, BadgeDollarSign, Camera,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useOrgOwner } from '@/hooks/useOrgOwner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  usePayrollSummary, useOverduePayments, usePaidClosuresByMonth, useTalentFinanceRealtime,
} from '@/hooks/useTalentPayments';
import type { OverduePayment, MonthlyClosureGroup } from '@/hooks/useTalentPayments';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { useOrgPayrollOverview } from '@/hooks/useFinanceOverview';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { TabIntro, HelpTip } from '@/components/finance/FinanceHelp';
import { useFillmakerPayroll } from '@/hooks/useClientBilling';
import type { FillmakerPayrollItem } from '@/hooks/useClientBilling';
import {
  formatCurrency, exportDetailedPayrollToCSV, useMonthlyClosures, NextPaymentBadge,
  ClosureRow, ClosureGroup, UnpaidRow, FillmakerPayRow,
} from './payroll';
import type { MonthlyClosureEntry } from './payroll';

// ─── Vista principal ──────────────────────────────────────────────────────────

export function TalentPayrollView() {
  const { currentOrgId } = useOrgOwner();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrgId ?? '';

  const { data: closures = [], isLoading: loadingClosures } = useMonthlyClosures(orgId);
  const { data: unpaid = [], isLoading: loadingUnpaid } = usePayrollSummary(orgId);
  const { data: overdue = [] } = useOverduePayments(orgId);
  const { data: paidByMonth = [], isLoading: loadingHistory } = usePaidClosuresByMonth(orgId);
  const { data: fillmakerItems = [] } = useFillmakerPayroll(orgId);
  const [runningClose, setRunningClose] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ─── Filtros locales ─────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'overdue'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'creator' | 'editor'>('all');
  const [search, setSearch] = useState('');

  // ─── KPIs del período global ─────────────────────────────────────────────
  const { startDate, endDate } = useFinanceFilters();
  const { data: payrollOverview } = useOrgPayrollOverview(orgId, startDate, endDate);

  useTalentFinanceRealtime(orgId);

  // ─── Filtrar closures + unpaid ───────────────────────────────────────────
  const filteredClosures = useMemo(() => {
    return closures.filter(e => {
      const s = e.payment.status;
      const due = e.payment.payment_date ? new Date(e.payment.payment_date) : null;
      const isOverdue = due && due < new Date() && s !== 'paid';

      if (statusFilter === 'pending' && s !== 'pending') return false;
      if (statusFilter === 'processing' && s !== 'processing') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;

      if (search) {
        const q = search.toLowerCase();
        if (!e.full_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [closures, statusFilter, search]);

  const filteredUnpaid = useMemo(() => {
    return unpaid
      .map(entry => {
        let items = entry.items;
        if (roleFilter !== 'all') items = items.filter(i => i.role === roleFilter);
        const total_pending = items.reduce((s, i) => s + i.amount, 0);
        const project_count = items.length;
        return { ...entry, items, total_pending, project_count };
      })
      .filter(e => e.items.length > 0)
      .filter(e => {
        if (!search) return true;
        return e.full_name.toLowerCase().includes(search.toLowerCase());
      });
  }, [unpaid, roleFilter, search]);

  const totalClosures = useMemo(() => filteredClosures.reduce((s, e) => s + e.payment.amount, 0), [filteredClosures]);
  const totalUnpaid = useMemo(() => filteredUnpaid.reduce((s, e) => s + e.total_pending, 0), [filteredUnpaid]);

  // Agrupar cierres filtrados por usuario
  const closureGroups = useMemo(() => {
    const map = new Map<string, MonthlyClosureEntry[]>();
    for (const entry of filteredClosures) {
      const uid = entry.payment.user_id;
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(entry);
    }
    return [...map.values()];
  }, [filteredClosures]);

  async function handleRunMonthlyClose() {
    setRunningClose(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-talent-payroll', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      const created = (data as any)?.payments_created ?? 0;
      toast({
        title: created > 0
          ? `Cierre ejecutado — ${created} liquidación${created > 1 ? 'es' : ''} creada${created > 1 ? 's' : ''}`
          : 'Sin proyectos nuevos para liquidar',
      });
      qc.invalidateQueries({ queryKey: ['monthly-closures', orgId] });
      qc.invalidateQueries({ queryKey: ['payroll-summary', orgId] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Error al ejecutar cierre', description: msg, variant: 'destructive' });
    } finally {
      setRunningClose(false);
    }
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">

      {/* ─── Intro ─────────────────────────────────────────────── */}
      <TabIntro
        emoji="👥"
        title="¿A quién le tengo que pagar?"
        subtitle="Aquí está lo que la agencia le debe a creadores y editores: a quién, cuánto y cuándo."
        accent="orange"
        bullets={[
          'Cada mes, el día 20, se cierra la nómina automáticamente con los proyectos aprobados.',
          'El pago se hace entre el 1 y el 5 del mes siguiente.',
          'Botón azul "Transferir" → marca un pago como en proceso. Botón verde "Confirmar pago" → marca como pagado (necesita comprobante).',
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Nómina</h2>
          <p className="text-sm text-muted-foreground">
            Ciclo mensual: cierre el día 20 · pago 1–5 del mes siguiente
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(closures.length > 0 || unpaid.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  await exportDetailedPayrollToCSV(closures, unpaid);
                } finally {
                  setExporting(false);
                }
              }}
              title="Exportar nómina con detalles completos de cada proyecto"
            >
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              {exporting ? 'Generando...' : 'CSV detallado'}
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleRunMonthlyClose}
              disabled={runningClose}
            >
              {runningClose
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5" />}
              Ejecutar cierre
            </Button>
          )}
        </div>
      </div>

      {/* ─── Hero KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-yellow-500/15 to-yellow-600/10 border-yellow-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <BadgeDollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">Por liquidar</span>
            <HelpTip text="Total que la agencia debe a creadores y editores. Suma de pagos pendientes + en transferencia." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.to_settle ?? 0)}
          </p>
          <p className="text-yellow-400 text-[11px] mt-0.5">pendiente + en transferencia</p>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/15 to-blue-600/10 border-blue-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">En proceso</span>
            <HelpTip text="Pagos que ya iniciaste pero que aún no confirmas con comprobante." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.in_transfer ?? 0)}
          </p>
          <p className="text-blue-400 text-[11px] mt-0.5">transferencias iniciadas</p>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/15 to-green-600/10 border-green-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">Pagado en período</span>
            <HelpTip text="TODO el dinero que salió a creadores y editores en el rango. Incluye pagos formales (talent_payments) Y los marcados directamente en cada proyecto (creator_paid/editor_paid). Sin doble conteo." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.paid_in_period ?? 0)}
          </p>
          <p className="text-green-400 text-[11px] mt-0.5">
            {payrollOverview?.talents_paid ?? 0} talento{(payrollOverview?.talents_paid ?? 0) !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/15 to-purple-600/10 border-purple-500/20 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-white/60 text-[10px] uppercase tracking-wide">Pago promedio</span>
            <HelpTip text="Pagado en el período ÷ número de talentos que recibieron pago." />
          </div>
          <p className="text-xl font-bold text-white">
            {formatCurrency(payrollOverview?.avg_payment ?? 0)}
          </p>
          <p className="text-purple-400 text-[11px] mt-0.5">por talento en período</p>
        </Card>
      </div>

      {/* ─── Filtros locales ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap p-3 rounded-md bg-white/[0.02] border border-white/5">
        <span className="text-white/40 text-xs">Filtros:</span>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
        >
          <option value="all" className="bg-[#111]">Todos los estados</option>
          <option value="pending" className="bg-[#111]">Pendientes</option>
          <option value="processing" className="bg-[#111]">En transferencia</option>
          <option value="overdue" className="bg-[#111]">Vencidos</option>
        </select>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
          className="bg-white/5 border border-white/10 rounded text-xs text-white px-2 py-1 h-7"
        >
          <option value="all" className="bg-[#111]">Todos los roles</option>
          <option value="creator" className="bg-[#111]">Solo creadores</option>
          <option value="editor" className="bg-[#111]">Solo editores</option>
        </select>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <Input
            placeholder="Buscar talento"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white text-xs h-7 pl-7 w-44"
          />
        </div>

        {(statusFilter !== 'all' || roleFilter !== 'all' || search) && (
          <button
            onClick={() => { setStatusFilter('all'); setRoleFilter('all'); setSearch(''); }}
            className="text-xs text-white/40 hover:text-white px-2 py-1"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Próximas fechas */}
      <NextPaymentBadge />

      {/* Alerta: pagos vencidos */}
      {overdue.length > 0 && (
        <div className="rounded-lg border border-red-400/30 bg-red-50 dark:bg-red-900/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">
              {overdue.length} pago{overdue.length > 1 ? 's' : ''} vencido{overdue.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {overdue.map((op: OverduePayment) => (
              <div key={op.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{op.full_name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{op.days_overdue} día{op.days_overdue !== 1 ? 's' : ''} de retraso</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatCurrency(op.amount, op.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección A: Cierres pendientes de pago */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            Pendientes y en transferencia
            {filteredClosures.length > 0 && (
              <Badge className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-400/30">
                {filteredClosures.length}
              </Badge>
            )}
          </h3>
          {filteredClosures.length > 0 && (
            <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(totalClosures)}
            </span>
          )}
        </div>

        {loadingClosures ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filteredClosures.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">
              {closures.length === 0
                ? 'Sin cierres pendientes de pago'
                : 'Sin cierres con esos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {closureGroups.map((group) =>
              group.length === 1
                ? <ClosureRow key={group[0].payment.id} entry={group[0]} organizationId={orgId} />
                : <ClosureGroup key={group[0].payment.user_id} entries={group} organizationId={orgId} />
            )}
          </div>
        )}
      </div>

      {/* Sección B: Proyectos sin liquidar (para el próximo cierre) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Proyectos para el próximo cierre
            {filteredUnpaid.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {filteredUnpaid.reduce((s, e) => s + e.project_count, 0)} proy.
              </Badge>
            )}
          </h3>
          {filteredUnpaid.length > 0 && (
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(totalUnpaid)}
            </span>
          )}
        </div>

        {loadingUnpaid ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filteredUnpaid.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">
              {unpaid.length === 0
                ? 'Sin proyectos pendientes de liquidar'
                : 'Sin proyectos con esos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" />
              Proyectos en estado <strong>Aprobado</strong> sin liquidar · Se incluyen en el cierre del día 20
            </p>
            {filteredUnpaid.map((entry) => (
              <UnpaidRow key={entry.user_id} entry={entry} organizationId={orgId} />
            ))}
          </div>
        )}

        {/* ─── Grabaciones Fillmaker (pagar ya) ── */}
        {fillmakerItems.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-violet-400" />
              Grabaciones Fillmaker por liquidar
            </p>
            {fillmakerItems.map((item: FillmakerPayrollItem) => (
              <FillmakerPayRow key={item.id} item={item} organizationId={orgId} />
            ))}
          </div>
        )}
      </div>

      {/* Sección C: Historial de pagos por mes */}
      <div className="space-y-3">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setHistoryExpanded((v) => !v)}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            Historial de pagos
            {paidByMonth.length > 0 && (
              <Badge variant="outline" className="text-xs">{paidByMonth.length} mes{paidByMonth.length !== 1 ? 'es' : ''}</Badge>
            )}
          </h3>
          {historyExpanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {historyExpanded && (
          loadingHistory ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : paidByMonth.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <History className="h-6 w-6 text-muted-foreground/40 mx-auto mb-1.5" />
              <p className="text-sm text-muted-foreground">Sin pagos confirmados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paidByMonth.map((group: MonthlyClosureGroup) => (
                <div key={group.month} className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                    <span className="text-sm font-semibold">{group.label}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{group.payment_count} pago{group.payment_count !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(group.total_paid)}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {group.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.description ?? 'Pago'}</p>
                          {p.payment_date && (
                            <p className="text-muted-foreground">
                              {format(new Date(p.payment_date), "d 'de' MMM yyyy", { locale: es })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {p.receipt_url && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                              <FileText className="h-2.5 w-2.5" />
                              Comprobante
                            </span>
                          )}
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(p.amount, p.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
}
