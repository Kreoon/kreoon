import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  jtbdData?: {
    functional?: any;
    emotional?: any;
    social?: any;
    pains?: any[];
    desires?: any[];
    objections?: any[];
    insights?: any[];
  } | null;
  marketResearch?: any;
}

function JobCard({ title, color, data }: { title: string; color: string; data: any }) {
  if (!data) return null;
  const desc = typeof data === 'string' ? data : data.description || data.statement || '';
  if (!desc) return null;

  const borderColor = color === 'blue' ? 'border-blue-500/20' : color === 'pink' ? 'border-pink-500/20' : 'border-purple-500/20';
  const bgColor = color === 'blue' ? 'bg-blue-500/5' : color === 'pink' ? 'bg-pink-500/5' : 'bg-purple-500/5';
  const textColor = color === 'blue' ? 'text-blue-300' : color === 'pink' ? 'text-pink-300' : 'text-purple-300';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
      <h5 className={`text-xs font-semibold ${textColor} uppercase tracking-wider mb-2`}>{title}</h5>
      <p className="text-sm text-white/70 leading-relaxed">{desc}</p>
      {typeof data === 'object' && data.statement && data.statement !== desc && (
        <p className="text-xs text-white/50 mt-2 italic border-l-2 border-white/10 pl-3">"{data.statement}"</p>
      )}
    </div>
  );
}

export function LandingJTBDAnalysis({ jtbdData, marketResearch }: Props) {
  // Try to get JTBD from multiple sources
  const jtbd = jtbdData || marketResearch?.jtbd || null;
  if (!jtbd) return <EmptySection label="Analisis JTBD" />;

  const pains = safeArray(jtbd.pains || marketResearch?.pains);
  const desires = safeArray(jtbd.desires || marketResearch?.desires);
  const objections = safeArray(jtbd.objections || marketResearch?.objections);
  const insights = safeArray(jtbd.insights);

  const hasJobs = jtbd.functional || jtbd.emotional || jtbd.social;
  const hasData = hasJobs || pains.length > 0 || desires.length > 0;

  if (!hasData) return <EmptySection label="Analisis JTBD" />;

  return (
    <div className="space-y-5">
      {/* Jobs */}
      {hasJobs && (
        <div className="space-y-3">
          <JobCard title="Job Funcional" color="blue" data={jtbd.functional} />
          <JobCard title="Job Emocional" color="pink" data={jtbd.emotional} />
          <JobCard title="Job Social" color="purple" data={jtbd.social} />
        </div>
      )}

      {/* Pains & Desires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pains.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-300/80 uppercase tracking-wider mb-3">Dolores</h4>
            <div className="space-y-2">
              {pains.slice(0, 10).map((p: any, i: number) => (
                <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                  <p className="text-sm text-white/80">{safeStr(p.pain || p, '')}</p>
                  {p.impact && <p className="text-xs text-white/40 mt-0.5">{p.impact}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
        {desires.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-green-300/80 uppercase tracking-wider mb-3">Deseos</h4>
            <div className="space-y-2">
              {desires.slice(0, 10).map((d: any, i: number) => (
                <div key={i} className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                  <p className="text-sm text-white/80">{safeStr(d.desire || d, '')}</p>
                  {d.idealState && <p className="text-xs text-white/40 mt-0.5">{d.idealState}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Objections */}
      {objections.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-yellow-300/80 uppercase tracking-wider mb-3">Objeciones</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {objections.slice(0, 10).map((o: any, i: number) => (
              <div key={i} className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
                <p className="text-sm text-white/80">{safeStr(o.objection || o, '')}</p>
                {o.counter && <p className="text-xs text-yellow-400/50 mt-1">{o.counter}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.slice(0, 10).map((ins: any, i: number) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                <p className="text-sm text-white/80">{safeStr(ins.insight || ins, '')}</p>
                {ins.actionable && <p className="text-xs text-purple-400/50 mt-1">{ins.actionable}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
