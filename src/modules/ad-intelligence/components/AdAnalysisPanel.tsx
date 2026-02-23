import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { AdAIAnalysis } from "../types/ad-intelligence.types";

interface AdAnalysisPanelProps {
  analysis: AdAIAnalysis;
}

export function AdAnalysisPanel({ analysis }: AdAnalysisPanelProps) {
  const a = analysis.analysis || {};
  const r = analysis.replicated || {};

  return (
    <div className="space-y-4">
      {/* Analysis section */}
      <div>
        <h4 className="text-sm font-medium mb-3">Análisis AI</h4>
        <div className="grid grid-cols-2 gap-3">
          {a.hook_type && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Tipo de Hook</span>
              <Badge variant="secondary" className="block w-fit">{a.hook_type}</Badge>
            </div>
          )}
          {a.cta_type && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Tipo de CTA</span>
              <Badge variant="secondary" className="block w-fit">{a.cta_type}</Badge>
            </div>
          )}
          {a.emotion_primary && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Emoción principal</span>
              <Badge variant="secondary" className="block w-fit">{a.emotion_primary}</Badge>
            </div>
          )}
          {a.target_audience && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Audiencia objetivo</span>
              <Badge variant="secondary" className="block w-fit">{a.target_audience}</Badge>
            </div>
          )}
        </div>

        {a.hook_text && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Hook</span>
            <p className="text-sm italic">"{a.hook_text}"</p>
          </div>
        )}

        {a.format_notes && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Notas de formato</span>
            <p className="text-sm text-muted-foreground">{a.format_notes}</p>
          </div>
        )}

        {a.effectiveness_score !== undefined && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Efectividad</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    a.effectiveness_score >= 7 ? "bg-green-500" : a.effectiveness_score >= 4 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${(a.effectiveness_score / 10) * 100}%` }}
                />
              </div>
              <span className="text-sm font-bold">{a.effectiveness_score}/10</span>
            </div>
          </div>
        )}

        {a.strengths?.length ? (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Fortalezas</span>
            <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
              {a.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        ) : null}

        {a.weaknesses?.length ? (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Debilidades</span>
            <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
              {a.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        ) : null}

        {a.why_it_works && (
          <div className="mt-3">
            <span className="text-xs text-muted-foreground">Por qué funciona</span>
            <p className="text-sm">{a.why_it_works}</p>
          </div>
        )}
      </div>

      {/* Replicated versions */}
      {r.versions?.length ? (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-3">Versiones adaptadas</h4>
            <div className="space-y-3">
              {r.versions.map((v, i) => (
                <Card key={i} className="bg-accent/30">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">Versión {i + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-1">
                    {v.title && <p className="text-sm font-semibold">{v.title}</p>}
                    {v.body && <p className="text-sm text-muted-foreground">{v.body}</p>}
                    {v.cta && <Badge variant="outline" className="text-xs">{v.cta}</Badge>}
                    {v.adaptation_notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">{v.adaptation_notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
