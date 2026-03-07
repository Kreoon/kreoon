/**
 * Tab02Competition
 * Análisis de competencia detallado
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Zap,
  ExternalLink,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { cn } from "@/lib/utils";

interface Competitor {
  name: string;
  website?: string;
  positioning: string;
  price_range: string;
  target_audience: string;
  strengths: string[];
  weaknesses: string[];
  market_share_estimate?: number;
  threat_level: "high" | "medium" | "low";
  differentiation_opportunity: string;
}

interface CompetitionData {
  competitive_landscape: {
    market_concentration: "fragmented" | "moderate" | "concentrated";
    intensity: "high" | "medium" | "low";
    barriers_to_entry: string[];
    key_success_factors: string[];
  };
  direct_competitors: Competitor[];
  indirect_competitors: Array<{
    name: string;
    category: string;
    overlap: string;
  }>;
  competitive_advantages: Array<{
    advantage: string;
    sustainability: "high" | "medium" | "low";
    proof_points: string[];
  }>;
  positioning_map: {
    x_axis: string;
    y_axis: string;
    your_position: { x: number; y: number };
    competitors_positions: Array<{
      name: string;
      x: number;
      y: number;
    }>;
  };
  strategic_recommendations: string[];
}

interface Tab02CompetitionProps {
  data: CompetitionData | null | undefined;
}

export function Tab02Competition({ data }: Tab02CompetitionProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin análisis de competencia</h3>
        <p className="text-sm text-muted-foreground">
          El análisis de competencia se generará al completar el research.
        </p>
      </div>
    );
  }

  const threatColors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  const sustainabilityColors = {
    high: "text-green-400",
    medium: "text-yellow-400",
    low: "text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Competitive Landscape Overview */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Panorama Competitivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Concentración del Mercado</p>
              <Badge variant="outline" className="capitalize">
                {data.competitive_landscape?.market_concentration === "fragmented"
                  ? "Fragmentado"
                  : data.competitive_landscape?.market_concentration === "moderate"
                  ? "Moderado"
                  : "Concentrado"}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Intensidad Competitiva</p>
              <Badge
                className={
                  data.competitive_landscape?.intensity === "high"
                    ? "bg-red-500/20 text-red-400"
                    : data.competitive_landscape?.intensity === "medium"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-green-500/20 text-green-400"
                }
              >
                {data.competitive_landscape?.intensity === "high"
                  ? "Alta"
                  : data.competitive_landscape?.intensity === "medium"
                  ? "Media"
                  : "Baja"}
              </Badge>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Barreras de Entrada</p>
              <ul className="space-y-1">
                {data.competitive_landscape?.barriers_to_entry?.map((barrier, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <Shield className="w-3 h-3 mt-1 text-blue-400 flex-shrink-0" />
                    {barrier}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Factores Clave de Éxito</p>
              <ul className="space-y-1">
                {data.competitive_landscape?.key_success_factors?.map((factor, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <Zap className="w-3 h-3 mt-1 text-yellow-400 flex-shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Direct Competitors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            Competidores Directos
          </CardTitle>
          <CardDescription>
            Empresas que ofrecen productos/servicios similares al mismo mercado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.direct_competitors?.map((competitor, idx) => (
            <div key={idx} className="p-4 rounded-lg border bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-lg">
                    {competitor.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{competitor.name}</h4>
                      {competitor.website && (
                        <a
                          href={competitor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{competitor.positioning}</p>
                  </div>
                </div>
                <Badge className={threatColors[competitor.threat_level]}>
                  {competitor.threat_level === "high"
                    ? "Amenaza Alta"
                    : competitor.threat_level === "medium"
                    ? "Amenaza Media"
                    : "Amenaza Baja"}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Precio: </span>
                  <span className="font-medium">{competitor.price_range}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Target: </span>
                  <span className="font-medium">{competitor.target_audience}</span>
                </div>
                {competitor.market_share_estimate && (
                  <div>
                    <span className="text-muted-foreground">Market Share: </span>
                    <span className="font-medium">~{competitor.market_share_estimate}%</span>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-green-400 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Fortalezas
                  </p>
                  <ul className="space-y-0.5">
                    {competitor.strengths?.map((strength, sIdx) => (
                      <li key={sIdx} className="text-xs text-muted-foreground">
                        • {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Debilidades
                  </p>
                  <ul className="space-y-0.5">
                    {competitor.weaknesses?.map((weakness, wIdx) => (
                      <li key={wIdx} className="text-xs text-muted-foreground">
                        • {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400">
                  <strong>Oportunidad de diferenciación:</strong>{" "}
                  {competitor.differentiation_opportunity}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Indirect Competitors */}
      <Card>
        <CardHeader>
          <CardTitle>Competidores Indirectos</CardTitle>
          <CardDescription>
            Alternativas que resuelven el mismo problema de forma diferente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.indirect_competitors?.map((comp, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                <p className="font-medium text-sm">{comp.name}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {comp.category}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">{comp.overlap}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitive Advantages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Ventajas Competitivas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.competitive_advantages?.map((adv, idx) => (
            <div key={idx} className="p-4 rounded-lg border bg-card">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">{adv.advantage}</h4>
                <span className={cn("text-xs", sustainabilityColors[adv.sustainability])}>
                  Sostenibilidad{" "}
                  {adv.sustainability === "high"
                    ? "Alta"
                    : adv.sustainability === "medium"
                    ? "Media"
                    : "Baja"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {adv.proof_points?.map((proof, pIdx) => (
                  <Badge key={pIdx} variant="secondary" className="text-xs">
                    {proof}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Recomendaciones Estratégicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.strategic_recommendations?.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm">{rec}</span>
                <CopyButton text={rec} size="sm" className="ml-auto" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
