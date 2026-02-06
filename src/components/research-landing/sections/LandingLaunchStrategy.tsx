import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  launchStrategy?: {
    preLaunch?: {
      duration?: string;
      objectives?: string[];
      actions?: any[];
      contentPlan?: string[];
      checklist?: string[];
    };
    launch?: {
      dayPlan?: any[];
      offer?: {
        description?: string;
        price?: string;
        bonuses?: string[];
        urgency?: string;
        scarcity?: string;
        guarantee?: string;
      };
      emailSequence?: any[];
      channels?: any[];
    };
    postLaunch?: {
      retentionActions?: string[];
      postSaleContent?: string[];
      referralStrategy?: string;
      nonBuyerFollowUp?: string[];
      analysisChecklist?: string[];
    };
    budget?: {
      organic?: any[];
      paid?: any[];
      totalEstimated?: string;
    };
    timeline?: any[];
    team?: any[];
    metrics?: {
      preLaunch?: any[];
      launch?: any[];
      postLaunch?: any[];
    };
  } | null;
}

function PhaseCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-500/5 border-blue-500/15',
    purple: 'bg-purple-500/5 border-purple-500/15',
    green: 'bg-green-500/5 border-green-500/15',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    green: 'text-green-300',
  };
  return (
    <div className={`${bgMap[color] || 'bg-white/[0.03] border-white/[0.06]'} border rounded-xl p-4`}>
      <h4 className={`text-sm font-semibold ${textMap[color] || 'text-white'} mb-3`}>{title}</h4>
      {children}
    </div>
  );
}

export function LandingLaunchStrategy({ launchStrategy }: Props) {
  if (!launchStrategy) return <EmptySection label="Estrategia de Lanzamiento" />;

  const { preLaunch, launch, postLaunch, budget, timeline, team, metrics } = launchStrategy;
  const hasData = preLaunch || launch || postLaunch;
  if (!hasData) return <EmptySection label="Estrategia de Lanzamiento" />;

  const timelineItems = safeArray(timeline);

  return (
    <div className="space-y-5">
      {/* Timeline */}
      {timelineItems.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timelineItems.map((t: any, i: number) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 min-w-[140px] shrink-0">
              <p className="text-[10px] text-purple-300/60 uppercase">{t.phase || ''} · {t.week || ''}</p>
              <p className="text-xs font-medium text-white/70 mt-0.5">{t.milestone || ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pre-Launch */}
      {preLaunch && (
        <PhaseCard title="Pre-Lanzamiento" color="blue">
          {preLaunch.duration && <p className="text-xs text-white/50 mb-2">Duracion: {preLaunch.duration}</p>}
          {safeArray(preLaunch.objectives).length > 0 && (
            <div className="mb-3">
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Objetivos</h5>
              <ul className="space-y-1">
                {safeArray(preLaunch.objectives).map((o: string, i: number) => (
                  <li key={i} className="text-xs text-white/60 flex gap-1.5"><span className="text-blue-400 shrink-0">•</span>{safeStr(o)}</li>
                ))}
              </ul>
            </div>
          )}
          {safeArray(preLaunch.actions).length > 0 && (
            <div>
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Acciones</h5>
              <div className="space-y-1.5">
                {safeArray(preLaunch.actions).map((a: any, i: number) => (
                  <div key={i} className="text-xs text-white/60">
                    <span className="text-white/80">{safeStr(a.action || a)}</span>
                    {a.channel && <span className="text-white/30"> · {a.channel}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </PhaseCard>
      )}

      {/* Launch */}
      {launch && (
        <PhaseCard title="Dia de Lanzamiento" color="purple">
          {/* Day plan */}
          {safeArray(launch.dayPlan).length > 0 && (
            <div className="mb-3">
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Plan del Dia</h5>
              <div className="space-y-1.5">
                {safeArray(launch.dayPlan).map((d: any, i: number) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="text-purple-300/60 font-mono shrink-0 w-14">{d.time || ''}</span>
                    <span className="text-white/60">{safeStr(d.action || d)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offer */}
          {launch.offer && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 mb-3">
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Estructura de Oferta</h5>
              {launch.offer.description && <p className="text-xs text-white/60 mb-1">{launch.offer.description}</p>}
              {launch.offer.price && <p className="text-xs text-white/70 font-medium">{launch.offer.price}</p>}
              {safeArray(launch.offer.bonuses).length > 0 && (
                <div className="mt-1.5">
                  <span className="text-[10px] text-white/30">Bonos: </span>
                  {safeArray(launch.offer.bonuses).map((b: string, i: number) => (
                    <span key={i} className="text-[10px] text-white/50">{i > 0 ? ' · ' : ''}{safeStr(b)}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email sequence */}
          {safeArray(launch.emailSequence).length > 0 && (
            <div>
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Secuencia de Emails</h5>
              <div className="space-y-1.5">
                {safeArray(launch.emailSequence).map((e: any, i: number) => (
                  <div key={i} className="bg-white/[0.02] rounded p-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-purple-300/60">{e.day || ''}</span>
                    </div>
                    <p className="text-white/70 font-medium">{e.subject || ''}</p>
                    {e.cta && <p className="text-white/40 mt-0.5">CTA: {e.cta}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </PhaseCard>
      )}

      {/* Post-Launch */}
      {postLaunch && (
        <PhaseCard title="Post-Lanzamiento" color="green">
          {safeArray(postLaunch.retentionActions).length > 0 && (
            <div className="mb-2">
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Retencion</h5>
              <ul className="space-y-1">
                {safeArray(postLaunch.retentionActions).map((a: string, i: number) => (
                  <li key={i} className="text-xs text-white/60 flex gap-1.5"><span className="text-green-400 shrink-0">•</span>{safeStr(a)}</li>
                ))}
              </ul>
            </div>
          )}
          {postLaunch.referralStrategy && (
            <div>
              <h5 className="text-[10px] text-white/30 uppercase mb-1">Estrategia de Referidos</h5>
              <p className="text-xs text-white/60">{postLaunch.referralStrategy}</p>
            </div>
          )}
        </PhaseCard>
      )}

      {/* Budget */}
      {budget && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Presupuesto</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-1.5 text-white/40 font-medium">Item</th>
                  <th className="text-left py-1.5 text-white/40 font-medium">Costo</th>
                  <th className="text-left py-1.5 text-white/40 font-medium">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {safeArray(budget.organic).map((b: any, i: number) => (
                  <tr key={`o-${i}`} className="border-b border-white/[0.04]">
                    <td className="py-1.5 text-white/60">{b.item || '-'}</td>
                    <td className="py-1.5 text-white/50">{b.cost || '-'}</td>
                    <td className="py-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-300">Organico</span></td>
                  </tr>
                ))}
                {safeArray(budget.paid).map((b: any, i: number) => (
                  <tr key={`p-${i}`} className="border-b border-white/[0.04]">
                    <td className="py-1.5 text-white/60">{b.item || '-'}</td>
                    <td className="py-1.5 text-white/50">{b.cost || '-'}</td>
                    <td className="py-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300">Pago</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {budget.totalEstimated && (
            <p className="text-sm font-semibold text-white mt-3 text-right">Total estimado: {budget.totalEstimated}</p>
          )}
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Metricas de Exito</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Pre-Lanzamiento', items: safeArray(metrics.preLaunch), color: 'blue' },
              { label: 'Lanzamiento', items: safeArray(metrics.launch), color: 'purple' },
              { label: 'Post-Lanzamiento', items: safeArray(metrics.postLaunch), color: 'green' },
            ].map(({ label, items, color }) => items.length > 0 && (
              <div key={label}>
                <h5 className={`text-[10px] uppercase mb-1.5 ${color === 'blue' ? 'text-blue-300/60' : color === 'purple' ? 'text-purple-300/60' : 'text-green-300/60'}`}>{label}</h5>
                <div className="space-y-1">
                  {items.map((m: any, i: number) => (
                    <div key={i} className="text-xs">
                      <span className="text-white/60">{m.metric || safeStr(m)}</span>
                      {m.target && <span className="text-white/40"> → {m.target}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
