/**
 * Tab21OrganicContent
 * Estrategia de contenido orgánico y SEO
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Search,
  TrendingUp,
  Target,
  Link2,
  BookOpen,
  Layers,
  CheckCircle2,
  Zap,
  Globe,
  Youtube,
  Mic,
  Video,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

interface ContentPillar {
  pillar: string;
  description: string;
  percentage: number;
  topics: string[];
  content_formats: string[];
  target_keywords: string[];
}

interface BlogPost {
  title: string;
  target_keyword: string;
  search_intent: string;
  outline: string[];
  word_count: string;
  internal_links: string[];
  cta: string;
}

interface SEOStrategy {
  primary_keywords: Array<{
    keyword: string;
    volume: string;
    difficulty: string;
    intent: string;
  }>;
  long_tail_keywords: string[];
  content_gaps: string[];
  competitor_keywords: string[];
}

interface OrganicContentData {
  content_strategy_overview: {
    primary_goal: string;
    content_frequency: string;
    primary_channels: string[];
    content_mix: Record<string, number>;
  };
  content_pillars: ContentPillar[];
  seo_strategy: SEOStrategy;
  blog_content_plan: BlogPost[];
  // Backend additional fields
  youtube_strategy?: {
    channel_positioning: string;
    video_types: string[];
    publishing_frequency: string;
    seo_approach: string;
    video_ideas: Array<{
      title: string;
      type: string;
      target_keyword: string;
    }>;
  };
  podcast_opportunity?: {
    viable: boolean;
    format: string;
    episode_topics: string[];
    distribution_strategy: string;
  };
  content_repurposing: Array<{
    original_format: string;
    repurposed_formats: string[];
  }>;
  content_distribution: Array<{
    channel: string;
    content_type: string;
    frequency: string;
    best_time: string;
  }>;
  link_building_strategy: {
    tactics: string[];
    target_sites: string[];
    outreach_angles: string[];
  };
  content_calendar_framework: {
    weekly_themes: string[];
    monthly_series: string[];
    seasonal_content: string[];
  };
  measurement: {
    primary_metrics: string[];
    tools_recommended: string[];
    reporting_frequency: string;
  };
  summary?: string;
}

interface Tab21OrganicContentProps {
  data: OrganicContentData | null | undefined;
}

export function Tab21OrganicContent({ data }: Tab21OrganicContentProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de contenido orgánico</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de contenido orgánico se generará al completar el research.
        </p>
      </div>
    );
  }

  // Fallback: Si la estructura no coincide o los tipos son incorrectos, usar GenericTabContent
  const rawData = data as Record<string, unknown>;
  const contentStrategyOverview = rawData.content_strategy_overview as Record<string, unknown> | undefined;
  const hasValidStructure =
    contentStrategyOverview &&
    typeof contentStrategyOverview === 'object' &&
    typeof contentStrategyOverview.primary_goal === 'string' &&
    Array.isArray(contentStrategyOverview.primary_channels);

  if (!hasValidStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Contenido Orgánico"
        icon={<FileText className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Strategy Overview */}
      <Card className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            Estrategia de Contenido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Objetivo Principal</p>
              <p className="font-medium">{data.content_strategy_overview?.primary_goal}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
              <p className="font-medium">{data.content_strategy_overview?.content_frequency}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Canales Primarios</p>
              <div className="flex flex-wrap gap-1">
                {data.content_strategy_overview?.primary_channels?.map((ch, idx) => (
                  <Badge key={idx} variant="secondary">{ch}</Badge>
                ))}
              </div>
            </div>
          </div>

          {data.content_strategy_overview?.content_mix && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Mix de Contenido</p>
              <div className="space-y-2">
                {Object.entries(data.content_strategy_overview.content_mix).map(([type, pct]) => (
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

      {/* Content Pillars */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pilares de Contenido</h3>
        {data.content_pillars?.map((pillar, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{pillar.pillar}</CardTitle>
                  <CardDescription>{pillar.description}</CardDescription>
                </div>
                <Badge className="bg-green-500/20 text-green-400">{pillar.percentage}%</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={pillar.percentage} className="h-2" />

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Temas</p>
                  <ul className="space-y-1">
                    {pillar.topics?.map((topic, tIdx) => (
                      <li key={tIdx} className="text-sm">• {topic}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Formatos</p>
                  <div className="flex flex-wrap gap-1">
                    {pillar.content_formats?.map((format, fIdx) => (
                      <Badge key={fIdx} variant="outline" className="text-xs">{format}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Keywords Target</p>
                  <div className="flex flex-wrap gap-1">
                    {pillar.target_keywords?.map((kw, kIdx) => (
                      <Badge key={kIdx} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEO Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Estrategia SEO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Keywords Primarias</p>
            <div className="space-y-2">
              {data.seo_strategy?.primary_keywords?.map((kw, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{kw.keyword}</span>
                    <Badge variant="outline">{kw.intent}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Vol: {kw.volume}</span>
                    <Badge className={
                      kw.difficulty === "low" ? "bg-green-500/20 text-green-400" :
                      kw.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }>
                      {kw.difficulty}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Long-Tail Keywords</p>
            <div className="flex flex-wrap gap-2">
              {data.seo_strategy?.long_tail_keywords?.map((kw, idx) => (
                <Badge key={idx} variant="secondary">{kw}</Badge>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-sm bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs text-orange-400 mb-2">Content Gaps</p>
              <ul className="space-y-1">
                {data.seo_strategy?.content_gaps?.map((gap, idx) => (
                  <li key={idx} className="text-sm">• {gap}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-400 mb-2">Keywords de Competidores</p>
              <div className="flex flex-wrap gap-1">
                {data.seo_strategy?.competitor_keywords?.map((kw, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">{kw}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blog Content Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            Plan de Contenido Blog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.blog_content_plan?.map((post, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{post.title}</h4>
                    <CopyButton text={post.title} size="sm" className="mt-1" />
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{post.word_count}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{post.search_intent}</p>
                  </div>
                </div>

                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 mb-3">
                  <p className="text-xs text-blue-400">Target Keyword: <span className="font-medium">{post.target_keyword}</span></p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Outline</p>
                  <ol className="space-y-0.5 list-decimal list-inside text-sm">
                    {post.outline?.map((section, sIdx) => (
                      <li key={sIdx}>{section}</li>
                    ))}
                  </ol>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Link2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Links: {post.internal_links?.join(", ")}
                    </span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">{post.cta}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* YouTube Strategy - Backend field */}
      {data.youtube_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              Estrategia YouTube
            </CardTitle>
            <CardDescription>{data.youtube_strategy.channel_positioning}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-sm bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
                <p className="font-medium">{data.youtube_strategy.publishing_frequency}</p>
              </div>
              <div className="p-3 rounded-sm bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Tipos de Video</p>
                <div className="flex flex-wrap gap-1">
                  {data.youtube_strategy.video_types?.map((type, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{type}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-sm bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 mb-1">Enfoque SEO</p>
                <p className="text-sm">{data.youtube_strategy.seo_approach}</p>
              </div>
            </div>

            {data.youtube_strategy.video_ideas && data.youtube_strategy.video_ideas.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Ideas de Videos</p>
                <div className="space-y-2">
                  {data.youtube_strategy.video_ideas.map((video, idx) => (
                    <div key={idx} className="p-3 rounded-sm border bg-card flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Video className="w-4 h-4 text-red-400" />
                        <div>
                          <p className="font-medium text-sm">{video.title}</p>
                          <p className="text-xs text-muted-foreground">KW: {video.target_keyword}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{video.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Podcast Opportunity - Backend field */}
      {data.podcast_opportunity && data.podcast_opportunity.viable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-purple-500" />
              Oportunidad de Podcast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-1">Formato</p>
                <p className="font-medium capitalize">{data.podcast_opportunity.format}</p>
              </div>
              <div className="p-3 rounded-sm bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Distribución</p>
                <p className="text-sm">{data.podcast_opportunity.distribution_strategy}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Ideas de Episodios</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {data.podcast_opportunity.episode_topics?.map((topic, idx) => (
                  <div key={idx} className="p-2 rounded bg-muted/50 flex items-center gap-2 text-sm">
                    <Mic className="w-3 h-3 text-purple-400" />
                    {topic}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Repurposing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-500" />
            Repurposing de Contenido
          </CardTitle>
          <CardDescription>
            Maximiza el alcance reutilizando contenido en diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.content_repurposing?.map((item, idx) => (
              <div key={idx} className="p-3 rounded-sm border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-500/20 text-orange-400">{item.original_format}</Badge>
                  <span className="text-muted-foreground">→</span>
                </div>
                <div className="flex flex-wrap gap-2 pl-4">
                  {item.repurposed_formats?.map((format, fIdx) => (
                    <Badge key={fIdx} variant="secondary">{format}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Distribución de Contenido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.content_distribution?.map((dist, idx) => (
              <div key={idx} className="p-3 rounded-sm border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{dist.channel}</Badge>
                  <span className="text-xs text-muted-foreground">{dist.frequency}</span>
                </div>
                <p className="text-sm mb-1">{dist.content_type}</p>
                <p className="text-xs text-muted-foreground">Mejor hora: {dist.best_time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Link Building Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-green-500" />
            Estrategia de Link Building
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Tácticas</p>
            <ul className="space-y-1">
              {data.link_building_strategy?.tactics?.map((tactic, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-muted/50 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {tactic}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Sitios Target</p>
              <div className="flex flex-wrap gap-2">
                {data.link_building_strategy?.target_sites?.map((site, idx) => (
                  <Badge key={idx} variant="secondary">{site}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Ángulos de Outreach</p>
              <ul className="space-y-1">
                {data.link_building_strategy?.outreach_angles?.map((angle, idx) => (
                  <li key={idx} className="text-sm">• {angle}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Calendar Framework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Framework de Calendario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-sm bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 mb-2">Temas Semanales</p>
              <ul className="space-y-1">
                {data.content_calendar_framework?.weekly_themes?.map((theme, idx) => (
                  <li key={idx} className="text-sm">• {theme}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-purple-400 mb-2">Series Mensuales</p>
              <ul className="space-y-1">
                {data.content_calendar_framework?.monthly_series?.map((series, idx) => (
                  <li key={idx} className="text-sm">• {series}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-sm bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs text-orange-400 mb-2">Contenido Estacional</p>
              <ul className="space-y-1">
                {data.content_calendar_framework?.seasonal_content?.map((content, idx) => (
                  <li key={idx} className="text-sm">• {content}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Measurement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Medición y Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Métricas Primarias</p>
              <div className="space-y-1">
                {data.measurement?.primary_metrics?.map((metric, idx) => (
                  <div key={idx} className="text-sm p-2 rounded bg-green-500/10 border border-green-500/20">
                    {metric}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Herramientas Recomendadas</p>
              <div className="flex flex-wrap gap-2">
                {data.measurement?.tools_recommended?.map((tool, idx) => (
                  <Badge key={idx} variant="secondary">{tool}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Frecuencia de Reportes</p>
              <Badge className="bg-blue-500/20 text-blue-400">
                {data.measurement?.reporting_frequency}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
