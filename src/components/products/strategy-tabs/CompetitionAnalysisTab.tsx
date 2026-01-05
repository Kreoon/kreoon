import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface BriefData {
  competitiveAdvantage?: string;
  differentiator?: string;
  commonObjections?: string[];
  customObjections?: string;
  brandStrengths?: string;
  brandRestrictions?: string;
}

interface CompetitionAnalysisTabProps {
  briefData?: BriefData | null;
}

export function CompetitionAnalysisTab({ briefData }: CompetitionAnalysisTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Swords className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver el análisis de competencia</p>
      </div>
    );
  }

  const objections = briefData.commonObjections || [];
  const customObjections = briefData.customObjections?.split(',').map(o => o.trim()).filter(Boolean) || [];
  const allObjections = [...objections, ...customObjections];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Ventaja Competitiva
            </CardTitle>
            <CardDescription>Lo que te hace superior a la competencia</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.competitiveAdvantage || <span className="text-muted-foreground">No definida</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Diferenciador Clave
            </CardTitle>
            <CardDescription>Tu propuesta única de valor</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.differentiator || <span className="text-muted-foreground">No definido</span>}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Objeciones Comunes
          </CardTitle>
          <CardDescription>Barreras que debemos superar en el contenido</CardDescription>
        </CardHeader>
        <CardContent>
          {allObjections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allObjections.map((objection, idx) => (
                <Badge key={idx} variant="outline" className="text-amber-600 border-amber-300">
                  {objection}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay objeciones definidas</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-green-600">✅ Fortalezas de Marca</CardTitle>
            <CardDescription>Qué comunicar y destacar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.brandStrengths || <span className="text-muted-foreground">No definidas</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">🚫 Restricciones de Marca</CardTitle>
            <CardDescription>Qué evitar en el contenido</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.brandRestrictions || <span className="text-muted-foreground">No definidas</span>}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
