import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, Heart, Lightbulb } from 'lucide-react';

interface BriefData {
  reptileBrain?: string[];
  limbicBrain?: string[];
  cortexBrain?: string;
}

interface NeuromarketingTabProps {
  briefData?: BriefData | null;
}

const REPTILE_LABELS: Record<string, { label: string; desc: string }> = {
  survival: { label: '🛡️ Supervivencia', desc: 'Seguridad y protección' },
  reproduction: { label: '💝 Atracción', desc: 'Verse bien, seducción' },
  power: { label: '👑 Poder', desc: 'Estatus y reconocimiento' },
  scarcity: { label: '⏰ Escasez', desc: 'Urgencia, FOMO' },
  territory: { label: '🏠 Territorio', desc: 'Pertenencia exclusiva' },
  food: { label: '🎁 Placer', desc: 'Gratificación inmediata' },
};

const LIMBIC_LABELS: Record<string, { label: string; emoji: string }> = {
  happiness: { label: 'Felicidad', emoji: '😊' },
  confidence: { label: 'Confianza', emoji: '💪' },
  freedom: { label: 'Libertad', emoji: '🦋' },
  peace: { label: 'Paz', emoji: '🧘' },
  pride: { label: 'Orgullo', emoji: '🏆' },
  love: { label: 'Amor', emoji: '❤️' },
  excitement: { label: 'Emoción', emoji: '🎢' },
  hope: { label: 'Esperanza', emoji: '✨' },
  belonging: { label: 'Pertenencia', emoji: '🤝' },
  relief: { label: 'Alivio', emoji: '😌' },
};

export function NeuromarketingTab({ briefData }: NeuromarketingTabProps) {
  if (!briefData) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Completa el Brief IA para ver los insights de neuromarketing</p>
      </div>
    );
  }

  const reptileTriggers = briefData.reptileBrain || [];
  const limbicEmotions = briefData.limbicBrain || [];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          Método Esfera - Los 3 Cerebros
        </h3>
        <p className="text-sm text-muted-foreground">
          Activamos los 3 niveles del cerebro para máxima persuasión: instinto (reptiliano), 
          emoción (límbico) y razón (neocórtex).
        </p>
      </div>

      <Card className="border-red-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-red-500" />
            🦎 Cerebro Reptiliano
          </CardTitle>
          <CardDescription>Instintos primitivos de supervivencia</CardDescription>
        </CardHeader>
        <CardContent>
          {reptileTriggers.length > 0 ? (
            <div className="space-y-2">
              {reptileTriggers.map((trigger) => {
                const info = REPTILE_LABELS[trigger];
                return (
                  <div key={trigger} className="flex items-center gap-3 p-2 bg-red-500/5 rounded">
                    <span className="font-medium text-sm">{info?.label || trigger}</span>
                    {info?.desc && (
                      <span className="text-xs text-muted-foreground">— {info.desc}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay gatillos reptilianos definidos</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-pink-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            💖 Cerebro Límbico
          </CardTitle>
          <CardDescription>Emociones que activamos</CardDescription>
        </CardHeader>
        <CardContent>
          {limbicEmotions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {limbicEmotions.map((emotion) => {
                const info = LIMBIC_LABELS[emotion];
                return (
                  <Badge key={emotion} variant="secondary" className="text-sm">
                    {info?.emoji} {info?.label || emotion}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay emociones definidas</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-500" />
            🧠 Neocórtex
          </CardTitle>
          <CardDescription>Argumentos racionales y lógicos</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {briefData.cortexBrain || <span className="text-muted-foreground">No hay argumentos racionales definidos</span>}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
