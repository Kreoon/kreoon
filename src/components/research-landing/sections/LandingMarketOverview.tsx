import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  marketResearch?: {
    marketSize?: string;
    growthTrend?: string;
    marketState?: string;
    marketStateExplanation?: string;
    macroVariables?: any[];
    awarenessLevel?: string;
    awarenessExplanation?: string;
    summary?: string;
    opportunities?: any[];
    threats?: any[];
  } | null;
}

const STATE_COLORS: Record<string, string> = {
  crecimiento: 'text-green-400 bg-green-500/15',
  saturacion: 'text-yellow-400 bg-yellow-500/15',
  declive: 'text-red-400 bg-red-500/15',
};

export function LandingMarketOverview({ marketResearch }: Props) {
  if (!marketResearch || (!marketResearch.summary && !marketResearch.marketSize)) {
    return <EmptySection label="Panorama de Mercado" />;
  }

  const opportunities = safeArray(marketResearch.opportunities);
  const threats = safeArray(marketResearch.threats);
  const macros = safeArray(marketResearch.macroVariables);

  return (
    <div className="space-y-5">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {marketResearch.marketSize && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-[10px] text-white/40 uppercase mb-1">Tamano</p>
            <p className="text-sm font-semibold text-white">{marketResearch.marketSize}</p>
          </div>
        )}
        {marketResearch.growthTrend && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-[10px] text-white/40 uppercase mb-1">Crecimiento</p>
            <p className="text-sm font-semibold text-white">{marketResearch.growthTrend}</p>
          </div>
        )}
        {marketResearch.marketState && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-[10px] text-white/40 uppercase mb-1">Estado</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATE_COLORS[marketResearch.marketState.toLowerCase()] || 'text-white/60 bg-white/10'}`}>
              {marketResearch.marketState}
            </span>
          </div>
        )}
        {marketResearch.awarenessLevel && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-[10px] text-white/40 uppercase mb-1">Awareness</p>
            <p className="text-xs font-semibold text-purple-300">{marketResearch.awarenessLevel.replace(/_/g, ' ')}</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {marketResearch.summary && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{marketResearch.summary}</p>
        </div>
      )}

      {/* Macroeconomic Variables */}
      {macros.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Variables Macroeconomicas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {macros.map((m: any, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 uppercase">{safeStr(m.type, 'macro')}</span>
                  <span className="text-xs font-medium text-white/80">{safeStr(m.factor, '')}</span>
                </div>
                {m.impact && <p className="text-xs text-white/50">{m.impact}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunities & Threats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-green-300/80 uppercase tracking-wider mb-3">Oportunidades</h4>
            <div className="space-y-2">
              {opportunities.map((o: any, i: number) => (
                <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                  <p className="text-sm text-white/80">{safeStr(o.opportunity || o, '')}</p>
                  {o.howToCapture && <p className="text-xs text-green-400/50 mt-1">{o.howToCapture}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {threats.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-300/80 uppercase tracking-wider mb-3">Amenazas</h4>
            <div className="space-y-2">
              {threats.map((t: any, i: number) => (
                <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                  <p className="text-sm text-white/80">{safeStr(t.threat || t, '')}</p>
                  {t.mitigation && <p className="text-xs text-red-400/50 mt-1">{t.mitigation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
