import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, Heart, Target, Lightbulb, TrendingUp } from 'lucide-react';

interface Differentiation {
  repeatedMessages?: string[];
  poorlyAddressedPains?: string[];
  ignoredAspirations?: string[];
  positioningOpportunities?: string[];
  unexploitedEmotions?: string[];
}

interface DifferentiationTabProps {
  differentiation?: Differentiation | null;
}

export function DifferentiationTab({ differentiation }: DifferentiationTabProps) {
  const hasData = differentiation && (
    differentiation.repeatedMessages?.length ||
    differentiation.poorlyAddressedPains?.length ||
    differentiation.ignoredAspirations?.length ||
    differentiation.positioningOpportunities?.length ||
    differentiation.unexploitedEmotions?.length
  );

  if (!hasData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver oportunidades de diferenciación</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Vacíos y Oportunidades de Diferenciación
        </h3>
        <p className="text-sm text-muted-foreground">
          Áreas donde el mercado está fallando y oportunidades únicas de posicionamiento.
        </p>
      </div>

      {/* Repeated Messages - What to AVOID */}
      {differentiation?.repeatedMessages && differentiation.repeatedMessages.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              🚫 Mensajes Saturados
            </CardTitle>
            <CardDescription>Lo que todos dicen - EVITAR para diferenciarse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {differentiation.repeatedMessages.map((msg, idx) => (
                <Badge key={idx} variant="outline" className="text-red-600 border-red-300 bg-red-50">
                  {msg}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Poorly Addressed Pains */}
        {differentiation?.poorlyAddressedPains && differentiation.poorlyAddressedPains.length > 0 && (
          <Card className="border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Dolores Mal Comunicados
              </CardTitle>
              <CardDescription>Oportunidad: abordar estos problemas mejor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {differentiation.poorlyAddressedPains.map((pain, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-amber-500/5 rounded">
                    <span className="text-amber-500">⚡</span>
                    <p className="text-sm">{pain}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ignored Aspirations */}
        {differentiation?.ignoredAspirations && differentiation.ignoredAspirations.length > 0 && (
          <Card className="border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-purple-500" />
                Aspiraciones Ignoradas
              </CardTitle>
              <CardDescription>Deseos que nadie está atendiendo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {differentiation.ignoredAspirations.map((aspiration, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-purple-500/5 rounded">
                    <span className="text-purple-500">✨</span>
                    <p className="text-sm">{aspiration}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Positioning Opportunities */}
      {differentiation?.positioningOpportunities && differentiation.positioningOpportunities.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              ✅ Oportunidades de Posicionamiento
            </CardTitle>
            <CardDescription>Espacios claros para diferenciarse del mercado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {differentiation.positioningOpportunities.map((opportunity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-background rounded border border-green-500/30">
                  <span className="text-lg">{idx + 1}.</span>
                  <p className="text-sm font-medium">{opportunity}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unexploited Emotions */}
      {differentiation?.unexploitedEmotions && differentiation.unexploitedEmotions.length > 0 && (
        <Card className="border-pink-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-pink-500" />
              💝 Emociones No Explotadas
            </CardTitle>
            <CardDescription>Territorio emocional disponible para conquistar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {differentiation.unexploitedEmotions.map((emotion, idx) => (
                <Badge key={idx} variant="secondary" className="text-pink-600 bg-pink-100">
                  {emotion}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
