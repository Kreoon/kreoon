import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface ExecutiveSummary {
  marketSummary?: string;
  opportunityScore?: number;
  opportunityScoreJustification?: string;
  keyInsights?: any[];
  psychologicalDrivers?: any[];
  immediateActions?: any[];
  quickWins?: any[];
  risksToAvoid?: any[];
  finalRecommendation?: string;
}

interface Props {
  contentStrategy?: { executiveSummary?: ExecutiveSummary } | null;
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const color = score >= 7 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400';
  const bg = score >= 7 ? 'from-green-500/20' : score >= 5 ? 'from-yellow-500/20' : 'from-red-500/20';
  return (
    <div className={`flex items-center gap-4 p-4 rounded-sm bg-gradient-to-r ${bg} to-transparent border border-white/[0.06]`}>
      <div className="relative h-16 w-16 shrink-0">
        <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`} className={color} strokeLinecap="round" />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${color}`}>
          {score}
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Score de Oportunidad</p>
        <p className="text-xs text-white/50">
          {score >= 8 ? 'Oportunidad excelente' : score >= 6 ? 'Buena oportunidad' : score >= 4 ? 'Oportunidad moderada' : 'Requiere validacion'}
        </p>
      </div>
    </div>
  );
}

export function LandingExecutiveSummary({ contentStrategy }: Props) {
  const summary = contentStrategy?.executiveSummary;
  if (!summary || (!summary.marketSummary && !summary.keyInsights?.length)) {
    return <EmptySection label="Conclusion Ejecutiva" />;
  }

  const insights = safeArray(summary.keyInsights);
  const actions = safeArray(summary.immediateActions);
  const risks = safeArray(summary.risksToAvoid);

  return (
    <div className="space-y-5">
      {/* Score */}
      {summary.opportunityScore != null && (
        <ScoreGauge score={summary.opportunityScore} />
      )}

      {/* Market Summary */}
      {summary.marketSummary && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-4">
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Resumen del Mercado</h4>
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{summary.marketSummary}</p>
        </div>
      )}

      {/* Key Insights */}
      {insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Insights Estrategicos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.slice(0, 6).map((item: any, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-3">
                <p className="text-sm text-white/80">{safeStr(item.insight || item, '')}</p>
                {item.action && <p className="text-xs text-purple-400/60 mt-1">{item.action}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Immediate Actions */}
      {actions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Acciones Inmediatas</h4>
          <div className="space-y-2">
            {actions.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex gap-3 bg-white/[0.03] border border-white/[0.06] rounded-sm p-3">
                <span className="text-purple-400 font-bold text-sm shrink-0">{i + 1}</span>
                <div>
                  <p className="text-sm text-white/80">{safeStr(item.action || item, '')}</p>
                  {item.expectedResult && <p className="text-xs text-white/40 mt-0.5">{item.expectedResult}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-red-300/80 uppercase tracking-wider mb-3">Riesgos a Evitar</h4>
          <div className="space-y-2">
            {risks.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-sm p-3">
                <p className="text-sm text-white/70">{safeStr(item.risk || item, '')}</p>
                {item.why && <p className="text-xs text-white/40 mt-0.5">{item.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Recommendation */}
      {summary.finalRecommendation && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-sm p-4">
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Recomendacion Final</h4>
          <p className="text-sm text-white/80 leading-relaxed">{summary.finalRecommendation}</p>
        </div>
      )}
    </div>
  );
}
