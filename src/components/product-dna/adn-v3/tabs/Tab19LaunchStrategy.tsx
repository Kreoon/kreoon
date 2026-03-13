/**
 * Tab19LaunchStrategy
 * Estrategia de lanzamiento
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Rocket,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  Users,
  Megaphone,
  Gift,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

interface LaunchPhase {
  phase: string;
  duration: string;
  goals: string[];
  key_activities: Array<{
    activity: string;
    channel: string;
    priority: "high" | "medium" | "low";
  }>;
  success_metrics: string[];
}

interface LaunchOffer {
  name: string;
  type: string;
  description: string;
  value_proposition: string;
  urgency_element: string;
  scarcity_element: string;
  deadline: string;
}

interface LaunchStrategyData {
  launch_overview: {
    launch_type: string;
    total_duration: string;
    primary_goal: string;
    target_revenue: string;
    target_customers: string;
  };
  pre_launch: LaunchPhase;
  launch: LaunchPhase;
  post_launch: LaunchPhase;
  launch_offers: LaunchOffer[];
  waitlist_strategy: {
    incentive: string;
    nurture_sequence: string[];
    engagement_tactics: string[];
  };
  launch_content_calendar: Array<{
    day: number;
    content_type: string;
    message_theme: string;
    channel: string;
    cta: string;
  }>;
  partner_strategy: {
    affiliate_structure: string;
    partner_types: string[];
    outreach_template: string;
  };
  contingency_plans: Array<{
    risk: string;
    mitigation: string;
  }>;
  launch_day_checklist: string[];
  // Backend additional fields
  post_launch_optimization?: {
    first_48_hours: string;
    first_week: string;
    first_month: string;
  };
  summary?: string;
}

interface Tab19LaunchStrategyProps {
  data: LaunchStrategyData | null | undefined;
}

export function Tab19LaunchStrategy({ data }: Tab19LaunchStrategyProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Rocket className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de lanzamiento</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de lanzamiento se generará al completar el research.
        </p>
      </div>
    );
  }

  // Fallback: Si la estructura no coincide o los tipos son incorrectos, usar GenericTabContent
  const rawData = data as Record<string, unknown>;
  const launchOverview = rawData.launch_overview as Record<string, unknown> | undefined;
  const hasValidStructure =
    launchOverview &&
    typeof launchOverview === 'object' &&
    typeof launchOverview.launch_type === 'string' &&
    typeof launchOverview.primary_goal === 'string';

  if (!hasValidStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Estrategia de Lanzamiento"
        icon={<Rocket className="w-4 h-4" />}
      />
    );
  }

  const priorityColors = {
    high: "bg-red-500/20 text-red-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-purple-500/10 border-orange-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Launch Overview */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-orange-500" />
            Visión General del Lanzamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Tipo de Lanzamiento</p>
              <p className="font-medium">{data.launch_overview?.launch_type}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Duración Total</p>
              <p className="font-medium">{data.launch_overview?.total_duration}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Objetivo Principal</p>
              <p className="font-medium">{data.launch_overview?.primary_goal}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Revenue Target</p>
              <p className="font-bold text-green-400">{data.launch_overview?.target_revenue}</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">Clientes Target</p>
              <p className="font-bold">{data.launch_overview?.target_customers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Launch Phases */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fases del Lanzamiento</h3>

        {/* Pre-Launch */}
        {data.pre_launch && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  {data.pre_launch.phase}
                </CardTitle>
                <Badge variant="outline">{data.pre_launch.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Objetivos</p>
                <div className="flex flex-wrap gap-2">
                  {data.pre_launch.goals?.map((goal, idx) => (
                    <Badge key={idx} className="bg-blue-500/20 text-blue-400">{goal}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Actividades Clave</p>
                <div className="space-y-2">
                  {data.pre_launch.key_activities?.map((activity, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[activity.priority]} variant="outline">
                          {activity.priority === "high" ? "Alta" : activity.priority === "medium" ? "Media" : "Baja"}
                        </Badge>
                        <span className="text-sm">{activity.activity}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{activity.channel}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Métricas de Éxito</p>
                <div className="flex flex-wrap gap-2">
                  {data.pre_launch.success_metrics?.map((metric, idx) => (
                    <Badge key={idx} variant="outline">{metric}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Launch */}
        {data.launch && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-orange-500" />
                  {data.launch.phase}
                </CardTitle>
                <Badge variant="outline">{data.launch.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Objetivos</p>
                <div className="flex flex-wrap gap-2">
                  {data.launch.goals?.map((goal, idx) => (
                    <Badge key={idx} className="bg-orange-500/20 text-orange-400">{goal}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Actividades Clave</p>
                <div className="space-y-2">
                  {data.launch.key_activities?.map((activity, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[activity.priority]} variant="outline">
                          {activity.priority === "high" ? "Alta" : activity.priority === "medium" ? "Media" : "Baja"}
                        </Badge>
                        <span className="text-sm">{activity.activity}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{activity.channel}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Métricas de Éxito</p>
                <div className="flex flex-wrap gap-2">
                  {data.launch.success_metrics?.map((metric, idx) => (
                    <Badge key={idx} variant="outline">{metric}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post-Launch */}
        {data.post_launch && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  {data.post_launch.phase}
                </CardTitle>
                <Badge variant="outline">{data.post_launch.duration}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Objetivos</p>
                <div className="flex flex-wrap gap-2">
                  {data.post_launch.goals?.map((goal, idx) => (
                    <Badge key={idx} className="bg-green-500/20 text-green-400">{goal}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Actividades Clave</p>
                <div className="space-y-2">
                  {data.post_launch.key_activities?.map((activity, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={priorityColors[activity.priority]} variant="outline">
                          {activity.priority === "high" ? "Alta" : activity.priority === "medium" ? "Media" : "Baja"}
                        </Badge>
                        <span className="text-sm">{activity.activity}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{activity.channel}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Launch Offers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            Ofertas de Lanzamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.launch_offers?.map((offer, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{offer.name}</h4>
                    <Badge variant="outline" className="mt-1">{offer.type}</Badge>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400">{offer.deadline}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{offer.description}</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-green-400 mb-1">Value Prop</p>
                    <p className="text-sm">{offer.value_proposition}</p>
                  </div>
                  <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                    <p className="text-xs text-orange-400 mb-1">Urgencia</p>
                    <p className="text-sm">{offer.urgency_element}</p>
                  </div>
                  <div className="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-purple-400 mb-1">Escasez</p>
                    <p className="text-sm">{offer.scarcity_element}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Strategy */}
      {data.waitlist_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Estrategia de Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 mb-1">Incentivo de Registro</p>
              <p className="font-medium">{data.waitlist_strategy.incentive}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Secuencia de Nurturing</p>
              <div className="space-y-2">
                {data.waitlist_strategy.nurture_sequence?.map((email, idx) => (
                  <div key={idx} className="p-2 rounded bg-muted/50 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Email {idx + 1}</Badge>
                    <span className="text-sm">{email}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Tácticas de Engagement</p>
              <ul className="space-y-1">
                {data.waitlist_strategy.engagement_tactics?.map((tactic, idx) => (
                  <li key={idx} className="text-sm">• {tactic}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Launch Content Calendar */}
      {data.launch_content_calendar && data.launch_content_calendar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              Calendario de Contenido de Lanzamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.launch_content_calendar.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500/20 text-purple-400">Día {item.day}</Badge>
                      <Badge variant="outline">{item.content_type}</Badge>
                      <Badge variant="secondary">{item.channel}</Badge>
                    </div>
                  </div>
                  <p className="text-sm mb-2">{item.message_theme}</p>
                  <div className="flex items-center justify-between">
                    <Badge className="bg-green-500/20 text-green-400">CTA: {item.cta}</Badge>
                    <CopyButton text={item.message_theme} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner Strategy */}
      {data.partner_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-green-500" />
              Estrategia de Partners/Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Estructura de Comisiones</p>
              <p className="font-medium">{data.partner_strategy.affiliate_structure}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Tipos de Partners</p>
              <div className="flex flex-wrap gap-2">
                {data.partner_strategy.partner_types?.map((type, idx) => (
                  <Badge key={idx} variant="secondary">{type}</Badge>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-400 mb-1">Template de Outreach</p>
              <p className="text-sm whitespace-pre-wrap">{data.partner_strategy.outreach_template}</p>
              <CopyButton text={data.partner_strategy.outreach_template} className="mt-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Launch Day Checklist & Contingency */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Checklist Día de Lanzamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.launch_day_checklist?.map((item, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-muted/50 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Planes de Contingencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.contingency_plans?.map((plan, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-yellow-400">{plan.risk}</p>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">→ {plan.mitigation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post-Launch Optimization - Backend field */}
      {data.post_launch_optimization && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Optimización Post-Lanzamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <p className="text-xs text-emerald-400 font-medium">Primeras 48 Horas</p>
                </div>
                <p className="text-sm">{data.post_launch_optimization.first_48_hours}</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <p className="text-xs text-blue-400 font-medium">Primera Semana</p>
                </div>
                <p className="text-sm">{data.post_launch_optimization.first_week}</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <p className="text-xs text-purple-400 font-medium">Primer Mes</p>
                </div>
                <p className="text-sm">{data.post_launch_optimization.first_month}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
