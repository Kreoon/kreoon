/**
 * Tab07Positioning
 * Estrategia de posicionamiento de marca
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Compass,
  Target,
  Zap,
  Quote,
  Shield,
  TrendingUp,
  Users,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface PositioningData {
  positioning_statement: string;
  brand_archetype: {
    primary: string;
    secondary: string;
    description: string;
  };
  value_proposition: {
    headline: string;
    subheadline: string;
    supporting_points: string[];
  };
  differentiators: Array<{
    differentiator: string;
    proof_point: string;
    competitor_gap: string;
  }>;
  brand_personality: {
    traits: string[];
    tone_of_voice: string;
    communication_style: string;
  };
  category_positioning: {
    category: string;
    positioning_type: "leader" | "challenger" | "niche" | "disruptor";
    positioning_rationale: string;
  };
  taglines: Array<{
    tagline: string;
    use_case: string;
  }>;
  brand_pillars: Array<{
    pillar: string;
    description: string;
    key_messages: string[];
  }>;
}

interface Tab07PositioningProps {
  data: PositioningData | null | undefined;
}

export function Tab07Positioning({ data }: Tab07PositioningProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Compass className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin datos de posicionamiento</h3>
        <p className="text-sm text-muted-foreground">
          El análisis de posicionamiento se generará al completar el research.
        </p>
      </div>
    );
  }

  const positioningTypeLabels = {
    leader: "Líder de Mercado",
    challenger: "Retador",
    niche: "Especialista de Nicho",
    disruptor: "Disruptor",
  };

  return (
    <div className="space-y-6">
      {/* Positioning Statement Hero */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Declaración de Posicionamiento
              </p>
              <p className="text-xl font-medium leading-relaxed">
                "{data.positioning_statement}"
              </p>
            </div>
            <CopyButton text={data.positioning_statement} />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Brand Archetype */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Arquetipo de Marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                {data.brand_archetype?.primary}
              </Badge>
              {data.brand_archetype?.secondary && (
                <Badge variant="outline">
                  {data.brand_archetype.secondary}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {data.brand_archetype?.description}
            </p>
          </CardContent>
        </Card>

        {/* Category Positioning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Posición en Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{data.category_positioning?.category}</Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {positioningTypeLabels[data.category_positioning?.positioning_type || "niche"]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.category_positioning?.positioning_rationale}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Value Proposition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Propuesta de Valor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold mb-1">
                  {data.value_proposition?.headline}
                </h3>
                <p className="text-muted-foreground">
                  {data.value_proposition?.subheadline}
                </p>
              </div>
              <CopyButton
                text={`${data.value_proposition?.headline}\n${data.value_proposition?.subheadline}`}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.value_proposition?.supporting_points?.map((point, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border bg-muted/30 text-sm"
              >
                {point}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Differentiators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Diferenciadores Clave
          </CardTitle>
          <CardDescription>
            Lo que te hace único frente a la competencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.differentiators?.map((diff, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium mb-2">{diff.differentiator}</h4>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Prueba: </span>
                        {diff.proof_point}
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Gap competidor:{" "}
                        </span>
                        {diff.competitor_gap}
                      </div>
                    </div>
                  </div>
                  <CopyButton text={diff.differentiator} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Brand Personality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            Personalidad de Marca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {data.brand_personality?.traits?.map((trait, idx) => (
              <Badge key={idx} variant="secondary">
                {trait}
              </Badge>
            ))}
          </div>
          <Separator />
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tono de voz: </span>
              <span className="font-medium">
                {data.brand_personality?.tone_of_voice}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                Estilo de comunicación:{" "}
              </span>
              <span className="font-medium">
                {data.brand_personality?.communication_style}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taglines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Quote className="w-5 h-5 text-indigo-500" />
            Taglines Sugeridos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.taglines?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium italic">"{item.tagline}"</p>
                  <CopyButton text={item.tagline} size="sm" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.use_case}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Brand Pillars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Pilares de Marca
          </CardTitle>
          <CardDescription>
            Fundamentos sobre los que se construye la marca
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {data.brand_pillars?.map((pillar, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                <h4 className="font-semibold text-emerald-400">{pillar.pillar}</h4>
                <p className="text-sm text-muted-foreground">
                  {pillar.description}
                </p>
                <ul className="space-y-1">
                  {pillar.key_messages?.map((msg, msgIdx) => (
                    <li key={msgIdx} className="text-xs text-muted-foreground">
                      • {msg}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
