import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Heart, Zap, Shield } from 'lucide-react';

interface BriefData {
  problemSolved?: string;
  mainDesire?: string;
  consequenceOfNotBuying?: string;
  competitiveAdvantage?: string;
  transformation?: string;
}

interface JTBDAnalysisTabProps {
  briefData?: BriefData | null;
}

export function JTBDAnalysisTab({ briefData }: JTBDAnalysisTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver el análisis del cliente</p>
      </div>
    );
  }

  const sections = [
    {
      icon: AlertCircle,
      title: 'Problema que Resuelve',
      description: 'El dolor principal del cliente',
      content: briefData.problemSolved,
      color: 'text-destructive',
    },
    {
      icon: Heart,
      title: 'Deseo Principal',
      description: 'Lo que el cliente realmente quiere',
      content: briefData.mainDesire,
      color: 'text-pink-500',
    },
    {
      icon: Zap,
      title: 'Transformación Prometida',
      description: 'El cambio que experimentará el cliente',
      content: briefData.transformation,
      color: 'text-amber-500',
    },
    {
      icon: Shield,
      title: 'Consecuencia de No Comprar',
      description: 'Qué pasa si el cliente no actúa',
      content: briefData.consequenceOfNotBuying,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-lg border">
        <h3 className="font-semibold text-sm mb-2">¿Qué es el Job To Be Done?</h3>
        <p className="text-sm text-muted-foreground">
          El JTBD es el trabajo que el cliente está "contratando" tu producto para realizar. 
          No se trata del producto en sí, sino de la transformación o resultado que el cliente busca lograr.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ icon: Icon, title, description, content, color }) => (
          <Card key={title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {content || <span className="text-muted-foreground">No definido</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {briefData.competitiveAdvantage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">💎 Ventaja Competitiva</CardTitle>
            <CardDescription>Lo que te diferencia de la competencia</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{briefData.competitiveAdvantage}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
