import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Heart, Zap, Target, Lightbulb, ShieldAlert, Eye } from 'lucide-react';

type Pain = string | { pain?: string; why?: string; impact?: string };
type Desire = string | { desire?: string; emotion?: string; idealState?: string };
type Objection = string | { objection?: string; belief?: string; counter?: string };
type Insight = string | { insight?: string; source?: string };

interface JTBD {
  functional?: string;
  emotional?: string;
  social?: string;
  pains?: Pain[];
  desires?: Desire[];
  objections?: Objection[];
  insights?: Insight[];
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
              {jtbdData.pains.map((pain, idx) => {
                if (typeof pain === 'string') {
                  return (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-red-500/5 rounded">
                      <span className="text-xs font-bold text-red-500 mt-0.5">{idx + 1}</span>
                      <p className="text-sm">{pain}</p>
                    </div>
                  );
                }

                const title = pain?.pain || '';
                const why = pain?.why || '';
                const impact = pain?.impact || '';

                return (
                  <div key={idx} className="space-y-1 p-3 bg-red-500/5 rounded border border-red-500/10">
                    <p className="text-sm font-medium">
                      <span className="text-xs font-bold text-red-500 mr-2">{idx + 1}</span>
                      {title || 'Dolor'}
                    </p>
                    {why ? <p className="text-xs text-muted-foreground">Por qué: {why}</p> : null}
                    {impact ? <p className="text-xs text-muted-foreground">Impacto: {impact}</p> : null}
                  </div>
                );
              })}
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
              {jtbdData.desires.map((desire, idx) => {
                if (typeof desire === 'string') {
                  return (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <span className="text-xs font-bold text-green-500 mt-0.5">{idx + 1}</span>
                      <p className="text-sm">{desire}</p>
                    </div>
                  );
                }

                const title = desire?.desire || '';
                const emotion = desire?.emotion || '';
                const idealState = desire?.idealState || '';

                return (
                  <div key={idx} className="space-y-1 p-3 bg-green-500/5 rounded border border-green-500/10">
                    <p className="text-sm font-medium">
                      <span className="text-xs font-bold text-green-500 mr-2">{idx + 1}</span>
                      {title || 'Deseo'}
                    </p>
                    {emotion ? <p className="text-xs text-muted-foreground">Emoción: {emotion}</p> : null}
                    {idealState ? <p className="text-xs text-muted-foreground">Estado ideal: {idealState}</p> : null}
                  </div>
                );
              })}
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
              {jtbdData.objections.map((obj, idx) => {
                if (typeof obj === 'string') {
                  return (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-amber-500/5 rounded">
                      <span className="text-xs font-bold text-amber-500 mt-0.5">{idx + 1}</span>
                      <p className="text-sm">{obj}</p>
                    </div>
                  );
                }

                const title = obj?.objection || '';
                const belief = obj?.belief || '';
                const counter = obj?.counter || '';

                return (
                  <div key={idx} className="space-y-1 p-3 bg-amber-500/5 rounded border border-amber-500/10">
                    <p className="text-sm font-medium">
                      <span className="text-xs font-bold text-amber-500 mr-2">{idx + 1}</span>
                      {title || 'Objeción'}
                    </p>
                    {belief ? <p className="text-xs text-muted-foreground">Creencia: {belief}</p> : null}
                    {counter ? <p className="text-xs text-muted-foreground">Neutralización: {counter}</p> : null}
                  </div>
                );
              })}
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
              {jtbdData.insights.map((insight, idx) => {
                const insightText = typeof insight === 'string' ? insight : (insight as any)?.insight || (insight as any)?.text || JSON.stringify(insight);
                return (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-background rounded border">
                    <span className="text-xs font-bold text-primary mt-0.5">💡</span>
                    <p className="text-sm">{insightText}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
