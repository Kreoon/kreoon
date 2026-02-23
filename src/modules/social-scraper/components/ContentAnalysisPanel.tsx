import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ContentAIAnalysis } from "../types/social-scraper.types";

interface ContentAnalysisPanelProps {
  analysis: ContentAIAnalysis;
}

export function ContentAnalysisPanel({ analysis }: ContentAnalysisPanelProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium mb-3">Analisis AI</h4>

      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-3">
        {analysis.hook_type && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Tipo de Hook</span>
            <Badge variant="secondary" className="block w-fit">{analysis.hook_type}</Badge>
          </div>
        )}
        {analysis.target_audience && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Audiencia objetivo</span>
            <Badge variant="secondary" className="block w-fit">{analysis.target_audience}</Badge>
          </div>
        )}
        {analysis.best_posting_time && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Mejor horario</span>
            <Badge variant="secondary" className="block w-fit">{analysis.best_posting_time}</Badge>
          </div>
        )}
      </div>

      {/* Content pillars */}
      {analysis.content_pillars?.length ? (
        <div>
          <span className="text-xs text-muted-foreground">Pilares de contenido</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.content_pillars.map((pillar, i) => (
              <Badge key={i} variant="outline" className="text-xs">{pillar}</Badge>
            ))}
          </div>
        </div>
      ) : null}

      {/* Hook text */}
      {analysis.hook_text && (
        <div>
          <span className="text-xs text-muted-foreground">Hook</span>
          <p className="text-sm italic">"{analysis.hook_text}"</p>
        </div>
      )}

      {/* Format notes */}
      {analysis.format_notes && (
        <div>
          <span className="text-xs text-muted-foreground">Notas de formato</span>
          <p className="text-sm text-muted-foreground">{analysis.format_notes}</p>
        </div>
      )}

      {/* Virality score */}
      {analysis.virality_score !== undefined && (
        <div>
          <span className="text-xs text-muted-foreground">Score de viralidad</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  analysis.virality_score >= 7 ? "bg-green-500" : analysis.virality_score >= 4 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${(analysis.virality_score / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold">{analysis.virality_score}/10</span>
          </div>
        </div>
      )}

      {/* Why it works */}
      {analysis.why_it_works && (
        <div>
          <span className="text-xs text-muted-foreground">Por que funciona</span>
          <p className="text-sm">{analysis.why_it_works}</p>
        </div>
      )}

      {/* Improvement suggestions */}
      {analysis.improvement_suggestions?.length ? (
        <div>
          <span className="text-xs text-muted-foreground">Sugerencias de mejora</span>
          <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
            {analysis.improvement_suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Replication ideas */}
      {analysis.replication_ideas?.length ? (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Ideas de replicacion</h4>
            <ul className="list-decimal list-inside text-sm space-y-1">
              {analysis.replication_ideas.map((idea, i) => <li key={i}>{idea}</li>)}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
