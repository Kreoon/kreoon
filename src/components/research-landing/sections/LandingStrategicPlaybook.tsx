import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface EsferaPhase {
  opportunities?: string[];
  hookTypes?: string;
  trustOpportunities?: string[];
  decisionMessages?: string[];
  communityOpportunities?: string[];
  marketDominance?: string;
  saturated?: string;
  positioning?: string;
  [key: string]: any;
}

interface Props {
  contentStrategy?: {
    esferaInsights?: {
      enganchar?: EsferaPhase;
      solucion?: EsferaPhase;
      remarketing?: EsferaPhase;
      fidelizar?: EsferaPhase;
    };
  } | null;
}

const PHASES = [
  { key: 'enganchar', label: 'Enganchar', color: 'cyan', desc: 'Captar atencion y generar interes', listKey: 'opportunities' },
  { key: 'solucion', label: 'Solucion', color: 'indigo', desc: 'Educar y presentar la solucion', listKey: 'trustOpportunities' },
  { key: 'remarketing', label: 'Remarketing', color: 'orange', desc: 'Reforzar la decision de compra', listKey: 'decisionMessages' },
  { key: 'fidelizar', label: 'Fidelizar', color: 'emerald', desc: 'Retener clientes y generar referidos', listKey: 'communityOpportunities' },
] as const;

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  cyan: { bg: 'bg-cyan-500/5', border: 'border-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  indigo: { bg: 'bg-indigo-500/5', border: 'border-indigo-500/15', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  orange: { bg: 'bg-orange-500/5', border: 'border-orange-500/15', text: 'text-orange-300', dot: 'bg-orange-400' },
  emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
};

export function LandingStrategicPlaybook({ contentStrategy }: Props) {
  const esfera = contentStrategy?.esferaInsights;
  if (!esfera) return <EmptySection label="Estrategia ESFERA" />;

  const hasData = PHASES.some(p => esfera[p.key as keyof typeof esfera]);
  if (!hasData) return <EmptySection label="Estrategia ESFERA" />;

  return (
    <div className="space-y-4">
      {PHASES.map((phase) => {
        const data = esfera[phase.key as keyof typeof esfera];
        if (!data) return null;
        const colors = COLOR_MAP[phase.color];
        const items = safeArray(data[phase.listKey]);

        return (
          <div key={phase.key} className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
              <h4 className={`text-sm font-semibold ${colors.text}`}>{phase.label}</h4>
              <span className="text-[10px] text-white/30">{phase.desc}</span>
            </div>

            {data.positioning && (
              <p className="text-xs text-white/60 mb-2">{data.positioning}</p>
            )}

            {items.length > 0 && (
              <ul className="space-y-1 mt-2">
                {items.map((item: any, i: number) => (
                  <li key={i} className="text-xs text-white/60 flex gap-2">
                    <span className={`${colors.text} shrink-0`}>•</span>
                    {safeStr(item)}
                  </li>
                ))}
              </ul>
            )}

            {data.hookTypes && (
              <p className="text-xs text-white/40 mt-2"><span className="text-white/50">Hooks:</span> {data.hookTypes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
