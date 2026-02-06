import { safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  salesAnglesData?: {
    puv?: {
      centralProblem?: string;
      tangibleResult?: string;
      marketDifference?: string;
      idealClient?: string;
      statement?: string;
    };
    transformation?: {
      functional?: { before?: string; after?: string };
      emotional?: { before?: string; after?: string };
      identity?: { before?: string; after?: string };
      social?: { before?: string; after?: string };
      financial?: { before?: string; after?: string };
    };
  } | null;
}

function TransformRow({ label, before, after, color }: { label: string; before?: string; after?: string; color: string }) {
  if (!before && !after) return null;
  return (
    <div className="grid grid-cols-[100px_1fr_auto_1fr] items-center gap-2">
      <span className={`text-xs font-medium ${color}`}>{label}</span>
      <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
        <p className="text-xs text-white/60">{before || '-'}</p>
      </div>
      <span className="text-white/30 text-lg">→</span>
      <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2">
        <p className="text-xs text-white/60">{after || '-'}</p>
      </div>
    </div>
  );
}

export function LandingPUVTransformation({ salesAnglesData }: Props) {
  const puv = salesAnglesData?.puv;
  const transformation = salesAnglesData?.transformation;

  if (!puv && !transformation) return <EmptySection label="Propuesta de Valor" />;

  return (
    <div className="space-y-5">
      {/* PUV Statement */}
      {puv?.statement && (
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5">
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Propuesta Unica de Valor</h4>
          <p className="text-base text-white/90 font-medium leading-relaxed">"{puv.statement}"</p>
        </div>
      )}

      {/* PUV Components */}
      {puv && (puv.centralProblem || puv.tangibleResult || puv.marketDifference) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {puv.centralProblem && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h5 className="text-[10px] text-red-300/60 uppercase mb-1">Problema Central</h5>
              <p className="text-sm text-white/70">{puv.centralProblem}</p>
            </div>
          )}
          {puv.tangibleResult && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h5 className="text-[10px] text-green-300/60 uppercase mb-1">Resultado Tangible</h5>
              <p className="text-sm text-white/70">{puv.tangibleResult}</p>
            </div>
          )}
          {puv.marketDifference && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h5 className="text-[10px] text-purple-300/60 uppercase mb-1">Diferencia en el Mercado</h5>
              <p className="text-sm text-white/70">{puv.marketDifference}</p>
            </div>
          )}
          {puv.idealClient && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h5 className="text-[10px] text-blue-300/60 uppercase mb-1">Cliente Ideal</h5>
              <p className="text-sm text-white/70">{puv.idealClient}</p>
            </div>
          )}
        </div>
      )}

      {/* Transformation Table */}
      {transformation && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Tabla de Transformacion</h4>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3 overflow-x-auto">
            <div className="grid grid-cols-[100px_1fr_auto_1fr] items-center gap-2 mb-2">
              <span className="text-[10px] text-white/30 uppercase">Dimension</span>
              <span className="text-[10px] text-red-300/40 uppercase text-center">Antes</span>
              <span />
              <span className="text-[10px] text-green-300/40 uppercase text-center">Despues</span>
            </div>
            <TransformRow label="Funcional" color="text-blue-300" before={transformation.functional?.before} after={transformation.functional?.after} />
            <TransformRow label="Emocional" color="text-pink-300" before={transformation.emotional?.before} after={transformation.emotional?.after} />
            <TransformRow label="Identidad" color="text-purple-300" before={transformation.identity?.before} after={transformation.identity?.after} />
            <TransformRow label="Social" color="text-cyan-300" before={transformation.social?.before} after={transformation.social?.after} />
            <TransformRow label="Financiero" color="text-green-300" before={transformation.financial?.before} after={transformation.financial?.after} />
          </div>
        </div>
      )}
    </div>
  );
}
