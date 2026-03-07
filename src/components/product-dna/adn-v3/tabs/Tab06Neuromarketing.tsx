/**
 * Tab06Neuromarketing
 * Principios de neuromarketing aplicados
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Brain,
  Eye,
  Palette,
  Volume2,
  Type,
  Zap,
  Target,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface NeuromarketingData {
  cognitive_biases: Array<{
    bias: string;
    description: string;
    application: string;
    example_copy: string;
  }>;
  persuasion_principles: Array<{
    principle: string;
    how_to_apply: string;
    copy_example: string;
  }>;
  sensory_triggers: {
    visual: string[];
    auditory: string[];
    kinesthetic: string[];
  };
  color_psychology: Array<{
    color: string;
    emotion: string;
    usage: string;
  }>;
  typography_recommendations: {
    headlines: string;
    body: string;
    cta: string;
    rationale: string;
  };
  attention_patterns: {
    f_pattern_elements: string[];
    z_pattern_elements: string[];
    focal_points: string[];
  };
  emotional_triggers: Array<{
    trigger: string;
    activation_method: string;
    copy_snippet: string;
  }>;
  decision_shortcuts: Array<{
    shortcut: string;
    implementation: string;
  }>;
}

interface Tab06NeuromarketingProps {
  data: NeuromarketingData | null | undefined;
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

  return (
    <div className="space-y-6">
      {/* Cognitive Biases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Sesgos Cognitivos Aplicables
          </CardTitle>
          <CardDescription>
            Atajos mentales que influyen en las decisiones de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.cognitive_biases?.map((bias, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <Badge className="bg-purple-500/20 text-purple-400">
                    {bias.bias}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{bias.description}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Aplicación</p>
                    <p className="text-sm">{bias.application}</p>
                  </div>
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="text-xs text-green-400 mb-1">Ejemplo de Copy</p>
                    <p className="text-sm italic">"{bias.example_copy}"</p>
                    <CopyButton text={bias.example_copy} size="sm" className="mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Persuasion Principles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Principios de Persuasión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.persuasion_principles?.map((principle, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold text-yellow-400 mb-2">{principle.principle}</h4>
                <p className="text-sm text-muted-foreground mb-3">{principle.how_to_apply}</p>
                <div className="p-2 rounded bg-muted/50 flex items-start justify-between">
                  <p className="text-sm italic">"{principle.copy_example}"</p>
                  <CopyButton text={principle.copy_example} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sensory Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Triggers Sensoriales
          </CardTitle>
          <CardDescription>
            Elementos que activan los diferentes canales sensoriales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-blue-400" />
                <p className="font-medium text-blue-400">Visual</p>
              </div>
              <ul className="space-y-2">
                {data.sensory_triggers?.visual?.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-green-400" />
                <p className="font-medium text-green-400">Auditivo</p>
              </div>
              <ul className="space-y-2">
                {data.sensory_triggers?.auditory?.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-orange-400" />
                <p className="font-medium text-orange-400">Kinestésico</p>
              </div>
              <ul className="space-y-2">
                {data.sensory_triggers?.kinesthetic?.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Psychology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-500" />
            Psicología del Color
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.color_psychology?.map((color, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-full border-2"
                    style={{
                      backgroundColor: color.color.toLowerCase().includes('rojo') ? '#ef4444' :
                        color.color.toLowerCase().includes('azul') ? '#3b82f6' :
                        color.color.toLowerCase().includes('verde') ? '#22c55e' :
                        color.color.toLowerCase().includes('amarillo') ? '#eab308' :
                        color.color.toLowerCase().includes('naranja') ? '#f97316' :
                        color.color.toLowerCase().includes('morado') || color.color.toLowerCase().includes('púrpura') ? '#a855f7' :
                        color.color.toLowerCase().includes('negro') ? '#1f2937' :
                        color.color.toLowerCase().includes('blanco') ? '#f9fafb' : '#6b7280'
                    }}
                  />
                  <span className="font-medium">{color.color}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Emoción:</strong> {color.emotion}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Uso:</strong> {color.usage}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-indigo-500" />
            Tipografía Recomendada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Headlines</p>
              <p className="font-bold text-lg">{data.typography_recommendations?.headlines}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground mb-1">Body Text</p>
              <p className="font-medium">{data.typography_recommendations?.body}</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-xs text-muted-foreground mb-1">CTAs</p>
              <p className="font-semibold">{data.typography_recommendations?.cta}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Razón:</strong> {data.typography_recommendations?.rationale}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Attention Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-500" />
            Patrones de Atención
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">Patrón F</Badge>
              <ul className="space-y-1">
                {data.attention_patterns?.f_pattern_elements?.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">Patrón Z</Badge>
              <ul className="space-y-1">
                {data.attention_patterns?.z_pattern_elements?.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <Badge variant="outline" className="mb-2">Puntos Focales</Badge>
              <ul className="space-y-1">
                {data.attention_patterns?.focal_points?.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emotional Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-500" />
            Triggers Emocionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.emotional_triggers?.map((trigger, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-red-400 mb-2">{trigger.trigger}</h4>
                <p className="text-sm text-muted-foreground mb-3">{trigger.activation_method}</p>
                <div className="p-2 rounded bg-muted/50 flex items-start justify-between">
                  <p className="text-sm italic">"{trigger.copy_snippet}"</p>
                  <CopyButton text={trigger.copy_snippet} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Decision Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Atajos de Decisión
          </CardTitle>
          <CardDescription>
            Elementos que aceleran la toma de decisiones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.decision_shortcuts?.map((shortcut, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-green-400 mb-2">{shortcut.shortcut}</h4>
                <p className="text-sm text-muted-foreground">{shortcut.implementation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
