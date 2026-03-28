import { useState } from 'react';
import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  salesAnglesData?: { angles?: any[] } | null;
}

const TYPE_COLORS: Record<string, string> = {
  emocional: 'bg-pink-500/15 text-pink-300 border-pink-500/20',
  logico: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  social: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  urgencia: 'bg-red-500/15 text-red-300 border-red-500/20',
  autoridad: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  curiosidad: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
};

export function LandingSalesAngles({ salesAnglesData }: Props) {
  const angles = safeArray(salesAnglesData?.angles);
  const [filter, setFilter] = useState('');

  if (angles.length === 0) return <EmptySection label="Angulos de Venta" />;

  // Get unique types for filter
  const types = [...new Set(angles.map((a: any) => a.type).filter(Boolean))] as string[];

  const filtered = filter ? angles.filter((a: any) => a.type?.toLowerCase() === filter.toLowerCase()) : angles;

  return (
    <div className="space-y-4">
      {/* Filter */}
      {types.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter('')}
            className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${!filter ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
          >
            Todos ({angles.length})
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(filter === t ? '' : t)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${filter === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
            >
              {t} ({angles.filter((a: any) => a.type === t).length})
            </button>
          ))}
        </div>
      )}

      {/* Angles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((angle: any, i: number) => {
          const typeClass = TYPE_COLORS[angle.type?.toLowerCase()] || 'bg-white/10 text-white/60 border-white/10';
          return (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white/90">{safeStr(angle.angle, `Angulo ${i + 1}`)}</p>
                {angle.type && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${typeClass}`}>
                    {angle.type}
                  </span>
                )}
              </div>

              {angle.hookExample && (
                <p className="text-xs text-purple-300/80 italic border-l-2 border-purple-500/20 pl-2">
                  "{angle.hookExample}"
                </p>
              )}

              {angle.whyItWorks && (
                <p className="text-xs text-white/40">{angle.whyItWorks}</p>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {angle.avatar && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{angle.avatar}</span>
                )}
                {angle.emotion && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{angle.emotion}</span>
                )}
                {angle.funnelPhase && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{angle.funnelPhase}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
