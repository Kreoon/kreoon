/**
 * Tab03JTBD
 * Jobs To Be Done - Trabajos del cliente
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Target,
  Zap,
  Heart,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-03-jtbd.ts)
interface BackendJTBDData {
  main_job?: {
    job_statement?: string;
    job_type?: string;
    frequency?: string;
    importance?: number;
  };
  functional_jobs?: Array<{
    job?: string;
    current_solution?: string;
    pain_with_current?: string;
    desired_outcome?: string;
  }>;
  emotional_jobs?: Array<{
    job?: string;
    feeling_sought?: string;
    feeling_avoided?: string;
  }>;
  social_jobs?: Array<{
    job?: string;
    perception_desired?: string;
    group_identity?: string;
  }>;
  hiring_triggers?: Array<{
    trigger?: string;
    urgency?: string;
    emotional_state?: string;
  }>;
  firing_triggers?: Array<{
    trigger?: string;
    last_straw?: string;
  }>;
  progress_makers?: Array<{
    force?: string;
    type?: string;
    strength?: string;
  }>;
  progress_blockers?: Array<{
    force?: string;
    type?: string;
    how_to_overcome?: string;
  }>;
  timeline?: {
    first_thought?: string;
    passive_looking?: string;
    active_looking?: string;
    decision?: string;
    post_purchase?: string;
  };
  summary?: string;
}

interface Tab03JTBDProps {
  data: BackendJTBDData | null | undefined;
}

const urgencyColors: Record<string, string> = {
  alta: "bg-red-500/20 text-red-400",
  media: "bg-yellow-500/20 text-yellow-400",
  baja: "bg-green-500/20 text-green-400",
  high: "bg-red-500/20 text-red-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-green-500/20 text-green-400",
};

const strengthColors: Record<string, string> = {
  fuerte: "text-green-400",
  moderada: "text-yellow-400",
  débil: "text-red-400",
  debil: "text-red-400",
  strong: "text-green-400",
  moderate: "text-yellow-400",
  weak: "text-red-400",
};

export function Tab03JTBD({ data }: Tab03JTBDProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Briefcase className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin Jobs To Be Done</h3>
        <p className="text-sm text-muted-foreground">
          El análisis JTBD se generará al completar el research.
        </p>
      </div>
    );
  }

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.main_job ||
    rawData.functional_jobs ||
    rawData.hiring_triggers ||
    rawData.progress_makers;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Jobs To Be Done"
        icon={<Briefcase className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Resumen JTBD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-3" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Main Job */}
      {data.main_job && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-blue-500" />
              Job Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-sm bg-muted/50">
              <p className="text-lg font-medium leading-relaxed">{data.main_job.job_statement}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.main_job.job_type && (
                <Badge variant="secondary" className="capitalize">{data.main_job.job_type}</Badge>
              )}
              {data.main_job.frequency && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {data.main_job.frequency}
                </Badge>
              )}
              {data.main_job.importance && (
                <Badge className="bg-blue-500/20 text-blue-400">
                  Importancia: {data.main_job.importance}/10
                </Badge>
              )}
            </div>
            <CopyButton text={data.main_job.job_statement || ""} size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Functional Jobs */}
      {data.functional_jobs && data.functional_jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-5 h-5 text-blue-500" />
              Jobs Funcionales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.functional_jobs.map((job, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <p className="font-medium text-sm mb-3">{job.job}</p>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  {job.current_solution && (
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground mb-1">Solución Actual</p>
                      <p>{job.current_solution}</p>
                    </div>
                  )}
                  {job.pain_with_current && (
                    <div className="p-2 rounded bg-red-500/10">
                      <p className="text-red-400 mb-1">Dolor</p>
                      <p>{job.pain_with_current}</p>
                    </div>
                  )}
                  {job.desired_outcome && (
                    <div className="p-2 rounded bg-green-500/10">
                      <p className="text-green-400 mb-1">Resultado Deseado</p>
                      <p>{job.desired_outcome}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Emotional Jobs */}
      {data.emotional_jobs && data.emotional_jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-5 h-5 text-pink-500" />
              Jobs Emocionales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.emotional_jobs.map((job, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <p className="font-medium text-sm mb-3">{job.job}</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {job.feeling_sought && (
                    <div className="p-2 rounded bg-green-500/10 border-l-2 border-l-green-500">
                      <p className="text-green-400 mb-1">Sentimiento Buscado</p>
                      <p>{job.feeling_sought}</p>
                    </div>
                  )}
                  {job.feeling_avoided && (
                    <div className="p-2 rounded bg-red-500/10 border-l-2 border-l-red-500">
                      <p className="text-red-400 mb-1">Sentimiento Evitado</p>
                      <p>{job.feeling_avoided}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Social Jobs */}
      {data.social_jobs && data.social_jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-purple-500" />
              Jobs Sociales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.social_jobs.map((job, idx) => (
              <div key={idx} className="p-4 rounded-sm border bg-card">
                <p className="font-medium text-sm mb-3">{job.job}</p>
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {job.perception_desired && (
                    <div className="p-2 rounded bg-purple-500/10">
                      <p className="text-purple-400 mb-1">Percepción Deseada</p>
                      <p>{job.perception_desired}</p>
                    </div>
                  )}
                  {job.group_identity && (
                    <div className="p-2 rounded bg-blue-500/10">
                      <p className="text-blue-400 mb-1">Identidad de Grupo</p>
                      <p>{job.group_identity}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Hiring Triggers */}
        {data.hiring_triggers && data.hiring_triggers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Disparadores de Contratación
              </CardTitle>
              <CardDescription>Qué hace que busquen una solución</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.hiring_triggers.map((trigger, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm">{trigger.trigger}</span>
                    {trigger.urgency && (
                      <Badge className={urgencyColors[trigger.urgency.toLowerCase()] || "bg-muted"}>
                        {trigger.urgency}
                      </Badge>
                    )}
                  </div>
                  {trigger.emotional_state && (
                    <p className="text-xs text-muted-foreground">
                      Estado: {trigger.emotional_state}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Firing Triggers */}
        {data.firing_triggers && data.firing_triggers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Disparadores de Abandono
              </CardTitle>
              <CardDescription>Qué hace que dejen la solución actual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.firing_triggers.map((trigger, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card border-l-4 border-l-red-500">
                  <p className="font-medium text-sm mb-1">{trigger.trigger}</p>
                  {trigger.last_straw && (
                    <p className="text-xs text-red-400">
                      La gota: {trigger.last_straw}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Progress Makers */}
        {data.progress_makers && data.progress_makers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-yellow-500" />
                Fuerzas de Progreso
              </CardTitle>
              <CardDescription>Qué empuja hacia el cambio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.progress_makers.map((maker, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-sm">{maker.force}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {maker.type && (
                      <Badge variant="outline" className="text-xs">
                        {maker.type === "push_away" ? "Empuja lejos" : "Atrae hacia"}
                      </Badge>
                    )}
                    {maker.strength && (
                      <span className={`text-xs ${strengthColors[maker.strength.toLowerCase()] || ""}`}>
                        {maker.strength}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Progress Blockers */}
        {data.progress_blockers && data.progress_blockers.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Bloqueadores de Progreso
              </CardTitle>
              <CardDescription>Qué frena el cambio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.progress_blockers.map((blocker, idx) => (
                <div key={idx} className="p-3 rounded-sm border bg-card">
                  <p className="font-medium text-sm mb-2">{blocker.force}</p>
                  {blocker.type && (
                    <Badge variant="outline" className="text-xs mb-2">
                      {blocker.type === "anxiety" ? "Ansiedad" : "Hábito"}
                    </Badge>
                  )}
                  {blocker.how_to_overcome && (
                    <div className="p-2 rounded bg-green-500/10 mt-2">
                      <p className="text-xs text-green-400">Cómo superar: {blocker.how_to_overcome}</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Timeline */}
      {data.timeline && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-blue-500" />
              Timeline del Comprador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.timeline.first_thought && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Primer Pensamiento</p>
                    <p className="text-sm">{data.timeline.first_thought}</p>
                  </div>
                </div>
              )}
              {data.timeline.passive_looking && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-yellow-400">2</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Búsqueda Pasiva</p>
                    <p className="text-sm">{data.timeline.passive_looking}</p>
                  </div>
                </div>
              )}
              {data.timeline.active_looking && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-orange-400">3</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Búsqueda Activa</p>
                    <p className="text-sm">{data.timeline.active_looking}</p>
                  </div>
                </div>
              )}
              {data.timeline.decision && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-green-400">4</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Decisión</p>
                    <p className="text-sm">{data.timeline.decision}</p>
                  </div>
                </div>
              )}
              {data.timeline.post_purchase && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-purple-400">5</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Post-Compra</p>
                    <p className="text-sm">{data.timeline.post_purchase}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
