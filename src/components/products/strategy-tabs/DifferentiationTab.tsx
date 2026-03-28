import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle, Heart, Target, Lightbulb, TrendingUp } from 'lucide-react';

type Maybe<T> = T | null | undefined;

type RepeatedMessage = string | { message?: string; opportunity?: string };
type PoorPain = string | { pain?: string; opportunity?: string; howToUse?: string };
type IgnoredAspiration = string | { aspiration?: string; opportunity?: string };
type PositioningOpportunity = string | { opportunity?: string; why?: string; execution?: string };
type UnexploitedEmotion = string | { emotion?: string; howToUse?: string };

interface Differentiation {
  repeatedMessages?: RepeatedMessage[];
  poorlyAddressedPains?: PoorPain[];
  ignoredAspirations?: IgnoredAspiration[];
  positioningOpportunities?: PositioningOpportunity[];
  unexploitedEmotions?: UnexploitedEmotion[];
}

interface DifferentiationTabProps {
  differentiation?: Differentiation | null;
}

function asText(item: any, keys: string[]): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  for (const k of keys) {
    const v = item?.[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
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

  const repeated = differentiation?.repeatedMessages || [];
  const pains = differentiation?.poorlyAddressedPains || [];
  const aspirations = differentiation?.ignoredAspirations || [];
  const positioning = differentiation?.positioningOpportunities || [];
  const emotions = differentiation?.unexploitedEmotions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Vacíos y Oportunidades de Diferenciación
        </h3>
        <p className="text-sm text-zinc-400">
          Áreas donde el mercado está fallando y oportunidades únicas de posicionamiento.
        </p>
      </div>

      {/* Repeated Messages - What to AVOID */}
      {repeated.length > 0 && (
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
              {repeated.map((item, idx) => {
                const msg = asText(item, ['message', 'text']);
                const opportunity = typeof item === 'object' ? asText(item, ['opportunity']) : '';

                return (
                  <Badge key={idx} variant="outline" className="text-red-600 border-red-300 bg-red-50">
                    {msg || `Mensaje ${idx + 1}`}
                    {opportunity ? <span className="ml-2 text-muted-foreground">→ {opportunity}</span> : null}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Poorly Addressed Pains */}
        {pains.length > 0 && (
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
                {pains.map((item, idx) => {
                  const pain = asText(item, ['pain', 'text']);
                  const opportunity = typeof item === 'object' ? asText(item, ['opportunity']) : '';
                  const how = typeof item === 'object' ? asText(item, ['howToUse']) : '';

                  return (
                    <div key={idx} className="space-y-1 p-2 bg-amber-500/5 rounded">
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500">⚡</span>
                        <p className="text-sm font-medium">{pain || `Dolor ${idx + 1}`}</p>
                      </div>
                      {opportunity ? <p className="text-xs text-muted-foreground">Oportunidad: {opportunity}</p> : null}
                      {how ? <p className="text-xs text-muted-foreground">Cómo usarlo: {how}</p> : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ignored Aspirations */}
        {aspirations.length > 0 && (
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
                {aspirations.map((item, idx) => {
                  const aspiration = asText(item, ['aspiration', 'text']);
                  const opportunity = typeof item === 'object' ? asText(item, ['opportunity']) : '';

                  return (
                    <div key={idx} className="space-y-1 p-2 bg-purple-500/5 rounded">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-500">✨</span>
                        <p className="text-sm font-medium">{aspiration || `Aspiración ${idx + 1}`}</p>
                      </div>
                      {opportunity ? <p className="text-xs text-muted-foreground">Oportunidad: {opportunity}</p> : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Positioning Opportunities */}
      {positioning.length > 0 && (
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
              {positioning.map((item, idx) => {
                const opp = asText(item, ['opportunity', 'text']);
                const why = typeof item === 'object' ? asText(item, ['why']) : '';
                const execution = typeof item === 'object' ? asText(item, ['execution']) : '';

                return (
                  <div key={idx} className="space-y-1 p-3 bg-background rounded border border-green-500/30">
                    <p className="text-sm font-medium">{idx + 1}. {opp || `Oportunidad ${idx + 1}`}</p>
                    {why ? <p className="text-xs text-muted-foreground">Por qué: {why}</p> : null}
                    {execution ? <p className="text-xs text-muted-foreground">Ejecución: {execution}</p> : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unexploited Emotions */}
      {emotions.length > 0 && (
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
              {emotions.map((item, idx) => {
                const emotion = asText(item, ['emotion', 'text']);
                const how = typeof item === 'object' ? asText(item, ['howToUse']) : '';
                return (
                  <Badge key={idx} variant="secondary" className="text-pink-600 bg-pink-100">
                    {emotion || `Emoción ${idx + 1}`}
                    {how ? <span className="ml-2 text-muted-foreground">→ {how}</span> : null}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
