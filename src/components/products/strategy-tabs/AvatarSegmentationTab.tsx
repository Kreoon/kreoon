import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User, Brain, MessageSquare, AlertTriangle, Target } from 'lucide-react';

interface AvatarSituation {
  dayToDay?: string;
  previousAttempts?: string;
  whyDidntWork?: string;
  currentFeeling?: string;
}

interface AvatarDemographics {
  age?: string;
  occupation?: string;
  familySituation?: string;
  location?: string;
  socioeconomicLevel?: string;
}

interface AvatarPsychographics {
  awarenessLevel?: string;
  drivers?: string[];
  biases?: string[];
  objections?: string[];
  values?: string[];
  deepestFears?: string[];
}

interface AvatarCommunication {
  phrases?: string[];
  frequentExpressions?: string[];
  preferredTone?: string;
}

interface AvatarProfile {
  name?: string;
  age?: string;
  demographics?: AvatarDemographics;
  situation?: string | AvatarSituation;
  awarenessLevel?: string;
  psychographics?: AvatarPsychographics;
  drivers?: string | string[];
  biases?: string | string[];
  objections?: string | string[];
  communication?: AvatarCommunication;
  phrases?: string[] | string;
}

interface AvatarProfiles {
  profiles?: AvatarProfile[];
}

interface AvatarSegmentationTabProps {
  avatarProfiles?: AvatarProfiles | null;
}

export function AvatarSegmentationTab({ avatarProfiles }: AvatarSegmentationTabProps) {
  const profiles = avatarProfiles?.profiles || [];

  if (profiles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Genera la investigación de mercado para ver los avatares estratégicos</p>
        <p className="text-sm mt-2">Completa el Brief IA y haz clic en "Generar Investigación"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-zinc-100">
          <Users className="h-4 w-4 text-purple-500" />
          5 Avatares Estratégicos
        </h3>
        <p className="text-sm text-zinc-400">
          Buyer personas creados a partir de la investigación de mercado con datos reales de comportamiento, sesgos cognitivos y frases textuales.
        </p>
      </div>

      {/* Avatar Cards */}
      <div className="space-y-6">
        {profiles.map((avatar, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  {avatar.name || `Avatar ${idx + 1}`}
                </CardTitle>
                {(avatar.awarenessLevel || avatar.psychographics?.awarenessLevel) && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {avatar.psychographics?.awarenessLevel || avatar.awarenessLevel}
                  </Badge>
                )}
              </div>
              {avatar.age && (
                <CardDescription>{avatar.age}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Situation */}
              {avatar.situation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">📍 Situación Actual</p>
                  {typeof avatar.situation === 'string' ? (
                    <p className="text-sm">{avatar.situation}</p>
                  ) : (
                    <div className="space-y-1">
                      {avatar.situation.dayToDay && <p className="text-sm">{avatar.situation.dayToDay}</p>}
                      {avatar.situation.currentFeeling && <p className="text-xs text-muted-foreground"><strong>Cómo se siente:</strong> {avatar.situation.currentFeeling}</p>}
                      {avatar.situation.previousAttempts && <p className="text-xs text-muted-foreground"><strong>Ha intentado:</strong> {avatar.situation.previousAttempts}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drivers */}
                {(avatar.drivers || avatar.psychographics?.drivers) && (
                  <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
                    <p className="text-xs font-medium text-green-500 mb-1 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Drivers Psicológicos
                    </p>
                    <p className="text-sm text-zinc-300">
                      {Array.isArray(avatar.psychographics?.drivers)
                        ? avatar.psychographics.drivers.join(', ')
                        : Array.isArray(avatar.drivers)
                          ? avatar.drivers.join(', ')
                          : avatar.drivers || ''}
                    </p>
                  </div>
                )}

                {/* Biases */}
                {(avatar.biases || avatar.psychographics?.biases) && (
                  <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
                    <p className="text-xs font-medium text-purple-500 mb-1 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Sesgos Cognitivos
                    </p>
                    <p className="text-sm text-zinc-300">
                      {Array.isArray(avatar.psychographics?.biases)
                        ? avatar.psychographics.biases.join(', ')
                        : Array.isArray(avatar.biases)
                          ? avatar.biases.join(', ')
                          : avatar.biases || ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Objections */}
              {(avatar.objections || avatar.psychographics?.objections) && (
                <div className="p-3 bg-[#1a1a24] rounded-lg border border-zinc-800 dark:border-zinc-700/50">
                  <p className="text-xs font-medium text-amber-500 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Objeciones Clave
                  </p>
                  <p className="text-sm text-zinc-300">
                    {Array.isArray(avatar.psychographics?.objections)
                      ? avatar.psychographics.objections.join(', ')
                      : Array.isArray(avatar.objections)
                        ? avatar.objections.join(', ')
                        : avatar.objections || ''}
                  </p>
                </div>
              )}

              {/* Phrases */}
              {(avatar.phrases || avatar.communication?.phrases) && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Frases Reales que Usa
                  </p>
                  <div className="space-y-2">
                    {(() => {
                      const phrases = avatar.communication?.phrases || avatar.phrases;
                      if (Array.isArray(phrases)) {
                        return phrases.map((phrase, pIdx) => (
                          <div key={pIdx} className="p-2 bg-muted/50 rounded border-l-2 border-primary italic text-sm">
                            "{phrase}"
                          </div>
                        ));
                      }
                      return (
                        <div className="p-2 bg-muted/50 rounded border-l-2 border-primary italic text-sm">
                          "{phrases}"
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
