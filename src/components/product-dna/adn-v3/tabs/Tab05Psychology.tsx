/**
 * Tab05Psychology
 * Psicología profunda del cliente
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Heart,
  AlertTriangle,
  Shield,
  Zap,
  Target,
  Eye,
  MessageSquare,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface PsychologyData {
  deep_motivations: Array<{
    motivation: string;
    underlying_need: string;
    how_to_activate: string;
  }>;
  core_fears: Array<{
    fear: string;
    manifestation: string;
    how_to_address: string;
  }>;
  belief_systems: Array<{
    belief: string;
    impact_on_buying: string;
    messaging_implication: string;
  }>;
  decision_triggers: Array<{
    trigger: string;
    psychological_principle: string;
    application: string;
  }>;
  resistance_points: Array<{
    resistance: string;
    root_cause: string;
    resolution_strategy: string;
  }>;
  emotional_journey: {
    before_awareness: string;
    during_consideration: string;
    at_decision: string;
    post_purchase: string;
  };
  identity_aspirations: {
    current_identity: string;
    desired_identity: string;
    transformation_narrative: string;
  };
  psychological_hooks: string[];
}

interface Tab05PsychologyProps {
  data: PsychologyData | null | undefined;
}

export function Tab05Psychology({ data }: Tab05PsychologyProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin análisis psicológico</h3>
        <p className="text-sm text-muted-foreground">
          El análisis psicológico profundo se generará al completar el research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Identity Transformation */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Transformación de Identidad
          </CardTitle>
          <CardDescription>
            El viaje de quién es el cliente a quién quiere ser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 mb-2">Identidad Actual</p>
              <p className="text-sm">{data.identity_aspirations?.current_identity}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-green-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-400 mb-2">Identidad Deseada</p>
              <p className="text-sm">{data.identity_aspirations?.desired_identity}</p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Narrativa de Transformación</p>
            <p className="font-medium">{data.identity_aspirations?.transformation_narrative}</p>
            <CopyButton text={data.identity_aspirations?.transformation_narrative || ""} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      {/* Emotional Journey */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Viaje Emocional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">1. Pre-Awareness</Badge>
              <p className="text-sm text-muted-foreground">
                {data.emotional_journey?.before_awareness}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">2. Consideración</Badge>
              <p className="text-sm text-muted-foreground">
                {data.emotional_journey?.during_consideration}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">3. Decisión</Badge>
              <p className="text-sm text-muted-foreground">
                {data.emotional_journey?.at_decision}
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">4. Post-Compra</Badge>
              <p className="text-sm text-muted-foreground">
                {data.emotional_journey?.post_purchase}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deep Motivations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Motivaciones Profundas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.deep_motivations?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2">{item.motivation}</h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Necesidad Subyacente</p>
                    <p>{item.underlying_need}</p>
                  </div>
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="text-xs text-green-400 mb-1">Cómo Activar</p>
                    <p>{item.how_to_activate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core Fears */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Miedos Centrales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.core_fears?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-red-400 mb-2">{item.fear}</h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded bg-red-500/10">
                    <p className="text-xs text-red-400 mb-1">Cómo se Manifiesta</p>
                    <p>{item.manifestation}</p>
                  </div>
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="text-xs text-green-400 mb-1">Cómo Abordarlo</p>
                    <p>{item.how_to_address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Belief Systems */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Sistemas de Creencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.belief_systems?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <p className="font-medium mb-2">"{item.belief}"</p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Impacto en Compra</p>
                    <p className="text-muted-foreground">{item.impact_on_buying}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-400 mb-1">Implicación para Messaging</p>
                    <p>{item.messaging_implication}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decision Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Triggers de Decisión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.decision_triggers?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <Badge className="bg-green-500/20 text-green-400 mb-2">
                  {item.psychological_principle}
                </Badge>
                <h4 className="font-medium mb-2">{item.trigger}</h4>
                <p className="text-sm text-muted-foreground">{item.application}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resistance Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            Puntos de Resistencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.resistance_points?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-orange-400 mb-2">{item.resistance}</h4>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Causa Raíz</p>
                    <p className="text-muted-foreground">{item.root_cause}</p>
                  </div>
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="text-xs text-green-400 mb-1">Estrategia de Resolución</p>
                    <p>{item.resolution_strategy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Psychological Hooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            Hooks Psicológicos
          </CardTitle>
          <CardDescription>
            Frases y conceptos que resuenan profundamente con el cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.psychological_hooks?.map((hook, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                <p className="text-sm font-medium">"{hook}"</p>
                <CopyButton text={hook} size="sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
