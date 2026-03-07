/**
 * Tab10VideoCreatives
 * Guiones y conceptos de video creativos
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Video,
  Play,
  Clock,
  Target,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { cn } from "@/lib/utils";

interface VideoScript {
  title: string;
  format: string;
  duration: string;
  objective: string;
  target_avatar: string;
  hook_options: string[];
  script: {
    hook: string;
    problem: string;
    agitation: string;
    solution: string;
    proof: string;
    cta: string;
  };
  visual_notes: string[];
  audio_notes: string;
  thumbnail_concept: string;
}

interface VideoCreativesData {
  video_strategy: {
    primary_platform: string;
    content_pillars: string[];
    posting_frequency: string;
    optimal_lengths: Record<string, string>;
  };
  ugc_scripts: VideoScript[];
  testimonial_scripts: VideoScript[];
  educational_scripts: VideoScript[];
  ad_scripts: VideoScript[];
  hooks_library: Array<{
    hook: string;
    type: string;
    best_for: string;
  }>;
  cta_library: string[];
}

interface Tab10VideoCreativesProps {
  data: VideoCreativesData | null | undefined;
}

function ScriptCard({ script }: { script: VideoScript }) {
  const [expanded, setExpanded] = useState(false);

  const fullScript = `HOOK: ${script.script.hook}

PROBLEMA: ${script.script.problem}

AGITACIÓN: ${script.script.agitation}

SOLUCIÓN: ${script.script.solution}

PRUEBA: ${script.script.proof}

CTA: ${script.script.cta}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{script.title}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{script.format}</Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {script.duration}
              </Badge>
            </div>
          </div>
          <Badge className="bg-blue-500/20 text-blue-400">
            {script.objective}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <Target className="w-4 h-4 inline mr-1" />
          Avatar: {script.target_avatar}
        </div>

        {/* Hook Options */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Opciones de Hook</p>
          <div className="space-y-2">
            {script.hook_options?.map((hook, idx) => (
              <div key={idx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                <p className="text-sm font-medium">{idx + 1}. {hook}</p>
                <CopyButton text={hook} size="sm" />
              </div>
            ))}
          </div>
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
              Ocultar guión
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver guión completo
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Full Script */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-red-500/10 border-l-4 border-red-500">
                <p className="text-xs text-red-400 mb-1">HOOK (3 seg)</p>
                <p className="text-sm font-medium">{script.script.hook}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 border-l-4 border-orange-500">
                <p className="text-xs text-orange-400 mb-1">PROBLEMA</p>
                <p className="text-sm">{script.script.problem}</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border-l-4 border-yellow-500">
                <p className="text-xs text-yellow-400 mb-1">AGITACIÓN</p>
                <p className="text-sm">{script.script.agitation}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border-l-4 border-green-500">
                <p className="text-xs text-green-400 mb-1">SOLUCIÓN</p>
                <p className="text-sm">{script.script.solution}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border-l-4 border-blue-500">
                <p className="text-xs text-blue-400 mb-1">PRUEBA</p>
                <p className="text-sm">{script.script.proof}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border-l-4 border-purple-500">
                <p className="text-xs text-purple-400 mb-1">CTA</p>
                <p className="text-sm font-medium">{script.script.cta}</p>
              </div>
            </div>

            {/* Visual & Audio Notes */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">Notas Visuales</p>
                <ul className="space-y-1">
                  {script.visual_notes?.map((note, idx) => (
                    <li key={idx} className="text-xs">• {note}</li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-2">Audio</p>
                <p className="text-xs">{script.audio_notes}</p>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Concepto de Thumbnail</p>
              <p className="text-sm">{script.thumbnail_concept}</p>
            </div>

            <CopyButton text={fullScript} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Tab10VideoCreatives({ data }: Tab10VideoCreativesProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Video className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin creativos de video</h3>
        <p className="text-sm text-muted-foreground">
          Los guiones de video se generarán al completar el research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Strategy */}
      <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            Estrategia de Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Plataforma Principal</p>
              <p className="font-medium">{data.video_strategy?.primary_platform}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
              <p className="font-medium">{data.video_strategy?.posting_frequency}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Pilares de Contenido</p>
              <div className="flex flex-wrap gap-1">
                {data.video_strategy?.content_pillars?.map((pillar, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {pillar}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {data.video_strategy?.optimal_lengths && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Duraciones Óptimas</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.video_strategy.optimal_lengths).map(([platform, length]) => (
                  <Badge key={platform} variant="outline">
                    {platform}: {length}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scripts by Type */}
      <Tabs defaultValue="ugc" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="ugc">UGC</TabsTrigger>
          <TabsTrigger value="testimonial">Testimoniales</TabsTrigger>
          <TabsTrigger value="educational">Educativos</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="hooks">Biblioteca</TabsTrigger>
        </TabsList>

        <TabsContent value="ugc" className="space-y-4">
          {data.ugc_scripts?.map((script, idx) => (
            <ScriptCard key={idx} script={script} />
          ))}
        </TabsContent>

        <TabsContent value="testimonial" className="space-y-4">
          {data.testimonial_scripts?.map((script, idx) => (
            <ScriptCard key={idx} script={script} />
          ))}
        </TabsContent>

        <TabsContent value="educational" className="space-y-4">
          {data.educational_scripts?.map((script, idx) => (
            <ScriptCard key={idx} script={script} />
          ))}
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          {data.ad_scripts?.map((script, idx) => (
            <ScriptCard key={idx} script={script} />
          ))}
        </TabsContent>

        <TabsContent value="hooks" className="space-y-4">
          {/* Hooks Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Biblioteca de Hooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.hooks_library?.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.hook}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.type}</Badge>
                        <Badge variant="secondary" className="text-xs">{item.best_for}</Badge>
                      </div>
                    </div>
                    <CopyButton text={item.hook} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                Biblioteca de CTAs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {data.cta_library?.map((cta, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                    <p className="font-medium text-sm">{cta}</p>
                    <CopyButton text={cta} size="sm" />
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
