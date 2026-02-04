import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, TrendingUp, Target, Lightbulb, BarChart3, Brain } from 'lucide-react';

interface MacroVariable {
  factor?: string;
  type?: string;
  impact?: string;
  implication?: string;
}

interface Opportunity {
  opportunity?: string;
  why?: string;
  howToCapture?: string;
}

interface Threat {
  threat?: string;
  riskLevel?: string;
  mitigation?: string;
}

interface MarketResearch {
  marketSize?: string;
  growthTrend?: string;
  marketState?: string;
  marketStateExplanation?: string;
  macroVariables?: (string | MacroVariable)[];
  awarenessLevel?: string;
  awarenessExplanation?: string;
  summary?: string;
  opportunities?: (string | Opportunity)[];
  threats?: (string | Threat)[];
  rawContent?: string;
  citations?: string[];
}

interface MarketOverviewTabProps {
  marketResearch?: MarketResearch | null;
}

const MARKET_STATE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  crecimiento: { label: 'En Crecimiento', color: 'text-green-600 bg-green-100', icon: '📈' },
  saturacion: { label: 'Saturado', color: 'text-amber-600 bg-amber-100', icon: '⚠️' },
  declive: { label: 'En Declive', color: 'text-red-600 bg-red-100', icon: '📉' },
};

export function MarketOverviewTab({ marketResearch }: MarketOverviewTabProps) {
  if (!marketResearch || (!marketResearch.summary && !marketResearch.marketSize)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver el panorama general</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  const marketStateInfo = marketResearch.marketState 
    ? MARKET_STATE_LABELS[marketResearch.marketState.toLowerCase()] 
    : null;

  return (
    <div className="space-y-6">
      {/* Market Overview Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Panorama General del Mercado
        </h3>
        <p className="text-sm text-muted-foreground">
          Análisis del tamaño, tendencias y oportunidades del mercado basado en investigación real.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Market Size */}
        {marketResearch.marketSize && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Tamaño del Mercado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{marketResearch.marketSize}</p>
            </CardContent>
          </Card>
        )}

        {/* Growth Trend */}
        {marketResearch.growthTrend && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendencia de Crecimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{marketResearch.growthTrend}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Market State */}
      {marketStateInfo && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Estado del Mercado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className={marketStateInfo.color}>
              {marketStateInfo.icon} {marketStateInfo.label}
            </Badge>
            {marketResearch.marketStateExplanation && (
              <p className="text-sm text-muted-foreground">{marketResearch.marketStateExplanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Macro Variables */}
      {marketResearch.macroVariables && marketResearch.macroVariables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Variables Macroeconómicas y Socioculturales
            </CardTitle>
            <CardDescription>Factores externos que influyen en la demanda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {marketResearch.macroVariables.map((variable, idx) => {
                if (typeof variable === 'string') {
                  return (
                    <Badge key={idx} variant="outline">
                      {variable}
                    </Badge>
                  );
                }
                return (
                  <div key={idx} className="p-2 bg-muted/50 rounded border text-sm">
                    <p className="font-medium">{variable.factor}</p>
                    {variable.type && <Badge variant="outline" className="text-xs mr-2">{variable.type}</Badge>}
                    {variable.impact && <p className="text-xs text-muted-foreground mt-1"><strong>Impacto:</strong> {variable.impact}</p>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunities & Threats */}
      {(marketResearch.opportunities?.length || marketResearch.threats?.length) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketResearch.opportunities?.length ? (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">✅ Oportunidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {marketResearch.opportunities.slice(0, 6).map((op, idx) => {
                    if (typeof op === 'string') {
                      return (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded border">
                          <span className="text-green-600">→</span>
                          <p className="text-sm">{op}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="p-2 bg-background rounded border">
                        <p className="text-sm font-medium">{op.opportunity}</p>
                        {op.why && <p className="text-xs text-muted-foreground mt-1"><strong>Por qué:</strong> {op.why}</p>}
                        {op.howToCapture && <p className="text-xs text-green-600 mt-1"><strong>Cómo aprovecharlo:</strong> {op.howToCapture}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {marketResearch.threats?.length ? (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚠️ Amenazas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {marketResearch.threats.slice(0, 6).map((t, idx) => {
                    if (typeof t === 'string') {
                      return (
                        <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded border">
                          <span className="text-red-600">→</span>
                          <p className="text-sm">{t}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="p-2 bg-background rounded border">
                        <p className="text-sm font-medium">{t.threat}</p>
                        {t.riskLevel && <Badge variant="outline" className="text-xs mt-1">{t.riskLevel}</Badge>}
                        {t.mitigation && <p className="text-xs text-muted-foreground mt-1"><strong>Mitigación:</strong> {t.mitigation}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {/* Awareness Level */}
      {marketResearch.awarenessLevel && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Nivel de Conciencia (Eugene Schwartz)
            </CardTitle>
            <CardDescription>Nivel de conciencia predominante del público objetivo</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{marketResearch.awarenessLevel}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {marketResearch.summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📊 Resumen Ejecutivo del Mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{marketResearch.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Citations */}
      {marketResearch.citations && marketResearch.citations.length > 0 && (
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">🔗 Fuentes de la Investigación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {marketResearch.citations.slice(0, 5).map((citation, idx) => (
                <a 
                  key={idx} 
                  href={citation} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-xs text-primary hover:underline truncate"
                >
                  {citation}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
