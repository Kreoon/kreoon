import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Heart, Zap, Target, Lightbulb, ShieldAlert, Eye } from 'lucide-react';

interface JTBD {
  functional?: string;
  emotional?: string;
  social?: string;
  pains?: string[];
  desires?: string[];
  objections?: string[];
  insights?: string[];
}

interface JTBDAnalysisTabProps {
  jtbdData?: JTBD | null;
}

export function JTBDAnalysisTab({ jtbdData }: JTBDAnalysisTabProps) {
  if (!jtbdData || (!jtbdData.functional && !jtbdData.pains?.length)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver el análisis JTBD</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* JTBD Explanation */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
        <h3 className="font-semibold text-sm mb-2">¿Qué es el Job To Be Done?</h3>
        <p className="text-sm text-muted-foreground">
          El JTBD es el trabajo que el cliente está "contratando" tu producto para realizar. 
          No se trata del producto en sí, sino de la transformación o resultado que el cliente busca lograr.
        </p>
      </div>

      {/* JTBD Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {jtbdData.functional && (
          <Card className="border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                JTBD Funcional
              </CardTitle>
              <CardDescription>El trabajo práctico que resuelve</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{jtbdData.functional}</p>
            </CardContent>
          </Card>
        )}

        {jtbdData.emotional && (
          <Card className="border-pink-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                JTBD Emocional
              </CardTitle>
              <CardDescription>Cómo quiere sentirse el cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{jtbdData.emotional}</p>
            </CardContent>
          </Card>
        )}

        {jtbdData.social && (
          <Card className="border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                JTBD Social
              </CardTitle>
              <CardDescription>Cómo quiere ser percibido</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{jtbdData.social}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pains */}
      {jtbdData.pains && jtbdData.pains.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              10 Dolores Profundos
            </CardTitle>
            <CardDescription>Los problemas reales que enfrenta el cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {jtbdData.pains.map((pain, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-red-500/5 rounded">
                  <span className="text-xs font-bold text-red-500 mt-0.5">{idx + 1}</span>
                  <p className="text-sm">{pain}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desires */}
      {jtbdData.desires && jtbdData.desires.length > 0 && (
        <Card className="border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-500" />
              10 Deseos Aspiracionales
            </CardTitle>
            <CardDescription>Lo que el cliente realmente quiere lograr</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {jtbdData.desires.map((desire, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                  <span className="text-xs font-bold text-green-500 mt-0.5">{idx + 1}</span>
                  <p className="text-sm">{desire}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objections */}
      {jtbdData.objections && jtbdData.objections.length > 0 && (
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              10 Objeciones y Miedos
            </CardTitle>
            <CardDescription>Barreras que impiden la compra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {jtbdData.objections.map((objection, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-amber-500/5 rounded">
                  <span className="text-xs font-bold text-amber-500 mt-0.5">{idx + 1}</span>
                  <p className="text-sm">{objection}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {jtbdData.insights && jtbdData.insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              10 Insights Estratégicos
            </CardTitle>
            <CardDescription>Descubrimientos de review mining y social listening</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jtbdData.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-background rounded border">
                  <span className="text-xs font-bold text-primary mt-0.5">💡</span>
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
