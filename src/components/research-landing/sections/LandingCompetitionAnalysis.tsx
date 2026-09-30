import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { safeArray, safeStr } from '../utils/researchDataHelpers';
import { EmptySection } from '../ResearchSection';

interface Props {
  competitorAnalysis?: { competitors?: any[]; differentiation?: any } | null;
}

function CompetitorCard({ competitor, index }: { competitor: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const name = competitor.name || `Competidor ${index + 1}`;
  const strengths = safeArray(competitor.strengths);
  const weaknesses = safeArray(competitor.weaknesses);

  return (
    <div className="bg-muted/40 border border-border rounded-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-sm bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{name}</p>
            {competitor.differentiator && <p className="text-xs text-muted-foreground/70 truncate max-w-[300px]">{competitor.differentiator}</p>}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground/70" /> : <ChevronDown className="h-4 w-4 text-muted-foreground/70" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {competitor.valueProposition && (
            <div>
              <h6 className="text-[10px] text-muted-foreground/70 uppercase mb-1">Propuesta de Valor</h6>
              <p className="text-xs text-muted-foreground">{competitor.valueProposition}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {competitor.price && (
              <div>
                <h6 className="text-[10px] text-muted-foreground/70 uppercase mb-1">Precio</h6>
                <p className="text-xs text-muted-foreground">{competitor.price}</p>
              </div>
            )}
            {competitor.tone && (
              <div>
                <h6 className="text-[10px] text-muted-foreground/70 uppercase mb-1">Tono</h6>
                <p className="text-xs text-muted-foreground">{competitor.tone}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strengths.length > 0 && (
              <div>
                <h6 className="text-[10px] text-green-300/60 uppercase mb-1.5">Fortalezas</h6>
                <ul className="space-y-1">
                  {strengths.map((s: any, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-green-400 shrink-0">+</span>{safeStr(s)}</li>
                  ))}
                </ul>
              </div>
            )}
            {weaknesses.length > 0 && (
              <div>
                <h6 className="text-[10px] text-red-300/60 uppercase mb-1.5">Debilidades</h6>
                <ul className="space-y-1">
                  {weaknesses.map((w: any, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-red-400 shrink-0">-</span>{safeStr(w)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Social links */}
          {(competitor.website || competitor.instagram) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {competitor.website && (
                <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-300/60 flex items-center gap-1 hover:text-purple-300">
                  <ExternalLink className="h-3 w-3" /> Web
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LandingCompetitionAnalysis({ competitorAnalysis }: Props) {
  const competitors = safeArray(competitorAnalysis?.competitors);

  if (competitors.length === 0) return <EmptySection label="Analisis de Competencia" />;

  return (
    <div className="space-y-3">
      {/* Comparison Table Summary */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground/70 font-medium">Competidor</th>
              <th className="text-left py-2 px-2 text-muted-foreground/70 font-medium">Diferenciador</th>
              <th className="text-left py-2 px-2 text-muted-foreground/70 font-medium">Precio</th>
              <th className="text-left py-2 px-2 text-muted-foreground/70 font-medium">Tono</th>
            </tr>
          </thead>
          <tbody>
            {competitors.slice(0, 10).map((c: any, i: number) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 px-2 text-muted-foreground font-medium">{c.name || `#${i + 1}`}</td>
                <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">{c.differentiator || '-'}</td>
                <td className="py-2 px-2 text-muted-foreground">{c.price || '-'}</td>
                <td className="py-2 px-2 text-muted-foreground">{c.tone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Cards */}
      <div className="space-y-2">
        {competitors.map((c: any, i: number) => (
          <CompetitorCard key={i} competitor={c} index={i} />
        ))}
      </div>
    </div>
  );
}
