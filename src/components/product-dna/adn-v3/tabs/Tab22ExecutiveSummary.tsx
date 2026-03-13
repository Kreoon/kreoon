/**
 * Tab22ExecutiveSummary
 * Resumen ejecutivo con insights clave y recomendaciones
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  Target,
  Lightbulb,
  AlertTriangle,
  Rocket,
  CheckCircle2,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Sparkles,
  Zap,
  Eye,
  MessageSquare,
  Megaphone,
  ShieldAlert,
  Star,
  ArrowRight,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-22-executive-summary.ts)
interface KiroInsight {
  number: number;
  type: string;
  title: string;
  insight: string;
  action: string;
  impact: "alto" | "medio" | "high" | "medium";
  urgency: string;
}

interface ActionPlanPhase {
  theme: string;
  actions: string[];
  deliverable: string;
  success_metric: string;
}

interface QuickWin {
  win: string;
  why: string;
  how: string;
}

interface ExecutiveSummaryData {
  // Backend structure (step-22)
  executive_summary?: {
    opportunity_score: number;
    opportunity_score_justification: string;
    one_liner: string;
    para_1_situation: string;
    para_2_opportunity: string;
    para_3_strategy: string;
    para_4_execution: string;
    para_5_projection: string;
  };
  emotional_audio_insights?: {
    founder_strengths_detected: string[];
    blind_spots_to_address: string[];
    authentic_story_angle: string;
    tone_recommendation: string;
  };
  brand_dna_coherence?: {
    alignment_score: number;
    alignment_notes: string;
    tension_points: string[];
    reinforcement_opportunities: string[];
  };
  kiro_insights?: KiroInsight[];
  action_plan_90_days?: {
    week_1_2?: ActionPlanPhase;
    week_3_4?: ActionPlanPhase;
    week_5_8?: ActionPlanPhase;
    week_9_12?: ActionPlanPhase;
  };
  quick_wins?: QuickWin[] | string[];
  final_recommendation?: string;

  // Legacy structure (compatibility)
  one_liner?: string;
  key_insights?: Array<{
    category: string;
    insight: string;
    impact: "high" | "medium" | "low";
  }>;
  strategic_priorities?: Array<{
    priority: number;
    action: string;
    expected_outcome: string;
    timeline: string;
  }>;
  risks_and_mitigations?: Array<{
    risk: string;
    mitigation: string;
    severity: "high" | "medium" | "low";
  }>;
  budget_allocation?: Array<{
    channel: string;
    percentage: number;
    rationale: string;
  }>;
  success_metrics?: Array<{
    metric: string;
    target: string;
    timeline: string;
  }>;
  next_steps_30_days?: string[];
}

interface Tab22ExecutiveSummaryProps {
  data: ExecutiveSummaryData | null | undefined;
}

// Helper para obtener icono de tipo de insight KIRO
function getInsightIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    oportunidad_oculta: <Eye className="w-4 h-4" />,
    punto_fragil: <ShieldAlert className="w-4 h-4" />,
    creativo_a_probar: <Sparkles className="w-4 h-4" />,
    audiencia_ignorada: <Users className="w-4 h-4" />,
    mensaje_contraintuitivo: <MessageSquare className="w-4 h-4" />,
    canal_subestimado: <Megaphone className="w-4 h-4" />,
    producto_expansion: <Rocket className="w-4 h-4" />,
    proximo_gran_movimiento: <Star className="w-4 h-4" />,
  };
  return icons[type] || <Lightbulb className="w-4 h-4" />;
}

function getInsightColor(type: string) {
  const colors: Record<string, string> = {
    oportunidad_oculta: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    punto_fragil: "from-red-500/20 to-orange-500/20 border-red-500/30",
    creativo_a_probar: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
    audiencia_ignorada: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    mensaje_contraintuitivo: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
    canal_subestimado: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
    producto_expansion: "from-teal-500/20 to-green-500/20 border-teal-500/30",
    proximo_gran_movimiento: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
  };
  return colors[type] || "from-gray-500/20 to-gray-400/20 border-gray-500/30";
}

export function Tab22ExecutiveSummary({ data }: Tab22ExecutiveSummaryProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin resumen ejecutivo</h3>
        <p className="text-sm text-muted-foreground">
          El resumen ejecutivo se generará al completar el análisis.
        </p>
      </div>
    );
  }

  const rawData = data as Record<string, unknown>;

  // Soportar tanto estructura backend (executive_summary) como legacy (one_liner directo)
  const execSummary = data.executive_summary;
  const oneLiner = execSummary?.one_liner || data.one_liner;
  const hasBackendStructure = !!execSummary || !!data.kiro_insights;
  const hasLegacyStructure = !!data.one_liner && !!data.key_insights;

  if (!hasBackendStructure && !hasLegacyStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Resumen Ejecutivo"
        icon={<ClipboardList className="w-4 h-4" />}
      />
    );
  }

  const impactColors = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    alto: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    medio: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  const severityColors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Opportunity Score (Backend) */}
      {execSummary?.opportunity_score && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-yellow-400">
                  {execSummary.opportunity_score}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Opportunity Score</p>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="flex-1">
                <p className="text-sm leading-relaxed">
                  {execSummary.opportunity_score_justification}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* One-Liner Hero */}
      {oneLiner && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Resumen en una frase
                </p>
                <p className="text-xl font-medium leading-relaxed">
                  "{oneLiner}"
                </p>
              </div>
              <CopyButton text={oneLiner} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Executive Summary Paragraphs (Backend) */}
      {execSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-500" />
              Análisis Ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {execSummary.para_1_situation && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-xs text-blue-400 mb-2 font-medium">Situación Actual</p>
                <p className="text-sm leading-relaxed">{execSummary.para_1_situation}</p>
              </div>
            )}
            {execSummary.para_2_opportunity && (
              <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                <p className="text-xs text-green-400 mb-2 font-medium">Oportunidad Identificada</p>
                <p className="text-sm leading-relaxed">{execSummary.para_2_opportunity}</p>
              </div>
            )}
            {execSummary.para_3_strategy && (
              <div className="p-4 rounded-lg border bg-purple-500/5 border-purple-500/20">
                <p className="text-xs text-purple-400 mb-2 font-medium">Estrategia Central</p>
                <p className="text-sm leading-relaxed">{execSummary.para_3_strategy}</p>
              </div>
            )}
            {execSummary.para_4_execution && (
              <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/20">
                <p className="text-xs text-orange-400 mb-2 font-medium">Próximas 2 Semanas</p>
                <p className="text-sm leading-relaxed">{execSummary.para_4_execution}</p>
              </div>
            )}
            {execSummary.para_5_projection && (
              <div className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                <p className="text-xs text-yellow-400 mb-2 font-medium">Proyección 90 Días</p>
                <p className="text-sm leading-relaxed">{execSummary.para_5_projection}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KIRO Insights (Backend) */}
      {data.kiro_insights && data.kiro_insights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <div>
              <h2 className="text-xl font-bold">KIRO Insights</h2>
              <p className="text-sm text-muted-foreground">
                {data.kiro_insights.length} insights únicos generados por KIRO
              </p>
            </div>
          </div>
          <div className="grid gap-4">
            {data.kiro_insights.map((insight, idx) => (
              <Card
                key={idx}
                className={`bg-gradient-to-br ${getInsightColor(insight.type)} overflow-hidden`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">
                          {insight.type.replace(/_/g, " ")}
                        </Badge>
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={impactColors[insight.impact as keyof typeof impactColors] || impactColors.medium}>
                        {insight.impact === "alto" || insight.impact === "high" ? "Alto Impacto" : "Medio Impacto"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {insight.urgency?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{insight.insight}</p>
                  <div className="p-3 rounded-lg bg-background/50 border">
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Acción a tomar</p>
                        <p className="text-sm font-medium">{insight.action}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan 90 Days (Backend) */}
      {data.action_plan_90_days && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Plan de Acción 90 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.action_plan_90_days.week_1_2 && (
                <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20">
                  <Badge className="bg-blue-500/20 text-blue-400 mb-2">Semana 1-2</Badge>
                  <p className="font-medium text-sm mb-2">{data.action_plan_90_days.week_1_2.theme}</p>
                  <ul className="space-y-1 mb-3">
                    {data.action_plan_90_days.week_1_2.actions?.map((a, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                        <CheckCircle2 className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs p-2 rounded bg-background/50">
                    <p className="text-muted-foreground">Entregable: {data.action_plan_90_days.week_1_2.deliverable}</p>
                  </div>
                </div>
              )}
              {data.action_plan_90_days.week_3_4 && (
                <div className="p-4 rounded-lg border bg-purple-500/5 border-purple-500/20">
                  <Badge className="bg-purple-500/20 text-purple-400 mb-2">Semana 3-4</Badge>
                  <p className="font-medium text-sm mb-2">{data.action_plan_90_days.week_3_4.theme}</p>
                  <ul className="space-y-1 mb-3">
                    {data.action_plan_90_days.week_3_4.actions?.map((a, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs p-2 rounded bg-background/50">
                    <p className="text-muted-foreground">Entregable: {data.action_plan_90_days.week_3_4.deliverable}</p>
                  </div>
                </div>
              )}
              {data.action_plan_90_days.week_5_8 && (
                <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                  <Badge className="bg-green-500/20 text-green-400 mb-2">Semana 5-8</Badge>
                  <p className="font-medium text-sm mb-2">{data.action_plan_90_days.week_5_8.theme}</p>
                  <ul className="space-y-1 mb-3">
                    {data.action_plan_90_days.week_5_8.actions?.map((a, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs p-2 rounded bg-background/50">
                    <p className="text-muted-foreground">Entregable: {data.action_plan_90_days.week_5_8.deliverable}</p>
                  </div>
                </div>
              )}
              {data.action_plan_90_days.week_9_12 && (
                <div className="p-4 rounded-lg border bg-orange-500/5 border-orange-500/20">
                  <Badge className="bg-orange-500/20 text-orange-400 mb-2">Semana 9-12</Badge>
                  <p className="font-medium text-sm mb-2">{data.action_plan_90_days.week_9_12.theme}</p>
                  <ul className="space-y-1 mb-3">
                    {data.action_plan_90_days.week_9_12.actions?.map((a, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                        <CheckCircle2 className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs p-2 rounded bg-background/50">
                    <p className="text-muted-foreground">Entregable: {data.action_plan_90_days.week_9_12.deliverable}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Wins */}
      {data.quick_wins && data.quick_wins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Wins
            </CardTitle>
            <CardDescription>Acciones de impacto rápido (menos de 24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.quick_wins.map((win, idx) => {
                // Soportar ambos formatos: objeto {win, why, how} o string simple
                const isObject = typeof win === 'object' && win !== null;
                const winObj = isObject ? (win as QuickWin) : null;
                const winText = isObject ? winObj?.win : (win as string);

                return (
                  <div key={idx} className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                    <div className="flex items-start gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="font-medium text-sm">{winText}</p>
                    </div>
                    {winObj?.why && (
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="text-yellow-400">Por qué:</span> {winObj.why}
                      </p>
                    )}
                    {winObj?.how && (
                      <p className="text-xs text-muted-foreground">
                        <span className="text-green-400">Cómo:</span> {winObj.how}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Audio Insights (Backend) */}
      {data.emotional_audio_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-500" />
              Insights del Audio del Fundador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {data.emotional_audio_insights.founder_strengths_detected &&
               data.emotional_audio_insights.founder_strengths_detected.length > 0 && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-2 font-medium">Fortalezas Detectadas</p>
                  <ul className="space-y-1">
                    {data.emotional_audio_insights.founder_strengths_detected.map((s, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.emotional_audio_insights.blind_spots_to_address &&
               data.emotional_audio_insights.blind_spots_to_address.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400 mb-2 font-medium">Puntos Ciegos a Abordar</p>
                  <ul className="space-y-1">
                    {data.emotional_audio_insights.blind_spots_to_address.map((s, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {data.emotional_audio_insights.authentic_story_angle && (
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-purple-400 mb-2">Ángulo de Historia Auténtico</p>
                <p className="text-sm">{data.emotional_audio_insights.authentic_story_angle}</p>
              </div>
            )}
            {data.emotional_audio_insights.tone_recommendation && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Recomendación de Tono</p>
                <p className="text-sm font-medium">{data.emotional_audio_insights.tone_recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final Recommendation (Backend) */}
      {data.final_recommendation && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Recomendación Final de KIRO
                </p>
                <p className="text-lg font-medium leading-relaxed">
                  {data.final_recommendation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy: Key Insights */}
      {data.key_insights && data.key_insights.length > 0 && !data.kiro_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Insights Clave
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.key_insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Badge variant="outline" className={impactColors[insight.impact]}>
                  {insight.category}
                </Badge>
                <p className="flex-1 text-sm">{insight.insight}</p>
                <CopyButton text={insight.insight} size="sm" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legacy: Strategic Priorities */}
      {data.strategic_priorities && data.strategic_priorities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Prioridades Estratégicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.strategic_priorities.map((priority, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-lg border bg-card">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{priority.priority}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{priority.action}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {priority.expected_outcome}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {priority.timeline}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legacy: Risks */}
      {data.risks_and_mitigations && data.risks_and_mitigations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Riesgos y Mitigaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.risks_and_mitigations.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={severityColors[item.severity]}>
                    {item.severity === "high" ? "Alto" : item.severity === "medium" ? "Medio" : "Bajo"}
                  </Badge>
                  <span className="text-sm font-medium">{item.risk}</span>
                </div>
                <p className="text-sm text-muted-foreground pl-4">→ {item.mitigation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legacy: Budget Allocation */}
      {data.budget_allocation && data.budget_allocation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Distribución de Presupuesto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budget_allocation.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.channel}</span>
                  <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                </div>
                <Progress value={item.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground">{item.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legacy: Next 30 Days */}
      {data.next_steps_30_days && data.next_steps_30_days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Próximos 30 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {data.next_steps_30_days.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
