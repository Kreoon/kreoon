import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  salesAnglesData?: {
    leadMagnets?: any[];
    videoCreatives?: any[];
  } | null;
}

export function LandingLeadMagnets({ salesAnglesData }: Props) {
  const magnets = safeArray(salesAnglesData?.leadMagnets);
  const creatives = safeArray(salesAnglesData?.videoCreatives);

  if (magnets.length === 0 && creatives.length === 0) {
    return <EmptySection label="Leads y Creativos" />;
  }

  return (
    <div className="space-y-5">
      {/* Lead Magnets */}
      {magnets.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Lead Magnets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {magnets.map((m: any, i: number) => (
              <div key={i} className="bg-muted/40 border border-border rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">{safeStr(m.name || m, `Lead Magnet ${i + 1}`)}</p>
                {m.objective && <p className="text-xs text-muted-foreground">{m.objective}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {m.contentType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">{m.contentType}</span>
                  )}
                  {m.avatar && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{m.avatar}</span>
                  )}
                  {m.awarenessPhase && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{m.awarenessPhase}</span>
                  )}
                </div>
                {m.pain && <p className="text-xs text-muted-foreground/70">Dolor: {m.pain}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Creatives */}
      {creatives.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3">Creativos de Video ({creatives.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {creatives.slice(0, 12).map((c: any, i: number) => (
              <div key={i} className="bg-muted/40 border border-border rounded-sm p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-muted-foreground">{safeStr(c.title || c.angle || c.idea, `Creativo ${i + 1}`)}</p>
                  {c.format && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 shrink-0">{c.format}</span>
                  )}
                </div>
                {c.idea && c.title && <p className="text-xs text-muted-foreground">{c.idea}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {c.esferaPhase && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{c.esferaPhase}</span>
                  )}
                  {c.avatar && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{c.avatar}</span>
                  )}
                  {c.duration && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/70">{c.duration}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {creatives.length > 12 && (
            <p className="text-xs text-muted-foreground/70 text-center mt-2">+{creatives.length - 12} creativos mas</p>
          )}
        </div>
      )}
    </div>
  );
}
