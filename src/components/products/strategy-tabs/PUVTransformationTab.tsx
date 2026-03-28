import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Sparkles, ArrowRight, ArrowLeftRight } from 'lucide-react';

interface PUV {
  centralProblem?: string;
  tangibleResult?: string;
  marketDifference?: string;
  idealClient?: string;
  statement?: string;
}

interface Transformation {
  functional?: { before?: string; after?: string };
  emotional?: { before?: string; after?: string };
  identity?: { before?: string; after?: string };
  social?: { before?: string; after?: string };
  financial?: { before?: string; after?: string };
}

interface SalesAnglesData {
  puv?: PUV;
  transformation?: Transformation;
}

interface PUVTransformationTabProps {
  salesAnglesData?: SalesAnglesData | null;
}

export function PUVTransformationTab({ salesAnglesData }: PUVTransformationTabProps) {
  const puv = salesAnglesData?.puv;
  const transformation = salesAnglesData?.transformation;

  const hasData = puv?.statement || puv?.centralProblem || transformation?.functional?.before;

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver la PUV y Transformación</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PUV Statement */}
      {puv?.statement && (
        <Card className="border-primary/30 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Propuesta Única de Valor (PUV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-center italic">"{puv.statement}"</p>
          </CardContent>
        </Card>
      )}

      {/* PUV Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {puv?.centralProblem && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" />
                Problema Central
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{puv.centralProblem}</p>
            </CardContent>
          </Card>
        )}

        {puv?.tangibleResult && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                Resultado Tangible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{puv.tangibleResult}</p>
            </CardContent>
          </Card>
        )}

        {puv?.marketDifference && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Diferencia vs Mercado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{puv.marketDifference}</p>
            </CardContent>
          </Card>
        )}

        {puv?.idealClient && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Cliente Ideal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{puv.idealClient}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transformation Section */}
      {transformation && (
        <>
          <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-amber-500" />
              Transformación: Antes vs Después
            </h3>
            <p className="text-sm text-muted-foreground">
              El cambio que experimenta el cliente en 3 dimensiones: funcional, emocional e identidad.
            </p>
          </div>

          <div className="space-y-4">
            {/* Functional Transformation */}
            {transformation.functional && (transformation.functional.before || transformation.functional.after) && (
              <Card className="border-blue-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">🔧 Cambio Funcional</CardTitle>
                  <CardDescription>Lo que el cliente puede HACER diferente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs font-medium text-red-600 mb-1">ANTES</p>
                      <p className="text-sm">{transformation.functional.before || '-'}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs font-medium text-green-600 mb-1">DESPUÉS</p>
                      <p className="text-sm">{transformation.functional.after || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emotional Transformation */}
            {transformation.emotional && (transformation.emotional.before || transformation.emotional.after) && (
              <Card className="border-pink-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">💝 Cambio Emocional</CardTitle>
                  <CardDescription>Cómo el cliente se SIENTE diferente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs font-medium text-red-600 mb-1">ANTES</p>
                      <p className="text-sm">{transformation.emotional.before || '-'}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs font-medium text-green-600 mb-1">DESPUÉS</p>
                      <p className="text-sm">{transformation.emotional.after || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Identity Transformation */}
            {transformation.identity && (transformation.identity.before || transformation.identity.after) && (
              <Card className="border-purple-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">👤 Cambio de Identidad</CardTitle>
                  <CardDescription>Quién el cliente se CONVIERTE</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs font-medium text-red-600 mb-1">ANTES</p>
                      <p className="text-sm">{transformation.identity.before || '-'}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs font-medium text-green-600 mb-1">DESPUÉS</p>
                      <p className="text-sm">{transformation.identity.after || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Transformation */}
            {transformation.social && (transformation.social.before || transformation.social.after) && (
              <Card className="border-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">🧑‍🤝‍🧑 Cambio Social</CardTitle>
                  <CardDescription>Cómo lo perciben los demás</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs font-medium text-red-600 mb-1">ANTES</p>
                      <p className="text-sm">{transformation.social.before || '-'}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs font-medium text-green-600 mb-1">DESPUÉS</p>
                      <p className="text-sm">{transformation.social.after || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Financial Transformation */}
            {transformation.financial && (transformation.financial.before || transformation.financial.after) && (
              <Card className="border-emerald-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">💰 Cambio Financiero</CardTitle>
                  <CardDescription>Impacto económico</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs font-medium text-red-600 mb-1">ANTES</p>
                      <p className="text-sm">{transformation.financial.before || '-'}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs font-medium text-green-600 mb-1">DESPUÉS</p>
                      <p className="text-sm">{transformation.financial.after || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
