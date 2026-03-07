/**
 * Tab12LeadMagnets
 * Ideas de lead magnets y recursos gratuitos
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Magnet,
  FileText,
  Video,
  Calculator,
  CheckSquare,
  BookOpen,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface LeadMagnet {
  title: string;
  format: string;
  description: string;
  target_avatar: string;
  problem_solved: string;
  perceived_value: string;
  production_effort: "low" | "medium" | "high";
  conversion_potential: number;
  outline: string[];
  landing_page_headline: string;
  email_sequence_hook: string;
}

interface LeadMagnetsData {
  recommended_lead_magnets: LeadMagnet[];
  quick_wins: Array<{
    idea: string;
    format: string;
    time_to_create: string;
  }>;
  funnel_strategy: {
    awareness_magnet: string;
    consideration_magnet: string;
    decision_magnet: string;
  };
  content_upgrades: Array<{
    blog_topic: string;
    upgrade_idea: string;
  }>;
}

interface Tab12LeadMagnetsProps {
  data: LeadMagnetsData | null | undefined;
}

export function Tab12LeadMagnets({ data }: Tab12LeadMagnetsProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Magnet className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin lead magnets</h3>
        <p className="text-sm text-muted-foreground">
          Las ideas de lead magnets se generarán al completar el research.
        </p>
      </div>
    );
  }

  const formatIcons: Record<string, any> = {
    ebook: BookOpen,
    checklist: CheckSquare,
    video: Video,
    calculator: Calculator,
    template: FileText,
    guide: FileText,
  };

  const effortColors = {
    low: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Funnel Strategy */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Estrategia de Funnel
          </CardTitle>
          <CardDescription>
            Lead magnets para cada etapa del journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Badge className="bg-blue-500/20 text-blue-400 mb-2">Awareness</Badge>
              <p className="text-sm">{data.funnel_strategy?.awareness_magnet}</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Badge className="bg-yellow-500/20 text-yellow-400 mb-2">Consideración</Badge>
              <p className="text-sm">{data.funnel_strategy?.consideration_magnet}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <Badge className="bg-green-500/20 text-green-400 mb-2">Decisión</Badge>
              <p className="text-sm">{data.funnel_strategy?.decision_magnet}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Wins
          </CardTitle>
          <CardDescription>
            Lead magnets que puedes crear rápidamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.quick_wins?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <h4 className="font-medium mb-2">{item.idea}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{item.format}</Badge>
                  <Badge variant="secondary" className="text-xs">{item.time_to_create}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Lead Magnets */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Lead Magnets Recomendados</h3>
        {data.recommended_lead_magnets?.map((magnet, idx) => {
          const Icon = formatIcons[magnet.format.toLowerCase()] || FileText;
          return (
            <Card key={idx}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{magnet.title}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{magnet.format}</Badge>
                        <Badge className={effortColors[magnet.production_effort]}>
                          Esfuerzo {magnet.production_effort === "low" ? "Bajo" :
                            magnet.production_effort === "medium" ? "Medio" : "Alto"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Potencial</p>
                    <p className="text-lg font-bold text-green-400">{magnet.conversion_potential}%</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{magnet.description}</p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Avatar Target</p>
                    <p className="text-sm">{magnet.target_avatar}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Problema que Resuelve</p>
                    <p className="text-sm">{magnet.problem_solved}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Valor Percibido</p>
                  <p className="text-sm font-medium">{magnet.perceived_value}</p>
                </div>

                {/* Outline */}
                <div>
                  <p className="text-sm font-medium mb-2">Estructura/Outline</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    {magnet.outline?.map((item, oIdx) => (
                      <li key={oIdx} className="text-sm text-muted-foreground">{item}</li>
                    ))}
                  </ol>
                </div>

                {/* Landing Page Headline */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">Headline para Landing Page</p>
                  <p className="font-bold">{magnet.landing_page_headline}</p>
                  <CopyButton text={magnet.landing_page_headline} className="mt-2" />
                </div>

                {/* Email Sequence Hook */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400 mb-1">Hook para Secuencia de Email</p>
                  <p className="text-sm">{magnet.email_sequence_hook}</p>
                  <CopyButton text={magnet.email_sequence_hook} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Upgrades */}
      {data.content_upgrades && data.content_upgrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Content Upgrades
            </CardTitle>
            <CardDescription>
              Recursos adicionales para artículos de blog
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.content_upgrades.map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground mb-1">Blog: {item.blog_topic}</p>
                  <p className="font-medium">→ {item.upgrade_idea}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
