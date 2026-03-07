/**
 * Tab16GoogleAds
 * Estrategia de Google Ads
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Target,
  DollarSign,
  TrendingUp,
  FileText,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface GoogleAd {
  campaign_type: string;
  headlines: string[];
  descriptions: string[];
  display_path: string;
  final_url_suffix: string;
  sitelinks: Array<{ title: string; description: string }>;
}

interface GoogleAdsData {
  strategy_overview: {
    campaign_types: string[];
    monthly_budget: string;
    target_cpa: string;
    target_roas?: string;
  };
  keyword_strategy: {
    primary_keywords: Array<{ keyword: string; match_type: string; intent: string }>;
    negative_keywords: string[];
    long_tail_keywords: string[];
  };
  search_ads: GoogleAd[];
  display_strategy: {
    audience_segments: string[];
    placements: string[];
    creative_sizes: string[];
  };
  youtube_strategy?: {
    ad_formats: string[];
    targeting: string[];
    video_concepts: string[];
  };
  bidding_strategy: {
    strategy: string;
    adjustments: Array<{ type: string; adjustment: string }>;
  };
  landing_page_requirements: string[];
  conversion_tracking: string[];
}

interface Tab16GoogleAdsProps {
  data: GoogleAdsData | null | undefined;
}

export function Tab16GoogleAds({ data }: Tab16GoogleAdsProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de Google Ads</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de Google Ads se generará al completar el research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-green-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Estrategia General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Tipos de Campaña</p>
              <div className="flex flex-wrap gap-1">
                {data.strategy_overview?.campaign_types?.map((t, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Presupuesto Mensual</p>
              <p className="font-bold text-lg">{data.strategy_overview?.monthly_budget}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Target CPA</p>
              <p className="font-bold text-lg">{data.strategy_overview?.target_cpa}</p>
            </div>
            {data.strategy_overview?.target_roas && (
              <div className="p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Target ROAS</p>
                <p className="font-bold text-lg">{data.strategy_overview.target_roas}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Keyword Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Estrategia de Keywords
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Keywords Primarias</p>
            <div className="space-y-2">
              {data.keyword_strategy?.primary_keywords?.map((kw, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{kw.match_type}</Badge>
                    <span className="font-medium">{kw.keyword}</span>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400">{kw.intent}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Long-Tail Keywords</p>
            <div className="flex flex-wrap gap-2">
              {data.keyword_strategy?.long_tail_keywords?.map((kw, idx) => (
                <Badge key={idx} variant="secondary">{kw}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Keywords Negativas
            </p>
            <div className="flex flex-wrap gap-2">
              {data.keyword_strategy?.negative_keywords?.map((kw, idx) => (
                <Badge key={idx} variant="outline" className="text-red-400 border-red-400/30">
                  -{kw}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Ads */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Anuncios de Búsqueda</h3>
        {data.search_ads?.map((ad, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{ad.campaign_type}</CardTitle>
                <Badge variant="outline">{ad.display_path}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Headlines (máx 30 caracteres)</p>
                <div className="space-y-2">
                  {ad.headlines?.map((h, hIdx) => (
                    <div key={hIdx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <span className="font-medium text-sm">{h}</span>
                      <CopyButton text={h} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Descriptions (máx 90 caracteres)</p>
                <div className="space-y-2">
                  {ad.descriptions?.map((d, dIdx) => (
                    <div key={dIdx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <span className="text-sm">{d}</span>
                      <CopyButton text={d} size="sm" />
                    </div>
                  ))}
                </div>
              </div>

              {ad.sitelinks && ad.sitelinks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sitelinks</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ad.sitelinks.map((sl, slIdx) => (
                      <div key={slIdx} className="p-2 rounded border bg-card">
                        <p className="font-medium text-sm text-blue-400">{sl.title}</p>
                        <p className="text-xs text-muted-foreground">{sl.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bidding Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Estrategia de Bidding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="font-medium">{data.bidding_strategy?.strategy}</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Ajustes de Bid</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {data.bidding_strategy?.adjustments?.map((adj, idx) => (
                <div key={idx} className="p-2 rounded bg-muted/50 flex justify-between">
                  <span className="text-sm">{adj.type}</span>
                  <Badge variant="outline">{adj.adjustment}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Conversion Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.conversion_tracking?.map((ct, idx) => (
              <li key={idx} className="text-sm p-2 rounded bg-muted/50 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                {ct}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
