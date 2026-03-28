/**
 * Tab01MarketOverview
 * Panorama de mercado con tendencias e insights
 * Compatible con múltiples estructuras de datos del backend
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  TrendingUp,
  Users,
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
  Layers,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura flexible que acepta múltiples formatos del backend
interface MarketOverviewData {
  // Formato directo (estructura real del backend)
  tam?: string;
  sam?: string;
  som?: string;
  cagr?: string;
  trends?: string[];
  threats?: string[];
  opportunities?: string[];
  consumer_behavior?: string[];
  category_design?: string;

  // Formato anidado (estructura anterior)
  market_size?: {
    tam?: string;
    sam_latam?: string;
    som_year1?: string;
    som_year3?: string;
  };
  market_state?: string;
  adoption_stage?: string;
  awareness_level?: string;
  awareness_implication?: string;
  macro_variables?: Array<{
    factor?: string;
    impact?: string;
    description?: string;
  }>;
  data_sources?: string[];
  summary?: string;
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

  // Detectar formato de datos
  const hasDirectFormat = !!(data.tam || data.sam || data.som || data.trends || data.opportunities);
  const hasNestedFormat = !!(data.market_size || data.market_state);

  if (!hasDirectFormat && !hasNestedFormat) {
    return (
      <GenericTabContent
        data={data as Record<string, unknown>}
        title="Panorama de Mercado"
        icon={<Globe className="w-4 h-4" />}
      />
    );
  }

  // Normalizar datos para renderizado
  const tam = data.tam || data.market_size?.tam;
  const sam = data.sam || data.market_size?.sam_latam;
  const som = data.som || data.market_size?.som_year1;
  const cagr = data.cagr;
  const trends = data.trends || [];
  const threats = data.threats || [];
  const opportunities = data.opportunities || [];
  const consumerBehavior = data.consumer_behavior || [];
  const categoryDesign = data.category_design;

  return (
    <div className="space-y-6">
      {/* Market Size Grid */}
      {(tam || sam || som) && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tam && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">TAM (Mercado Total)</p>
                <p className="text-sm font-semibold text-blue-400 leading-tight">{tam}</p>
              </CardContent>
            </Card>
          )}
          {sam && (
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">SAM (Mercado Accesible)</p>
                <p className="text-sm font-semibold text-green-400 leading-tight">{sam}</p>
              </CardContent>
            </Card>
          )}
          {som && (
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">SOM (Mercado Objetivo)</p>
                <p className="text-sm font-semibold text-yellow-400 leading-tight">{som}</p>
              </CardContent>
            </Card>
          )}
          {cagr && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground">CAGR</p>
                </div>
                <p className="text-sm font-semibold text-purple-400">{cagr}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Consumer Behavior */}
      {consumerBehavior.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-blue-500" />
              Comportamiento del Consumidor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {consumerBehavior.map((behavior, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 rounded-sm bg-muted/30">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span className="text-sm leading-relaxed">{behavior}</span>
                </li>
              ))}
            </ul>
            <CopyButton
              text={consumerBehavior.join('\n\n')}
              className="mt-3"
              size="sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Trends */}
      {trends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-cyan-500" />
              Tendencias del Mercado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends.map((trend, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-sm border bg-card border-l-4 border-l-cyan-500">
                  <Badge variant="secondary" className="shrink-0 mt-0.5">
                    {idx + 1}
                  </Badge>
                  <span className="text-sm leading-relaxed">{trend}</span>
                </div>
              ))}
            </div>
            <CopyButton
              text={trends.join('\n\n')}
              className="mt-3"
              size="sm"
            />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Opportunities */}
        {opportunities.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-5 h-5 text-green-500" />
                Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunities.map((opp, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card border-l-4 border-l-green-500">
                  <div className="flex items-start gap-2">
                    <Badge className="bg-green-500/20 text-green-400 shrink-0">
                      {idx + 1}
                    </Badge>
                    <span className="text-sm leading-relaxed">{opp}</span>
                  </div>
                </div>
              ))}
              <CopyButton
                text={opportunities.join('\n\n')}
                className="mt-2"
                size="sm"
              />
            </CardContent>
          </Card>
        )}

        {/* Threats */}
        {threats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Amenazas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {threats.map((threat, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card border-l-4 border-l-red-500">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="border-red-500 text-red-400 shrink-0">
                      {idx + 1}
                    </Badge>
                    <span className="text-sm leading-relaxed">{threat}</span>
                  </div>
                </div>
              ))}
              <CopyButton
                text={threats.join('\n\n')}
                className="mt-2"
                size="sm"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Category Design */}
      {categoryDesign && (
        <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-5 h-5 text-indigo-500" />
              Diseño de Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{categoryDesign}</p>
            <CopyButton text={categoryDesign} className="mt-3" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Legacy: Market State & Awareness (for backwards compatibility) */}
      {(data.market_state || data.awareness_level) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.market_state && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-2">Estado del Mercado</p>
                <Badge variant="secondary" className="capitalize">
                  {data.market_state}
                </Badge>
              </CardContent>
            </Card>
          )}
          {data.awareness_level && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <p className="text-xs text-muted-foreground">Nivel de Consciencia</p>
                </div>
                <Badge className="bg-purple-500/20 text-purple-400">
                  {data.awareness_level}
                </Badge>
                {data.awareness_implication && (
                  <p className="text-xs text-muted-foreground mt-2">{data.awareness_implication}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Legacy: Macro Variables */}
      {data.macro_variables && data.macro_variables.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Variables Macro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.macro_variables.map((mv, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="capitalize">
                      {mv.factor}
                    </Badge>
                    <Badge variant="secondary">
                      Impacto {mv.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{mv.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy: Summary */}
      {data.summary && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-3" size="sm" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
