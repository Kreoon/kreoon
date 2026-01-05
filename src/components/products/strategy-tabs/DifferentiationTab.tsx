import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, Zap, Trophy } from 'lucide-react';

interface BriefData {
  differentiator?: string;
  mainBenefit?: string;
  keyIngredients?: string;
  mustCommunicate?: string;
  transformation?: string;
  slogan?: string;
}

interface DifferentiationTabProps {
  briefData?: BriefData | null;
}

export function DifferentiationTab({ briefData }: DifferentiationTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver las oportunidades de diferenciación</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {briefData.slogan && (
        <Card className="border-primary bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <p className="text-xl font-semibold text-center italic">"{briefData.slogan}"</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Beneficio Principal
            </CardTitle>
            <CardDescription>El valor más importante para el cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.mainBenefit || <span className="text-muted-foreground">No definido</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Diferenciador Único
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
            <Zap className="h-4 w-4 text-amber-500" />
            Transformación Prometida
          </CardTitle>
          <CardDescription>El cambio que experimenta el cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {briefData.transformation || <span className="text-muted-foreground">No definida</span>}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🧪 Ingredientes Clave</CardTitle>
            <CardDescription>Componentes diferenciadores del producto</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.keyIngredients || <span className="text-muted-foreground">No definidos</span>}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">📢 Mensaje Obligatorio</CardTitle>
            <CardDescription>Lo que siempre debe comunicarse</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {briefData.mustCommunicate || <span className="text-muted-foreground">No definido</span>}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
