/**
 * Tab02Competition
 * Análisis de competencia detallado
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  ExternalLink,
  Lightbulb,
  Clock,
  Crosshair,
  BookOpen,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-02-competition.ts)
interface BackendCompetitionData {
  direct_competitors?: Array<{
    name?: string;
    website?: string;
    positioning?: string;
    target_audience?: string;
    price_range?: string;
    strengths?: string[];
    weaknesses?: string[];
    unique_selling_point?: string;
    content_strategy?: string;
    threat_level?: string;
  }>;
  indirect_competitors?: Array<{
    name?: string;
    why_indirect?: string;
    threat_level?: string;
  }>;
  competitive_gaps?: Array<{
    gap?: string;
    opportunity?: string;
    difficulty?: string;
  }>;
  market_positioning_map?: {
    axis_x?: string;
    axis_y?: string;
    positions?: Array<{
      competitor?: string;
      x?: number;
      y?: number;
    }>;
  };
  differentiation_opportunities?: Array<{
    area?: string;
    current_state?: string;
    opportunity?: string;
    implementation?: string;
  }>;
  competitive_threats?: Array<{
    threat?: string;
    source?: string;
    timeline?: string;
    mitigation?: string;
  }>;
  recommended_positioning?: string;
  summary?: string;
}

interface Tab02CompetitionProps {
  data: BackendCompetitionData | null | undefined;
}

const threatColors: Record<string, string> = {
  alto: "bg-red-500/20 text-red-400 border-red-500/30",
  medio: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  bajo: "bg-green-500/20 text-green-400 border-green-500/30",
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const difficultyColors: Record<string, string> = {
  fácil: "bg-green-500/20 text-green-400",
  facil: "bg-green-500/20 text-green-400",
  medio: "bg-yellow-500/20 text-yellow-400",
  difícil: "bg-red-500/20 text-red-400",
  dificil: "bg-red-500/20 text-red-400",
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-red-500/20 text-red-400",
};

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

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.direct_competitors ||
    rawData.competitive_gaps ||
    rawData.differentiation_opportunities;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Análisis de Competencia"
        icon={<Target className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary & Recommended Positioning */}
      {(data.summary || data.recommended_positioning) && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-orange-500" />
              Resumen Competitivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.summary && (
              <div>
                <p className="text-sm leading-relaxed">{data.summary}</p>
                <CopyButton text={data.summary} className="mt-2" size="sm" />
              </div>
            )}
            {data.recommended_positioning && (
              <div className="p-3 rounded-lg bg-background/50 border-l-4 border-l-orange-500">
                <p className="text-xs text-muted-foreground mb-1">Posicionamiento Recomendado</p>
                <p className="text-sm font-medium">{data.recommended_positioning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Direct Competitors */}
      {data.direct_competitors && data.direct_competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-red-500" />
              Competidores Directos
            </CardTitle>
            <CardDescription>
              {data.direct_competitors.length} competidores identificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.direct_competitors.map((comp, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-lg">
                      {comp.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{comp.name}</h4>
                        {comp.website && (
                          <a
                            href={comp.website.startsWith("http") ? comp.website : `https://${comp.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {comp.positioning && (
                        <p className="text-xs text-muted-foreground">{comp.positioning}</p>
                      )}
                    </div>
                  </div>
                  {comp.threat_level && (
                    <Badge className={threatColors[comp.threat_level.toLowerCase()] || "bg-muted"}>
                      Amenaza {comp.threat_level}
                    </Badge>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-3 text-sm">
                  {comp.price_range && (
                    <div>
                      <span className="text-muted-foreground">Precio: </span>
                      <span className="font-medium">{comp.price_range}</span>
                    </div>
                  )}
                  {comp.target_audience && (
                    <div>
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-medium">{comp.target_audience}</span>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-3">
                  {comp.strengths && comp.strengths.length > 0 && (
                    <div>
                      <p className="text-xs text-green-400 mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Fortalezas
                      </p>
                      <ul className="space-y-0.5">
                        {comp.strengths.map((s, sIdx) => (
                          <li key={sIdx} className="text-xs text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {comp.weaknesses && comp.weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs text-red-400 mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Debilidades
                      </p>
                      <ul className="space-y-0.5">
                        {comp.weaknesses.map((w, wIdx) => (
                          <li key={wIdx} className="text-xs text-muted-foreground">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {(comp.unique_selling_point || comp.content_strategy) && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t">
                    {comp.unique_selling_point && (
                      <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                        <p className="text-xs text-purple-400">
                          <strong>USP:</strong> {comp.unique_selling_point}
                        </p>
                      </div>
                    )}
                    {comp.content_strategy && (
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-400">
                          <strong>Contenido:</strong> {comp.content_strategy}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Indirect Competitors */}
      {data.indirect_competitors && data.indirect_competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competidores Indirectos</CardTitle>
            <CardDescription>
              Alternativas que resuelven el mismo problema de forma diferente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.indirect_competitors.map((comp, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{comp.name}</p>
                    {comp.threat_level && (
                      <Badge variant="outline" className={threatColors[comp.threat_level.toLowerCase()] || ""}>
                        {comp.threat_level}
                      </Badge>
                    )}
                  </div>
                  {comp.why_indirect && (
                    <p className="text-xs text-muted-foreground">{comp.why_indirect}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitive Gaps */}
      {data.competitive_gaps && data.competitive_gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crosshair className="w-5 h-5 text-green-500" />
              Gaps Competitivos
            </CardTitle>
            <CardDescription>
              Espacios no cubiertos en el mercado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.competitive_gaps.map((gap, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card border-l-4 border-l-green-500">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-sm">{gap.gap}</span>
                  {gap.difficulty && (
                    <Badge className={difficultyColors[gap.difficulty.toLowerCase()] || "bg-muted"}>
                      {gap.difficulty}
                    </Badge>
                  )}
                </div>
                {gap.opportunity && (
                  <p className="text-sm text-muted-foreground">
                    <span className="text-green-400">Oportunidad:</span> {gap.opportunity}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Differentiation Opportunities */}
      {data.differentiation_opportunities && data.differentiation_opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Oportunidades de Diferenciación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.differentiation_opportunities.map((diff, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium text-sm text-yellow-400 mb-2">{diff.area}</h4>
                <div className="space-y-2 text-sm">
                  {diff.current_state && (
                    <p className="text-muted-foreground">
                      <strong>Estado actual:</strong> {diff.current_state}
                    </p>
                  )}
                  {diff.opportunity && (
                    <p>
                      <strong className="text-green-400">Oportunidad:</strong> {diff.opportunity}
                    </p>
                  )}
                  {diff.implementation && (
                    <p className="text-muted-foreground">
                      <strong>Implementación:</strong> {diff.implementation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Competitive Threats */}
      {data.competitive_threats && data.competitive_threats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Amenazas Competitivas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.competitive_threats.map((threat, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card border-l-4 border-l-red-500">
                <h4 className="font-medium text-sm mb-2">{threat.threat}</h4>
                <div className="grid sm:grid-cols-3 gap-2 text-xs">
                  {threat.source && (
                    <div>
                      <span className="text-muted-foreground">Fuente: </span>
                      <span>{threat.source}</span>
                    </div>
                  )}
                  {threat.timeline && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span>{threat.timeline}</span>
                    </div>
                  )}
                  {threat.mitigation && (
                    <div className="sm:col-span-3 mt-2 p-2 rounded bg-green-500/10">
                      <span className="text-green-400">Mitigación: </span>
                      <span>{threat.mitigation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Positioning Map */}
      {data.market_positioning_map && data.market_positioning_map.positions && data.market_positioning_map.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Mapa de Posicionamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Eje X</p>
                <p className="font-medium text-sm">{data.market_positioning_map.axis_x}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Eje Y</p>
                <p className="font-medium text-sm">{data.market_positioning_map.axis_y}</p>
              </div>
            </div>
            <div className="space-y-2">
              {data.market_positioning_map.positions.map((pos, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded border bg-card">
                  <span className="text-sm font-medium">{pos.competitor}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">X: {pos.x}</Badge>
                    <Badge variant="outline">Y: {pos.y}</Badge>
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
