/**
 * Tab06Neuromarketing
 * Principios de neuromarketing aplicados
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Brain,
  Eye,
  Palette,
  Volume2,
  Zap,
  Target,
  Heart,
  Shield,
  DollarSign,
  Sparkles,
  PenTool,
  AlertTriangle,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-06-neuromarketing.ts)
interface BackendNeuromarketingData {
  primary_biases?: Array<{
    bias?: string;
    description?: string;
    application?: string;
    implementation?: {
      landing_page?: string;
      ad_creative?: string;
      email?: string;
      sales_call?: string;
    };
  }>;
  decision_architecture?: {
    default_option?: string;
    choice_overload_prevention?: string;
    decoy_effect?: {
      applicable?: boolean;
      how_to_implement?: string;
    };
    anchoring?: {
      anchor_price?: string;
      how_to_present?: string;
    };
  };
  sensory_triggers?: {
    visual?: {
      colors?: string[];
      imagery?: string;
      typography?: string;
    };
    auditory?: {
      music_style?: string;
      voice_characteristics?: string;
      sound_effects?: string;
    };
    kinesthetic?: {
      textures?: string;
      interactive_elements?: string;
    };
  };
  attention_grabbers?: Array<{
    technique?: string;
    neuroscience?: string;
    example?: string;
  }>;
  memory_encoding?: {
    peak_end_rule?: string;
    repetition_strategy?: string;
    emotional_peaks?: string[];
    distinctiveness?: string;
  };
  trust_signals?: {
    neurological_trust_builders?: Array<{
      signal?: string;
      why_works?: string;
      implementation?: string;
    }>;
    reduce_cognitive_load?: string;
  };
  urgency_scarcity_neuro?: {
    loss_aversion_messaging?: string;
    fomo_triggers?: string[];
    ethical_boundaries?: string;
  };
  pricing_psychology?: {
    charm_pricing?: string;
    payment_pain_reduction?: string;
    value_framing?: string;
    installment_psychology?: string;
  };
  emotional_arc?: {
    hook_emotion?: string;
    engagement_emotion?: string;
    conversion_emotion?: string;
    retention_emotion?: string;
  };
  color_psychology?: {
    primary_recommendation?: string;
    secondary_recommendation?: string;
    accent_for_cta?: string;
    colors_to_avoid?: string[];
  };
  neuro_copywriting?: {
    opening_pattern?: string;
    credibility_pattern?: string;
    desire_amplifier?: string;
    urgency_pattern?: string;
    closing_pattern?: string;
  };
  summary?: string;
}

interface Tab06NeuromarketingProps {
  data: BackendNeuromarketingData | null | undefined;
}

export function Tab06Neuromarketing({ data }: Tab06NeuromarketingProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lightbulb className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin análisis de neuromarketing</h3>
        <p className="text-sm text-muted-foreground">
          El análisis de neuromarketing se generará al completar el research.
        </p>
      </div>
    );
  }

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.primary_biases ||
    rawData.decision_architecture ||
    rawData.sensory_triggers ||
    rawData.emotional_arc;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Neuromarketing"
        icon={<Lightbulb className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-purple-500" />
              Resumen de Neuromarketing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-2" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Primary Biases */}
      {data.primary_biases && data.primary_biases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-purple-500" />
              Sesgos Cognitivos Principales
            </CardTitle>
            <CardDescription>
              Atajos mentales que influyen en las decisiones de compra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.primary_biases.map((bias, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {bias.bias}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{bias.description}</p>
                <div className="p-3 rounded bg-muted/50 mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Aplicación</p>
                  <p className="text-sm">{bias.application}</p>
                </div>
                {bias.implementation && (
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    {bias.implementation.landing_page && (
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <span className="text-blue-400 font-medium">Landing:</span>{" "}
                        <span className="text-muted-foreground">{bias.implementation.landing_page}</span>
                      </div>
                    )}
                    {bias.implementation.ad_creative && (
                      <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                        <span className="text-green-400 font-medium">Anuncios:</span>{" "}
                        <span className="text-muted-foreground">{bias.implementation.ad_creative}</span>
                      </div>
                    )}
                    {bias.implementation.email && (
                      <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <span className="text-yellow-400 font-medium">Email:</span>{" "}
                        <span className="text-muted-foreground">{bias.implementation.email}</span>
                      </div>
                    )}
                    {bias.implementation.sales_call && (
                      <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                        <span className="text-orange-400 font-medium">Ventas:</span>{" "}
                        <span className="text-muted-foreground">{bias.implementation.sales_call}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decision Architecture */}
      {data.decision_architecture && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-blue-500" />
              Arquitectura de Decisiones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.decision_architecture.default_option && (
              <div className="p-3 rounded-sm bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 mb-1">Opción por Defecto</p>
                <p className="text-sm">{data.decision_architecture.default_option}</p>
              </div>
            )}
            {data.decision_architecture.choice_overload_prevention && (
              <div className="p-3 rounded-sm bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Prevención de Parálisis por Análisis</p>
                <p className="text-sm">{data.decision_architecture.choice_overload_prevention}</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {data.decision_architecture.decoy_effect && (
                <div className="p-3 rounded-sm border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={data.decision_architecture.decoy_effect.applicable ? "default" : "secondary"}>
                      Efecto Señuelo
                    </Badge>
                    {data.decision_architecture.decoy_effect.applicable && (
                      <span className="text-xs text-green-400">Aplicable</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.decision_architecture.decoy_effect.how_to_implement}
                  </p>
                </div>
              )}
              {data.decision_architecture.anchoring && (
                <div className="p-3 rounded-sm border">
                  <Badge className="mb-2">Anclaje de Precio</Badge>
                  <p className="text-sm font-medium text-green-400 mb-1">
                    {data.decision_architecture.anchoring.anchor_price}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.decision_architecture.anchoring.how_to_present}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Arc */}
      {data.emotional_arc && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-red-500" />
              Arco Emocional
            </CardTitle>
            <CardDescription>
              Emociones a activar en cada etapa del journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.emotional_arc.hook_emotion && (
                <div className="p-3 rounded-sm bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400 mb-1">Hook (Captura)</p>
                  <p className="text-sm font-medium">{data.emotional_arc.hook_emotion}</p>
                </div>
              )}
              {data.emotional_arc.engagement_emotion && (
                <div className="p-3 rounded-sm bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400 mb-1">Engagement</p>
                  <p className="text-sm font-medium">{data.emotional_arc.engagement_emotion}</p>
                </div>
              )}
              {data.emotional_arc.conversion_emotion && (
                <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Conversión</p>
                  <p className="text-sm font-medium">{data.emotional_arc.conversion_emotion}</p>
                </div>
              )}
              {data.emotional_arc.retention_emotion && (
                <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">Retención</p>
                  <p className="text-sm font-medium">{data.emotional_arc.retention_emotion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sensory Triggers */}
      {data.sensory_triggers && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-5 h-5 text-blue-500" />
              Triggers Sensoriales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.sensory_triggers.visual && (
                <div className="p-4 rounded-sm border bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <p className="font-medium text-blue-400">Visual</p>
                  </div>
                  {data.sensory_triggers.visual.colors && data.sensory_triggers.visual.colors.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Colores:</p>
                      <ul className="space-y-1">
                        {data.sensory_triggers.visual.colors.map((c, i) => (
                          <li key={i} className="text-xs">• {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.sensory_triggers.visual.imagery && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Imágenes:</strong> {data.sensory_triggers.visual.imagery}
                    </p>
                  )}
                  {data.sensory_triggers.visual.typography && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Tipografía:</strong> {data.sensory_triggers.visual.typography}
                    </p>
                  )}
                </div>
              )}
              {data.sensory_triggers.auditory && (
                <div className="p-4 rounded-sm border bg-green-500/5 border-green-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Volume2 className="w-4 h-4 text-green-400" />
                    <p className="font-medium text-green-400">Auditivo</p>
                  </div>
                  {data.sensory_triggers.auditory.music_style && (
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>Música:</strong> {data.sensory_triggers.auditory.music_style}
                    </p>
                  )}
                  {data.sensory_triggers.auditory.voice_characteristics && (
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>Voz:</strong> {data.sensory_triggers.auditory.voice_characteristics}
                    </p>
                  )}
                  {data.sensory_triggers.auditory.sound_effects && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Efectos:</strong> {data.sensory_triggers.auditory.sound_effects}
                    </p>
                  )}
                </div>
              )}
              {data.sensory_triggers.kinesthetic && (
                <div className="p-4 rounded-sm border bg-orange-500/5 border-orange-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <p className="font-medium text-orange-400">Kinestésico</p>
                  </div>
                  {data.sensory_triggers.kinesthetic.textures && (
                    <p className="text-xs text-muted-foreground mb-1">
                      <strong>Texturas:</strong> {data.sensory_triggers.kinesthetic.textures}
                    </p>
                  )}
                  {data.sensory_triggers.kinesthetic.interactive_elements && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Interactivos:</strong> {data.sensory_triggers.kinesthetic.interactive_elements}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attention Grabbers */}
      {data.attention_grabbers && data.attention_grabbers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-yellow-500" />
              Captadores de Atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.attention_grabbers.map((grabber, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <h4 className="font-medium text-yellow-400 mb-2">{grabber.technique}</h4>
                {grabber.neuroscience && (
                  <p className="text-xs text-muted-foreground mb-2">
                    <strong>Neurociencia:</strong> {grabber.neuroscience}
                  </p>
                )}
                {grabber.example && (
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm italic">"{grabber.example}"</p>
                    <CopyButton text={grabber.example} size="sm" className="mt-1" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Color Psychology */}
      {data.color_psychology && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-5 h-5 text-pink-500" />
              Psicología del Color
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.color_psychology.primary_recommendation && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Color Primario</p>
                  <p className="text-sm">{data.color_psychology.primary_recommendation}</p>
                </div>
              )}
              {data.color_psychology.secondary_recommendation && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Color Secundario</p>
                  <p className="text-sm">{data.color_psychology.secondary_recommendation}</p>
                </div>
              )}
              {data.color_psychology.accent_for_cta && (
                <div className="p-3 rounded-sm border bg-green-500/10 border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Color CTA</p>
                  <p className="text-sm">{data.color_psychology.accent_for_cta}</p>
                </div>
              )}
            </div>
            {data.color_psychology.colors_to_avoid && data.color_psychology.colors_to_avoid.length > 0 && (
              <div className="mt-4 p-3 rounded-sm bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-2">Colores a Evitar:</p>
                <ul className="space-y-1">
                  {data.color_psychology.colors_to_avoid.map((c, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Neuro Copywriting */}
      {data.neuro_copywriting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenTool className="w-5 h-5 text-indigo-500" />
              Neuro Copywriting
            </CardTitle>
            <CardDescription>
              Patrones de escritura que activan el cerebro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.neuro_copywriting.opening_pattern && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-yellow-400 mb-1">Apertura</p>
                <p className="text-sm">{data.neuro_copywriting.opening_pattern}</p>
              </div>
            )}
            {data.neuro_copywriting.credibility_pattern && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-blue-400 mb-1">Credibilidad</p>
                <p className="text-sm">{data.neuro_copywriting.credibility_pattern}</p>
              </div>
            )}
            {data.neuro_copywriting.desire_amplifier && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-pink-400 mb-1">Amplificador de Deseo</p>
                <p className="text-sm">{data.neuro_copywriting.desire_amplifier}</p>
              </div>
            )}
            {data.neuro_copywriting.urgency_pattern && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-orange-400 mb-1">Urgencia</p>
                <p className="text-sm">{data.neuro_copywriting.urgency_pattern}</p>
              </div>
            )}
            {data.neuro_copywriting.closing_pattern && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-green-400 mb-1">Cierre</p>
                <p className="text-sm">{data.neuro_copywriting.closing_pattern}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trust Signals */}
      {data.trust_signals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-green-500" />
              Señales de Confianza
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.trust_signals.neurological_trust_builders && data.trust_signals.neurological_trust_builders.length > 0 && (
              <div className="space-y-3">
                {data.trust_signals.neurological_trust_builders.map((signal, idx) => (
                  <div key={idx} className="p-3 rounded-sm border">
                    <h4 className="font-medium text-green-400 text-sm mb-1">{signal.signal}</h4>
                    {signal.why_works && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <strong>Por qué funciona:</strong> {signal.why_works}
                      </p>
                    )}
                    {signal.implementation && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Implementación:</strong> {signal.implementation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {data.trust_signals.reduce_cognitive_load && (
              <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Reducir Carga Cognitiva</p>
                <p className="text-sm">{data.trust_signals.reduce_cognitive_load}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Psychology */}
      {data.pricing_psychology && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Psicología de Precios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.pricing_psychology.charm_pricing && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Precios con Encanto</p>
                  <p className="text-sm">{data.pricing_psychology.charm_pricing}</p>
                </div>
              )}
              {data.pricing_psychology.payment_pain_reduction && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Reducir Dolor del Pago</p>
                  <p className="text-sm">{data.pricing_psychology.payment_pain_reduction}</p>
                </div>
              )}
              {data.pricing_psychology.value_framing && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Enmarcado de Valor</p>
                  <p className="text-sm">{data.pricing_psychology.value_framing}</p>
                </div>
              )}
              {data.pricing_psychology.installment_psychology && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-1">Psicología de Cuotas</p>
                  <p className="text-sm">{data.pricing_psychology.installment_psychology}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Urgency & Scarcity Neuro */}
      {data.urgency_scarcity_neuro && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Urgencia y Escasez (Neuro)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.urgency_scarcity_neuro.loss_aversion_messaging && (
              <div className="p-3 rounded-sm bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-1">Aversión a la Pérdida</p>
                <p className="text-sm">{data.urgency_scarcity_neuro.loss_aversion_messaging}</p>
              </div>
            )}
            {data.urgency_scarcity_neuro.fomo_triggers && data.urgency_scarcity_neuro.fomo_triggers.length > 0 && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-orange-400 mb-2">Triggers FOMO:</p>
                <ul className="space-y-1">
                  {data.urgency_scarcity_neuro.fomo_triggers.map((trigger, i) => (
                    <li key={i} className="text-sm">• {trigger}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.urgency_scarcity_neuro.ethical_boundaries && (
              <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Límites Éticos</p>
                <p className="text-sm">{data.urgency_scarcity_neuro.ethical_boundaries}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Memory Encoding */}
      {data.memory_encoding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-cyan-500" />
              Codificación en Memoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.memory_encoding.peak_end_rule && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-cyan-400 mb-1">Regla Peak-End</p>
                <p className="text-sm">{data.memory_encoding.peak_end_rule}</p>
              </div>
            )}
            {data.memory_encoding.repetition_strategy && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-muted-foreground mb-1">Estrategia de Repetición</p>
                <p className="text-sm">{data.memory_encoding.repetition_strategy}</p>
              </div>
            )}
            {data.memory_encoding.emotional_peaks && data.memory_encoding.emotional_peaks.length > 0 && (
              <div className="p-3 rounded-sm border">
                <p className="text-xs text-pink-400 mb-2">Picos Emocionales:</p>
                <ul className="space-y-1">
                  {data.memory_encoding.emotional_peaks.map((peak, i) => (
                    <li key={i} className="text-sm">• {peak}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.memory_encoding.distinctiveness && (
              <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-1">Distintividad vs Competencia</p>
                <p className="text-sm">{data.memory_encoding.distinctiveness}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
