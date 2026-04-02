/**
 * Tab11Calendar
 * Calendario de contenido de 30 días
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Video,
  Image,
  FileText,
  Instagram,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Copy,
  Check,
  Clock,
  Sparkles,
  Package,
} from "lucide-react";
import { GenericTabContent } from "./GenericTabContent";
import { cn } from "@/lib/utils";

// Estructura real del backend (step-11-content-calendar.ts)
interface BackendCalendarData {
  strategy_overview?: string;
  weekly_cadence?: string;
  platform_distribution?: Record<string, number>;
  days?: Array<{
    day?: number;
    date_relative?: string;
    platform?: string;
    format?: string;
    pillar?: string;
    esfera_phase?: string;
    title?: string;
    hook?: string;
    full_copy?: string;
    hashtags?: string[];
    cta?: string;
    production_notes?: string;
    estimated_reach?: string;
  }>;
  content_batching_guide?: {
    batch_1_week_1?: {
      content_to_create?: string[];
      time_required?: string;
      equipment_needed?: string[];
    };
    batch_2_week_2?: {
      content_to_create?: string[];
      time_required?: string;
      equipment_needed?: string[];
    };
  };
  engagement_strategy?: {
    daily_tasks?: string[];
    weekly_tasks?: string[];
    response_templates?: {
      positive_comment?: string;
      question?: string;
      objection?: string;
    };
  };
}

interface Tab11CalendarProps {
  data: BackendCalendarData | null | undefined;
}

const formatIcons: Record<string, typeof Video> = {
  reel: Video,
  video: Video,
  reels: Video,
  carousel: LayoutGrid,
  carrusel: LayoutGrid,
  image: Image,
  imagen: Image,
  post: FileText,
  story: Instagram,
  stories: Instagram,
};

const phaseColors: Record<string, string> = {
  enganchar: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  solucion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  solución: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fidelizar: "bg-green-500/20 text-green-400 border-green-500/30",
  emocion: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  emoción: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  remarketing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  automatizacion: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  automatización: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const reachColors: Record<string, string> = {
  alto: "bg-green-500/20 text-green-400",
  high: "bg-green-500/20 text-green-400",
  medio: "bg-yellow-500/20 text-yellow-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  bajo: "bg-gray-500/20 text-gray-400",
  low: "bg-gray-500/20 text-gray-400",
};

export function Tab11Calendar({ data }: Tab11CalendarProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentWeek, setCurrentWeek] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (text: string, id?: number) => {
    await navigator.clipboard.writeText(text);
    if (id !== undefined) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const daysByWeek = useMemo(() => {
    if (!data?.days) return {};
    const grouped: Record<number, NonNullable<BackendCalendarData['days']>> = {};
    data.days.forEach((day) => {
      const week = Math.ceil((day.day || 1) / 7);
      if (!grouped[week]) grouped[week] = [];
      grouped[week].push(day);
    });
    return grouped;
  }, [data?.days]);

  const weeks = Object.keys(daysByWeek).map(Number).sort((a, b) => a - b);
  const totalWeeks = weeks.length || 4;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin calendario</h3>
        <p className="text-sm text-muted-foreground">
          El calendario de 30 días se generará al completar el research.
        </p>
      </div>
    );
  }

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.days ||
    rawData.strategy_overview ||
    rawData.platform_distribution;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Calendario 30 Días"
        icon={<Calendar className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      {(data.strategy_overview || data.weekly_cadence) && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-purple-500" />
              Visión General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.strategy_overview && (
              <p className="text-sm">{data.strategy_overview}</p>
            )}
            {data.weekly_cadence && (
              <div className="p-3 rounded-sm bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Cadencia Semanal</p>
                <p className="text-sm font-medium">{data.weekly_cadence}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Platform Distribution */}
      {data.platform_distribution && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.platform_distribution).map(([platform, count]) => (
                <div key={platform} className="p-3 rounded-sm border bg-card min-w-[100px] text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground capitalize">{platform}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Navigation & View Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Semana {currentWeek}</CardTitle>
              <CardDescription>
                {daysByWeek[currentWeek]?.length || 0} publicaciones
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek((prev) => Math.max(1, prev - 1))}
                disabled={currentWeek === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentWeek} / {totalWeeks}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentWeek((prev) => Math.min(totalWeeks, prev + 1))}
                disabled={currentWeek === totalWeeks}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="border-l pl-2 ml-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="ml-1"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {daysByWeek[currentWeek]?.map((day, idx) => {
                const Icon = formatIcons[day.format?.toLowerCase() || ''] || FileText;
                return (
                  <Card key={idx} className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          Día {day.day}
                        </Badge>
                        {day.estimated_reach && (
                          <Badge className={reachColors[day.estimated_reach.toLowerCase()] || "bg-muted"}>
                            {day.estimated_reach}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{day.platform}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          <span className="capitalize">{day.format}</span>
                        </div>
                      </div>
                      {day.date_relative && (
                        <p className="text-xs text-muted-foreground">{day.date_relative}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {day.pillar && (
                          <Badge variant="secondary" className="text-xs">{day.pillar}</Badge>
                        )}
                        {day.esfera_phase && (
                          <Badge className={cn("text-xs", phaseColors[day.esfera_phase.toLowerCase()] || "bg-muted")}>
                            {day.esfera_phase}
                          </Badge>
                        )}
                      </div>

                      {day.title && (
                        <p className="font-medium text-sm">{day.title}</p>
                      )}

                      {day.hook && (
                        <div className="p-2 rounded bg-primary/10 border-l-2 border-primary">
                          <p className="text-sm">{day.hook}</p>
                        </div>
                      )}

                      {day.full_copy && (
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {day.full_copy}
                        </p>
                      )}

                      {day.hashtags && day.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {day.hashtags.slice(0, 3).map((tag, tIdx) => (
                            <span key={tIdx} className="text-xs text-blue-400">
                              #{tag}
                            </span>
                          ))}
                          {day.hashtags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{day.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        {day.cta && (
                          <Badge variant="outline" className="text-xs truncate max-w-[150px]">
                            {day.cta}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(
                            `${day.hook || ''}\n\n${day.full_copy || ''}\n\n${day.hashtags?.map(h => `#${h}`).join(" ") || ''}\n\n${day.cta || ''}`,
                            idx
                          )}
                        >
                          {copiedId === idx ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {daysByWeek[currentWeek]?.map((day, idx) => {
                  const Icon = formatIcons[day.format?.toLowerCase() || ''] || FileText;
                  return (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className="text-2xl font-bold">{day.day}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {day.platform}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Icon className="w-3 h-3" />
                                {day.format}
                              </Badge>
                              {day.pillar && (
                                <Badge variant="secondary">{day.pillar}</Badge>
                              )}
                              {day.esfera_phase && (
                                <Badge className={phaseColors[day.esfera_phase.toLowerCase()] || "bg-muted"}>
                                  {day.esfera_phase}
                                </Badge>
                              )}
                              {day.estimated_reach && (
                                <Badge className={reachColors[day.estimated_reach.toLowerCase()] || "bg-muted"}>
                                  Alcance: {day.estimated_reach}
                                </Badge>
                              )}
                            </div>

                            {day.title && (
                              <h4 className="font-medium">{day.title}</h4>
                            )}

                            <div className="p-3 rounded bg-muted/50 space-y-2">
                              {day.hook && (
                                <p className="font-medium text-sm border-l-2 border-primary pl-2">
                                  {day.hook}
                                </p>
                              )}
                              {day.full_copy && (
                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                  {day.full_copy}
                                </p>
                              )}
                            </div>

                            {day.production_notes && (
                              <p className="text-xs text-muted-foreground">
                                <span className="text-yellow-400">Notas:</span> {day.production_notes}
                              </p>
                            )}

                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {day.hashtags?.map((tag, tIdx) => (
                                  <span key={tIdx} className="text-xs text-blue-400">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(
                                  `${day.hook || ''}\n\n${day.full_copy || ''}\n\n${day.hashtags?.map(h => `#${h}`).join(" ") || ''}`,
                                  idx
                                )}
                              >
                                {copiedId === idx ? (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-1" />
                                    Copiar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Content Batching Guide */}
      {data.content_batching_guide && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-orange-500" />
              Guía de Batching
            </CardTitle>
            <CardDescription>
              Crea todo el contenido en sesiones organizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.content_batching_guide.batch_1_week_1 && (
                <div className="p-4 rounded-sm border">
                  <Badge className="mb-2">Batch 1 - Semana 1</Badge>
                  {data.content_batching_guide.batch_1_week_1.time_required && (
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {data.content_batching_guide.batch_1_week_1.time_required}
                    </p>
                  )}
                  {data.content_batching_guide.batch_1_week_1.content_to_create && (
                    <ul className="space-y-1 mb-3">
                      {data.content_batching_guide.batch_1_week_1.content_to_create.map((c, i) => (
                        <li key={i} className="text-sm">• {c}</li>
                      ))}
                    </ul>
                  )}
                  {data.content_batching_guide.batch_1_week_1.equipment_needed && (
                    <div className="flex flex-wrap gap-1">
                      {data.content_batching_guide.batch_1_week_1.equipment_needed.map((eq, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{eq}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {data.content_batching_guide.batch_2_week_2 && (
                <div className="p-4 rounded-sm border">
                  <Badge className="mb-2">Batch 2 - Semana 2</Badge>
                  {data.content_batching_guide.batch_2_week_2.time_required && (
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {data.content_batching_guide.batch_2_week_2.time_required}
                    </p>
                  )}
                  {data.content_batching_guide.batch_2_week_2.content_to_create && (
                    <ul className="space-y-1 mb-3">
                      {data.content_batching_guide.batch_2_week_2.content_to_create.map((c, i) => (
                        <li key={i} className="text-sm">• {c}</li>
                      ))}
                    </ul>
                  )}
                  {data.content_batching_guide.batch_2_week_2.equipment_needed && (
                    <div className="flex flex-wrap gap-1">
                      {data.content_batching_guide.batch_2_week_2.equipment_needed.map((eq, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{eq}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Strategy */}
      {data.engagement_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Estrategia de Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {data.engagement_strategy.daily_tasks && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-2">Tareas Diarias</p>
                  <ul className="space-y-1">
                    {data.engagement_strategy.daily_tasks.map((task, i) => (
                      <li key={i} className="text-sm">• {task}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.engagement_strategy.weekly_tasks && (
                <div className="p-3 rounded-sm border">
                  <p className="text-xs text-muted-foreground mb-2">Tareas Semanales</p>
                  <ul className="space-y-1">
                    {data.engagement_strategy.weekly_tasks.map((task, i) => (
                      <li key={i} className="text-sm">• {task}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {data.engagement_strategy.response_templates && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Templates de Respuesta</p>
                {data.engagement_strategy.response_templates.positive_comment && (
                  <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-green-400 mb-1">Comentario Positivo</p>
                    <p className="text-sm">{data.engagement_strategy.response_templates.positive_comment}</p>
                  </div>
                )}
                {data.engagement_strategy.response_templates.question && (
                  <div className="p-3 rounded-sm bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-400 mb-1">Pregunta</p>
                    <p className="text-sm">{data.engagement_strategy.response_templates.question}</p>
                  </div>
                )}
                {data.engagement_strategy.response_templates.objection && (
                  <div className="p-3 rounded-sm bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xs text-orange-400 mb-1">Objeción</p>
                    <p className="text-sm">{data.engagement_strategy.response_templates.objection}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
