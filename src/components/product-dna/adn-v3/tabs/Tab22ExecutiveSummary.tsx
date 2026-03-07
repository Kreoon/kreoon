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
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface ExecutiveSummaryData {
  one_liner: string;
  key_insights: Array<{
    category: string;
    insight: string;
    impact: "high" | "medium" | "low";
  }>;
  strategic_priorities: Array<{
    priority: number;
    action: string;
    expected_outcome: string;
    timeline: string;
  }>;
  quick_wins: string[];
  risks_and_mitigations: Array<{
    risk: string;
    mitigation: string;
    severity: "high" | "medium" | "low";
  }>;
  budget_allocation: Array<{
    channel: string;
    percentage: number;
    rationale: string;
  }>;
  success_metrics: Array<{
    metric: string;
    target: string;
    timeline: string;
  }>;
  next_steps_30_days: string[];
}

interface Tab22ExecutiveSummaryProps {
  data: ExecutiveSummaryData | null | undefined;
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

  const impactColors = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  const severityColors = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="space-y-6">
      {/* One-Liner Hero */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Resumen en una frase
              </p>
              <p className="text-xl font-medium leading-relaxed">
                "{data.one_liner}"
              </p>
            </div>
            <CopyButton text={data.one_liner} />
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Insights Clave
          </CardTitle>
          <CardDescription>
            Los hallazgos más importantes del análisis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.key_insights?.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <Badge
                variant="outline"
                className={impactColors[insight.impact]}
              >
                {insight.category}
              </Badge>
              <p className="flex-1 text-sm">{insight.insight}</p>
              <CopyButton text={insight.insight} size="sm" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Strategic Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Prioridades Estratégicas
          </CardTitle>
          <CardDescription>
            Acciones ordenadas por impacto y urgencia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.strategic_priorities?.map((priority, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-4 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {priority.priority}
                </span>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Wins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-green-500" />
              Quick Wins
            </CardTitle>
            <CardDescription>Acciones de bajo esfuerzo y alto impacto</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.quick_wins?.map((win, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{win}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Risks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Riesgos y Mitigaciones
            </CardTitle>
            <CardDescription>Amenazas identificadas y cómo abordarlas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.risks_and_mitigations?.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={severityColors[item.severity]}
                  >
                    {item.severity === "high"
                      ? "Alto"
                      : item.severity === "medium"
                      ? "Medio"
                      : "Bajo"}
                  </Badge>
                  <span className="text-sm font-medium">{item.risk}</span>
                </div>
                <p className="text-sm text-muted-foreground pl-4">
                  → {item.mitigation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Budget Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Distribución de Presupuesto Recomendada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.budget_allocation?.map((item, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.channel}</span>
                <span className="text-sm text-muted-foreground">
                  {item.percentage}%
                </span>
              </div>
              <Progress value={item.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">{item.rationale}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Métricas de Éxito
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.success_metrics?.map((metric, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border bg-muted/30 space-y-1"
              >
                <p className="text-sm text-muted-foreground">{metric.metric}</p>
                <p className="text-lg font-bold">{metric.target}</p>
                <p className="text-xs text-muted-foreground">{metric.timeline}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next 30 Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Próximos 30 Días
          </CardTitle>
          <CardDescription>Plan de acción inmediato</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {data.next_steps_30_days?.map((step, idx) => (
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
    </div>
  );
}
