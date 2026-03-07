/**
 * Tab14MetaAds
 * Estrategia y creativos para Meta Ads (Facebook e Instagram)
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Facebook,
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Image,
  Video,
  LayoutGrid,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { cn } from "@/lib/utils";

interface AdCreative {
  format: "image" | "video" | "carousel";
  objective: string;
  headline: string;
  primary_text: string;
  description: string;
  cta_button: string;
  visual_concept: string;
  hook_first_3_seconds?: string;
  target_placement: string[];
}

interface AudienceSegment {
  name: string;
  description: string;
  interests: string[];
  behaviors: string[];
  demographics: {
    age_range: string;
    gender: string;
    locations: string[];
  };
  estimated_size: string;
  priority: "high" | "medium" | "low";
}

interface CampaignStructure {
  campaign_objective: string;
  daily_budget_recommendation: string;
  testing_budget_split: Record<string, number>;
  campaign_phases: Array<{
    phase: string;
    duration: string;
    focus: string;
    kpis: string[];
  }>;
}

interface MetaAdsData {
  strategy_overview: {
    primary_objective: string;
    secondary_objectives: string[];
    recommended_campaign_types: string[];
    budget_allocation: Record<string, number>;
  };
  audiences: AudienceSegment[];
  creatives: AdCreative[];
  campaign_structure: CampaignStructure;
  copy_variations: Array<{
    angle: string;
    headline: string;
    primary_text: string;
    cta: string;
  }>;
  best_practices: string[];
  tracking_setup: {
    pixel_events: string[];
    custom_conversions: string[];
    attribution_window: string;
  };
}

interface Tab14MetaAdsProps {
  data: MetaAdsData | null | undefined;
}

function CreativeCard({ creative, index }: { creative: AdCreative; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const formatIcons = {
    image: Image,
    video: Video,
    carousel: LayoutGrid,
  };

  const Icon = formatIcons[creative.format] || Image;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              #{index + 1}
            </Badge>
            <Badge
              className={cn(
                creative.format === "video"
                  ? "bg-red-500/20 text-red-400"
                  : creative.format === "carousel"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-blue-500/20 text-blue-400"
              )}
            >
              <Icon className="w-3 h-3 mr-1" />
              {creative.format}
            </Badge>
          </div>
          <Badge variant="secondary" className="text-xs">
            {creative.objective}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview mockup */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center p-4">
              <Icon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {creative.visual_concept}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm">{creative.primary_text}</p>
            <p className="font-semibold">{creative.headline}</p>
            <p className="text-xs text-muted-foreground">{creative.description}</p>
            <Button size="sm" className="w-full">
              {creative.cta_button}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {creative.target_placement?.map((placement, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {placement}
            </Badge>
          ))}
        </div>

        {creative.hook_first_3_seconds && (
          <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 mb-1">Hook (3 segundos):</p>
            <p className="text-sm">{creative.hook_first_3_seconds}</p>
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
              Ocultar copy
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver copy completo
            </>
          )}
        </Button>

        {expanded && (
          <div className="space-y-3 p-4 rounded-lg border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Primary Text:</p>
                <p className="text-sm">{creative.primary_text}</p>
              </div>
              <CopyButton text={creative.primary_text} />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Headline:</p>
                <p className="text-sm font-semibold">{creative.headline}</p>
              </div>
              <CopyButton text={creative.headline} />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Description:</p>
                <p className="text-sm">{creative.description}</p>
              </div>
              <CopyButton text={creative.description} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Tab14MetaAds({ data }: Tab14MetaAdsProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Facebook className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de Meta Ads</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de Meta Ads se generará al completar el research.
        </p>
      </div>
    );
  }

  const priorityColors = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="strategy">Estrategia</TabsTrigger>
          <TabsTrigger value="audiences">Audiencias</TabsTrigger>
          <TabsTrigger value="creatives">Creativos</TabsTrigger>
          <TabsTrigger value="copy">Copy</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Visión General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Objetivo Principal
                </p>
                <p className="font-semibold">
                  {data.strategy_overview?.primary_objective}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Objetivos Secundarios
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.strategy_overview?.secondary_objectives?.map((obj, idx) => (
                    <Badge key={idx} variant="outline">
                      {obj}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Tipos de Campaña Recomendados
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.strategy_overview?.recommended_campaign_types?.map(
                    (type, idx) => (
                      <Badge key={idx} className="bg-blue-500/20 text-blue-400">
                        {type}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Distribución de Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(data.strategy_overview?.budget_allocation || {}).map(
                ([category, percentage]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-medium">{percentage}%</span>
                    </div>
                    <Progress value={percentage as number} className="h-2" />
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Campaign Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Estructura de Campaña
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
                  <p className="font-medium">
                    {data.campaign_structure?.campaign_objective}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Presupuesto Diario
                  </p>
                  <p className="font-medium">
                    {data.campaign_structure?.daily_budget_recommendation}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Fases de Campaña</p>
                {data.campaign_structure?.campaign_phases?.map((phase, idx) => (
                  <div key={idx} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium">{phase.phase}</p>
                        <p className="text-xs text-muted-foreground">
                          {phase.duration}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {phase.focus}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {phase.kpis?.map((kpi, kpiIdx) => (
                        <Badge key={kpiIdx} variant="secondary" className="text-xs">
                          {kpi}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Mejores Prácticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.best_practices?.map((practice, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{practice}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audiences Tab */}
        <TabsContent value="audiences" className="space-y-4">
          {data.audiences?.map((audience, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {audience.name}
                  </CardTitle>
                  <Badge className={priorityColors[audience.priority]}>
                    {audience.priority === "high"
                      ? "Alta Prioridad"
                      : audience.priority === "medium"
                      ? "Media"
                      : "Baja"}
                  </Badge>
                </div>
                <CardDescription>{audience.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Edad</p>
                    <p className="font-medium">
                      {audience.demographics?.age_range}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Género</p>
                    <p className="font-medium">{audience.demographics?.gender}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">
                      Tamaño Est.
                    </p>
                    <p className="font-medium">{audience.estimated_size}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ubicaciones</p>
                  <div className="flex flex-wrap gap-1">
                    {audience.demographics?.locations?.map((loc, locIdx) => (
                      <Badge key={locIdx} variant="outline" className="text-xs">
                        {loc}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Intereses</p>
                  <div className="flex flex-wrap gap-1">
                    {audience.interests?.map((interest, intIdx) => (
                      <Badge key={intIdx} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Comportamientos
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {audience.behaviors?.map((behavior, behIdx) => (
                      <Badge key={behIdx} variant="outline" className="text-xs">
                        {behavior}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Creatives Tab */}
        <TabsContent value="creatives" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.creatives?.map((creative, idx) => (
              <CreativeCard key={idx} creative={creative} index={idx} />
            ))}
          </div>
        </TabsContent>

        {/* Copy Tab */}
        <TabsContent value="copy" className="space-y-4">
          {data.copy_variations?.map((variation, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{variation.angle}</CardTitle>
                  <CopyButton
                    text={`${variation.headline}\n\n${variation.primary_text}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50 border-l-4 border-primary">
                  <p className="font-semibold mb-2">{variation.headline}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {variation.primary_text}
                  </p>
                </div>
                <Badge>{variation.cta}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Eventos de Pixel</CardTitle>
                <CardDescription>
                  Eventos a configurar en Meta Pixel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.tracking_setup?.pixel_events?.map((event, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">
                        {event}
                      </code>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversiones Personalizadas</CardTitle>
                <CardDescription>Conversiones a crear en Ads Manager</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.tracking_setup?.custom_conversions?.map((conv, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{conv}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ventana de Atribución</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {data.tracking_setup?.attribution_window}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
