import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, Sparkles, Heart, AlertTriangle, Info } from 'lucide-react';
import { useAcademyAdvancedMetrics } from '@/hooks/academy/useAcademyLive';
import { cn } from '@/lib/utils';

interface Props { spaceId: string; }

/**
 * Métricas tipo Baremetrics: LTV, churn, ARPU, Net new MRR mensual,
 * Cohort retention, MRR breakdown del mes actual.
 *
 * Todo se actualiza en realtime al cambiar academy_memberships.
 */
export function AdvancedMetricsPanel({ spaceId }: Props) {
  const { data: metrics, isLoading } = useAcademyAdvancedMetrics(spaceId);

  if (isLoading || !metrics) {
    return <div className="text-zinc-500 p-8 text-center text-sm">Calculando LTV, cohort y net MRR...</div>;
  }

  const ltvDisplay = metrics.ltv_usd !== null
    ? `$${metrics.ltv_usd.toFixed(2)}`
    : 'n/a';
  const lifetimeDisplay = metrics.avg_lifetime_months !== null
    ? `${metrics.avg_lifetime_months} meses`
    : 'sin churn aún';

  const churnColor = metrics.monthly_churn_rate_pct === 0 ? '#10b981'
                   : metrics.monthly_churn_rate_pct < 5 ? '#84cc16'
                   : metrics.monthly_churn_rate_pct < 10 ? '#eab308'
                   : '#f43f5e';

  const series = metrics.net_mrr_series.map((m) => ({
    ...m,
    new_mrr: Number(m.new_mrr),
    churned_mrr_neg: -Number(m.churned_mrr),
    net_mrr: Number(m.net_mrr),
  }));

  return (
    <div className="space-y-4">
      {/* Row 1: LTV / ARPU / Churn / CAC */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigStat
          icon={Sparkles}
          label="LTV (Lifetime Value)"
          value={ltvDisplay}
          subtext={lifetimeDisplay}
          color="#a78bfa"
        />
        <BigStat
          icon={Heart}
          label="ARPU"
          value={`$${metrics.avg_revenue_per_member_usd.toFixed(2)}`}
          subtext="ingreso real por miembro/mes"
          color="#10b981"
        />
        <BigStat
          icon={metrics.monthly_churn_rate_pct === 0 ? TrendingUp : TrendingDown}
          label="Churn mensual"
          value={`${metrics.monthly_churn_rate_pct}%`}
          subtext={metrics.monthly_churn_rate_pct === 0
            ? 'sin cancelaciones'
            : metrics.monthly_churn_rate_pct < 5 ? 'saludable (<5%)'
            : metrics.monthly_churn_rate_pct < 10 ? 'aceptable (<10%)'
            : 'crítico (>10%)'}
          color={churnColor}
        />
        <BigStat
          icon={Calendar}
          label="CAC payback"
          value={metrics.cac_payback_months !== null ? `${metrics.cac_payback_months} meses` : '—'}
          subtext={metrics.cac_payback_months === null ? 'falta registro de ads' : ''}
          color="#71717a"
        />
      </div>

      {/* CAC note */}
      {metrics.cac_payback_months === null && (
        <Card className="p-3 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-2 text-xs text-blue-300">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              <strong>CAC payback</strong> mide cuántos meses tarda un miembro en pagar lo que costó traerlo.
              Necesita registro de gasto en ads (Meta, TikTok, Google) para calcularse. {metrics.cac_note}
            </span>
          </div>
        </Card>
      )}

      {/* MRR breakdown del mes */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          MRR breakdown — mes actual
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <BreakdownCard
            label="Nuevo MRR"
            value={`+$${metrics.mrr_breakdown.new_mrr_this_month.toFixed(2)}`}
            subtext={`${metrics.mrr_breakdown.new_members_this_month} miembro${metrics.mrr_breakdown.new_members_this_month === 1 ? '' : 's'}`}
            color="#10b981"
          />
          <BreakdownCard
            label="MRR perdido"
            value={`-$${metrics.mrr_breakdown.churned_mrr_this_month.toFixed(2)}`}
            subtext={`${metrics.mrr_breakdown.churned_members_this_month} churn`}
            color="#f43f5e"
          />
          <BreakdownCard
            label="Net new MRR"
            value={`${metrics.mrr_breakdown.net_mrr_this_month >= 0 ? '+' : ''}$${metrics.mrr_breakdown.net_mrr_this_month.toFixed(2)}`}
            subtext={metrics.mrr_breakdown.net_mrr_this_month >= 0 ? 'crecimiento' : 'contracción'}
            color={metrics.mrr_breakdown.net_mrr_this_month >= 0 ? '#10b981' : '#f43f5e'}
          />
        </div>
      </Card>

      {/* Net new MRR 12 meses (bar chart) */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-400" />
          Net new MRR — últimos 12 meses
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={series} stackOffset="sign" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="month_label" stroke="#71717a" fontSize={11} />
            <YAxis stroke="#71717a" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: '#0c0c16',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: any, name: string) => {
                const labels: Record<string, string> = {
                  new_mrr: 'Nuevo',
                  churned_mrr_neg: 'Churn',
                  net_mrr: 'Net',
                };
                return [`$${Math.abs(Number(value)).toFixed(2)}`, labels[name] ?? name];
              }}
            />
            <ReferenceLine y={0} stroke="#3f3f46" />
            <Bar dataKey="new_mrr" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="churned_mrr_neg" stackId="a" fill="#f43f5e" radius={[0, 0, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Nuevo MRR
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-rose-500" /> Churn MRR
          </span>
        </div>
      </Card>

      {/* Cohort retention */}
      <Card className="p-5 bg-white/5 border-white/10">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-amber-400" />
          Retención por cohorte
        </h3>
        {metrics.cohort_retention.length === 0 ? (
          <div className="text-zinc-500 text-sm py-4">
            Aún no hay cohortes. Aparecerán cuando tengas miembros de distintos meses.
          </div>
        ) : (
          <div className="space-y-2">
            {metrics.cohort_retention.map((c) => (
              <CohortRow key={c.cohort_month} cohort={c} />
            ))}
          </div>
        )}
      </Card>

      {/* Tips */}
      {metrics.monthly_churn_rate_pct >= 10 && (
        <Card className="p-4 bg-rose-500/5 border-rose-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-rose-200">Churn elevado: {metrics.monthly_churn_rate_pct}%</p>
              <p className="text-xs text-zinc-300 mt-1">
                Más del 10% de tus miembros cancela cada mes. Posibles causas: onboarding débil,
                falta de valor percibido en el primer mes, comunidad fantasma, o cancelaciones
                anti-incumplimiento (cobros que rebotan). Revisar primero las cancelaciones de los
                últimos 30 días y entrevistar a 3-5 ex-miembros.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function BigStat({
  icon: Icon, label, value, subtext, color,
}: { icon: any; label: string; value: string; subtext: string; color: string }) {
  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-2"
           style={{ backgroundColor: `${color}26` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-zinc-300 uppercase tracking-wide mt-1">{label}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{subtext}</div>
    </Card>
  );
}

function BreakdownCard({
  label, value, subtext, color,
}: { label: string; value: string; subtext: string; color: string }) {
  return (
    <div className="rounded-lg p-3 border" style={{ borderColor: `${color}33`, backgroundColor: `${color}0d` }}>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-zinc-400 uppercase tracking-wide mt-0.5">{label}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{subtext}</div>
    </div>
  );
}

function CohortRow({
  cohort,
}: {
  cohort: {
    cohort_label: string;
    cohort_size: number;
    still_active: number;
    retention_pct: number;
  };
}) {
  const retentionColor = cohort.retention_pct >= 80 ? '#10b981'
                       : cohort.retention_pct >= 50 ? '#84cc16'
                       : cohort.retention_pct >= 30 ? '#eab308'
                       : '#f43f5e';
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 text-zinc-400 text-xs">{cohort.cohort_label}</span>
      <div className="flex-1 h-6 rounded-md bg-white/5 overflow-hidden relative">
        <div
          className="h-full transition-all"
          style={{
            width: `${cohort.retention_pct}%`,
            backgroundColor: retentionColor,
            opacity: 0.6,
          }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs">
          {cohort.still_active}/{cohort.cohort_size} activos · {cohort.retention_pct}%
        </span>
      </div>
    </div>
  );
}
