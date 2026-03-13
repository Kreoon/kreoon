/**
 * Tab05Psychology
 * Psicología profunda del cliente
 * Adaptado a la estructura real del backend adn-research-v3
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
  Users,
  Lightbulb,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-05-psychology.ts)
interface BackendPsychologyData {
  pain_map?: {
    functional_pains?: Array<{
      pain?: string;
      intensity?: number;
      frequency?: string;
      trigger?: string;
    }>;
    emotional_pains?: Array<{
      emotion?: string;
      what_causes_it?: string;
      peak_moment?: string;
    }>;
    social_pains?: Array<{
      fear?: string;
    }>;
    root_pain?: string;
  };
  desire_map?: {
    functional_desires?: Array<{
      desire?: string;
      urgency?: number;
      blocker?: string;
    }>;
    emotional_desires?: Array<{
      state?: string;
      intensity?: number;
      delivery?: string;
    }>;
    aspirational_desires?: Array<{
      aspiration?: string;
    }>;
    deep_desire?: string;
  };
  cialdini_principles?: {
    reciprocity?: { what_to_give_first?: string; implementation?: string };
    commitment_consistency?: { micro_commitment?: string; escalation_path?: string };
    social_proof?: { most_powerful_type?: string; what_to_show?: string; implementation?: string };
    authority?: { credibility_signals?: string[]; how_to_build_fast?: string };
    liking?: { similarity_factors?: string[]; rapport_builders?: string[] };
    scarcity?: { type?: string; most_credible_version?: string };
  };
  cognitive_biases?: Array<{
    bias?: string;
    relevance?: string;
    how_to_use?: string;
    copy_example?: string;
  }>;
  lifeforce_8?: Array<{
    desire?: string;
    relevance?: string;
    application?: string;
  }>;
  objections_bank?: Array<{
    objection?: string;
    source?: string;
    type?: string;
    underlying_emotion?: string;
    handling_technique?: string;
    sales_script?: string;
    content_neutralizer?: string;
  }>;
  summary?: string;
}

interface Tab05PsychologyProps {
  data: BackendPsychologyData | null | undefined;
}

const relevanceColors: Record<string, string> = {
  alta: "bg-green-500/20 text-green-400",
  media: "bg-yellow-500/20 text-yellow-400",
  baja: "bg-gray-500/20 text-gray-400",
  high: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-gray-500/20 text-gray-400",
  no_aplica: "bg-gray-500/20 text-gray-400",
};

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

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.pain_map ||
    rawData.desire_map ||
    rawData.cialdini_principles ||
    rawData.cognitive_biases;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Psicología Profunda"
        icon={<Brain className="w-4 h-4" />}
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
              <Sparkles className="w-5 h-5 text-purple-500" />
              Resumen Psicológico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-3" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Pain Map */}
      {data.pain_map && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Mapa de Dolores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Root Pain */}
            {data.pain_map.root_pain && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400 mb-1">Dolor Raíz Existencial</p>
                <p className="text-sm font-medium">{data.pain_map.root_pain}</p>
                <CopyButton text={data.pain_map.root_pain} className="mt-2" size="sm" />
              </div>
            )}

            {/* Functional Pains */}
            {data.pain_map.functional_pains && data.pain_map.functional_pains.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-blue-400">Dolores Funcionales</p>
                <div className="space-y-2">
                  {data.pain_map.functional_pains.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium">{p.pain}</p>
                        {p.intensity && (
                          <Badge variant="outline">{p.intensity}/10</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {p.frequency && <span>Frecuencia: {p.frequency}</span>}
                        {p.trigger && <span>• Trigger: {p.trigger}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emotional Pains */}
            {data.pain_map.emotional_pains && data.pain_map.emotional_pains.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-pink-400">Dolores Emocionales</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {data.pain_map.emotional_pains.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card border-l-4 border-l-pink-500">
                      <p className="text-sm font-medium mb-1">{p.emotion}</p>
                      {p.what_causes_it && (
                        <p className="text-xs text-muted-foreground">Causa: {p.what_causes_it}</p>
                      )}
                      {p.peak_moment && (
                        <p className="text-xs text-muted-foreground">Pico: {p.peak_moment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Pains */}
            {data.pain_map.social_pains && data.pain_map.social_pains.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-purple-400">Miedos Sociales</p>
                <div className="flex flex-wrap gap-2">
                  {data.pain_map.social_pains.map((p, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {p.fear}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Desire Map */}
      {data.desire_map && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-green-500" />
              Mapa de Deseos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Deep Desire */}
            {data.desire_map.deep_desire && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-green-400 mb-1">Deseo Profundo</p>
                <p className="text-sm font-medium italic">{data.desire_map.deep_desire}</p>
                <CopyButton text={data.desire_map.deep_desire} className="mt-2" size="sm" />
              </div>
            )}

            {/* Functional Desires */}
            {data.desire_map.functional_desires && data.desire_map.functional_desires.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-blue-400">Deseos Funcionales</p>
                <div className="space-y-2">
                  {data.desire_map.functional_desires.map((d, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm">{d.desire}</p>
                        {d.urgency && (
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            Urgencia: {d.urgency}/10
                          </Badge>
                        )}
                      </div>
                      {d.blocker && (
                        <p className="text-xs text-red-400 mt-1">Bloqueador: {d.blocker}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emotional Desires */}
            {data.desire_map.emotional_desires && data.desire_map.emotional_desires.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-pink-400">Deseos Emocionales</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {data.desire_map.emotional_desires.map((d, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-card border-l-4 border-l-green-500">
                      <p className="text-sm font-medium mb-1">{d.state}</p>
                      {d.delivery && (
                        <p className="text-xs text-green-400">Cómo entregar: {d.delivery}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aspirational Desires */}
            {data.desire_map.aspirational_desires && data.desire_map.aspirational_desires.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-purple-400">Aspiraciones</p>
                <div className="flex flex-wrap gap-2">
                  {data.desire_map.aspirational_desires.map((d, idx) => (
                    <Badge key={idx} className="bg-purple-500/20 text-purple-400">
                      {d.aspiration}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cialdini Principles */}
      {data.cialdini_principles && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-blue-500" />
              Principios de Cialdini
            </CardTitle>
            <CardDescription>Cómo aplicar los principios de persuasión</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.cialdini_principles.reciprocity && (
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="bg-blue-500/20 text-blue-400 mb-2">Reciprocidad</Badge>
                  {data.cialdini_principles.reciprocity.what_to_give_first && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Dar primero: </span>
                      {data.cialdini_principles.reciprocity.what_to_give_first}
                    </p>
                  )}
                  {data.cialdini_principles.reciprocity.implementation && (
                    <p className="text-xs text-muted-foreground">
                      {data.cialdini_principles.reciprocity.implementation}
                    </p>
                  )}
                </div>
              )}
              {data.cialdini_principles.social_proof && (
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="bg-green-500/20 text-green-400 mb-2">Prueba Social</Badge>
                  {data.cialdini_principles.social_proof.most_powerful_type && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Tipo más poderoso: </span>
                      {data.cialdini_principles.social_proof.most_powerful_type}
                    </p>
                  )}
                  {data.cialdini_principles.social_proof.what_to_show && (
                    <p className="text-xs text-muted-foreground">
                      {data.cialdini_principles.social_proof.what_to_show}
                    </p>
                  )}
                </div>
              )}
              {data.cialdini_principles.authority && (
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="bg-purple-500/20 text-purple-400 mb-2">Autoridad</Badge>
                  {data.cialdini_principles.authority.credibility_signals && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {data.cialdini_principles.authority.credibility_signals.map((sig, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{sig}</Badge>
                      ))}
                    </div>
                  )}
                  {data.cialdini_principles.authority.how_to_build_fast && (
                    <p className="text-xs text-muted-foreground">
                      {data.cialdini_principles.authority.how_to_build_fast}
                    </p>
                  )}
                </div>
              )}
              {data.cialdini_principles.scarcity && (
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="bg-red-500/20 text-red-400 mb-2">Escasez</Badge>
                  {data.cialdini_principles.scarcity.type && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Tipo: </span>
                      {data.cialdini_principles.scarcity.type}
                    </p>
                  )}
                  {data.cialdini_principles.scarcity.most_credible_version && (
                    <p className="text-xs text-muted-foreground">
                      {data.cialdini_principles.scarcity.most_credible_version}
                    </p>
                  )}
                </div>
              )}
              {data.cialdini_principles.liking && (
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="bg-yellow-500/20 text-yellow-400 mb-2">Simpatía</Badge>
                  {data.cialdini_principles.liking.similarity_factors && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {data.cialdini_principles.liking.similarity_factors.map((f, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {data.cialdini_principles.commitment_consistency && (
                <div className="p-4 rounded-lg border bg-card">
                  <Badge className="bg-orange-500/20 text-orange-400 mb-2">Compromiso</Badge>
                  {data.cialdini_principles.commitment_consistency.micro_commitment && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Micro-compromiso: </span>
                      {data.cialdini_principles.commitment_consistency.micro_commitment}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cognitive Biases */}
      {data.cognitive_biases && data.cognitive_biases.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-5 h-5 text-purple-500" />
              Sesgos Cognitivos a Usar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.cognitive_biases.map((bias, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-sm">{bias.bias}</span>
                    {bias.relevance && (
                      <Badge className={relevanceColors[bias.relevance.toLowerCase()] || "bg-muted"}>
                        {bias.relevance}
                      </Badge>
                    )}
                  </div>
                  {bias.how_to_use && (
                    <p className="text-sm text-muted-foreground mb-2">{bias.how_to_use}</p>
                  )}
                  {bias.copy_example && (
                    <div className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <p className="text-xs italic">"{bias.copy_example}"</p>
                      <CopyButton text={bias.copy_example} size="sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifeforce 8 */}
      {data.lifeforce_8 && data.lifeforce_8.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-yellow-500" />
              Lifeforce 8
            </CardTitle>
            <CardDescription>Los 8 deseos humanos fundamentales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.lifeforce_8.filter(l => l.relevance !== "no_aplica").map((lf, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{lf.desire}</span>
                    {lf.relevance && (
                      <Badge className={relevanceColors[lf.relevance.toLowerCase()] || "bg-muted"} variant="secondary">
                        {lf.relevance}
                      </Badge>
                    )}
                  </div>
                  {lf.application && (
                    <p className="text-xs text-muted-foreground">{lf.application}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objections Bank */}
      {data.objections_bank && data.objections_bank.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Banco de Objeciones
            </CardTitle>
            <CardDescription>Objeciones y cómo manejarlas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.objections_bank.map((obj, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-sm text-orange-400">"{obj.objection}"</p>
                    {obj.type && (
                      <Badge variant="outline" className="text-xs capitalize">{obj.type}</Badge>
                    )}
                  </div>
                  {obj.underlying_emotion && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Emoción real: {obj.underlying_emotion}
                    </p>
                  )}
                  {obj.sales_script && (
                    <div className="p-3 rounded bg-green-500/10 border border-green-500/20 mb-2">
                      <p className="text-xs text-green-400 mb-1">Script de Venta</p>
                      <p className="text-sm">{obj.sales_script}</p>
                      <CopyButton text={obj.sales_script} size="sm" className="mt-2" />
                    </div>
                  )}
                  {obj.content_neutralizer && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Neutralizar con contenido:</strong> {obj.content_neutralizer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
