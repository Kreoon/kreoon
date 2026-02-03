import { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, Sparkles, AlertTriangle, CheckCircle2, 
  ArrowRight, Lightbulb, Target, Zap, BarChart3,
  Loader2, Clock, AlertCircle, TrendingUp, X, Search
} from 'lucide-react';
import { useBoardAI, CardAnalysis, BoardAnalysis, ResearchContextResult } from '@/hooks/useBoardAI';
import { useAICopilot } from '@/contexts/AICopilotContext';
import { AIFeedbackWidget } from '@/components/ai/AIFeedbackWidget';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BoardAIPanelProps {
  organizationId: string;
  open: boolean;
  onClose: () => void;
  mode: 'card' | 'board';
  contentId?: string;
  contentTitle?: string;
}

const RISK_COLORS = {
  bajo: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  medio: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  alto: 'text-red-600 bg-red-100 dark:bg-red-900/30'
};

const SEVERITY_COLORS = {
  low: 'border-green-500/50 bg-green-500/5',
  medium: 'border-amber-500/50 bg-amber-500/5',
  high: 'border-red-500/50 bg-red-500/5'
};

const PRIORITY_BADGES = {
  low: { variant: 'secondary' as const, label: 'Baja' },
  medium: { variant: 'default' as const, label: 'Media' },
  high: { variant: 'destructive' as const, label: 'Alta' }
};

export function BoardAIPanel({
  organizationId,
  open,
  onClose,
  mode,
  contentId,
  contentTitle
}: BoardAIPanelProps) {
  const {
    loading,
    cardAnalysis,
    boardAnalysis,
    automationRecommendations,
    moduleInactive,
    analyzeCard,
    analyzeBoard,
    recommendAutomation,
    researchContext,
    clearAnalysis
  } = useBoardAI(organizationId);

  const { addNotification } = useAICopilot();
  const [activeTab, setActiveTab] = useState<'analysis' | 'bottlenecks' | 'automation'>('analysis');
  const [researchResult, setResearchResult] = useState<ResearchContextResult | null>(null);
  const isResearching = loading === 'research';

  const handleAnalyze = async () => {
    setFeedbackDismissed(false);
    try {
      if (mode === 'card' && contentId) {
        const result = await analyzeCard(contentId);
        if (result) {
          addNotification({
            type: result.risk_level === 'alto' ? 'warning' : result.risk_level === 'medio' ? 'insight' : 'success',
            title: `Análisis: ${contentTitle || 'Tarjeta'}`,
            message: result.recommendation,
          });
        }
      } else {
        const result = await analyzeBoard();
        if (result) {
          const type = result.health_score >= 70 ? 'success' : result.health_score >= 40 ? 'insight' : 'warning';
          addNotification({
            type,
            title: 'Análisis del Tablero',
            message: result.summary || 'Análisis completado',
          });

          // Add bottleneck warnings (with defensive check)
          const bottlenecks = result.bottlenecks || [];
          bottlenecks.filter(b => b.severity === 'high').forEach(b => {
            addNotification({
              type: 'warning',
              title: `Cuello de botella: ${b.status}`,
              message: b.suggestion,
            });
          });
        }
      }
    } catch (e) {
      // Avoid unhandled promise rejections that can blank the screen
      console.error('BoardAIPanel handleAnalyze error:', e);
    }
  };

  const handleClose = () => {
    setResearchResult(null);
    clearAnalysis();
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {mode === 'card' ? 'Análisis de Proyecto' : 'Análisis Estratégico'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'card' 
              ? `Análisis inteligente: ${contentTitle || 'Proyecto seleccionado'}`
              : 'Análisis inteligente del estado del tablero'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          {/* Module Inactive Warning */}
          {moduleInactive && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-amber-500/10 p-4 mb-4">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              </div>
              <h3 className="font-medium mb-2 text-lg">Asistente no habilitado</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                El asistente estratégico para {mode === 'card' ? 'proyectos' : 'tablero'} no está activado para tu organización.
              </p>
              <Badge variant="outline" className="mb-4">
                Módulo: {moduleInactive}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Un administrador debe habilitarlo en <strong>Configuración → IA & Modelos</strong>
              </p>
            </div>
          )}

          {/* Action Button */}
          {!cardAnalysis && !boardAnalysis && !moduleInactive && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium mb-2">
                {mode === 'card' ? 'Analizar este proyecto' : 'Análisis estratégico'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                {mode === 'card' 
                  ? 'El asistente analizará el estado, riesgos y recomendará acciones para este proyecto.'
                  : 'El asistente detectará cuellos de botella, problemas de flujo y oportunidades de mejora.'
                }
              </p>
              <Button 
                onClick={handleAnalyze} 
                disabled={!!loading}
                size="lg"
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analizar con IA
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Card Analysis Results */}
          {mode === 'card' && cardAnalysis && (
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {/* Risk Summary Card */}
                <Card className={cn("border-2", RISK_COLORS[cardAnalysis.risk_level])}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">Nivel de Riesgo</span>
                      </div>
                      <Badge className={cn("uppercase", RISK_COLORS[cardAnalysis.risk_level])}>
                        {cardAnalysis.risk_level}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Probabilidad de atraso</span>
                        <span className="font-medium">{cardAnalysis.risk_percentage}%</span>
                      </div>
                      <Progress value={cardAnalysis.risk_percentage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Interpretation */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      Interpretación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{cardAnalysis.current_interpretation}</p>
                  </CardContent>
                </Card>

                {/* Risk Factors */}
                {cardAnalysis.risk_factors && cardAnalysis.risk_factors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Factores de Riesgo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {cardAnalysis.risk_factors.map((factor, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-500 mt-1">•</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Next State Suggestion */}
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-primary" />
                      Siguiente Estado Probable
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="text-sm">
                      {cardAnalysis.probable_next_state}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Recommendation */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Recomendación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{cardAnalysis.recommendation}</p>
                  </CardContent>
                </Card>

                {/* Investigar tendencias con Perplexity */}
                {contentId && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const result = await researchContext(contentId, 'trends');
                        if (result) {
                          setResearchResult(result);
                          addNotification({
                            type: 'success',
                            title: 'Investigación completada',
                            message: 'Tendencias actuales cargadas con Perplexity',
                          });
                        }
                      }}
                      disabled={isResearching || moduleInactive !== null}
                      className="gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {isResearching ? 'Investigando...' : 'Investigar tendencias'}
                    </Button>
                    {researchResult && (
                      <Card className="border-purple-500/20 bg-purple-500/5">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Search className="h-4 w-4 text-purple-500" />
                            Investigación en tiempo real
                          </CardTitle>
                          {researchResult.citations?.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Fuentes: {researchResult.citations.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{researchResult.research}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Explainability Section */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="h-3 w-3" />
                      Datos Analizados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {cardAnalysis.data_analyzed?.map((data, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {data}
                        </Badge>
                      ))}
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Confianza: {cardAnalysis.confidence}%</span>
                      <span>Modelo: {cardAnalysis.ai_model}</span>
                    </div>
                  </CardContent>
                </Card>

                {cardAnalysis.execution_id && !feedbackDismissed && (
                  <div className="mt-4">
                    <AIFeedbackWidget
                      executionId={cardAnalysis.execution_id}
                      onClose={() => setFeedbackDismissed(true)}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Board Analysis Results */}
          {mode === 'board' && boardAnalysis && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="analysis">Resumen</TabsTrigger>
                  <TabsTrigger value="bottlenecks">Cuellos</TabsTrigger>
                  <TabsTrigger value="automation">Automatizar</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                  <TabsContent value="analysis" className="mt-0 space-y-4 pr-4">
                    {/* Health Score */}
                    <Card className="border-2">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Salud del Tablero</span>
                          <span className="text-2xl font-bold">{boardAnalysis.health_score}/100</span>
                        </div>
                        <Progress 
                          value={boardAnalysis.health_score} 
                          className={cn(
                            "h-3",
                            boardAnalysis.health_score >= 70 && "[&>div]:bg-green-500",
                            boardAnalysis.health_score >= 40 && boardAnalysis.health_score < 70 && "[&>div]:bg-amber-500",
                            boardAnalysis.health_score < 40 && "[&>div]:bg-red-500"
                          )} 
                        />
                      </CardContent>
                    </Card>

                    {/* Summary */}
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm">{boardAnalysis.summary}</p>
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <Card>
                        <CardContent className="pt-3 pb-3 text-center">
                          <div className="text-2xl font-bold">{boardAnalysis.total_cards}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </CardContent>
                      </Card>
                      <Card className="border-amber-500/30">
                        <CardContent className="pt-3 pb-3 text-center">
                          <div className="text-2xl font-bold text-amber-500">{boardAnalysis.stale_count}</div>
                          <div className="text-xs text-muted-foreground">Estancadas</div>
                        </CardContent>
                      </Card>
                      <Card className="border-destructive/30">
                        <CardContent className="pt-3 pb-3 text-center">
                          <div className="text-2xl font-bold text-destructive">{boardAnalysis.overdue_count}</div>
                          <div className="text-xs text-muted-foreground">Vencidas</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recommendations */}
                    {(boardAnalysis.recommendations?.length ?? 0) > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            Recomendaciones
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(boardAnalysis.recommendations || []).map((rec, i) => (
                            <div key={i} className="p-3 rounded-lg border bg-muted/30">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium text-sm">{rec.title}</span>
                                <Badge {...PRIORITY_BADGES[rec.priority]}>
                                  {PRIORITY_BADGES[rec.priority].label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {boardAnalysis.execution_id && !feedbackDismissed && (
                      <div className="mt-4">
                        <AIFeedbackWidget
                          executionId={boardAnalysis.execution_id}
                          onClose={() => setFeedbackDismissed(true)}
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="bottlenecks" className="mt-0 space-y-3 pr-4">
                    {(boardAnalysis.bottlenecks?.length ?? 0) === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="font-medium">Sin cuellos de botella</p>
                        <p className="text-sm text-muted-foreground">El flujo del tablero parece saludable</p>
                      </div>
                    ) : (
                      (boardAnalysis.bottlenecks || []).map((bottleneck, i) => (
                        <Card 
                          key={i} 
                          className={cn("border-l-4", SEVERITY_COLORS[bottleneck.severity])}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{bottleneck.status}</Badge>
                              <Badge 
                                variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {bottleneck.severity === 'high' ? 'Crítico' : bottleneck.severity === 'medium' ? 'Moderado' : 'Leve'}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{bottleneck.description}</p>
                            {bottleneck.impact && (
                              <p className="text-xs text-muted-foreground mb-2">
                                <strong>Impacto:</strong> {bottleneck.impact}
                              </p>
                            )}
                            <div className="p-2 rounded bg-primary/5 text-xs">
                              <strong>💡 Sugerencia:</strong> {bottleneck.suggestion}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="automation" className="mt-0 space-y-4 pr-4">
                    {!automationRecommendations ? (
                      <div className="text-center py-8">
                        <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Analiza patrones de uso para obtener sugerencias de automatización
                        </p>
                        <Button 
                          onClick={recommendAutomation} 
                          disabled={loading === 'automation'}
                          variant="outline"
                        >
                          {loading === 'automation' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Analizando...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Sugerir Automatizaciones
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(automationRecommendations?.automations ?? [])
                          .filter(Boolean)
                          .map((auto, i) => (
                            <Card key={i}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between mb-2">
                                  <span className="font-medium text-sm">{auto?.title || 'Automatización'}</span>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {auto?.complexity || 'simple'}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <p><strong>Cuando:</strong> {auto?.trigger || '-'}</p>
                                  <p><strong>Acción:</strong> {auto?.action || '-'}</p>
                                  <p className="text-green-600"><strong>Beneficio:</strong> {auto?.benefit || '-'}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          )}
        </div>

        {/* Footer with model info */}
        {(cardAnalysis || boardAnalysis) && (
          <div className="pt-4 border-t mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(cardAnalysis?.analyzed_at || boardAnalysis?.analyzed_at || '').toLocaleString()}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={!!loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
              <span className="ml-1">Actualizar</span>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
