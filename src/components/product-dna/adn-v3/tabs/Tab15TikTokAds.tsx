/**
 * Tab15TikTokAds
 * Estrategia de TikTok Ads
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Music2,
  Video,
  Users,
  Target,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface TikTokCreative {
  concept: string;
  hook: string;
  format: string;
  duration: string;
  audio_type: string;
  script_outline: string[];
  visual_style: string;
  cta: string;
}

interface TikTokAdsData {
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
  creatives: TikTokCreative[];
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

interface Tab15TikTokAdsProps {
  data: TikTokAdsData | null | undefined;
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
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Objetivo</p>
              <p className="font-medium">{data.strategy_overview?.campaign_objective}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Presupuesto</p>
              <p className="font-medium">{data.strategy_overview?.budget_recommendation}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Bidding</p>
              <p className="font-medium">{data.strategy_overview?.bidding_strategy}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
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
              <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between">
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
              <div className="p-3 rounded-lg bg-pink-500/10 border-l-4 border-pink-500">
                <p className="text-xs text-pink-400 mb-1">Hook (3 seg)</p>
                <p className="font-medium">{creative.hook}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Audio</p>
                  <p className="text-sm">{creative.audio_type}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
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

              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
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
          <div className="p-3 rounded-lg bg-muted/50">
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

          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
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
