/**
 * Tab08CopyAngles
 * Ángulos de copywriting y frameworks de persuasión
 * Adaptado a la estructura real del backend adn-research-v3
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
  Mail,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";
import { cn } from "@/lib/utils";

// Estructura real del backend (step-08-copywriting.ts)
interface BackendCopyAnglesData {
  sales_angles?: Array<{
    angle_name?: string;
    description?: string;
    best_for?: string;
    example_hook?: string;
    example_body?: string;
    example_cta?: string;
  }>;
  copy_frameworks?: {
    pas?: {
      problem?: string;
      agitation?: string;
      solution?: string;
    };
    aida?: {
      attention?: string;
      interest?: string;
      desire?: string;
      action?: string;
    };
    bab?: {
      before?: string;
      after?: string;
      bridge?: string;
    };
    pastor?: {
      problem?: string;
      amplify?: string;
      story?: string;
      transformation?: string;
      offer?: string;
      response?: string;
    };
  };
  hooks_bank?: string[];
  headlines_bank?: string[];
  ctas_bank?: string[];
  power_phrases?: {
    urgency?: string[];
    scarcity?: string[];
    social_proof?: string[];
    guarantee?: string[];
    value_stack?: string[];
  };
  story_angles?: Array<{
    angle?: string;
    setup?: string;
    conflict?: string;
    resolution?: string;
    where_to_use?: string;
  }>;
  objection_handlers?: Array<{
    objection?: string;
    copy_response?: string;
    technique_used?: string;
  }>;
  email_subject_lines?: {
    curiosity?: string[];
    benefit?: string[];
    urgency?: string[];
    personal?: string[];
  };
}

interface Tab08CopyAnglesProps {
  data: BackendCopyAnglesData | null | undefined;
}

function SalesAngleCard({ angle }: { angle: NonNullable<BackendCopyAnglesData['sales_angles']>[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{angle.angle_name}</CardTitle>
            {angle.best_for && (
              <Badge variant="outline" className="text-xs mt-1">
                {angle.best_for}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {angle.description && (
          <p className="text-sm text-muted-foreground">{angle.description}</p>
        )}

        {angle.example_hook && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 mb-1">Hook:</p>
            <p className="text-sm italic">"{angle.example_hook}"</p>
            <CopyButton text={angle.example_hook} size="sm" className="mt-1" />
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar ejemplo completo
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
            {angle.example_body && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Body:</p>
                <p className="text-sm whitespace-pre-line">{angle.example_body}</p>
              </div>
            )}
            {angle.example_cta && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">CTA:</p>
                <Badge className="bg-green-500/20 text-green-400">{angle.example_cta}</Badge>
              </div>
            )}
            <CopyButton
              text={`${angle.example_hook || ''}\n\n${angle.example_body || ''}\n\n${angle.example_cta || ''}`}
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

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.sales_angles ||
    rawData.hooks_bank ||
    rawData.copy_frameworks ||
    rawData.headlines_bank;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Ángulos de Copy"
        icon={<PenTool className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="angles" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="angles">Ángulos</TabsTrigger>
          <TabsTrigger value="hooks">Hooks ({data.hooks_bank?.length || 0})</TabsTrigger>
          <TabsTrigger value="headlines">Headlines ({data.headlines_bank?.length || 0})</TabsTrigger>
          <TabsTrigger value="ctas">CTAs ({data.ctas_bank?.length || 0})</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="stories">Historias</TabsTrigger>
          <TabsTrigger value="objections">Objeciones</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>

        {/* Sales Angles Tab */}
        <TabsContent value="angles" className="space-y-4">
          {data.sales_angles && data.sales_angles.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {data.sales_angles.map((angle, idx) => (
                <SalesAngleCard key={idx} angle={angle} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay ángulos de venta disponibles</p>
          )}

          {/* Power Phrases */}
          {data.power_phrases && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Frases de Poder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {Object.entries(data.power_phrases).map(([category, phrases]) => (
                    <div key={category} className="space-y-2">
                      <Badge variant="outline" className="capitalize">
                        {category === "urgency" ? "Urgencia" :
                         category === "scarcity" ? "Escasez" :
                         category === "social_proof" ? "Prueba Social" :
                         category === "guarantee" ? "Garantía" :
                         category === "value_stack" ? "Valor" : category}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {(phrases as string[])?.map((phrase, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded bg-muted cursor-pointer hover:bg-muted/80"
                            onClick={() => navigator.clipboard.writeText(phrase)}
                            title="Click para copiar"
                          >
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Hooks Tab */}
        <TabsContent value="hooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-yellow-500" />
                Banco de Hooks ({data.hooks_bank?.length || 0})
              </CardTitle>
              <CardDescription>
                Ganchos de apertura listos para usar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {data.hooks_bank?.map((hook, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-card flex items-start justify-between gap-2"
                  >
                    <div className="flex gap-2">
                      <span className="text-xs text-muted-foreground flex-shrink-0">{idx + 1}.</span>
                      <p className="text-sm">{hook}</p>
                    </div>
                    <CopyButton text={hook} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Headlines Tab */}
        <TabsContent value="headlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-5 h-5 text-orange-500" />
                Banco de Headlines ({data.headlines_bank?.length || 0})
              </CardTitle>
              <CardDescription>
                Titulares persuasivos listos para usar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.headlines_bank?.map((headline, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-card flex items-start justify-between gap-2"
                  >
                    <div className="flex gap-2">
                      <span className="text-xs text-muted-foreground flex-shrink-0">{idx + 1}.</span>
                      <p className="text-sm font-medium">{headline}</p>
                    </div>
                    <CopyButton text={headline} size="sm" />
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
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="w-5 h-5 text-green-500" />
                Banco de CTAs ({data.ctas_bank?.length || 0})
              </CardTitle>
              <CardDescription>
                Llamadas a la acción optimizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.ctas_bank?.map((cta, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between gap-2">
                    <Button size="sm" variant="outline" className="font-semibold text-xs">
                      {cta}
                    </Button>
                    <CopyButton text={cta} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-4">
          {data.copy_frameworks?.pas && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PAS (Problem - Agitation - Solution)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 mb-1">Problema</p>
                  <p className="text-sm">{data.copy_frameworks.pas.problem}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-orange-400 mb-1">Agitación</p>
                  <p className="text-sm">{data.copy_frameworks.pas.agitation}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Solución</p>
                  <p className="text-sm">{data.copy_frameworks.pas.solution}</p>
                </div>
                <CopyButton
                  text={`${data.copy_frameworks.pas.problem}\n\n${data.copy_frameworks.pas.agitation}\n\n${data.copy_frameworks.pas.solution}`}
                />
              </CardContent>
            </Card>
          )}

          {data.copy_frameworks?.aida && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AIDA (Attention - Interest - Desire - Action)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-yellow-400 mb-1">Atención</p>
                  <p className="text-sm">{data.copy_frameworks.aida.attention}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-blue-400 mb-1">Interés</p>
                  <p className="text-sm">{data.copy_frameworks.aida.interest}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-pink-400 mb-1">Deseo</p>
                  <p className="text-sm">{data.copy_frameworks.aida.desire}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Acción</p>
                  <p className="text-sm">{data.copy_frameworks.aida.action}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {data.copy_frameworks?.bab && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">BAB (Before - After - Bridge)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 mb-1">Antes</p>
                  <p className="text-sm">{data.copy_frameworks.bab.before}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Después</p>
                  <p className="text-sm">{data.copy_frameworks.bab.after}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">Puente</p>
                  <p className="text-sm">{data.copy_frameworks.bab.bridge}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {data.copy_frameworks?.pastor && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PASTOR</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                {Object.entries(data.copy_frameworks.pastor).map(([key, value]) => (
                  <div key={key} className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1 capitalize">{key}</p>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="w-5 h-5 text-purple-500" />
                Ángulos de Historia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.story_angles?.map((story, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <h4 className="font-medium text-purple-400 mb-3">{story.angle}</h4>
                  <div className="space-y-2 text-sm">
                    {story.setup && (
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Setup: </span>
                        {story.setup}
                      </div>
                    )}
                    {story.conflict && (
                      <div className="p-2 rounded bg-red-500/10">
                        <span className="text-red-400">Conflicto: </span>
                        {story.conflict}
                      </div>
                    )}
                    {story.resolution && (
                      <div className="p-2 rounded bg-green-500/10">
                        <span className="text-green-400">Resolución: </span>
                        {story.resolution}
                      </div>
                    )}
                    {story.where_to_use && (
                      <Badge variant="outline" className="mt-2">{story.where_to_use}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Objections Tab */}
        <TabsContent value="objections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Manejo de Objeciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.objection_handlers?.map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="destructive" className="flex-shrink-0">Objeción</Badge>
                    <p className="font-medium">{item.objection}</p>
                  </div>
                  {item.copy_response && (
                    <div className="p-3 rounded bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-400 mb-1">Respuesta:</p>
                      <p className="text-sm">{item.copy_response}</p>
                      <CopyButton text={item.copy_response} size="sm" className="mt-1" />
                    </div>
                  )}
                  {item.technique_used && (
                    <Badge variant="outline" className="text-xs">{item.technique_used}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-5 h-5 text-blue-500" />
                Subject Lines para Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.email_subject_lines?.curiosity && (
                  <div className="p-3 rounded-lg border">
                    <Badge className="bg-purple-500/20 text-purple-400 mb-2">Curiosidad</Badge>
                    <ul className="space-y-2">
                      {data.email_subject_lines.curiosity.map((subject, idx) => (
                        <li key={idx} className="text-sm flex items-start justify-between gap-2">
                          <span>{subject}</span>
                          <CopyButton text={subject} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.email_subject_lines?.benefit && (
                  <div className="p-3 rounded-lg border">
                    <Badge className="bg-green-500/20 text-green-400 mb-2">Beneficio</Badge>
                    <ul className="space-y-2">
                      {data.email_subject_lines.benefit.map((subject, idx) => (
                        <li key={idx} className="text-sm flex items-start justify-between gap-2">
                          <span>{subject}</span>
                          <CopyButton text={subject} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.email_subject_lines?.urgency && (
                  <div className="p-3 rounded-lg border">
                    <Badge className="bg-red-500/20 text-red-400 mb-2">Urgencia</Badge>
                    <ul className="space-y-2">
                      {data.email_subject_lines.urgency.map((subject, idx) => (
                        <li key={idx} className="text-sm flex items-start justify-between gap-2">
                          <span>{subject}</span>
                          <CopyButton text={subject} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.email_subject_lines?.personal && (
                  <div className="p-3 rounded-lg border">
                    <Badge className="bg-blue-500/20 text-blue-400 mb-2">Personal</Badge>
                    <ul className="space-y-2">
                      {data.email_subject_lines.personal.map((subject, idx) => (
                        <li key={idx} className="text-sm flex items-start justify-between gap-2">
                          <span>{subject}</span>
                          <CopyButton text={subject} size="sm" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
