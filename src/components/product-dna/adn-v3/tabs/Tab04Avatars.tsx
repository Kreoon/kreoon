/**
 * Tab04Avatars
 * Avatares de cliente ideal con perfiles detallados
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  User,
  Heart,
  Target,
  AlertTriangle,
  MessageSquare,
  ShoppingCart,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";
import { cn } from "@/lib/utils";

// Estructura real del backend (step-04-avatars.ts)
interface MainAvatar {
  name: string;
  age_range: string;
  gender: string;
  location: string;
  occupation: string;
  income_level: string;
  education?: string;
  family_status?: string;
  psychographics?: {
    values?: string[];
    interests?: string[];
    lifestyle?: string;
    personality_traits?: string[];
  };
  day_in_the_life?: string;
  goals?: string[];
  frustrations?: string[];
  fears?: string[];
  aspirations?: string[];
  media_consumption?: {
    social_platforms?: string[];
    content_types?: string[];
    influencers_they_follow?: string;
    news_sources?: string[];
  };
  purchase_behavior?: {
    research_style?: string;
    decision_factors?: string[];
    objections?: string[];
    preferred_payment?: string;
  };
  quote?: string;
  messaging_guidelines?: {
    tone?: string;
    words_to_use?: string[];
    words_to_avoid?: string[];
    emotional_triggers?: string[];
  };
}

interface SecondaryAvatar {
  name: string;
  brief_description: string;
  key_difference: string;
  priority: string;
}

interface AntiAvatar {
  description: string;
  red_flags: string[];
  why_not_fit: string;
}

interface AvatarJourney {
  awareness: string;
  consideration: string;
  decision: string;
  post_purchase: string;
}

interface AvatarsData {
  // Backend structure
  main_avatar?: MainAvatar;
  secondary_avatars?: SecondaryAvatar[];
  anti_avatar?: AntiAvatar;
  avatar_journey?: AvatarJourney;
  summary?: string;
  // Legacy structure (compatibility)
  primary_avatar?: MainAvatar;
  avatar_overlap?: {
    shared_pain_points?: string[];
    shared_desires?: string[];
    universal_objections?: string[];
  };
  segmentation_strategy?: string;
}

interface Tab04AvatarsProps {
  data: AvatarsData | null | undefined;
}

function MainAvatarCard({ avatar, isPrimary = true }: { avatar: MainAvatar; isPrimary?: boolean }) {
  const [expanded, setExpanded] = useState(isPrimary);

  return (
    <Card className={cn(isPrimary && "border-purple-500/30 bg-purple-500/5")}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
                isPrimary
                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                  : "bg-muted text-foreground"
              )}
            >
              {avatar.name?.charAt(0) || "?"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{avatar.name}</CardTitle>
                {isPrimary && (
                  <Badge className="bg-purple-500/20 text-purple-400">
                    Avatar Principal
                  </Badge>
                )}
              </div>
              <CardDescription>
                {avatar.age_range} · {avatar.gender} · {avatar.occupation}
              </CardDescription>
              <div className="flex gap-2 mt-1">
                {avatar.income_level && (
                  <Badge variant="outline" className="text-xs">
                    {avatar.income_level}
                  </Badge>
                )}
                {avatar.location && (
                  <Badge variant="secondary" className="text-xs">
                    {avatar.location}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day in the Life / Quote */}
        {(avatar.day_in_the_life || avatar.quote) && (
          <div className="p-3 rounded-sm bg-muted/50 italic text-sm">
            "{avatar.quote || avatar.day_in_the_life}"
          </div>
        )}

        {/* Goals & Fears */}
        <div className="grid sm:grid-cols-2 gap-4">
          {avatar.goals && avatar.goals.length > 0 && (
            <div className="p-3 rounded-sm border bg-green-500/5 border-green-500/20">
              <p className="text-xs text-green-400 mb-2 flex items-center gap-1">
                <Heart className="w-3 h-3" /> Metas
              </p>
              <ul className="space-y-1">
                {avatar.goals.slice(0, 3).map((goal, idx) => (
                  <li key={idx} className="text-xs flex gap-2">
                    <span className="text-green-400">•</span> {goal}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {avatar.fears && avatar.fears.length > 0 && (
            <div className="p-3 rounded-sm border bg-red-500/5 border-red-500/20">
              <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Miedos
              </p>
              <ul className="space-y-1">
                {avatar.fears.slice(0, 3).map((fear, idx) => (
                  <li key={idx} className="text-xs flex gap-2">
                    <span className="text-red-400">•</span> {fear}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Messaging Tone */}
        {avatar.messaging_guidelines?.tone && (
          <div className="p-4 rounded-sm bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-purple-400 mb-1">Tono de Comunicación</p>
                <p className="font-medium">{avatar.messaging_guidelines.tone}</p>
              </div>
              <CopyButton text={avatar.messaging_guidelines.tone} />
            </div>
          </div>
        )}

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar detalles
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver perfil completo
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Psychographics */}
            {avatar.psychographics && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Psicografía
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {avatar.psychographics.values && avatar.psychographics.values.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Valores</p>
                      <div className="flex flex-wrap gap-1">
                        {avatar.psychographics.values.map((v, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {avatar.psychographics.interests && avatar.psychographics.interests.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Intereses</p>
                      <div className="flex flex-wrap gap-1">
                        {avatar.psychographics.interests.map((i, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{i}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {avatar.psychographics.lifestyle && (
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Estilo de Vida</p>
                    <p className="text-sm">{avatar.psychographics.lifestyle}</p>
                  </div>
                )}
              </div>
            )}

            {/* Frustrations & Aspirations */}
            <div className="grid sm:grid-cols-2 gap-4">
              {avatar.frustrations && avatar.frustrations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-red-400">
                    Frustraciones
                  </p>
                  <ul className="space-y-1">
                    {avatar.frustrations.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-red-400">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {avatar.aspirations && avatar.aspirations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-green-400">
                    Aspiraciones
                  </p>
                  <ul className="space-y-1">
                    {avatar.aspirations.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-green-400">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Purchase Behavior */}
            {avatar.purchase_behavior && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  Comportamiento de Compra
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {avatar.purchase_behavior.research_style && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Estilo de Research</p>
                      <p className="text-xs font-medium">{avatar.purchase_behavior.research_style}</p>
                    </div>
                  )}
                  {avatar.purchase_behavior.preferred_payment && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Pago Preferido</p>
                      <p className="text-xs font-medium">{avatar.purchase_behavior.preferred_payment}</p>
                    </div>
                  )}
                </div>
                {avatar.purchase_behavior.decision_factors && avatar.purchase_behavior.decision_factors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Factores de Decisión</p>
                    <div className="flex flex-wrap gap-1">
                      {avatar.purchase_behavior.decision_factors.map((f, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {avatar.purchase_behavior.objections && avatar.purchase_behavior.objections.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Objeciones
                    </p>
                    <ul className="space-y-1">
                      {avatar.purchase_behavior.objections.map((obj, idx) => (
                        <li key={idx} className="text-xs">"{obj}"</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Media Consumption */}
            {avatar.media_consumption && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  Consumo de Medios
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {avatar.media_consumption.social_platforms && avatar.media_consumption.social_platforms.length > 0 && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Plataformas</p>
                      <div className="flex flex-wrap gap-1">
                        {avatar.media_consumption.social_platforms.map((p, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {avatar.media_consumption.content_types && avatar.media_consumption.content_types.length > 0 && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Tipos de Contenido</p>
                      <div className="flex flex-wrap gap-1">
                        {avatar.media_consumption.content_types.map((c, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messaging Guidelines */}
            {avatar.messaging_guidelines && (
              <div className="grid sm:grid-cols-2 gap-4">
                {avatar.messaging_guidelines.words_to_use && avatar.messaging_guidelines.words_to_use.length > 0 && (
                  <div className="p-3 rounded-sm border bg-green-500/5 border-green-500/20">
                    <p className="text-xs text-green-400 mb-2">✓ Palabras a usar</p>
                    <div className="flex flex-wrap gap-1">
                      {avatar.messaging_guidelines.words_to_use.map((word, idx) => (
                        <Badge key={idx} className="text-xs bg-green-500/20 text-green-400">{word}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {avatar.messaging_guidelines.words_to_avoid && avatar.messaging_guidelines.words_to_avoid.length > 0 && (
                  <div className="p-3 rounded-sm border bg-red-500/5 border-red-500/20">
                    <p className="text-xs text-red-400 mb-2">✗ Palabras a evitar</p>
                    <div className="flex flex-wrap gap-1">
                      {avatar.messaging_guidelines.words_to_avoid.map((word, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-red-500/30 text-red-400">{word}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Emotional Triggers */}
            {avatar.messaging_guidelines?.emotional_triggers && avatar.messaging_guidelines.emotional_triggers.length > 0 && (
              <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-2">
                  <Target className="w-3 h-3 inline mr-1" />
                  Triggers Emocionales
                </p>
                <div className="flex flex-wrap gap-1">
                  {avatar.messaging_guidelines.emotional_triggers.map((trigger, idx) => (
                    <Badge key={idx} className="text-xs bg-purple-500/20 text-purple-400">{trigger}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Tab04Avatars({ data }: Tab04AvatarsProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin avatares definidos</h3>
        <p className="text-sm text-muted-foreground">
          Los avatares de cliente ideal se generarán al completar el research.
        </p>
      </div>
    );
  }

  // Soportar ambas estructuras: backend (main_avatar) y legacy (primary_avatar)
  const rawData = data as Record<string, unknown>;
  const mainAvatar = (rawData.main_avatar || rawData.primary_avatar) as MainAvatar | undefined;
  const hasValidStructure = mainAvatar && typeof mainAvatar === 'object' && typeof mainAvatar.name === 'string';

  if (!hasValidStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Avatares Ideales"
        icon={<Users className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">{data.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Avatar */}
      {mainAvatar && (
        <MainAvatarCard avatar={mainAvatar} isPrimary />
      )}

      {/* Secondary Avatars */}
      {data.secondary_avatars && data.secondary_avatars.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Avatares Secundarios</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.secondary_avatars.map((avatar, idx) => (
              <Card key={idx} className="border-muted">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                      {avatar.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <CardTitle className="text-base">{avatar.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {avatar.priority === "media" ? "Prioridad Media" : "Prioridad Baja"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{avatar.brief_description}</p>
                  <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-400 mb-1">Diferencia clave</p>
                    <p className="text-xs">{avatar.key_difference}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Anti-Avatar */}
      {data.anti_avatar && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Anti-Avatar: Quién NO es cliente ideal
            </CardTitle>
            <CardDescription>{data.anti_avatar.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.anti_avatar.red_flags && data.anti_avatar.red_flags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-red-400">Señales de Alerta</p>
                <div className="flex flex-wrap gap-2">
                  {data.anti_avatar.red_flags.map((flag, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-red-500/30 text-red-400">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {data.anti_avatar.why_not_fit && (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-1">Por qué no encajan</p>
                <p className="text-sm">{data.anti_avatar.why_not_fit}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Avatar Journey */}
      {data.avatar_journey && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Journey del Avatar
            </CardTitle>
            <CardDescription>
              Cómo piensa el avatar en cada etapa del funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-sm border bg-blue-500/5 border-blue-500/20">
                <p className="text-xs text-blue-400 mb-2 font-medium">1. Awareness</p>
                <p className="text-sm">{data.avatar_journey.awareness}</p>
              </div>
              <div className="p-3 rounded-sm border bg-purple-500/5 border-purple-500/20">
                <p className="text-xs text-purple-400 mb-2 font-medium">2. Consideration</p>
                <p className="text-sm">{data.avatar_journey.consideration}</p>
              </div>
              <div className="p-3 rounded-sm border bg-green-500/5 border-green-500/20">
                <p className="text-xs text-green-400 mb-2 font-medium">3. Decision</p>
                <p className="text-sm">{data.avatar_journey.decision}</p>
              </div>
              <div className="p-3 rounded-sm border bg-yellow-500/5 border-yellow-500/20">
                <p className="text-xs text-yellow-400 mb-2 font-medium">4. Post-Purchase</p>
                <p className="text-sm">{data.avatar_journey.post_purchase}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy: Avatar Overlap */}
      {data.avatar_overlap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Puntos en Común
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.avatar_overlap.shared_pain_points && data.avatar_overlap.shared_pain_points.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-red-400">Dolores Compartidos</p>
                  <ul className="space-y-1">
                    {data.avatar_overlap.shared_pain_points.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.avatar_overlap.shared_desires && data.avatar_overlap.shared_desires.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-green-400">Deseos Compartidos</p>
                  <ul className="space-y-1">
                    {data.avatar_overlap.shared_desires.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.avatar_overlap.universal_objections && data.avatar_overlap.universal_objections.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-yellow-400">Objeciones Universales</p>
                  <ul className="space-y-1">
                    {data.avatar_overlap.universal_objections.map((item, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
