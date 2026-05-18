import { Activity, AlertCircle, Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useOrgFinancialHealth, useOrgFinancialAnomalies } from '@/hooks/useFinanceOverview';
import type { HealthLevel } from '@/hooks/useFinanceOverview';
import { useFinanceFilters } from '@/contexts/FinanceFiltersContext';
import { formatCurrency } from '@/lib/finance-format';

const LEVEL_STYLES: Record<HealthLevel, { color: string; bg: string; border: string; label: string; icon: typeof Shield }> = {
  excelente:  { color: 'text-green-300', bg: 'bg-green-500/15', border: 'border-green-500/30', label: 'Excelente', icon: ShieldCheck },
  saludable:  { color: 'text-blue-300',  bg: 'bg-blue-500/15',  border: 'border-blue-500/30',  label: 'Saludable', icon: Shield },
  vigilar:    { color: 'text-yellow-300', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', label: 'Vigilar', icon: ShieldAlert },
  en_riesgo:  { color: 'text-orange-300', bg: 'bg-orange-500/15', border: 'border-orange-500/30', label: 'En riesgo', icon: ShieldAlert },
  critico:    { color: 'text-red-300',  bg: 'bg-red-500/15',  border: 'border-red-500/30',  label: 'Crítico', icon: ShieldX },
};

const PRIORITY_STYLES = {
  critica: 'bg-red-500/15 text-red-300 border-red-500/30',
  alta:    'bg-orange-500/15 text-orange-300 border-orange-500/30',
  media:   'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  baja:    'bg-blue-500/15 text-blue-300 border-blue-500/30',
};

const PRIORITY_LABEL = {
  critica: '🚨 Crítico',
  alta:    '⚠️ Alto',
  media:   '🟡 Medio',
  baja:    '🔵 Bajo',
};

interface Props {
  orgId: string;
}

export function FinanceHealthCard({ orgId }: Props) {
  const { currency } = useFinanceFilters();
  const { data: health, isLoading } = useOrgFinancialHealth(orgId, currency);
  const { data: anomalies = [] } = useOrgFinancialAnomalies(orgId, currency);

  if (isLoading || !health) {
    return (
      <Card className="bg-white/5 border-white/10 p-5">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white/70 animate-spin" />
          Evaluando salud financiera...
        </div>
      </Card>
    );
  }

  const styles = LEVEL_STYLES[health.level];
  const Icon = styles.icon;

  return (
    <Card className={`${styles.bg} ${styles.border} p-5`}>
      <div className="flex items-start gap-4">
        {/* Score circular */}
        <div className="shrink-0">
          <div className={`w-20 h-20 rounded-full border-4 ${styles.border} flex flex-col items-center justify-center ${styles.bg}`}>
            <p className={`text-2xl font-bold ${styles.color}`}>{health.score}</p>
            <p className="text-[9px] text-white/40 uppercase tracking-wide">de 100</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${styles.color}`} />
            <h3 className="text-base font-semibold text-white">Salud financiera</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${styles.border} ${styles.color}`}>
              {styles.label}
            </span>
          </div>

          {health.factors.length === 0 ? (
            <p className="text-sm text-white/60">
              🎉 Todo en orden — sin alertas financieras importantes.
            </p>
          ) : (
            <div className="space-y-1.5 mt-2">
              <p className="text-xs text-white/40 uppercase tracking-wide">Factores que afectan tu score:</p>
              {health.factors.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-white/80 flex-1">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-white/50"> · {f.detail}</span>
                  </span>
                  <span className={`font-mono whitespace-nowrap ${parseInt(f.impact) < 0 ? 'text-red-300' : 'text-white/40'}`}>
                    {f.impact}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recomendaciones priorizadas */}
      {health.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wide">Acciones recomendadas:</p>
          {health.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_STYLES[rec.priority]}`}>
                {PRIORITY_LABEL[rec.priority]}
              </span>
              <div className="flex-1">
                <p className="text-white/90">{rec.action}</p>
                {rec.impact_potencial > 0 && (
                  <p className="text-green-300/70 text-[10px] mt-0.5">
                    Impacto potencial: {formatCurrency(rec.impact_potencial, currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Anomalías detectadas */}
      {anomalies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
          <p className="text-xs text-white/40 uppercase tracking-wide flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Anomalías detectadas ({anomalies.length})
          </p>
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-white/5 rounded p-2">
              <Activity className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-white/90 font-medium">{a.title}</p>
                <p className="text-white/50 text-[11px]">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
