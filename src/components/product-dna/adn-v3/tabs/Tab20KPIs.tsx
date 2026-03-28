/**
 * Tab20KPIs
 * Dashboard de KPIs y métricas clave
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  ShoppingCart,
  Eye,
  MousePointer,
  Clock,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Globe,
  Mail,
  Megaphone,
} from "lucide-react";
import { GenericTabContent } from "./GenericTabContent";

interface KPIMetric {
  name: string;
  description: string;
  formula: string;
  target: string;
  benchmark: string;
  importance: "critical" | "high" | "medium";
  tracking_frequency: string;
}

interface KPICategory {
  category: string;
  metrics: KPIMetric[];
}

interface ChannelMetrics {
  primary: string[];
  secondary: string[];
}

interface KPIsData {
  north_star_metric: {
    metric: string;
    definition: string;
    target: string;
    current_baseline: string;
    growth_rate_target: string;
  };
  primary_kpis: KPICategory[];
  funnel_metrics: Array<{
    stage: string;
    metric: string;
    target: string;
    formula: string;
  }>;
  // Backend additional field
  channel_metrics?: {
    organic_social?: ChannelMetrics;
    paid_social?: ChannelMetrics;
    email?: ChannelMetrics;
    website?: ChannelMetrics;
  };
  cohort_metrics: Array<{
    cohort: string;
    metrics: string[];
  }>;
  leading_indicators: string[];
  lagging_indicators: string[];
  dashboard_recommendations: Array<{
    dashboard: string;
    metrics_to_include: string[];
    refresh_frequency: string;
  }>;
  alert_thresholds: Array<{
    metric: string;
    warning_threshold: string;
    critical_threshold: string;
    action: string;
  }>;
  reporting_cadence: Array<{
    frequency: string;
    metrics: string[];
    audience: string;
  }>;
  // Backend additional fields
  tools_recommended?: Array<{
    tool: string;
    use_case: string;
    priority: "must_have" | "nice_to_have";
  }>;
  summary?: string;
}

interface Tab20KPIsProps {
  data: KPIsData | null | undefined;
}

export function Tab20KPIs({ data }: Tab20KPIsProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin KPIs definidos</h3>
        <p className="text-sm text-muted-foreground">
          Los KPIs y métricas se generarán al completar el research.
        </p>
      </div>
    );
  }

  // Fallback: Si la estructura no coincide o los tipos son incorrectos, usar GenericTabContent
  const rawData = data as Record<string, unknown>;
  const northStarMetric = rawData.north_star_metric as Record<string, unknown> | undefined;
  const hasValidStructure =
    northStarMetric &&
    typeof northStarMetric === 'object' &&
    typeof northStarMetric.metric === 'string' &&
    typeof northStarMetric.target === 'string';

  if (!hasValidStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="KPIs y Métricas"
        icon={<BarChart3 className="w-4 h-4" />}
      />
    );
  }

  const importanceColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  const categoryIcons: Record<string, any> = {
    acquisition: Users,
    activation: MousePointer,
    retention: Repeat,
    revenue: DollarSign,
    referral: Users,
    engagement: Eye,
    conversion: ShoppingCart,
    growth: TrendingUp,
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* North Star Metric */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-500" />
            North Star Metric
          </CardTitle>
          <CardDescription>
            La métrica más importante que define el éxito del negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-6 rounded-sm bg-background/50">
            <p className="text-2xl font-bold text-yellow-400 mb-2">{data.north_star_metric?.metric}</p>
            <p className="text-sm text-muted-foreground">{data.north_star_metric?.definition}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-sm bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Target</p>
              <p className="font-bold text-lg text-green-400">{data.north_star_metric?.target}</p>
            </div>
            <div className="p-3 rounded-sm bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Baseline Actual</p>
              <p className="font-medium">{data.north_star_metric?.current_baseline}</p>
            </div>
            <div className="p-3 rounded-sm bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Growth Target</p>
              <p className="font-bold text-blue-400">{data.north_star_metric?.growth_rate_target}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            Métricas del Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.funnel_metrics?.map((stage, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stage.stage}</p>
                      <p className="text-sm text-muted-foreground">{stage.metric}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400">{stage.target}</Badge>
                </div>
                <div className="pl-11">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono bg-muted px-1 rounded">{stage.formula}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Primary KPIs by Category */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">KPIs Primarios por Categoría</h3>
        {data.primary_kpis?.map((category, idx) => {
          const Icon = categoryIcons[category.category.toLowerCase()] || BarChart3;
          return (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-purple-500" />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.metrics?.map((metric, mIdx) => (
                    <div key={mIdx} className={`p-4 rounded-sm border ${importanceColors[metric.importance]}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{metric.name}</h4>
                          <p className="text-sm text-muted-foreground">{metric.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-1">
                            {metric.importance === "critical" ? "Crítico" :
                             metric.importance === "high" ? "Alto" : "Medio"}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{metric.tracking_frequency}</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3 mt-3">
                        <div className="p-2 rounded bg-background/50">
                          <p className="text-xs text-muted-foreground mb-1">Fórmula</p>
                          <p className="text-xs font-mono">{metric.formula}</p>
                        </div>
                        <div className="p-2 rounded bg-background/50">
                          <p className="text-xs text-muted-foreground mb-1">Target</p>
                          <p className="text-sm font-medium text-green-400">{metric.target}</p>
                        </div>
                        <div className="p-2 rounded bg-background/50">
                          <p className="text-xs text-muted-foreground mb-1">Benchmark</p>
                          <p className="text-sm">{metric.benchmark}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Leading vs Lagging Indicators */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Leading Indicators
            </CardTitle>
            <CardDescription>Métricas predictivas del futuro</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.leading_indicators?.map((indicator, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-green-500/10 border border-green-500/20 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {indicator}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Lagging Indicators
            </CardTitle>
            <CardDescription>Métricas de resultados pasados</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.lagging_indicators?.map((indicator, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  {indicator}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Umbrales de Alerta
          </CardTitle>
          <CardDescription>
            Cuándo tomar acción basado en métricas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.alert_thresholds?.map((alert, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{alert.metric}</h4>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400 mb-1">Warning</p>
                    <p className="text-sm font-medium">{alert.warning_threshold}</p>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 mb-1">Critical</p>
                    <p className="text-sm font-medium">{alert.critical_threshold}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Acción</p>
                    <p className="text-sm">{alert.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Dashboards Recomendados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.dashboard_recommendations?.map((dash, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{dash.dashboard}</h4>
                  <Badge variant="outline">{dash.refresh_frequency}</Badge>
                </div>
                <div className="space-y-1">
                  {dash.metrics_to_include?.map((metric, mIdx) => (
                    <div key={mIdx} className="text-xs p-1.5 rounded bg-muted/50 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      {metric}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reporting Cadence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Cadencia de Reportes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.reporting_cadence?.map((report, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-orange-500/20 text-orange-400">{report.frequency}</Badge>
                  <span className="text-sm text-muted-foreground">Para: {report.audience}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.metrics?.map((metric, mIdx) => (
                    <Badge key={mIdx} variant="secondary">{metric}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cohort Metrics */}
      {data.cohort_metrics && data.cohort_metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Métricas por Cohorte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.cohort_metrics.map((cohort, idx) => (
                <div key={idx} className="p-4 rounded-sm border bg-card">
                  <h4 className="font-medium mb-2">{cohort.cohort}</h4>
                  <div className="flex flex-wrap gap-1">
                    {cohort.metrics?.map((metric, mIdx) => (
                      <Badge key={mIdx} variant="outline" className="text-xs">{metric}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Metrics - Backend field */}
      {data.channel_metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-500" />
              Métricas por Canal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.channel_metrics.organic_social && (
                <div className="p-4 rounded-sm border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-pink-500" />
                    <h4 className="font-medium">Social Orgánico</h4>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Primarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.organic_social.primary?.map((m, idx) => (
                        <Badge key={idx} className="text-xs bg-pink-500/20 text-pink-400">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Secundarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.organic_social.secondary?.map((m, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {data.channel_metrics.paid_social && (
                <div className="p-4 rounded-sm border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="w-4 h-4 text-blue-500" />
                    <h4 className="font-medium">Paid Social</h4>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Primarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.paid_social.primary?.map((m, idx) => (
                        <Badge key={idx} className="text-xs bg-blue-500/20 text-blue-400">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Secundarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.paid_social.secondary?.map((m, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {data.channel_metrics.email && (
                <div className="p-4 rounded-sm border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4 text-purple-500" />
                    <h4 className="font-medium">Email</h4>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Primarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.email.primary?.map((m, idx) => (
                        <Badge key={idx} className="text-xs bg-purple-500/20 text-purple-400">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Secundarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.email.secondary?.map((m, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {data.channel_metrics.website && (
                <div className="p-4 rounded-sm border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-green-500" />
                    <h4 className="font-medium">Website</h4>
                  </div>
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Primarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.website.primary?.map((m, idx) => (
                        <Badge key={idx} className="text-xs bg-green-500/20 text-green-400">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Secundarias</p>
                    <div className="flex flex-wrap gap-1">
                      {data.channel_metrics.website.secondary?.map((m, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools Recommended - Backend field */}
      {data.tools_recommended && data.tools_recommended.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gray-500" />
              Herramientas Recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.tools_recommended.map((tool, idx) => (
                <div key={idx} className="p-4 rounded-sm border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{tool.tool}</h4>
                    <Badge
                      className={tool.priority === "must_have"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-gray-500/20 text-gray-400"
                      }
                    >
                      {tool.priority === "must_have" ? "Esencial" : "Opcional"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{tool.use_case}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
