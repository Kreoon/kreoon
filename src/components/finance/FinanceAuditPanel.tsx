import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/finance-format';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';

interface AuditBreakdown {
  cobrado_paquetes_paid_amount: number;
  cobrado_abonos_granulares: number;
  costos_operativos: number;
  costos_paquete: number;
  nomina_talent_payments: number;
  nomina_content_creator: number;
  nomina_content_editor: number;
  gastos_recurrentes_definidos: number;
  primer_movimiento: string | null;
}

function useFinanceAudit(orgId: string, currency: string, start: string, end: string) {
  return useQuery({
    queryKey: ['finance-audit', orgId, currency, start, end],
    queryFn: async (): Promise<AuditBreakdown> => {
      const isCop = currency === 'COP';

      // Cobrado paid_amount fallback
      const { data: pkgs } = await (supabase as any)
        .from('client_packages')
        .select('paid_amount, paid_at, created_at, currency, client_id, clients!inner(organization_id)')
        .eq('clients.organization_id', orgId)
        .eq('is_barter', false)
        .eq('currency', currency)
        .gt('paid_amount', 0);

      const cobrado_paid_amount = ((pkgs ?? []) as any[])
        .filter(p => {
          const d = (p.paid_at ?? p.created_at).substring(0, 10);
          return d >= start && d <= end;
        })
        .reduce((s, p) => s + Number(p.paid_amount), 0);

      // Cobrado abonos granulares
      const { data: pays } = await (supabase as any)
        .from('client_package_payments')
        .select('amount')
        .eq('organization_id', orgId)
        .eq('currency', currency)
        .gte('payment_date', start)
        .lte('payment_date', end);
      const cobrado_granular = ((pays ?? []) as any[]).reduce((s, p) => s + Number(p.amount), 0);

      // Costos operativos
      const { data: costs } = await (supabase as any)
        .from('org_financial_costs')
        .select('amount')
        .eq('organization_id', orgId)
        .eq('currency', currency)
        .gte('cost_date', start)
        .lte('cost_date', end);
      const costos_op = ((costs ?? []) as any[]).reduce((s, c) => s + Number(c.amount), 0);

      // Costos por paquete
      const { data: pkgCosts } = await (supabase as any)
        .from('package_costs')
        .select('amount, cost_type, status, paid_date, created_at')
        .eq('organization_id', orgId)
        .eq('currency', currency);
      const costos_pkg = ((pkgCosts ?? []) as any[])
        .filter(c => c.cost_type !== 'creator_payout' && c.status !== 'cancelled')
        .filter(c => {
          const d = (c.paid_date ?? c.created_at).substring(0, 10);
          return d >= start && d <= end;
        })
        .reduce((s, c) => s + Number(c.amount), 0);

      // Nómina: talent_payments (solo si COP)
      let nomina_tp = 0;
      let nomina_creator = 0;
      let nomina_editor = 0;

      if (isCop) {
        const { data: tp } = await (supabase as any)
          .from('talent_payments')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('status', 'paid')
          .gte('payment_date', start)
          .lte('payment_date', end + 'T23:59:59');
        nomina_tp = ((tp ?? []) as any[]).reduce((s, p) => s + Number(p.amount), 0);

        // Content flags
        const { data: tpAll } = await (supabase as any)
          .from('talent_payments')
          .select('content_ids')
          .eq('organization_id', orgId)
          .not('content_ids', 'is', null);
        const coveredIds = new Set<string>();
        for (const row of (tpAll ?? []) as any[]) {
          for (const id of (row.content_ids ?? [])) coveredIds.add(id);
        }

        const { data: contents } = await (supabase as any)
          .from('content')
          .select('id, creator_payment, editor_payment, creator_paid, editor_paid, paid_at, updated_at')
          .eq('organization_id', orgId);

        for (const ct of (contents ?? []) as any[]) {
          if (coveredIds.has(ct.id)) continue;
          const d = (ct.paid_at ?? ct.updated_at)?.substring(0, 10);
          if (!d || d < start || d > end) continue;
          if (ct.creator_paid) nomina_creator += Number(ct.creator_payment ?? 0);
          if (ct.editor_paid) nomina_editor += Number(ct.editor_payment ?? 0);
        }
      }

      // Gastos recurrentes definidos (referencia)
      const { data: rec } = await (supabase as any)
        .from('recurring_expenses')
        .select('amount, frequency, is_active')
        .eq('organization_id', orgId)
        .eq('currency', currency)
        .eq('is_active', true);
      const recurrentes_def = ((rec ?? []) as any[]).reduce((s, r) => s + Number(r.amount), 0);

      // Primer movimiento histórico
      const { data: first } = await (supabase as any)
        .from('client_packages')
        .select('created_at, clients!inner(organization_id)')
        .eq('clients.organization_id', orgId)
        .order('created_at', { ascending: true })
        .limit(1);
      const primer = (first as any)?.[0]?.created_at?.substring(0, 10) ?? null;

      return {
        cobrado_paquetes_paid_amount: cobrado_paid_amount,
        cobrado_abonos_granulares: cobrado_granular,
        costos_operativos: costos_op,
        costos_paquete: costos_pkg,
        nomina_talent_payments: nomina_tp,
        nomina_content_creator: nomina_creator,
        nomina_content_editor: nomina_editor,
        gastos_recurrentes_definidos: recurrentes_def,
        primer_movimiento: primer,
      };
    },
    enabled: !!orgId,
    staleTime: 0,
  });
}

interface Props {
  orgId: string;
}

export function FinanceAuditPanel({ orgId }: Props) {
  const { startDate, endDate, currency } = useFinanceFilters();
  const [open, setOpen] = useState(false);
  const { data: audit, isLoading } = useFinanceAudit(orgId, currency, startDate, endDate);

  if (!audit && !isLoading) return null;

  const totalCobrado = (audit?.cobrado_paquetes_paid_amount ?? 0) + (audit?.cobrado_abonos_granulares ?? 0);
  const totalCostos = (audit?.costos_operativos ?? 0) + (audit?.costos_paquete ?? 0);
  const totalNomina = (audit?.nomina_talent_payments ?? 0) + (audit?.nomina_content_creator ?? 0) + (audit?.nomina_content_editor ?? 0);

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              Auditoría de cálculo
              <span className="ml-2 text-[10px] font-normal text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full">
                Transparencia total
              </span>
            </h3>
            <p className="text-white/40 text-xs mt-0.5">
              Detalle de TODAS las fuentes que componen los KPIs · click para ver
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>

      {open && audit && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          {/* Info histórica */}
          {audit.primer_movimiento && (
            <div className="text-xs text-white/50 bg-white/5 rounded p-2.5">
              📅 Primer movimiento de la agencia: <span className="text-white font-medium">{audit.primer_movimiento}</span>
              {(startDate > audit.primer_movimiento) && (
                <span className="ml-2 text-yellow-300/80">
                  · Hay datos anteriores fuera del filtro actual — usa "Todo" para verlos
                </span>
              )}
            </div>
          )}

          {/* INGRESOS */}
          <div>
            <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-1.5">Ingresos</p>
            <div className="space-y-1 pl-3 border-l-2 border-green-500/20">
              <AuditRow label="Pagos granulares (client_package_payments)" value={audit.cobrado_abonos_granulares} currency={currency} />
              <AuditRow label="Paid_amount de paquetes (fallback sin abonos)" value={audit.cobrado_paquetes_paid_amount} currency={currency} />
              <AuditRow label="Total cobrado" value={totalCobrado} currency={currency} bold />
            </div>
          </div>

          {/* COSTOS */}
          <div>
            <p className="text-xs text-red-400 font-semibold uppercase tracking-wide mb-1.5">Costos operativos</p>
            <div className="space-y-1 pl-3 border-l-2 border-red-500/20">
              <AuditRow label="Costos generales (org_financial_costs)" value={audit.costos_operativos} currency={currency} />
              <AuditRow label="Costos por paquete (package_costs, excluye creator_payout)" value={audit.costos_paquete} currency={currency} />
              <AuditRow label="Total costos" value={totalCostos} currency={currency} bold />
            </div>
          </div>

          {/* NÓMINA */}
          <div>
            <p className="text-xs text-orange-400 font-semibold uppercase tracking-wide mb-1.5">
              Nómina (pagos a creadores y editores)
              {currency !== 'COP' && (
                <span className="ml-2 text-yellow-300/70 text-[10px] normal-case">
                  No descontada — la caja {currency} no paga talento (se paga en COP)
                </span>
              )}
            </p>
            <div className="space-y-1 pl-3 border-l-2 border-orange-500/20">
              <AuditRow label="Pagos formales (talent_payments status=paid)" value={audit.nomina_talent_payments} currency="COP" />
              <AuditRow label="Pagos a creador via content.creator_paid (sin dup)" value={audit.nomina_content_creator} currency="COP" />
              <AuditRow label="Pagos a editor via content.editor_paid (sin dup)" value={audit.nomina_content_editor} currency="COP" />
              <AuditRow label="Total nómina pagada" value={totalNomina} currency="COP" bold />
            </div>
          </div>

          {/* GASTOS RECURRENTES (info) */}
          {audit.gastos_recurrentes_definidos > 0 && (
            <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/15 rounded px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="text-yellow-200 font-medium">
                  Tienes {formatCurrency(audit.gastos_recurrentes_definidos, currency)} en gastos recurrentes definidos
                </p>
                <p className="text-yellow-200/60 mt-0.5">
                  Estos NO se descuentan automáticamente. Para incluirlos en la utilidad, regístralos manualmente en el tab Costos cuando los pagues.
                </p>
              </div>
            </div>
          )}

          {/* RESUMEN UTILIDAD */}
          <div className="bg-white/5 rounded-md p-3 mt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/70">Cobrado − Costos {currency === 'COP' ? '− Nómina' : ''}</span>
              <span className="text-white font-medium">
                {formatCurrency(totalCobrado, currency)} − {formatCurrency(totalCostos, currency)}
                {currency === 'COP' && ` − ${formatCurrency(totalNomina, 'COP')}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-base mt-1.5 pt-1.5 border-t border-white/10">
              <span className="text-white/70 font-medium">Utilidad neta calculada</span>
              <span className={`font-bold ${
                (totalCobrado - totalCostos - (currency === 'COP' ? totalNomina : 0)) >= 0
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(
                  totalCobrado - totalCostos - (currency === 'COP' ? totalNomina : 0),
                  currency
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function AuditRow({ label, value, currency, bold }: { label: string; value: number; currency: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-xs ${bold ? 'pt-1 border-t border-white/5 mt-1' : ''}`}>
      <span className={bold ? 'text-white font-medium' : 'text-white/60'}>{label}</span>
      <span className={`whitespace-nowrap ${bold ? 'text-white font-bold' : value > 0 ? 'text-white/90' : 'text-white/30'}`}>
        {value > 0 ? formatCurrency(value, currency) : '—'}
      </span>
    </div>
  );
}
