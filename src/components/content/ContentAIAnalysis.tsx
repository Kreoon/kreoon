import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Brain, Copy, Check, Target, Zap, TrendingUp, Lightbulb, AlertCircle, Users, Globe, UserCheck, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdCopy {
  framework?: string;
  text: string;
  clickBooster?: string;
  urgencyBooster?: string; // legacy
  cta?: string; // legacy
  trustBadge: string;
  psychologicalTriggers: string[];
}

interface AudienceSegment {
  name: string;
  description: string;
  interests: string[];
  demographics?: string;
}

interface TargetAudiences {
  directAudiences: AudienceSegment[];
  indirectAudiences: AudienceSegment[];
  country: string;
  notes?: string;
}

interface AnalysisResult {
  recommendedPhase: {
    phase: string;
    confidence: number;
    reasoning: string;
  };
  adCopies: AdCopy[];
  targetAudiences?: TargetAudiences;
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
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Load existing analysis on mount
  useEffect(() => {
    const loadExistingAnalysis = async () => {
      if (!contentId) {
        setLoadingExisting(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('content')
          .select('ai_analysis_data')
          .eq('id', contentId)
          .single();

        if (error) throw error;

        if (data?.ai_analysis_data) {
          setResult(data.ai_analysis_data as unknown as AnalysisResult);
          setIsSaved(true);
        }
      } catch (error) {
        console.error('Error loading existing analysis:', error);
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExistingAnalysis();
  }, [contentId]);

  const saveResult = async (analysisResult: AnalysisResult) => {
    if (!analysisResult || !contentId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('content')
        .update({
          ai_quality_score: analysisResult.contentAnalysis.overall_score,
          sphere_phase: analysisResult.recommendedPhase.phase as any,
          ai_analysis_data: analysisResult as any,
        })
        .eq('id', contentId);

      if (error) throw error;
      setIsSaved(true);
    } catch (error: any) {
      console.error('Auto-save error:', error);
      toast.error('Error al guardar automáticamente');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!organizationId || !contentId) {
      toast.error('Faltan datos para el análisis');
      return;
    }

    setLoading(true);
    setIsSaved(false);
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
      
      // Auto-save immediately after analysis completes
      await saveResult(data);
      toast.success('Análisis completado y guardado');
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

  if (loadingExisting) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 animate-pulse">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Cargando análisis existente...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trigger Button - show only if no result exists */}
      {!result && (
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
      )}

      {/* Results */}
      {result && (
        <>
          {/* Header with regenerate button */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
              <Check className="h-3 w-3" />
              Guardado automáticamente
            </Badge>
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Regenerando...' : 'Regenerar análisis'}
            </Button>
          </div>

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

            {/* Target Audiences */}
            {result.targetAudiences && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Públicos de Segmentación
                    {result.targetAudiences.country && (
                      <Badge variant="outline" className="ml-2 gap-1">
                        <Globe className="h-3 w-3" />
                        {result.targetAudiences.country}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Direct Audiences */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-green-600">
                      <UserCheck className="h-4 w-4" />
                      Públicos Directos
                      <span className="text-muted-foreground font-normal">(buscan activamente la solución)</span>
                    </h4>
                    <div className="grid gap-3">
                      {result.targetAudiences.directAudiences?.map((audience, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-sm">{audience.name}</span>
                            {audience.demographics && (
                              <Badge variant="secondary" className="text-xs">
                                {audience.demographics}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{audience.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {audience.interests?.map((interest, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Indirect Audiences */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-600">
                      <UserPlus className="h-4 w-4" />
                      Públicos Indirectos
                      <span className="text-muted-foreground font-normal">(relacionados pero no buscan aún)</span>
                    </h4>
                    <div className="grid gap-3">
                      {result.targetAudiences.indirectAudiences?.map((audience, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-sm">{audience.name}</span>
                            {audience.demographics && (
                              <Badge variant="secondary" className="text-xs">
                                {audience.demographics}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{audience.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {audience.interests?.map((interest, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.targetAudiences.notes && (
                    <p className="text-sm text-muted-foreground italic border-l-2 pl-3">
                      💡 {result.targetAudiences.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Copy {index + 1}
                        </Badge>
                        {copy.framework && (
                          <Badge className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            {copy.framework}
                          </Badge>
                        )}
                      </div>
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
                      {(copy.clickBooster || copy.urgencyBooster || copy.cta) && (
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium">
                          {copy.clickBooster || copy.urgencyBooster || copy.cta}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {copy.trustBadge}
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
        </>
      )}
    </div>
  );
}
