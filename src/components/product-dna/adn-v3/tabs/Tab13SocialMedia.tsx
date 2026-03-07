/**
 * Tab13SocialMedia
 * Estrategia de redes sociales
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Share2,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Target,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface PlatformStrategy {
  platform: string;
  priority: "high" | "medium" | "low";
  audience_fit: number;
  content_types: string[];
  posting_frequency: string;
  best_times: string[];
  tone: string;
  hashtag_strategy: string[];
  growth_tactics: string[];
  content_pillars: Array<{
    pillar: string;
    percentage: number;
    examples: string[];
  }>;
}

interface SocialMediaData {
  overall_strategy: {
    primary_platforms: string[];
    secondary_platforms: string[];
    brand_voice: string;
    content_ratio: Record<string, number>;
  };
  platform_strategies: PlatformStrategy[];
  content_ideas: Array<{
    idea: string;
    platform: string;
    format: string;
    pillar: string;
  }>;
  engagement_tactics: string[];
  community_building: string[];
}

interface Tab13SocialMediaProps {
  data: SocialMediaData | null | undefined;
}

export function Tab13SocialMedia({ data }: Tab13SocialMediaProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Share2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia social</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de redes sociales se generará al completar el research.
        </p>
      </div>
    );
  }

  const platformIcons: Record<string, any> = {
    instagram: Instagram,
    facebook: Facebook,
    linkedin: Linkedin,
    twitter: Twitter,
    youtube: Youtube,
    tiktok: Share2,
  };

  const priorityColors = {
    high: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-6">
      {/* Overall Strategy */}
      <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-pink-500" />
            Estrategia General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Plataformas Primarias</p>
              <div className="flex flex-wrap gap-2">
                {data.overall_strategy?.primary_platforms?.map((p, idx) => (
                  <Badge key={idx} className="bg-green-500/20 text-green-400">{p}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Plataformas Secundarias</p>
              <div className="flex flex-wrap gap-2">
                {data.overall_strategy?.secondary_platforms?.map((p, idx) => (
                  <Badge key={idx} variant="outline">{p}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Brand Voice</p>
            <p className="text-sm">{data.overall_strategy?.brand_voice}</p>
          </div>

          {data.overall_strategy?.content_ratio && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Ratio de Contenido</p>
              <div className="space-y-2">
                {Object.entries(data.overall_strategy.content_ratio).map(([type, pct]) => (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct as number} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Strategies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Estrategia por Plataforma</h3>
        {data.platform_strategies?.map((platform, idx) => {
          const Icon = platformIcons[platform.platform.toLowerCase()] || Share2;
          return (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{platform.platform}</CardTitle>
                      <Badge className={priorityColors[platform.priority]}>
                        Prioridad {platform.priority === "high" ? "Alta" :
                          platform.priority === "medium" ? "Media" : "Baja"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Audience Fit</p>
                    <p className="text-lg font-bold">{platform.audience_fit}%</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
                    <p className="text-sm font-medium">{platform.posting_frequency}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Mejores Horarios</p>
                    <p className="text-sm">{platform.best_times?.join(", ")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Tono</p>
                    <p className="text-sm">{platform.tone}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tipos de Contenido</p>
                  <div className="flex flex-wrap gap-2">
                    {platform.content_types?.map((type, tIdx) => (
                      <Badge key={tIdx} variant="secondary">{type}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Hashtags Recomendados</p>
                  <div className="flex flex-wrap gap-1">
                    {platform.hashtag_strategy?.map((tag, tIdx) => (
                      <span key={tIdx} className="text-sm text-blue-400">#{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Content Pillars */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Pilares de Contenido</p>
                  <div className="space-y-2">
                    {platform.content_pillars?.map((pillar, pIdx) => (
                      <div key={pIdx} className="p-3 rounded-lg border bg-card">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-sm">{pillar.pillar}</span>
                          <span className="text-sm text-muted-foreground">{pillar.percentage}%</span>
                        </div>
                        <Progress value={pillar.percentage} className="h-1.5 mb-2" />
                        <div className="flex flex-wrap gap-1">
                          {pillar.examples?.map((ex, eIdx) => (
                            <Badge key={eIdx} variant="outline" className="text-xs">{ex}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Tactics */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tácticas de Crecimiento</p>
                  <ul className="space-y-1">
                    {platform.growth_tactics?.map((tactic, tIdx) => (
                      <li key={tIdx} className="text-sm flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        {tactic}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Engagement & Community */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Tácticas de Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.engagement_tactics?.map((tactic, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {tactic}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Community Building
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.community_building?.map((item, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Content Ideas */}
      {data.content_ideas && data.content_ideas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Ideas de Contenido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.content_ideas.map((idea, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card">
                  <p className="font-medium text-sm mb-2">{idea.idea}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{idea.platform}</Badge>
                    <Badge variant="secondary" className="text-xs">{idea.format}</Badge>
                    <Badge className="text-xs bg-purple-500/20 text-purple-400">{idea.pillar}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
