/**
 * Tab15TikTokAds
 * Estrategia de TikTok Ads - Compatible con estructura backend step-15-tiktok-ads.ts
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Music2,
  Video,
  Users,
  Target,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
  Hash,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Backend structure from step-15-tiktok-ads.ts
interface BackendTikTokCreative {
  concept: string;
  hook_3s: string;
  format: string;
  duration: string;
  audio: string;
  script: string;
  visual_style: string;
}

interface BackendTikTokAdsData {
  strategy: {
    objective: string;
    daily_budget_usd: number | string;
    bidding: string;
  };
  audience: {
    age: string;
    gender: string;
    locations: string[];
    interests: string[];
    behaviors: string[];
  };
  creatives: BackendTikTokCreative[];
  viral_hooks: string[];
  spark_ads: {
    creator_profile: string;
    content_guidelines: string[];
    brief: string;
  };
  hashtags: {
    branded: string[];
    trending: string[];
    niche: string[];
  };
  native_tips: string[];
  kpis: Array<{
    metric: string;
    target: string;
  }>;
  summary: string;
}

// Legacy structure for backwards compatibility
interface LegacyTikTokCreative {
  concept: string;
  hook: string;
  format: string;
  duration: string;
  audio_type: string;
  script_outline: string[];
  visual_style: string;
  cta: string;
}

interface LegacyTikTokAdsData {
  strategy_overview: {
    campaign_objective: string;
    target_audience_interests: string[];
    budget_recommendation: string;
    bidding_strategy: string;
  };
  audience_targeting: {
    demographics: Record<string, string>;
    interests: string[];
    behaviors: string[];
    custom_audiences: string[];
  };
  creatives: LegacyTikTokCreative[];
  spark_ads_strategy: {
    creator_profile: string;
    content_guidelines: string[];
    partnership_approach: string;
  };
  viral_hooks: string[];
  trending_sounds_strategy: string;
  best_practices: string[];
  kpis: Array<{
    metric: string;
    target: string;
  }>;
}

type TikTokAdsData = BackendTikTokAdsData | LegacyTikTokAdsData;

interface Tab15TikTokAdsProps {
  data: TikTokAdsData | null | undefined;
}

function hasBackendStructure(data: unknown): data is BackendTikTokAdsData {
  const d = data as Record<string, unknown>;
  return !!(
    d.strategy &&
    typeof d.strategy === 'object' &&
    (d.strategy as Record<string, unknown>).objective
  );
}

function hasLegacyStructure(data: unknown): data is LegacyTikTokAdsData {
  const d = data as Record<string, unknown>;
  return !!(
    d.strategy_overview &&
    typeof d.strategy_overview === 'object' &&
    (d.strategy_overview as Record<string, unknown>).campaign_objective
  );
}

export function Tab15TikTokAds({ data }: Tab15TikTokAdsProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de TikTok Ads</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de TikTok Ads se generará al completar el research.
        </p>
      </div>
    );
  }

  // Backend structure (step-15-tiktok-ads.ts)
  if (hasBackendStructure(data)) {
    return <BackendTikTokAdsView data={data} />;
  }

  // Legacy structure
  if (hasLegacyStructure(data)) {
    return <LegacyTikTokAdsView data={data} />;
  }

  // Fallback: unknown structure
  return (
    <GenericTabContent
      data={data as Record<string, unknown>}
      title="TikTok Ads"
      icon={<Music2 className="w-4 h-4" />}
    />
  );
}

// Backend structure renderer
function BackendTikTokAdsView({ data }: { data: BackendTikTokAdsData }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-pink-500/10 to-cyan-500/10 border-pink-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Strategy Overview */}
      <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-pink-500" />
            Estrategia General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
              <p className="font-medium">{data.strategy?.objective}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Presupuesto Diario</p>
              <p className="font-bold text-lg text-green-400">
                ${typeof data.strategy?.daily_budget_usd === 'number'
                  ? data.strategy.daily_budget_usd.toLocaleString()
                  : data.strategy?.daily_budget_usd} USD
              </p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Bidding</p>
              <p className="font-medium">{data.strategy?.bidding}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Audiencia Target
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-sm bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Edad</p>
              <p className="font-medium">{data.audience?.age}</p>
            </div>
            <div className="p-3 rounded-sm bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Género</p>
              <p className="font-medium">{data.audience?.gender}</p>
            </div>
            <div className="p-3 rounded-sm bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Ubicaciones</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.audience?.locations?.slice(0, 3).map((loc, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{loc}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Intereses</p>
              <div className="flex flex-wrap gap-1">
                {data.audience?.interests?.map((int, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">{int}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Comportamientos</p>
              <div className="flex flex-wrap gap-1">
                {data.audience?.behaviors?.map((beh, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{beh}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Viral Hooks */}
      {data.viral_hooks && data.viral_hooks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Hooks Virales
            </CardTitle>
            <CardDescription>
              Primeras palabras que detienen el scroll
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.viral_hooks.map((hook, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card flex items-center justify-between">
                  <p className="font-medium text-sm">{hook}</p>
                  <CopyButton text={hook} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Creatives */}
      {data.creatives && data.creatives.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="w-5 h-5 text-pink-500" />
            Creativos ({data.creatives.length})
          </h3>
          {data.creatives.map((creative, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{creative.concept}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{creative.format}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {creative.duration}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-sm bg-pink-500/10 border-l-4 border-pink-500">
                  <p className="text-xs text-pink-400 mb-1">Hook (3 seg)</p>
                  <p className="font-medium">{creative.hook_3s}</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-sm bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Audio</p>
                    <p className="text-sm">{creative.audio}</p>
                  </div>
                  <div className="p-3 rounded-sm bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Estilo Visual</p>
                    <p className="text-sm">{creative.visual_style}</p>
                  </div>
                </div>

                {creative.script && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Script</p>
                    <div className="p-3 rounded-sm bg-muted/50 whitespace-pre-wrap text-sm">
                      {creative.script}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hashtags */}
      {data.hashtags && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-cyan-500" />
              Estrategia de Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="branded" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="branded">Branded</TabsTrigger>
                <TabsTrigger value="trending">Trending</TabsTrigger>
                <TabsTrigger value="niche">Nicho</TabsTrigger>
              </TabsList>
              <TabsContent value="branded" className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {data.hashtags.branded?.map((tag, idx) => (
                    <Badge key={idx} variant="default" className="bg-pink-500/20 text-pink-400">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="trending" className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {data.hashtags.trending?.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">#{tag}</Badge>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="niche" className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {data.hashtags.niche?.map((tag, idx) => (
                    <Badge key={idx} variant="outline">#{tag}</Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Spark Ads */}
      {data.spark_ads && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Estrategia Spark Ads
            </CardTitle>
            <CardDescription>
              Colaboración con creadores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-sm bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Perfil de Creador Ideal</p>
              <p className="text-sm">{data.spark_ads.creator_profile}</p>
            </div>

            {data.spark_ads.content_guidelines && data.spark_ads.content_guidelines.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Guidelines de Contenido</p>
                <ul className="space-y-1">
                  {data.spark_ads.content_guidelines.map((g, idx) => (
                    <li key={idx} className="text-sm">• {g}</li>
                  ))}
                </ul>
              </div>
            )}

            {data.spark_ads.brief && (
              <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-1">Brief</p>
                <p className="text-sm">{data.spark_ads.brief}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Native Tips & KPIs */}
      <div className="grid sm:grid-cols-2 gap-6">
        {data.native_tips && data.native_tips.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Tips Nativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.native_tips.map((tip, idx) => (
                  <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.kpis && data.kpis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                KPIs Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.kpis.map((kpi, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span className="text-sm">{kpi.metric}</span>
                    <Badge variant="outline">{kpi.target}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Legacy structure renderer
function LegacyTikTokAdsView({ data }: { data: LegacyTikTokAdsData }) {
  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-pink-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-pink-500" />
            Estrategia General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
              <p className="font-medium">{data.strategy_overview?.campaign_objective}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
              <p className="font-medium">{data.strategy_overview?.budget_recommendation}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Bidding</p>
              <p className="font-medium">{data.strategy_overview?.bidding_strategy}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Intereses Target</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.strategy_overview?.target_audience_interests?.slice(0, 3).map((i, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{i}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Viral Hooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Hooks Virales
          </CardTitle>
          <CardDescription>
            Primeras palabras que detienen el scroll
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.viral_hooks?.map((hook, idx) => (
              <div key={idx} className="p-3 rounded-sm border bg-card flex items-center justify-between">
                <p className="font-medium text-sm">{hook}</p>
                <CopyButton text={hook} size="sm" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Creatives */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Creativos</h3>
        {data.creatives?.map((creative, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{creative.concept}</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline">{creative.format}</Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {creative.duration}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-sm bg-pink-500/10 border-l-4 border-pink-500">
                <p className="text-xs text-pink-400 mb-1">Hook (3 seg)</p>
                <p className="font-medium">{creative.hook}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-sm bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Audio</p>
                  <p className="text-sm">{creative.audio_type}</p>
                </div>
                <div className="p-3 rounded-sm bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Estilo Visual</p>
                  <p className="text-sm">{creative.visual_style}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Outline del Script</p>
                <ol className="space-y-1 list-decimal list-inside">
                  {creative.script_outline?.map((step, sIdx) => (
                    <li key={sIdx} className="text-sm">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">CTA</p>
                <p className="font-medium">{creative.cta}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spark Ads Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Estrategia Spark Ads
          </CardTitle>
          <CardDescription>
            Colaboración con creadores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-sm bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Perfil de Creador Ideal</p>
            <p className="text-sm">{data.spark_ads_strategy?.creator_profile}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Guidelines de Contenido</p>
            <ul className="space-y-1">
              {data.spark_ads_strategy?.content_guidelines?.map((g, idx) => (
                <li key={idx} className="text-sm">• {g}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-sm bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-400 mb-1">Approach de Partnership</p>
            <p className="text-sm">{data.spark_ads_strategy?.partnership_approach}</p>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices & KPIs */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.best_practices?.map((bp, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {bp}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              KPIs Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.kpis?.map((kpi, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">{kpi.metric}</span>
                  <Badge variant="outline">{kpi.target}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
