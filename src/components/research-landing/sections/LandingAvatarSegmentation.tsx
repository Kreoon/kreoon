import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  avatarProfiles?: { profiles?: any[] } | null;
}

function AvatarCard({ avatar, index, isExpanded, onToggle }: { avatar: any; index: number; isExpanded: boolean; onToggle: () => void }) {
  const name = avatar.name || `Avatar ${index + 1}`;
  const demographics = avatar.demographics || {};
  const situation = typeof avatar.situation === 'string' ? avatar.situation : avatar.situation?.dayToDay || '';
  const psychographics = avatar.psychographics || {};
  const communication = avatar.communication || {};
  const phrases = safeArray(communication.phrases || avatar.phrases);
  const drivers = safeArray(psychographics.drivers || avatar.drivers);
  const objections = safeArray(psychographics.objections || avatar.objections);
  const fears = safeArray(psychographics.deepestFears);

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-sm font-bold shrink-0">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-white/40">
              {[demographics.age, demographics.occupation, demographics.location].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
          {/* Situation */}
          {situation && (
            <div>
              <h6 className="text-[10px] text-white/40 uppercase mb-1">Situacion Actual</h6>
              <p className="text-sm text-white/70">{situation}</p>
            </div>
          )}

          {/* Drivers & Objections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drivers.length > 0 && (
              <div>
                <h6 className="text-[10px] text-green-300/60 uppercase mb-1.5">Motivaciones</h6>
                <ul className="space-y-1">
                  {drivers.map((d: any, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex gap-1.5"><span className="text-green-400 shrink-0">+</span>{safeStr(d)}</li>
                  ))}
                </ul>
              </div>
            )}
            {objections.length > 0 && (
              <div>
                <h6 className="text-[10px] text-red-300/60 uppercase mb-1.5">Objeciones</h6>
                <ul className="space-y-1">
                  {objections.map((o: any, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex gap-1.5"><span className="text-red-400 shrink-0">-</span>{safeStr(o)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Fears */}
          {fears.length > 0 && (
            <div>
              <h6 className="text-[10px] text-yellow-300/60 uppercase mb-1.5">Miedos Profundos</h6>
              <div className="flex flex-wrap gap-1.5">
                {fears.map((f: any, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300/70 border border-yellow-500/15">{safeStr(f)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Phrases */}
          {phrases.length > 0 && (
            <div>
              <h6 className="text-[10px] text-purple-300/60 uppercase mb-1.5">Frases Reales</h6>
              <div className="space-y-1">
                {phrases.slice(0, 3).map((p: any, i: number) => (
                  <p key={i} className="text-xs text-white/50 italic border-l-2 border-purple-500/20 pl-2">"{safeStr(p)}"</p>
                ))}
              </div>
            </div>
          )}

          {/* Awareness & Tone */}
          <div className="flex flex-wrap gap-2">
            {(avatar.awarenessLevel || psychographics.awarenessLevel) && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
                {avatar.awarenessLevel || psychographics.awarenessLevel}
              </span>
            )}
            {communication.preferredTone && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                Tono: {communication.preferredTone}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function LandingAvatarSegmentation({ avatarProfiles }: Props) {
  const profiles = safeArray(avatarProfiles?.profiles);
  const [expandedIdx, setExpandedIdx] = useState<number>(0);

  if (profiles.length === 0) return <EmptySection label="Avatares Estrategicos" />;

  return (
    <div className="space-y-3">
      {profiles.map((avatar: any, i: number) => (
        <AvatarCard
          key={i}
          avatar={avatar}
          index={i}
          isExpanded={expandedIdx === i}
          onToggle={() => setExpandedIdx(expandedIdx === i ? -1 : i)}
        />
      ))}
    </div>
  );
}
