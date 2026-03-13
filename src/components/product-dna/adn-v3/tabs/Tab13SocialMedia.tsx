/**
 * Tab13SocialMedia
 * Estrategia de redes sociales
 * Adaptado a la estructura real del backend adn-research-v3
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
  BarChart3,
  Camera,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-13-social-media.ts)
interface BackendSocialMediaData {
  overall_strategy?: {
    primary_platforms?: string[];
    secondary_platforms?: string[];
    brand_voice?: string;
    content_ratio?: Record<string, number>;
  };
  platform_strategies?: Array<{
    platform?: string;
    priority?: string;
    audience_fit?: number;
    content_types?: string[];
    posting_frequency?: string;
    best_times?: string[];
    tone?: string;
    hashtag_strategy?: string[];
    growth_tactics?: string[];
    content_pillars?: Array<{
      pillar?: string;
      percentage?: number;
      examples?: string[];
    }>;
  }>;
  content_ideas?: Array<{
    idea?: string;
    platform?: string;
    format?: string;
    pillar?: string;
  }>;
  engagement_tactics?: string[];
  community_building?: string[];
  influencer_strategy?: {
    type?: string;
    criteria?: string[];
    collaboration_ideas?: string[];
    budget_range?: string;
  };
  ugc_strategy?: {
    how_to_encourage?: string;
    branded_hashtag?: string;
    repurposing_plan?: string;
  };
  analytics_focus?: {
    primary_metrics?: string[];
    benchmarks?: {
      engagement_rate?: string;
      reach_growth?: string;
    };
    reporting_frequency?: string;
  };
  summary?: string;
}

interface Tab13SocialMediaProps {
  data: BackendSocialMediaData | null | undefined;
}

const platformIcons: Record<string, typeof Share2> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Share2,
  x: Twitter,
};

const priorityColors: Record<string, string> = {
  high: "bg-green-500/20 text-green-400",
  alta: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  media: "bg-yellow-500/20 text-yellow-400",
  low: "bg-gray-500/20 text-gray-400",
  baja: "bg-gray-500/20 text-gray-400",
};

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

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.overall_strategy ||
    rawData.platform_strategies ||
    rawData.influencer_strategy;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Redes Sociales"
        icon={<Share2 className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-2" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Overall Strategy */}
      {data.overall_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="w-5 h-5 text-pink-500" />
              Estrategia General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {data.overall_strategy.primary_platforms && data.overall_strategy.primary_platforms.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Plataformas Primarias</p>
                  <div className="flex flex-wrap gap-2">
                    {data.overall_strategy.primary_platforms.map((p, idx) => (
                      <Badge key={idx} className="bg-green-500/20 text-green-400">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.overall_strategy.secondary_platforms && data.overall_strategy.secondary_platforms.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Plataformas Secundarias</p>
                  <div className="flex flex-wrap gap-2">
                    {data.overall_strategy.secondary_platforms.map((p, idx) => (
                      <Badge key={idx} variant="outline">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {data.overall_strategy.brand_voice && (
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Brand Voice</p>
                <p className="text-sm">{data.overall_strategy.brand_voice}</p>
              </div>
            )}

            {data.overall_strategy.content_ratio && (
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
      )}

      {/* Platform Strategies */}
      {data.platform_strategies && data.platform_strategies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Estrategia por Plataforma</h3>
          {data.platform_strategies.map((platform, idx) => {
            const Icon = platformIcons[platform.platform?.toLowerCase() || ''] || Share2;
            return (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg capitalize">{platform.platform}</CardTitle>
                        {platform.priority && (
                          <Badge className={priorityColors[platform.priority.toLowerCase()] || "bg-muted"}>
                            Prioridad {platform.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {platform.audience_fit !== undefined && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Audience Fit</p>
                        <p className="text-lg font-bold">{platform.audience_fit}%</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {platform.posting_frequency && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
                        <p className="text-sm font-medium">{platform.posting_frequency}</p>
                      </div>
                    )}
                    {platform.best_times && platform.best_times.length > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Mejores Horarios</p>
                        <p className="text-sm">{platform.best_times.join(", ")}</p>
                      </div>
                    )}
                    {platform.tone && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Tono</p>
                        <p className="text-sm">{platform.tone}</p>
                      </div>
                    )}
                  </div>

                  {platform.content_types && platform.content_types.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tipos de Contenido</p>
                      <div className="flex flex-wrap gap-2">
                        {platform.content_types.map((type, tIdx) => (
                          <Badge key={tIdx} variant="secondary">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {platform.hashtag_strategy && platform.hashtag_strategy.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Hashtags Recomendados</p>
                      <div className="flex flex-wrap gap-1">
                        {platform.hashtag_strategy.map((tag, tIdx) => (
                          <span key={tIdx} className="text-sm text-blue-400">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Pillars */}
                  {platform.content_pillars && platform.content_pillars.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Pilares de Contenido</p>
                      <div className="space-y-2">
                        {platform.content_pillars.map((pillar, pIdx) => (
                          <div key={pIdx} className="p-3 rounded-lg border bg-card">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium text-sm">{pillar.pillar}</span>
                              <span className="text-sm text-muted-foreground">{pillar.percentage}%</span>
                            </div>
                            <Progress value={pillar.percentage} className="h-1.5 mb-2" />
                            {pillar.examples && pillar.examples.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {pillar.examples.map((ex, eIdx) => (
                                  <Badge key={eIdx} variant="outline" className="text-xs">{ex}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Growth Tactics */}
                  {platform.growth_tactics && platform.growth_tactics.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Tácticas de Crecimiento</p>
                      <ul className="space-y-1">
                        {platform.growth_tactics.map((tactic, tIdx) => (
                          <li key={tIdx} className="text-sm flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            {tactic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Influencer Strategy */}
      {data.influencer_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Estrategia de Influencers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {data.influencer_strategy.type && (
                <Badge className="bg-purple-500/20 text-purple-400">{data.influencer_strategy.type}</Badge>
              )}
              {data.influencer_strategy.budget_range && (
                <Badge variant="outline">{data.influencer_strategy.budget_range}</Badge>
              )}
            </div>
            {data.influencer_strategy.criteria && data.influencer_strategy.criteria.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Criterios de Selección</p>
                <ul className="space-y-1">
                  {data.influencer_strategy.criteria.map((c, i) => (
                    <li key={i} className="text-sm">• {c}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.influencer_strategy.collaboration_ideas && data.influencer_strategy.collaboration_ideas.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Ideas de Colaboración</p>
                <div className="flex flex-wrap gap-2">
                  {data.influencer_strategy.collaboration_ideas.map((idea, i) => (
                    <Badge key={i} variant="secondary">{idea}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* UGC Strategy */}
      {data.ugc_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="w-5 h-5 text-orange-500" />
              Estrategia UGC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.ugc_strategy.branded_hashtag && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs text-orange-400 mb-1">Hashtag de Marca</p>
                <p className="font-bold text-lg">{data.ugc_strategy.branded_hashtag}</p>
              </div>
            )}
            {data.ugc_strategy.how_to_encourage && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Cómo Incentivar</p>
                <p className="text-sm">{data.ugc_strategy.how_to_encourage}</p>
              </div>
            )}
            {data.ugc_strategy.repurposing_plan && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Plan de Reutilización</p>
                <p className="text-sm">{data.ugc_strategy.repurposing_plan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Engagement & Community */}
      <div className="grid sm:grid-cols-2 gap-6">
        {data.engagement_tactics && data.engagement_tactics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-orange-500" />
                Tácticas de Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.engagement_tactics.map((tactic, idx) => (
                  <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {tactic}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.community_building && data.community_building.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-blue-500" />
                Community Building
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.community_building.map((item, idx) => (
                  <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Analytics Focus */}
      {data.analytics_focus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-cyan-500" />
              Enfoque de Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {data.analytics_focus.primary_metrics && data.analytics_focus.primary_metrics.length > 0 && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Métricas Primarias</p>
                  <div className="flex flex-wrap gap-1">
                    {data.analytics_focus.primary_metrics.map((m, i) => (
                      <Badge key={i} variant="secondary">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {data.analytics_focus.benchmarks && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Benchmarks</p>
                  {data.analytics_focus.benchmarks.engagement_rate && (
                    <p className="text-sm">Engagement: {data.analytics_focus.benchmarks.engagement_rate}</p>
                  )}
                  {data.analytics_focus.benchmarks.reach_growth && (
                    <p className="text-sm">Alcance: {data.analytics_focus.benchmarks.reach_growth}</p>
                  )}
                </div>
              )}
              {data.analytics_focus.reporting_frequency && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Frecuencia de Reportes</p>
                  <p className="text-sm font-medium">{data.analytics_focus.reporting_frequency}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Ideas */}
      {data.content_ideas && data.content_ideas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
                    {idea.platform && (
                      <Badge variant="outline" className="text-xs">{idea.platform}</Badge>
                    )}
                    {idea.format && (
                      <Badge variant="secondary" className="text-xs">{idea.format}</Badge>
                    )}
                    {idea.pillar && (
                      <Badge className="text-xs bg-purple-500/20 text-purple-400">{idea.pillar}</Badge>
                    )}
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
