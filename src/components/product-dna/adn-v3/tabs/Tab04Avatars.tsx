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
import { cn } from "@/lib/utils";

interface Avatar {
  name: string;
  age_range: string;
  gender: string;
  occupation: string;
  income_level: string;
  location_type: string;
  photo_description: string;
  bio: string;
  core_motivation: string;
  biggest_fear: string;
  daily_frustrations: string[];
  secret_desires: string[];
  purchase_triggers: string[];
  objections: string[];
  information_sources: string[];
  social_media_usage: Record<string, string>;
  buying_behavior: {
    decision_style: string;
    price_sensitivity: string;
    brand_loyalty: string;
    research_depth: string;
  };
  messaging_do: string[];
  messaging_dont: string[];
  perfect_ad_hook: string;
  conversion_path: string;
}

interface AvatarsData {
  primary_avatar: Avatar;
  secondary_avatars: Avatar[];
  avatar_overlap: {
    shared_pain_points: string[];
    shared_desires: string[];
    universal_objections: string[];
  };
  segmentation_strategy: string;
}

interface Tab04AvatarsProps {
  data: AvatarsData | null | undefined;
}

function AvatarCard({ avatar, isPrimary = false }: { avatar: Avatar; isPrimary?: boolean }) {
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
              {avatar.name.charAt(0)}
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
                <Badge variant="outline" className="text-xs">
                  {avatar.income_level}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {avatar.location_type}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bio */}
        <div className="p-3 rounded-lg bg-muted/50 italic text-sm">
          "{avatar.bio}"
        </div>

        {/* Core Motivation & Fear */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20">
            <p className="text-xs text-green-400 mb-1 flex items-center gap-1">
              <Heart className="w-3 h-3" /> Motivación Principal
            </p>
            <p className="text-sm">{avatar.core_motivation}</p>
          </div>
          <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20">
            <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Mayor Miedo
            </p>
            <p className="text-sm">{avatar.biggest_fear}</p>
          </div>
        </div>

        {/* Perfect Ad Hook */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-purple-400 mb-1">Hook Perfecto para este Avatar</p>
              <p className="font-medium">"{avatar.perfect_ad_hook}"</p>
            </div>
            <CopyButton text={avatar.perfect_ad_hook} />
          </div>
        </div>

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
            {/* Frustrations & Desires */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2 text-red-400">
                  Frustraciones Diarias
                </p>
                <ul className="space-y-1">
                  {avatar.daily_frustrations?.map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-red-400">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-green-400">
                  Deseos Secretos
                </p>
                <ul className="space-y-1">
                  {avatar.secret_desires?.map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-green-400">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Purchase Triggers & Objections */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  Triggers de Compra
                </p>
                <div className="flex flex-wrap gap-1">
                  {avatar.purchase_triggers?.map((trigger, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {trigger}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Objeciones Comunes
                </p>
                <ul className="space-y-1">
                  {avatar.objections?.map((obj, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      "{obj}"
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Buying Behavior */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Brain className="w-4 h-4 text-purple-400" />
                Comportamiento de Compra
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Decisión</p>
                  <p className="text-xs font-medium">
                    {avatar.buying_behavior?.decision_style}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Sensibilidad Precio</p>
                  <p className="text-xs font-medium">
                    {avatar.buying_behavior?.price_sensitivity}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Lealtad</p>
                  <p className="text-xs font-medium">
                    {avatar.buying_behavior?.brand_loyalty}
                  </p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground">Research</p>
                  <p className="text-xs font-medium">
                    {avatar.buying_behavior?.research_depth}
                  </p>
                </div>
              </div>
            </div>

            {/* Messaging Guidelines */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                <p className="text-xs text-green-400 mb-2">✓ SÍ decirle</p>
                <ul className="space-y-1">
                  {avatar.messaging_do?.map((item, idx) => (
                    <li key={idx} className="text-xs">{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-lg border bg-red-500/5 border-red-500/20">
                <p className="text-xs text-red-400 mb-2">✗ NO decirle</p>
                <ul className="space-y-1">
                  {avatar.messaging_dont?.map((item, idx) => (
                    <li key={idx} className="text-xs">{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Conversion Path */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 mb-1">
                <Target className="w-3 h-3 inline mr-1" />
                Ruta de Conversión Ideal
              </p>
              <p className="text-sm">{avatar.conversion_path}</p>
            </div>
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

  return (
    <div className="space-y-6">
      {/* Primary Avatar */}
      {data.primary_avatar && (
        <AvatarCard avatar={data.primary_avatar} isPrimary />
      )}

      {/* Secondary Avatars */}
      {data.secondary_avatars && data.secondary_avatars.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Avatares Secundarios</h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {data.secondary_avatars.map((avatar, idx) => (
              <AvatarCard key={idx} avatar={avatar} />
            ))}
          </div>
        </div>
      )}

      {/* Avatar Overlap */}
      {data.avatar_overlap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Puntos en Común (Todos los Avatares)
            </CardTitle>
            <CardDescription>
              Insights aplicables a todos los segmentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium mb-2 text-red-400">
                  Dolores Compartidos
                </p>
                <ul className="space-y-1">
                  {data.avatar_overlap.shared_pain_points?.map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-green-400">
                  Deseos Compartidos
                </p>
                <ul className="space-y-1">
                  {data.avatar_overlap.shared_desires?.map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 text-yellow-400">
                  Objeciones Universales
                </p>
                <ul className="space-y-1">
                  {data.avatar_overlap.universal_objections?.map((item, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segmentation Strategy */}
      {data.segmentation_strategy && (
        <Card>
          <CardHeader>
            <CardTitle>Estrategia de Segmentación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.segmentation_strategy}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
