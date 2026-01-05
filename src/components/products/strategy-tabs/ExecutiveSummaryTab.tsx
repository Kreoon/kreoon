import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Lightbulb, Brain, Rocket, CheckCircle } from 'lucide-react';

interface ExecutiveSummary {
  keyInsights?: string[];
  psychologicalDrivers?: string[];
  immediateActions?: string[];
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
    summary.keyInsights?.length ||
    summary.psychologicalDrivers?.length ||
    summary.immediateActions?.length
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

      {/* Key Insights */}
      {summary?.keyInsights && summary.keyInsights.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              5 Insights Estratégicos Clave
            </CardTitle>
            <CardDescription>Los descubrimientos más importantes del análisis de mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.keyInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
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
            <div className="flex flex-wrap gap-3">
              {summary.psychologicalDrivers.map((driver, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-background rounded-lg border border-purple-500/30">
                  <Brain className="h-4 w-4 text-purple-500 shrink-0" />
                  <p className="text-sm font-medium">{driver}</p>
                </div>
              ))}
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
              3 Acciones Inmediatas
            </CardTitle>
            <CardDescription>Pasos concretos para validar en campañas reales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.immediateActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-background rounded-lg border border-green-500/30">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-1">ACCIÓN {idx + 1}</p>
                    <p className="text-sm">{action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
