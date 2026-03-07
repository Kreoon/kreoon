/**
 * Tab08CopyAngles
 * Ángulos de copywriting y frameworks de persuasión
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PenTool,
  Lightbulb,
  Target,
  MessageSquare,
  AlertTriangle,
  Gift,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { cn } from "@/lib/utils";

interface CopyAngle {
  angle_name: string;
  hook: string;
  explanation: string;
  target_emotion: string;
  best_for: string[];
  example_headline: string;
  example_body: string;
}

interface CopyFramework {
  name: string;
  description: string;
  structure: string[];
  example: {
    headline: string;
    body: string;
  };
}

interface CopyAnglesData {
  primary_angles: CopyAngle[];
  secondary_angles: CopyAngle[];
  frameworks: CopyFramework[];
  power_words: {
    urgency: string[];
    exclusivity: string[];
    emotion: string[];
    authority: string[];
    curiosity: string[];
  };
  headline_formulas: Array<{
    formula: string;
    example: string;
  }>;
  cta_variations: Array<{
    cta: string;
    context: string;
    psychology: string;
  }>;
  objection_handlers: Array<{
    objection: string;
    response: string;
    copy_snippet: string;
  }>;
}

interface Tab08CopyAnglesProps {
  data: CopyAnglesData | null | undefined;
}

function AngleCard({ angle, isPrimary = false }: { angle: CopyAngle; isPrimary?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={cn(isPrimary && "border-purple-500/30 bg-purple-500/5")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isPrimary && (
                <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
              )}
              <CardTitle className="text-lg">{angle.angle_name}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {angle.target_emotion}
            </Badge>
          </div>
          <CopyButton text={angle.example_headline} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
          <p className="font-medium italic">"{angle.hook}"</p>
        </div>

        <p className="text-sm text-muted-foreground">{angle.explanation}</p>

        <div className="flex flex-wrap gap-1">
          {angle.best_for?.map((use, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {use}
            </Badge>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar ejemplo
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver ejemplo completo
            </>
          )}
        </Button>

        {expanded && (
          <div className="p-4 rounded-lg border bg-card space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Headline:</p>
              <p className="font-semibold">{angle.example_headline}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Body:</p>
              <p className="text-sm whitespace-pre-line">{angle.example_body}</p>
            </div>
            <CopyButton
              text={`${angle.example_headline}\n\n${angle.example_body}`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Tab08CopyAngles({ data }: Tab08CopyAnglesProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PenTool className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin ángulos de copy</h3>
        <p className="text-sm text-muted-foreground">
          Los ángulos de copywriting se generarán al completar el research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="angles" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="angles">Ángulos</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="headlines">Headlines</TabsTrigger>
          <TabsTrigger value="ctas">CTAs</TabsTrigger>
          <TabsTrigger value="objections">Objeciones</TabsTrigger>
        </TabsList>

        {/* Angles Tab */}
        <TabsContent value="angles" className="space-y-6">
          {/* Primary Angles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">Ángulos Primarios</h3>
              <Badge className="bg-purple-500/20 text-purple-400">
                Alto Impacto
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {data.primary_angles?.map((angle, idx) => (
                <AngleCard key={idx} angle={angle} isPrimary />
              ))}
            </div>
          </div>

          {/* Secondary Angles */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Ángulos Secundarios</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {data.secondary_angles?.map((angle, idx) => (
                <AngleCard key={idx} angle={angle} />
              ))}
            </div>
          </div>

          {/* Power Words */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Palabras de Poder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.entries(data.power_words || {}).map(([category, words]) => (
                  <div key={category} className="space-y-2">
                    <Badge variant="outline" className="capitalize">
                      {category === "urgency"
                        ? "Urgencia"
                        : category === "exclusivity"
                        ? "Exclusividad"
                        : category === "emotion"
                        ? "Emoción"
                        : category === "authority"
                        ? "Autoridad"
                        : "Curiosidad"}
                    </Badge>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[])?.map((word, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded bg-muted cursor-pointer hover:bg-muted/80"
                          onClick={() => navigator.clipboard.writeText(word)}
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          {data.frameworks?.map((framework, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle>{framework.name}</CardTitle>
                <CardDescription>{framework.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {framework.structure?.map((step, stepIdx) => (
                    <div key={stepIdx} className="flex items-center gap-2">
                      <Badge variant="outline">{stepIdx + 1}</Badge>
                      <span className="text-sm">{step}</span>
                      {stepIdx < framework.structure.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Ejemplo:
                      </p>
                      <p className="font-semibold">{framework.example?.headline}</p>
                    </div>
                    <CopyButton
                      text={`${framework.example?.headline}\n\n${framework.example?.body}`}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {framework.example?.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Headlines Tab */}
        <TabsContent value="headlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Fórmulas de Headlines
              </CardTitle>
              <CardDescription>
                Plantillas probadas para crear titulares efectivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.headline_formulas?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border bg-card flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 space-y-2">
                      <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                        {item.formula}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        → {item.example}
                      </p>
                    </div>
                    <CopyButton text={item.example} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CTAs Tab */}
        <TabsContent value="ctas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-500" />
                Variaciones de CTA
              </CardTitle>
              <CardDescription>
                Llamadas a la acción optimizadas para diferentes contextos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.cta_variations?.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <Button size="sm" className="font-semibold">
                        {item.cta}
                      </Button>
                      <CopyButton text={item.cta} size="sm" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.context}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {item.psychology}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objections Tab */}
        <TabsContent value="objections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Manejo de Objeciones
              </CardTitle>
              <CardDescription>
                Respuestas preparadas para las objeciones más comunes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.objection_handlers?.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive" className="flex-shrink-0">
                        Objeción
                      </Badge>
                      <p className="font-medium">{item.objection}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="flex-shrink-0">
                        Respuesta
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {item.response}
                      </p>
                    </div>
                    <div className="p-3 rounded bg-muted/50 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Copy sugerido:
                        </p>
                        <p className="text-sm italic">"{item.copy_snippet}"</p>
                      </div>
                      <CopyButton text={item.copy_snippet} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
