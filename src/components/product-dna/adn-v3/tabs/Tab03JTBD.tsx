/**
 * Tab03JTBD
 * Jobs To Be Done - Trabajos del cliente
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Target,
  Zap,
  Heart,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { cn } from "@/lib/utils";

interface Job {
  job_statement: string;
  job_type: "functional" | "emotional" | "social";
  importance: number;
  satisfaction_current: number;
  opportunity_score: number;
  context: string;
  desired_outcome: string;
  success_criteria: string[];
  barriers: string[];
  current_solutions: string[];
  our_solution_fit: string;
}

interface JTBDData {
  main_job: {
    statement: string;
    description: string;
    why_matters: string;
  };
  functional_jobs: Job[];
  emotional_jobs: Job[];
  social_jobs: Job[];
  job_hierarchy: {
    core_job: string;
    related_jobs: string[];
    consumption_chain: string[];
  };
  opportunity_map: Array<{
    job: string;
    importance: number;
    satisfaction: number;
    opportunity: number;
  }>;
  strategic_focus: string[];
}

interface Tab03JTBDProps {
  data: JTBDData | null | undefined;
}

function JobCard({ job, index }: { job: Job; index: number }) {
  const typeConfig: Record<string, { icon: typeof Briefcase; color: string; label: string }> = {
    functional: { icon: Briefcase, color: "blue", label: "Funcional" },
    emotional: { icon: Heart, color: "pink", label: "Emocional" },
    social: { icon: Users, color: "purple", label: "Social" },
  };

  // Fallback para job_type undefined o inválido
  const jobType = job?.job_type && typeConfig[job.job_type] ? job.job_type : "functional";
  const config = typeConfig[jobType];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-${config.color}-500/20 flex items-center justify-center`}>
              <Icon className={`w-4 h-4 text-${config.color}-400`} />
            </div>
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Oportunidad</p>
            <p className={cn(
              "text-lg font-bold",
              (job.opportunity_score || 0) >= 8 ? "text-green-400" :
              (job.opportunity_score || 0) >= 5 ? "text-yellow-400" : "text-red-400"
            )}>
              {(job.opportunity_score || 0).toFixed(1)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
          <p className="font-medium text-sm">{job.job_statement}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Importancia</p>
            <Progress value={(job.importance || 0) * 10} className="h-2" />
            <p className="text-xs text-right mt-1">{job.importance || 0}/10</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Satisfacción Actual</p>
            <Progress value={(job.satisfaction_current || 0) * 10} className="h-2" />
            <p className="text-xs text-right mt-1">{job.satisfaction_current || 0}/10</p>
          </div>
        </div>

        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Contexto:</p>
          <p>{job.context}</p>
        </div>

        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-400 mb-1">Resultado Deseado</p>
          <p className="text-sm">{job.desired_outcome}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              Criterios de Éxito
            </p>
            <ul className="space-y-1">
              {job.success_criteria?.map((c, idx) => (
                <li key={idx} className="text-xs text-muted-foreground">• {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Barreras
            </p>
            <ul className="space-y-1">
              {job.barriers?.map((b, idx) => (
                <li key={idx} className="text-xs text-muted-foreground">• {b}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400 mb-1">Cómo Resolvemos Este Job</p>
          <p className="text-sm">{job.our_solution_fit}</p>
          <CopyButton text={job.our_solution_fit} className="mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

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

  // Si los datos vienen en formato diferente (solo summary), mostrar vista simplificada
  const rawData = data as Record<string, unknown>;
  if (rawData.summary && !rawData.main_job) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Análisis Jobs To Be Done
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-background/50">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {String(rawData.summary || "")}
              </p>
            </div>
            {rawData._raw && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Ver datos completos
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-96">
                  {typeof rawData._raw === "string" ? rawData._raw : JSON.stringify(rawData, null, 2)}
                </pre>
              </details>
            )}
            <CopyButton text={String(rawData.summary || "")} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Job */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Job Principal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-background/50">
            <p className="text-xl font-bold mb-2">{data.main_job?.statement}</p>
            <p className="text-muted-foreground">{data.main_job?.description}</p>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-400 mb-1">Por qué importa</p>
            <p className="text-sm">{data.main_job?.why_matters}</p>
          </div>
          <CopyButton text={data.main_job?.statement || ""} />
        </CardContent>
      </Card>

      {/* Opportunity Map */}
      {data.opportunity_map && data.opportunity_map.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Mapa de Oportunidades
            </CardTitle>
            <CardDescription>
              Jobs ordenados por oportunidad (Importancia - Satisfacción)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.opportunity_map
                .sort((a, b) => b.opportunity - a.opportunity)
                .map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{item.job}</p>
                      <Badge className={cn(
                        item.opportunity >= 6 ? "bg-green-500/20 text-green-400" :
                        item.opportunity >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-gray-500/20 text-gray-400"
                      )}>
                        {item.opportunity.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Importancia: </span>
                        <span>{item.importance}/10</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Satisfacción: </span>
                        <span>{item.satisfaction}/10</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Functional Jobs */}
      {data.functional_jobs && data.functional_jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Jobs Funcionales
          </h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {data.functional_jobs.map((job, idx) => (
              <JobCard key={idx} job={job} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Emotional Jobs */}
      {data.emotional_jobs && data.emotional_jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Jobs Emocionales
          </h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {data.emotional_jobs.map((job, idx) => (
              <JobCard key={idx} job={job} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Social Jobs */}
      {data.social_jobs && data.social_jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Jobs Sociales
          </h3>
          <div className="grid lg:grid-cols-2 gap-4">
            {data.social_jobs.map((job, idx) => (
              <JobCard key={idx} job={job} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Strategic Focus */}
      {data.strategic_focus && data.strategic_focus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Foco Estratégico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.strategic_focus.map((focus, idx) => (
                <li key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{focus}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
