import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, User, Brain, MessageSquare, AlertTriangle, Target } from 'lucide-react';

interface AvatarProfile {
  name?: string;
  age?: string;
  situation?: string;
  awarenessLevel?: string;
  drivers?: string;
  biases?: string;
  objections?: string;
  phrases?: string[];
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
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" />
          5 Avatares Estratégicos
        </h3>
        <p className="text-sm text-muted-foreground">
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
                {avatar.awarenessLevel && (
                  <Badge variant="outline" className="text-xs">
                    <Target className="h-3 w-3 mr-1" />
                    {avatar.awarenessLevel}
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
                  <p className="text-sm">{avatar.situation}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drivers */}
                {avatar.drivers && (
                  <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                    <p className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Drivers Psicológicos
                    </p>
                    <p className="text-sm">{avatar.drivers}</p>
                  </div>
                )}

                {/* Biases */}
                {avatar.biases && (
                  <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                    <p className="text-xs font-medium text-purple-600 mb-1 flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      Sesgos Cognitivos
                    </p>
                    <p className="text-sm">{avatar.biases}</p>
                  </div>
                )}
              </div>

              {/* Objections */}
              {avatar.objections && (
                <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                  <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Objeciones Clave
                  </p>
                  <p className="text-sm">{avatar.objections}</p>
                </div>
              )}

              {/* Phrases */}
              {avatar.phrases && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Frases Reales que Usa
                  </p>
                  <div className="space-y-2">
                    {Array.isArray(avatar.phrases) ? (
                      avatar.phrases.map((phrase, pIdx) => (
                        <div key={pIdx} className="p-2 bg-muted/50 rounded border-l-2 border-primary italic text-sm">
                          "{phrase}"
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-muted/50 rounded border-l-2 border-primary italic text-sm">
                        "{avatar.phrases}"
                      </div>
                    )}
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
