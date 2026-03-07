/**
 * Tab01MarketOverview
 * Panorama de mercado con tendencias e insights
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { cn } from "@/lib/utils";

interface MarketOverviewData {
  market_summary: {
    description: string;
    market_size: string;
    growth_rate: string;
    maturity_stage: "emerging" | "growing" | "mature" | "declining";
    key_drivers: string[];
  };
  trends: Array<{
    trend: string;
    direction: "up" | "down" | "stable";
    impact: "high" | "medium" | "low";
    timeframe: string;
    description: string;
  }>;
  market_segments: Array<{
    segment: string;
    size_percentage: number;
    growth_potential: "high" | "medium" | "low";
    description: string;
    key_players: string[];
  }>;
  opportunities: Array<{
    opportunity: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    potential_impact: string;
  }>;
  threats: Array<{
    threat: string;
    severity: "high" | "medium" | "low";
    mitigation: string;
  }>;
  key_statistics: Array<{
    metric: string;
    value: string;
    context: string;
  }>;
  consumer_insights: {
    primary_motivations: string[];
    key_pain_points: string[];
    purchase_triggers: string[];
    decision_factors: string[];
  };
}

interface Tab01MarketOverviewProps {
  data: MarketOverviewData | null | undefined;
}

export function Tab01MarketOverview({ data }: Tab01MarketOverviewProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin panorama de mercado</h3>
        <p className="text-sm text-muted-foreground">
          El análisis de mercado se generará al completar el research.
        </p>
      </div>
    );
  }

  const maturityColors = {
    emerging: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    growing: "bg-green-500/20 text-green-400 border-green-500/30",
    mature: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    declining: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const maturityLabels = {
    emerging: "Emergente",
    growing: "En Crecimiento",
    mature: "Maduro",
    declining: "En Declive",
  };

  const directionIcons = {
    up: ArrowUp,
    down: ArrowDown,
    stable: Minus,
  };

  const potentialColors = {
    high: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-gray-500/20 text-gray-400",
  };

  const difficultyColors = {
    easy: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    hard: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Market Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            Resumen del Mercado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed">{data.market_summary?.description}</p>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Tamaño del Mercado</p>
              <p className="text-lg font-bold">{data.market_summary?.market_size}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Tasa de Crecimiento</p>
              <p className="text-lg font-bold">{data.market_summary?.growth_rate}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Etapa de Madurez</p>
              <Badge className={maturityColors[data.market_summary?.maturity_stage || "growing"]}>
                {maturityLabels[data.market_summary?.maturity_stage || "growing"]}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Impulsores Clave</p>
            <div className="flex flex-wrap gap-2">
              {data.market_summary?.key_drivers?.map((driver, idx) => (
                <Badge key={idx} variant="secondary">
                  {driver}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Statistics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.key_statistics?.map((stat, idx) => (
          <Card key={idx}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.metric}</p>
              <p className="text-2xl font-bold mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.context}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Tendencias del Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.trends?.map((trend, idx) => {
              const DirectionIcon = directionIcons[trend.direction];
              return (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <DirectionIcon
                        className={cn(
                          "w-5 h-5",
                          trend.direction === "up"
                            ? "text-green-500"
                            : trend.direction === "down"
                            ? "text-red-500"
                            : "text-yellow-500"
                        )}
                      />
                      <span className="font-medium">{trend.trend}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          trend.impact === "high"
                            ? "border-green-500 text-green-500"
                            : trend.impact === "medium"
                            ? "border-yellow-500 text-yellow-500"
                            : "border-gray-500 text-gray-500"
                        }
                      >
                        Impacto {trend.impact === "high" ? "Alto" : trend.impact === "medium" ? "Medio" : "Bajo"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {trend.timeframe}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{trend.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Market Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Segmentos de Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.market_segments?.map((segment, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{segment.segment}</span>
                  <div className="flex items-center gap-2">
                    <Badge className={potentialColors[segment.growth_potential]}>
                      Potencial {segment.growth_potential === "high" ? "Alto" : segment.growth_potential === "medium" ? "Medio" : "Bajo"}
                    </Badge>
                    <span className="text-sm font-medium">{segment.size_percentage}%</span>
                  </div>
                </div>
                <Progress value={segment.size_percentage} className="h-2 mb-3" />
                <p className="text-sm text-muted-foreground mb-2">{segment.description}</p>
                {segment.key_players?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {segment.key_players.map((player, playerIdx) => (
                      <Badge key={playerIdx} variant="outline" className="text-xs">
                        {player}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Opportunities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.opportunities?.map((opp, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{opp.opportunity}</span>
                  <Badge className={difficultyColors[opp.difficulty]}>
                    {opp.difficulty === "easy" ? "Fácil" : opp.difficulty === "medium" ? "Moderado" : "Difícil"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{opp.description}</p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Impacto: </span>
                  <span className="text-green-400">{opp.potential_impact}</span>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Threats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Amenazas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.threats?.map((threat, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{threat.threat}</span>
                  <Badge
                    variant="outline"
                    className={
                      threat.severity === "high"
                        ? "border-red-500 text-red-500"
                        : threat.severity === "medium"
                        ? "border-yellow-500 text-yellow-500"
                        : "border-gray-500 text-gray-500"
                    }
                  >
                    {threat.severity === "high" ? "Alto" : threat.severity === "medium" ? "Medio" : "Bajo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground">Mitigación: </span>
                  {threat.mitigation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Consumer Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Insights del Consumidor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium mb-2 text-green-400">Motivaciones Principales</p>
              <ul className="space-y-1">
                {data.consumer_insights?.primary_motivations?.map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 text-red-400">Puntos de Dolor</p>
              <ul className="space-y-1">
                {data.consumer_insights?.key_pain_points?.map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 text-yellow-400">Disparadores de Compra</p>
              <ul className="space-y-1">
                {data.consumer_insights?.purchase_triggers?.map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 text-blue-400">Factores de Decisión</p>
              <ul className="space-y-1">
                {data.consumer_insights?.decision_factors?.map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
