import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Lightbulb, Brain, Rocket, CheckCircle, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

interface KeyInsight {
  insight?: string;
  importance?: string;
  action?: string;
}

interface PsychologicalDriver {
  driver?: string;
  why?: string;
  howToUse?: string;
}

interface ImmediateAction {
  action?: string;
  howTo?: string;
  expectedResult?: string;
}

interface QuickWin {
  win?: string;
  effort?: string;
  impact?: string;
}

interface Risk {
  risk?: string;
  why?: string;
}

interface ExecutiveSummary {
  marketSummary?: string;
  opportunityScore?: number;
  opportunityScoreJustification?: string;
  keyInsights?: (string | KeyInsight)[];
  psychologicalDrivers?: (string | PsychologicalDriver)[];
  immediateActions?: (string | ImmediateAction)[];
  quickWins?: (string | QuickWin)[];
  risksToAvoid?: (string | Risk)[];
  finalRecommendation?: string;
}

interface ContentStrategy {
  executiveSummary?: ExecutiveSummary;
}

interface ExecutiveSummaryTabProps {
  contentStrategy?: ContentStrategy | null;
  productName?: string;
}

export function ExecutiveSummaryTab({ contentStrategy, productName }: ExecutiveSummaryTabProps) {
  const summary = contentStrategy?.executiveSummary;

  const hasData = summary && (
    summary.marketSummary ||
    summary.keyInsights?.length ||
    summary.psychologicalDrivers?.length ||
    summary.immediateActions?.length ||
    summary.quickWins?.length ||
    summary.risksToAvoid?.length ||
    summary.finalRecommendation
  );

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver el resumen ejecutivo</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  // Helper to extract string from object or string
  const extractInsight = (item: string | KeyInsight): { text: string; importance?: string; action?: string } => {
    if (typeof item === 'string') return { text: item };
    return { text: item.insight || '', importance: item.importance, action: item.action };
  };

  const extractDriver = (item: string | PsychologicalDriver): { text: string; why?: string; howToUse?: string } => {
    if (typeof item === 'string') return { text: item };
    return { text: item.driver || '', why: item.why, howToUse: item.howToUse };
  };

  const extractAction = (item: string | ImmediateAction): { text: string; howTo?: string; expectedResult?: string } => {
    if (typeof item === 'string') return { text: item };
    return { text: item.action || '', howTo: item.howTo, expectedResult: item.expectedResult };
  };

  const extractQuickWin = (item: string | QuickWin): { text: string; effort?: string; impact?: string } => {
    if (typeof item === 'string') return { text: item };
    return { text: item.win || '', effort: item.effort, impact: item.impact };
  };

  const extractRisk = (item: string | Risk): { text: string; why?: string } => {
    if (typeof item === 'string') return { text: item };
    return { text: item.risk || '', why: item.why };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Conclusión Ejecutiva
        </h3>
        {productName && (
          <p className="text-sm text-muted-foreground">
            Investigación de mercado para: <span className="font-medium">{productName}</span>
          </p>
        )}
      </div>

      {/* Opportunity Score */}
      {summary?.opportunityScore != null && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white ${
                  summary.opportunityScore >= 8 ? 'bg-green-500' :
                  summary.opportunityScore >= 6 ? 'bg-amber-500' :
                  summary.opportunityScore >= 4 ? 'bg-orange-500' : 'bg-red-500'
                }`}>
                  {summary.opportunityScore}
                </div>
                <span className="text-xs text-muted-foreground mt-1">de 10</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm">Score de Oportunidad</h4>
                {summary.opportunityScoreJustification && (
                  <p className="text-sm text-muted-foreground mt-1">{summary.opportunityScoreJustification}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Summary */}
      {summary?.marketSummary && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Resumen del Mercado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary.marketSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      {summary?.keyInsights && summary.keyInsights.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Insights Estratégicos Clave
            </CardTitle>
            <CardDescription>Los descubrimientos más importantes del análisis de mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.keyInsights.map((item, idx) => {
                const insight = extractInsight(item);
                return (
                  <div key={idx} className="p-4 bg-background rounded-lg border">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium">{insight.text}</p>
                        {insight.importance && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-amber-600">Por qué importa:</span> {insight.importance}
                          </p>
                        )}
                        {insight.action && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-green-600">Cómo aprovecharlo:</span> {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Psychological Drivers */}
      {summary?.psychologicalDrivers && summary.psychologicalDrivers.length > 0 && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Drivers Psicológicos Más Potentes
            </CardTitle>
            <CardDescription>Motivadores que generan mayor impacto en la decisión de compra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.psychologicalDrivers.map((item, idx) => {
                const driver = extractDriver(item);
                return (
                  <div key={idx} className="p-4 bg-background rounded-lg border border-purple-500/30">
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium">{driver.text}</p>
                        {driver.why && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-purple-600">Por qué funciona:</span> {driver.why}
                          </p>
                        )}
                        {driver.howToUse && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-primary">Cómo usarlo:</span> {driver.howToUse}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Immediate Actions */}
      {summary?.immediateActions && summary.immediateActions.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-green-500" />
              Acciones Inmediatas Prioritarias
            </CardTitle>
            <CardDescription>Pasos concretos para validar en campañas reales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.immediateActions.map((item, idx) => {
                const action = extractAction(item);
                return (
                  <div key={idx} className="p-4 bg-background rounded-lg border border-green-500/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            Acción {idx + 1}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{action.text}</p>
                        {action.howTo && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-green-600">Cómo hacerlo:</span> {action.howTo}
                          </p>
                        )}
                        {action.expectedResult && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-blue-600">Resultado esperado:</span> {action.expectedResult}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Wins & Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Wins */}
        {summary?.quickWins && summary.quickWins.length > 0 && (
          <Card className="border-teal-500/20 bg-teal-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-teal-500" />
                Victorias Rápidas
              </CardTitle>
              <CardDescription>Bajo esfuerzo, alto impacto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.quickWins.map((item, idx) => {
                  const win = extractQuickWin(item);
                  return (
                    <div key={idx} className="p-3 bg-background rounded-lg border">
                      <p className="text-sm">{win.text}</p>
                      {(win.effort || win.impact) && (
                        <div className="flex gap-2 mt-2">
                          {win.effort && (
                            <Badge variant="outline" className="text-xs">
                              Esfuerzo: {win.effort}
                            </Badge>
                          )}
                          {win.impact && (
                            <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700">
                              Impacto: {win.impact}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risks to Avoid */}
        {summary?.risksToAvoid && summary.risksToAvoid.length > 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Riesgos a Evitar
              </CardTitle>
              <CardDescription>Qué no hacer y por qué</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.risksToAvoid.map((item, idx) => {
                  const risk = extractRisk(item);
                  return (
                    <div key={idx} className="p-3 bg-background rounded-lg border border-red-500/30">
                      <p className="text-sm font-medium text-red-600">{risk.text}</p>
                      {risk.why && (
                        <p className="text-xs text-muted-foreground mt-1">{risk.why}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Final Recommendation */}
      {summary?.finalRecommendation && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🎯 Recomendación Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary.finalRecommendation}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
