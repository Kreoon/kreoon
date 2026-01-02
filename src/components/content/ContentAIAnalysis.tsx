import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Brain, Copy, Check, Target, Zap, TrendingUp, Lightbulb, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdCopy {
  text: string;
  cta: string;
  trustBadge: string;
  psychologicalTriggers: string[];
}

interface AnalysisResult {
  recommendedPhase: {
    phase: string;
    confidence: number;
    reasoning: string;
  };
  adCopies: AdCopy[];
  contentAnalysis: {
    hook_effectiveness: number;
    emotional_impact: number;
    clarity: number;
    cta_strength: number;
    overall_score: number;
    strengths: string[];
    improvements: string[];
  };
}

interface ContentAIAnalysisProps {
  contentId: string;
  organizationId: string;
  videoUrl?: string;
  product?: {
    name?: string;
    description?: string;
    strategy?: string;
    market_research?: string;
    ideal_avatar?: string;
    sales_angles?: string[];
  };
  client?: {
    name?: string;
    category?: string;
    bio?: string;
  };
  script?: string;
  spherePhase?: string;
  guidelines?: {
    editor?: string;
    strategist?: string;
    trafficker?: string;
    designer?: string;
    admin?: string;
  };
}

const PHASE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  engage: { label: 'Enganchar', color: 'bg-blue-500', emoji: '🎯' },
  solution: { label: 'Solución', color: 'bg-green-500', emoji: '💡' },
  remarketing: { label: 'Remarketing', color: 'bg-orange-500', emoji: '🔄' },
  fidelize: { label: 'Fidelizar', color: 'bg-purple-500', emoji: '💎' },
};

export function ContentAIAnalysis({
  contentId,
  organizationId,
  videoUrl,
  product,
  client,
  script,
  spherePhase,
  guidelines,
}: ContentAIAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!organizationId || !contentId) {
      toast.error('Faltan datos para el análisis');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-video-content', {
        body: {
          organizationId,
          contentId,
          videoUrl,
          product,
          client,
          script,
          spherePhase,
          guidelines,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success('Análisis completado');
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Error al analizar el contenido');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Copiado al portapapeles');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error('Error al copiar');
    }
  };

  const phaseConfig = result?.recommendedPhase?.phase
    ? PHASE_CONFIG[result.recommendedPhase.phase]
    : null;

  return (
    <div className="space-y-6">
      {/* Trigger Button */}
      <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Análisis Inteligente con IA</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gemini analizará el contenido considerando producto, estrategia, guiones y más para generar recomendaciones y copys optimizados.
              </p>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              size="lg"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analizando...' : 'Analizar con Gemini'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Phase Recommendation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Fase Recomendada
                </CardTitle>
              </CardHeader>
              <CardContent>
                {phaseConfig && (
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-lg ${phaseConfig.color} text-white text-3xl`}>
                      {phaseConfig.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-base px-3 py-1">
                          {phaseConfig.label}
                        </Badge>
                        <Badge variant="outline">
                          {result.recommendedPhase.confidence}% confianza
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.recommendedPhase.reasoning}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Análisis de Efectividad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Hook', value: result.contentAnalysis.hook_effectiveness, icon: Zap },
                    { label: 'Impacto Emocional', value: result.contentAnalysis.emotional_impact, icon: Brain },
                    { label: 'Claridad', value: result.contentAnalysis.clarity, icon: Lightbulb },
                    { label: 'CTA', value: result.contentAnalysis.cta_strength, icon: Target },
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <metric.icon className="h-3 w-3" />
                          {metric.label}
                        </span>
                        <span className="font-medium">{metric.value}%</span>
                      </div>
                      <Progress value={metric.value} className="h-2" />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Puntuación General</span>
                    <span className="text-2xl font-bold text-primary">
                      {result.contentAnalysis.overall_score}%
                    </span>
                  </div>
                  <Progress value={result.contentAnalysis.overall_score} className="h-3" />
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <h4 className="font-medium text-sm text-green-600 mb-2 flex items-center gap-1">
                      <Check className="h-4 w-4" /> Fortalezas
                    </h4>
                    <ul className="text-sm space-y-1">
                      {result.contentAnalysis.strengths.map((s, i) => (
                        <li key={i} className="text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-amber-600 mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> Mejoras Sugeridas
                    </h4>
                    <ul className="text-sm space-y-1">
                      {result.contentAnalysis.improvements.map((s, i) => (
                        <li key={i} className="text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ad Copies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5" />
                  Copys para Ads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.adCopies.map((copy, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        Copy {index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(
                          `${copy.text}\n\nCTA: ${copy.cta}\n${copy.trustBadge}`,
                          index
                        )}
                        className="h-8 px-2"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <p className="text-sm leading-relaxed mb-3">{copy.text}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className="bg-primary text-primary-foreground">
                        CTA: {copy.cta}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        ✓ {copy.trustBadge}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {copy.psychologicalTriggers.map((trigger, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs bg-muted/50"
                        >
                          🧠 {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
