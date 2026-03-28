/**
 * Tab07Positioning
 * Estrategia de posicionamiento de marca
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Compass,
  Target,
  Zap,
  Quote,
  Shield,
  Users,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Mic,
  Map,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-07-positioning.ts)
interface BackendPositioningData {
  positioning_statement?: {
    for?: string;
    who?: string;
    product_is?: string;
    that?: string;
    unlike?: string;
    our_product?: string;
  };
  puv?: {
    headline?: string;
    subheadline?: string;
    proof_points?: string[];
  };
  brand_archetype?: {
    primary?: string;
    secondary?: string;
    why?: string;
    voice_characteristics?: string[];
    words_to_use?: string[];
    words_to_avoid?: string[];
  };
  brand_territory?: {
    owns?: string;
    adjacent_territories?: string[];
    territories_to_avoid?: string[];
  };
  competitive_frame?: {
    category?: string;
    frame_of_reference?: string;
    differentiation_angle?: string;
  };
  messaging_hierarchy?: {
    level_1_tagline?: string;
    level_2_value_prop?: string;
    level_3_proof?: string;
    level_4_features?: string;
  };
  key_messages?: Array<{
    audience?: string;
    message?: string;
    emotional_hook?: string;
    rational_support?: string;
  }>;
  elevator_pitches?: {
    "10_seconds"?: string;
    "30_seconds"?: string;
    "60_seconds"?: string;
  };
  brand_mantras?: string[];
  positioning_risks?: Array<{
    risk?: string;
    mitigation?: string;
  }>;
  summary?: string;
}

interface Tab07PositioningProps {
  data: BackendPositioningData | null | undefined;
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

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.positioning_statement ||
    rawData.puv ||
    rawData.brand_archetype ||
    rawData.messaging_hierarchy;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Posicionamiento"
        icon={<Compass className="w-4 h-4" />}
      />
    );
  }

  // Construir el positioning statement completo
  const buildPositioningStatement = () => {
    const ps = data.positioning_statement;
    if (!ps) return null;
    return `Para ${ps.for || '...'}, que ${ps.who || '...'}, ${ps.product_is || '...'} que ${ps.that || '...'}. A diferencia de ${ps.unlike || '...'}, nuestro producto ${ps.our_product || '...'}.`;
  };

  const fullStatement = buildPositioningStatement();

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="w-5 h-5 text-blue-500" />
              Resumen de Posicionamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-2" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Positioning Statement */}
      {data.positioning_statement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-purple-500" />
              Declaración de Posicionamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fullStatement && (
              <div className="p-4 rounded-sm bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm leading-relaxed italic">"{fullStatement}"</p>
                <CopyButton text={fullStatement} className="mt-2" size="sm" />
              </div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {data.positioning_statement.for && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Para</p>
                  <p className="font-medium">{data.positioning_statement.for}</p>
                </div>
              )}
              {data.positioning_statement.who && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Que tiene</p>
                  <p className="font-medium">{data.positioning_statement.who}</p>
                </div>
              )}
              {data.positioning_statement.product_is && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">El producto es</p>
                  <p className="font-medium">{data.positioning_statement.product_is}</p>
                </div>
              )}
              {data.positioning_statement.that && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Que proporciona</p>
                  <p className="font-medium">{data.positioning_statement.that}</p>
                </div>
              )}
              {data.positioning_statement.unlike && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">A diferencia de</p>
                  <p className="font-medium">{data.positioning_statement.unlike}</p>
                </div>
              )}
              {data.positioning_statement.our_product && (
                <div className="p-3 rounded-sm border bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Nuestro producto</p>
                  <p className="font-medium">{data.positioning_statement.our_product}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PUV - Propuesta Única de Valor */}
      {data.puv && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-yellow-500" />
              Propuesta Única de Valor (PUV)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.puv.headline && (
              <div className="p-4 rounded-sm bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <h3 className="text-xl font-bold mb-2">{data.puv.headline}</h3>
                {data.puv.subheadline && (
                  <p className="text-muted-foreground">{data.puv.subheadline}</p>
                )}
                <CopyButton
                  text={`${data.puv.headline}${data.puv.subheadline ? '\n' + data.puv.subheadline : ''}`}
                  className="mt-2"
                  size="sm"
                />
              </div>
            )}
            {data.puv.proof_points && data.puv.proof_points.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Puntos de Prueba:</p>
                <div className="flex flex-wrap gap-2">
                  {data.puv.proof_points.map((point, idx) => (
                    <Badge key={idx} variant="secondary">{point}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Brand Archetype */}
      {data.brand_archetype && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-purple-500" />
              Arquetipo de Marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {data.brand_archetype.primary && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-base px-3 py-1">
                  {data.brand_archetype.primary}
                </Badge>
              )}
              {data.brand_archetype.secondary && (
                <Badge variant="outline">{data.brand_archetype.secondary}</Badge>
              )}
            </div>
            {data.brand_archetype.why && (
              <p className="text-sm text-muted-foreground">{data.brand_archetype.why}</p>
            )}
            <div className="grid sm:grid-cols-3 gap-4">
              {data.brand_archetype.voice_characteristics && data.brand_archetype.voice_characteristics.length > 0 && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-2">Características de Voz:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.brand_archetype.voice_characteristics.map((char, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">{char}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.brand_archetype.words_to_use && data.brand_archetype.words_to_use.length > 0 && (
                <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-2">Palabras a Usar:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.brand_archetype.words_to_use.map((word, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded bg-green-500/20">{word}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.brand_archetype.words_to_avoid && data.brand_archetype.words_to_avoid.length > 0 && (
                <div className="p-3 rounded-sm bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 mb-2">Palabras a Evitar:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.brand_archetype.words_to_avoid.map((word, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded bg-red-500/20 line-through">{word}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Territory */}
      {data.brand_territory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Map className="w-5 h-5 text-green-500" />
              Territorio de Marca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.brand_territory.owns && (
              <div className="p-4 rounded-sm bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Territorio que Poseemos</p>
                <p className="font-medium">{data.brand_territory.owns}</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {data.brand_territory.adjacent_territories && data.brand_territory.adjacent_territories.length > 0 && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-2">Territorios Adyacentes:</p>
                  <ul className="space-y-1">
                    {data.brand_territory.adjacent_territories.map((t, idx) => (
                      <li key={idx} className="text-sm">• {t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.brand_territory.territories_to_avoid && data.brand_territory.territories_to_avoid.length > 0 && (
                <div className="p-3 rounded-sm bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 mb-2">Territorios a Evitar:</p>
                  <ul className="space-y-1">
                    {data.brand_territory.territories_to_avoid.map((t, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">• {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitive Frame */}
      {data.competitive_frame && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-blue-500" />
              Marco Competitivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.competitive_frame.category && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Categoría</p>
                  <p className="font-medium">{data.competitive_frame.category}</p>
                </div>
              )}
              {data.competitive_frame.frame_of_reference && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Marco de Referencia</p>
                  <p className="font-medium">{data.competitive_frame.frame_of_reference}</p>
                </div>
              )}
              {data.competitive_frame.differentiation_angle && (
                <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">Ángulo de Diferenciación</p>
                  <p className="font-medium">{data.competitive_frame.differentiation_angle}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messaging Hierarchy */}
      {data.messaging_hierarchy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-5 h-5 text-indigo-500" />
              Jerarquía de Mensajes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.messaging_hierarchy.level_1_tagline && (
              <div className="p-3 rounded-sm border border-l-4 border-l-indigo-500">
                <p className="text-xs text-indigo-400 mb-1">Nivel 1: Tagline</p>
                <p className="font-bold text-lg">{data.messaging_hierarchy.level_1_tagline}</p>
                <CopyButton text={data.messaging_hierarchy.level_1_tagline} size="sm" className="mt-1" />
              </div>
            )}
            {data.messaging_hierarchy.level_2_value_prop && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-muted-foreground mb-1">Nivel 2: Propuesta de Valor</p>
                <p className="font-medium">{data.messaging_hierarchy.level_2_value_prop}</p>
              </div>
            )}
            {data.messaging_hierarchy.level_3_proof && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-muted-foreground mb-1">Nivel 3: Prueba</p>
                <p className="text-sm">{data.messaging_hierarchy.level_3_proof}</p>
              </div>
            )}
            {data.messaging_hierarchy.level_4_features && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-muted-foreground mb-1">Nivel 4: Features</p>
                <p className="text-sm text-muted-foreground">{data.messaging_hierarchy.level_4_features}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Messages */}
      {data.key_messages && data.key_messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Mensajes Clave por Audiencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.key_messages.map((msg, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{msg.audience}</Badge>
                </div>
                {msg.message && (
                  <p className="font-medium mb-2">{msg.message}</p>
                )}
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {msg.emotional_hook && (
                    <div className="p-2 rounded bg-pink-500/10">
                      <span className="text-pink-400 text-xs">Gancho emocional: </span>
                      <span className="text-muted-foreground">{msg.emotional_hook}</span>
                    </div>
                  )}
                  {msg.rational_support && (
                    <div className="p-2 rounded bg-blue-500/10">
                      <span className="text-blue-400 text-xs">Soporte racional: </span>
                      <span className="text-muted-foreground">{msg.rational_support}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Elevator Pitches */}
      {data.elevator_pitches && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="w-5 h-5 text-orange-500" />
              Elevator Pitches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.elevator_pitches["10_seconds"] && (
              <div className="p-4 rounded-sm border">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-orange-500/20 text-orange-400">10 segundos</Badge>
                  <CopyButton text={data.elevator_pitches["10_seconds"]} size="sm" />
                </div>
                <p className="text-sm">{data.elevator_pitches["10_seconds"]}</p>
              </div>
            )}
            {data.elevator_pitches["30_seconds"] && (
              <div className="p-4 rounded-sm border">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-yellow-500/20 text-yellow-400">30 segundos</Badge>
                  <CopyButton text={data.elevator_pitches["30_seconds"]} size="sm" />
                </div>
                <p className="text-sm">{data.elevator_pitches["30_seconds"]}</p>
              </div>
            )}
            {data.elevator_pitches["60_seconds"] && (
              <div className="p-4 rounded-sm border">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-green-500/20 text-green-400">60 segundos</Badge>
                  <CopyButton text={data.elevator_pitches["60_seconds"]} size="sm" />
                </div>
                <p className="text-sm">{data.elevator_pitches["60_seconds"]}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Brand Mantras */}
      {data.brand_mantras && data.brand_mantras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Quote className="w-5 h-5 text-cyan-500" />
              Mantras de Marca (Internos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.brand_mantras.map((mantra, idx) => (
                <div key={idx} className="p-3 rounded-sm bg-cyan-500/10 border border-cyan-500/20 flex items-start justify-between">
                  <p className="italic">"{mantra}"</p>
                  <CopyButton text={mantra} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positioning Risks */}
      {data.positioning_risks && data.positioning_risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Riesgos del Posicionamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.positioning_risks.map((risk, idx) => (
              <div key={idx} className="p-4 rounded-sm border">
                <div className="flex items-start gap-3 mb-2">
                  <Badge variant="destructive" className="flex-shrink-0">Riesgo</Badge>
                  <p className="text-sm font-medium">{risk.risk}</p>
                </div>
                {risk.mitigation && (
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                    <span className="text-green-400 text-xs">Mitigación: </span>
                    <span className="text-sm">{risk.mitigation}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
