/**
 * Tab16GoogleAds
 * Estrategia de Google Ads - Compatible con estructura backend step-16-google-ads.ts
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Target,
  DollarSign,
  TrendingUp,
  FileText,
  Zap,
  AlertTriangle,
  Youtube,
  Monitor,
  BarChart3,
  Layers,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Backend structure from step-16-google-ads.ts
interface BackendSearchAd {
  campaign_name: string;
  ad_group: string;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
  negative_keywords?: string[];
}

interface BackendGoogleAdsData {
  strategy_overview: {
    objectives: string[];
    monthly_budget_usd: number | string;
    target_cpa_usd?: number | string;
    target_roas?: number | string;
  };
  keyword_strategy: {
    primary_themes: string[];
    high_intent_keywords: string[];
    broad_match_keywords: string[];
    negative_keywords: string[];
  };
  search_ads: BackendSearchAd[];
  display_strategy: {
    targeting: string[];
    placements: string[];
    audiences: string[];
    creative_formats: string[];
  };
  youtube_strategy: {
    ad_formats: string[];
    targeting: string[];
    video_concepts: Array<{
      title: string;
      hook: string;
      script_outline: string;
      cta: string;
    }>;
  };
  bidding_strategy: {
    strategy_type: string;
    bid_adjustments: Array<{ dimension: string; adjustment: string }>;
  };
  campaign_structure: {
    campaigns: Array<{
      name: string;
      type: string;
      objective: string;
      budget_allocation: string;
    }>;
  };
  conversion_tracking: {
    primary_conversions: string[];
    micro_conversions: string[];
    attribution_model: string;
  };
  summary?: string;
}

// Legacy structure
interface LegacyGoogleAd {
  campaign_type: string;
  headlines: string[];
  descriptions: string[];
  display_path: string;
  final_url_suffix: string;
  sitelinks: Array<{ title: string; description: string }>;
}

interface LegacyGoogleAdsData {
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
  search_ads: LegacyGoogleAd[];
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

type GoogleAdsData = BackendGoogleAdsData | LegacyGoogleAdsData;

interface Tab16GoogleAdsProps {
  data: GoogleAdsData | null | undefined;
}

function hasBackendStructure(data: unknown): data is BackendGoogleAdsData {
  const d = data as Record<string, unknown>;
  const strategy = d.strategy_overview as Record<string, unknown> | undefined;
  return !!(
    strategy &&
    (Array.isArray(strategy.objectives) || typeof strategy.monthly_budget_usd !== 'undefined')
  );
}

function hasLegacyStructure(data: unknown): data is LegacyGoogleAdsData {
  const d = data as Record<string, unknown>;
  const strategy = d.strategy_overview as Record<string, unknown> | undefined;
  return !!(
    strategy &&
    Array.isArray(strategy.campaign_types) &&
    typeof strategy.monthly_budget === 'string'
  );
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

  // Backend structure (step-16-google-ads.ts)
  if (hasBackendStructure(data)) {
    return <BackendGoogleAdsView data={data} />;
  }

  // Legacy structure
  if (hasLegacyStructure(data)) {
    return <LegacyGoogleAdsView data={data} />;
  }

  // Fallback: unknown structure
  return (
    <GenericTabContent
      data={data as Record<string, unknown>}
      title="Google Ads"
      icon={<Search className="w-4 h-4" />}
    />
  );
}

// Backend structure renderer
function BackendGoogleAdsView({ data }: { data: BackendGoogleAdsData }) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-yellow-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </CardContent>
        </Card>
      )}

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
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Objetivos</p>
              <div className="flex flex-wrap gap-1">
                {data.strategy_overview?.objectives?.map((obj, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{obj}</Badge>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Presupuesto Mensual</p>
              <p className="font-bold text-lg text-green-400">
                ${typeof data.strategy_overview?.monthly_budget_usd === 'number'
                  ? data.strategy_overview.monthly_budget_usd.toLocaleString()
                  : data.strategy_overview?.monthly_budget_usd} USD
              </p>
            </div>
            {data.strategy_overview?.target_cpa_usd && (
              <div className="p-3 rounded-sm bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Target CPA</p>
                <p className="font-bold text-lg">
                  ${typeof data.strategy_overview.target_cpa_usd === 'number'
                    ? data.strategy_overview.target_cpa_usd
                    : data.strategy_overview.target_cpa_usd} USD
                </p>
              </div>
            )}
            {data.strategy_overview?.target_roas && (
              <div className="p-3 rounded-sm bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Target ROAS</p>
                <p className="font-bold text-lg">{data.strategy_overview.target_roas}x</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Structure */}
      {data.campaign_structure?.campaigns && data.campaign_structure.campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              Estructura de Campañas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.campaign_structure.campaigns.map((campaign, idx) => (
                <div key={idx} className="p-4 rounded-sm border bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{campaign.name}</h4>
                    <Badge variant="outline">{campaign.type}</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Objetivo:</span>{' '}
                      {campaign.objective}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget:</span>{' '}
                      <span className="text-green-400">{campaign.budget_allocation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Keyword Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            Estrategia de Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="high-intent" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="high-intent">Alta Intención</TabsTrigger>
              <TabsTrigger value="broad">Broad Match</TabsTrigger>
              <TabsTrigger value="themes">Temas</TabsTrigger>
              <TabsTrigger value="negative">Negativas</TabsTrigger>
            </TabsList>
            <TabsContent value="high-intent" className="pt-4">
              <div className="flex flex-wrap gap-2">
                {data.keyword_strategy?.high_intent_keywords?.map((kw, idx) => (
                  <Badge key={idx} variant="default" className="bg-green-500/20 text-green-400">
                    {kw}
                  </Badge>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="broad" className="pt-4">
              <div className="flex flex-wrap gap-2">
                {data.keyword_strategy?.broad_match_keywords?.map((kw, idx) => (
                  <Badge key={idx} variant="secondary">{kw}</Badge>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="themes" className="pt-4">
              <div className="flex flex-wrap gap-2">
                {data.keyword_strategy?.primary_themes?.map((theme, idx) => (
                  <Badge key={idx} variant="outline">{theme}</Badge>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="negative" className="pt-4">
              <div className="flex flex-wrap gap-2">
                {data.keyword_strategy?.negative_keywords?.map((kw, idx) => (
                  <Badge key={idx} variant="outline" className="text-red-400 border-red-400/30">
                    -{kw}
                  </Badge>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Search Ads */}
      {data.search_ads && data.search_ads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Anuncios de Búsqueda ({data.search_ads.length})
          </h3>
          {data.search_ads.map((ad, idx) => (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{ad.campaign_name}</CardTitle>
                  <Badge variant="outline">{ad.ad_group}</Badge>
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

                {ad.keywords && ad.keywords.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {ad.keywords.map((kw, kwIdx) => (
                        <Badge key={kwIdx} variant="secondary" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Display Strategy */}
      {data.display_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-orange-500" />
              Estrategia Display
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Targeting</p>
                <div className="flex flex-wrap gap-1">
                  {data.display_strategy.targeting?.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Audiencias</p>
                <div className="flex flex-wrap gap-1">
                  {data.display_strategy.audiences?.map((aud, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{aud}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Placements</p>
                <ul className="space-y-1">
                  {data.display_strategy.placements?.map((p, idx) => (
                    <li key={idx} className="text-sm">• {p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Formatos</p>
                <div className="flex flex-wrap gap-1">
                  {data.display_strategy.creative_formats?.map((f, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{f}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* YouTube Strategy */}
      {data.youtube_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              Estrategia YouTube
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Formatos de Anuncio</p>
                <div className="flex flex-wrap gap-1">
                  {data.youtube_strategy.ad_formats?.map((f, idx) => (
                    <Badge key={idx} variant="secondary">{f}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Targeting</p>
                <div className="flex flex-wrap gap-1">
                  {data.youtube_strategy.targeting?.map((t, idx) => (
                    <Badge key={idx} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {data.youtube_strategy.video_concepts && data.youtube_strategy.video_concepts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Conceptos de Video</p>
                <div className="space-y-3">
                  {data.youtube_strategy.video_concepts.map((video, idx) => (
                    <div key={idx} className="p-3 rounded-sm border bg-card">
                      <h4 className="font-medium mb-2">{video.title}</h4>
                      <div className="p-2 rounded bg-red-500/10 border-l-4 border-red-500 mb-2">
                        <p className="text-xs text-red-400 mb-1">Hook</p>
                        <p className="text-sm">{video.hook}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Outline</p>
                      <p className="text-sm mb-2">{video.script_outline}</p>
                      <Badge variant="default" className="bg-green-500/20 text-green-400">
                        CTA: {video.cta}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bidding Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Estrategia de Bidding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
            <p className="font-medium">{data.bidding_strategy?.strategy_type}</p>
          </div>

          {data.bidding_strategy?.bid_adjustments && data.bidding_strategy.bid_adjustments.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Ajustes de Bid</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {data.bidding_strategy.bid_adjustments.map((adj, idx) => (
                  <div key={idx} className="p-2 rounded bg-muted/50 flex justify-between">
                    <span className="text-sm">{adj.dimension}</span>
                    <Badge variant="outline">{adj.adjustment}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Tracking */}
      {data.conversion_tracking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Conversion Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Conversiones Primarias</p>
                <ul className="space-y-1">
                  {data.conversion_tracking.primary_conversions?.map((conv, idx) => (
                    <li key={idx} className="text-sm p-2 rounded bg-green-500/10 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-400" />
                      {conv}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Micro-Conversiones</p>
                <ul className="space-y-1">
                  {data.conversion_tracking.micro_conversions?.map((conv, idx) => (
                    <li key={idx} className="text-sm p-2 rounded bg-muted/50 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      {conv}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {data.conversion_tracking.attribution_model && (
              <div className="p-3 rounded-sm bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 mb-1">Modelo de Atribución</p>
                <p className="font-medium">{data.conversion_tracking.attribution_model}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Legacy structure renderer
function LegacyGoogleAdsView({ data }: { data: LegacyGoogleAdsData }) {
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
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Tipos de Campaña</p>
              <div className="flex flex-wrap gap-1">
                {data.strategy_overview?.campaign_types?.map((t, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Presupuesto Mensual</p>
              <p className="font-bold text-lg">{data.strategy_overview?.monthly_budget}</p>
            </div>
            <div className="p-3 rounded-sm bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Target CPA</p>
              <p className="font-bold text-lg">{data.strategy_overview?.target_cpa}</p>
            </div>
            {data.strategy_overview?.target_roas && (
              <div className="p-3 rounded-sm bg-background/50">
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
                <div key={idx} className="p-3 rounded-sm border bg-card flex items-center justify-between">
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
          <div className="p-3 rounded-sm bg-green-500/10 border border-green-500/20">
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
