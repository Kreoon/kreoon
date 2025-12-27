import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, RefreshCw, TrendingUp, AlertTriangle,
  CheckCircle2, Lightbulb, Brain
} from 'lucide-react';
import { useContentQualityScore, useUPEngine } from '@/hooks/useUPEngine';
import { cn } from '@/lib/utils';

interface QualityScoreWidgetProps {
  contentId: string;
  organizationId?: string;
  compact?: boolean;
}

export function QualityScoreWidget({ contentId, organizationId, compact = false }: QualityScoreWidgetProps) {
  const { qualityScore, loading, refetch } = useContentQualityScore(contentId);
  const { evaluateQualityScore } = useUPEngine(organizationId);
  const [evaluating, setEvaluating] = useState(false);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await evaluateQualityScore(contentId);
      await refetch();
    } finally {
      setEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/20 border-success/30';
    if (score >= 60) return 'bg-warning/20 border-warning/30';
    return 'bg-destructive/20 border-destructive/30';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 80) return 'Muy Bueno';
    if (score >= 70) return 'Bueno';
    if (score >= 60) return 'Aceptable';
    if (score >= 50) return 'Mejorable';
    return 'Necesita Trabajo';
  };

  if (loading) {
    return <Skeleton className={compact ? "h-12" : "h-32"} />;
  }

  // Compact version for card preview
  if (compact) {
    if (!qualityScore) {
      return (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-1 text-xs"
          onClick={handleEvaluate}
          disabled={evaluating}
        >
          <Sparkles className={cn("w-3 h-3", evaluating && "animate-spin")} />
          Evaluar IA
        </Button>
      );
    }

    return (
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md border text-xs",
        getScoreBg(qualityScore.score)
      )}>
        <Brain className="w-3 h-3" />
        <span className={cn("font-bold", getScoreColor(qualityScore.score))}>
          {qualityScore.score}
        </span>
        <span className="text-muted-foreground">/100</span>
      </div>
    );
  }

  // Full version for detail dialog
  return (
    <Card className={cn(
      "border-2 overflow-hidden",
      qualityScore ? getScoreBg(qualityScore.score) : "border-dashed"
    )}>
      <CardContent className="p-4">
        {qualityScore ? (
          <div className="space-y-4">
            {/* Score Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center border-2",
                  getScoreBg(qualityScore.score)
                )}>
                  <span className={cn("text-2xl font-bold", getScoreColor(qualityScore.score))}>
                    {qualityScore.score}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Quality Score IA
                  </h4>
                  <p className={cn("text-sm font-medium", getScoreColor(qualityScore.score))}>
                    {getScoreLabel(qualityScore.score)}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleEvaluate}
                disabled={evaluating}
              >
                <RefreshCw className={cn("w-4 h-4", evaluating && "animate-spin")} />
              </Button>
            </div>

            {/* Breakdown */}
            {qualityScore.breakdown && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Desglose:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(qualityScore.breakdown).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize">{key}</span>
                        <span className="font-medium">{value}/100</span>
                      </div>
                      <Progress value={value} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasons */}
            {qualityScore.reasons && qualityScore.reasons.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Por qué este puntaje:
                </p>
                <ul className="text-xs space-y-1">
                  {qualityScore.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <TrendingUp className="w-3 h-3 mt-0.5 text-success shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {qualityScore.suggestions && qualityScore.suggestions.length > 0 && (
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-primary" />
                  Sugerencias para mejorar:
                </p>
                <ul className="text-xs space-y-1">
                  {qualityScore.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5 text-warning shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground text-right">
              Evaluado: {new Date(qualityScore.evaluated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">
              Evalúa la calidad del contenido con IA
            </p>
            <Button onClick={handleEvaluate} disabled={evaluating}>
              <Brain className={cn("w-4 h-4 mr-2", evaluating && "animate-spin")} />
              {evaluating ? 'Evaluando...' : 'Evaluar con IA'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}