import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import {
  LazyComposedChart,
  LazyChartContainer,
} from '@/components/ui/lazy-charts';
import {
  Area,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  formatCurrency,
  SCENARIO_LABELS,
  SCENARIO_MULTIPLIERS,
  SCENARIO_ACTIVE_STYLES,
  confidenceBadgeClass,
  type CashFlowWeek,
  type CashFlowScenario,
  type PackageCurrency,
} from '@/lib/finance-format';
import { HelpTip } from './FinanceHelp';

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

interface Props {
  orgId: string;
  selectedCurrency: PackageCurrency;
}

export function CashFlowSection({ orgId, selectedCurrency }: Props) {
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

  // Detectar si está usando fallback histórico (confidence_score = 35 en todas las semanas)
  const isHistoricalFallback = weeks.length > 0 && weeks.every(w => w.confidence_score === 35);

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
      <div className="p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 flex-wrap">
              ¿Cuánto dinero vas a tener las próximas semanas?
              <span className="text-sm font-normal text-white/40">— {selectedCurrency} · 12 semanas</span>
              {isHistoricalFallback && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                  📊 Estimado con historial
                </span>
              )}
              <HelpTip text={isHistoricalFallback
                ? "No tienes cuotas ni gastos recurrentes configurados. La proyección usa el promedio mensual de los últimos 6 meses prorrateado por semana. Para mayor precisión configura cuotas o gastos recurrentes."
                : "Predicción de cuánto vas a recibir (verde) y cuánto vas a gastar (rojo) cada semana. El escenario 'Conservador' asume que solo cobras el 70% de lo esperado."} />
            </h3>
            <p className="text-white/40 text-sm">
              {isHistoricalFallback
                ? 'Basado en tu actividad de los últimos 6 meses · baja confianza'
                : 'Si el balance neto es negativo, vas a necesitar reservas o cobrar más rápido'}
            </p>
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
          <div className="px-6 pb-2">
            <LazyChartContainer height={220}>
              <ResponsiveContainer width="100%" height={220}>
                <LazyComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
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
                  <Area type="monotone" dataKey="inflow" stroke="#22c55e" strokeWidth={1.5} fill="rgba(34,197,94,0.12)" name="inflow" />
                  <Area type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={1.5} fill="rgba(239,68,68,0.10)" name="outflow" />
                  <Line type="monotone" dataKey="net" stroke="rgba(255,255,255,0.65)" strokeWidth={2} dot={{ fill: 'rgba(255,255,255,0.4)', r: 3, strokeWidth: 0 }} name="net" />
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
