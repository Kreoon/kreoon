/**
 * Tab12LeadMagnets
 * Ideas de lead magnets y recursos gratuitos
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  HelpCircle,
  Users,
  Trophy,
  Share2,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-12-lead-magnets.ts)
interface BackendLeadMagnetsData {
  funnel_strategy?: {
    awareness_magnet?: string;
    consideration_magnet?: string;
    decision_magnet?: string;
  };
  recommended_lead_magnets?: Array<{
    title?: string;
    format?: string;
    description?: string;
    target_avatar?: string;
    problem_solved?: string;
    perceived_value?: string;
    production_effort?: string;
    conversion_potential?: number;
    outline?: string[];
    landing_page_headline?: string;
    email_sequence_hook?: string;
  }>;
  quick_wins?: Array<{
    idea?: string;
    format?: string;
    time_to_create?: string;
  }>;
  content_upgrades?: Array<{
    blog_topic?: string;
    upgrade_idea?: string;
  }>;
  quiz_funnel?: {
    quiz_title?: string;
    quiz_hook?: string;
    number_of_questions?: number;
    question_examples?: string[];
    result_types?: Array<{
      result?: string;
      description?: string;
      recommended_offer?: string;
    }>;
  };
  webinar_concept?: {
    title?: string;
    hook?: string;
    duration?: string;
    structure?: Array<{
      section?: string;
      duration?: string;
      content?: string;
    }>;
    offer_transition?: string;
  };
  challenge_concept?: {
    name?: string;
    duration?: string;
    daily_structure?: Array<{
      day?: number;
      theme?: string;
      task?: string;
      deliverable?: string;
    }>;
    community_element?: string;
    graduation_offer?: string;
  };
  distribution_strategy?: {
    organic_channels?: string[];
    paid_channels?: string[];
    partnership_opportunities?: string[];
  };
  summary?: string;
}

interface Tab12LeadMagnetsProps {
  data: BackendLeadMagnetsData | null | undefined;
}

const formatIcons: Record<string, typeof FileText> = {
  ebook: BookOpen,
  checklist: CheckSquare,
  video: Video,
  calculator: Calculator,
  template: FileText,
  guide: FileText,
  quiz: HelpCircle,
  webinar: Video,
  mini_course: BookOpen,
};

const effortColors: Record<string, string> = {
  bajo: "bg-green-500/20 text-green-400",
  low: "bg-green-500/20 text-green-400",
  medio: "bg-yellow-500/20 text-yellow-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  alto: "bg-red-500/20 text-red-400",
  high: "bg-red-500/20 text-red-400",
};

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

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.funnel_strategy ||
    rawData.recommended_lead_magnets ||
    rawData.quiz_funnel ||
    rawData.webinar_concept;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Lead Magnets"
        icon={<Magnet className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {data.summary && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-2" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Funnel Strategy */}
      {data.funnel_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-purple-500" />
              Estrategia de Funnel
            </CardTitle>
            <CardDescription>
              Lead magnets para cada etapa del journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.funnel_strategy.awareness_magnet && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Badge className="bg-blue-500/20 text-blue-400 mb-2">Awareness</Badge>
                  <p className="text-sm">{data.funnel_strategy.awareness_magnet}</p>
                </div>
              )}
              {data.funnel_strategy.consideration_magnet && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Badge className="bg-yellow-500/20 text-yellow-400 mb-2">Consideración</Badge>
                  <p className="text-sm">{data.funnel_strategy.consideration_magnet}</p>
                </div>
              )}
              {data.funnel_strategy.decision_magnet && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Badge className="bg-green-500/20 text-green-400 mb-2">Decisión</Badge>
                  <p className="text-sm">{data.funnel_strategy.decision_magnet}</p>
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Wins
            </CardTitle>
            <CardDescription>
              Lead magnets que puedes crear rápidamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.quick_wins.map((item, idx) => (
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
      )}

      {/* Recommended Lead Magnets */}
      {data.recommended_lead_magnets && data.recommended_lead_magnets.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Lead Magnets Recomendados</h3>
          {data.recommended_lead_magnets.map((magnet, idx) => {
            const Icon = formatIcons[magnet.format?.toLowerCase() || ''] || FileText;
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
                          {magnet.production_effort && (
                            <Badge className={effortColors[magnet.production_effort.toLowerCase()] || "bg-muted"}>
                              Esfuerzo {magnet.production_effort}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {magnet.conversion_potential !== undefined && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Potencial</p>
                        <p className="text-lg font-bold text-green-400">{magnet.conversion_potential}%</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {magnet.description && (
                    <p className="text-sm text-muted-foreground">{magnet.description}</p>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    {magnet.target_avatar && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Avatar Target</p>
                        <p className="text-sm">{magnet.target_avatar}</p>
                      </div>
                    )}
                    {magnet.problem_solved && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Problema que Resuelve</p>
                        <p className="text-sm">{magnet.problem_solved}</p>
                      </div>
                    )}
                  </div>

                  {magnet.perceived_value && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-xs text-green-400 mb-1">Valor Percibido</p>
                      <p className="text-sm font-medium">{magnet.perceived_value}</p>
                    </div>
                  )}

                  {magnet.outline && magnet.outline.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Estructura/Outline</p>
                      <ol className="space-y-1 list-decimal list-inside">
                        {magnet.outline.map((item, oIdx) => (
                          <li key={oIdx} className="text-sm text-muted-foreground">{item}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {magnet.landing_page_headline && (
                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <p className="text-xs text-purple-400 mb-1">Headline para Landing Page</p>
                      <p className="font-bold">{magnet.landing_page_headline}</p>
                      <CopyButton text={magnet.landing_page_headline} className="mt-2" size="sm" />
                    </div>
                  )}

                  {magnet.email_sequence_hook && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-400 mb-1">Hook para Secuencia de Email</p>
                      <p className="text-sm">{magnet.email_sequence_hook}</p>
                      <CopyButton text={magnet.email_sequence_hook} className="mt-2" size="sm" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quiz Funnel */}
      {data.quiz_funnel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
              Quiz Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.quiz_funnel.quiz_title && (
              <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <h4 className="font-bold text-lg mb-1">{data.quiz_funnel.quiz_title}</h4>
                {data.quiz_funnel.quiz_hook && (
                  <p className="text-sm text-muted-foreground">{data.quiz_funnel.quiz_hook}</p>
                )}
                {data.quiz_funnel.number_of_questions && (
                  <Badge className="mt-2">{data.quiz_funnel.number_of_questions} preguntas</Badge>
                )}
              </div>
            )}
            {data.quiz_funnel.question_examples && data.quiz_funnel.question_examples.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Ejemplos de Preguntas</p>
                <ul className="space-y-2">
                  {data.quiz_funnel.question_examples.map((q, i) => (
                    <li key={i} className="text-sm p-2 rounded bg-muted/50">{i + 1}. {q}</li>
                  ))}
                </ul>
              </div>
            )}
            {data.quiz_funnel.result_types && data.quiz_funnel.result_types.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Tipos de Resultado</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.quiz_funnel.result_types.map((r, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <p className="font-medium text-sm">{r.result}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      )}
                      {r.recommended_offer && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Oferta: {r.recommended_offer}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Webinar Concept */}
      {data.webinar_concept && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="w-5 h-5 text-red-500" />
              Concepto de Webinar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.webinar_concept.title && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <h4 className="font-bold text-lg mb-1">{data.webinar_concept.title}</h4>
                {data.webinar_concept.hook && (
                  <p className="text-sm text-muted-foreground">{data.webinar_concept.hook}</p>
                )}
                {data.webinar_concept.duration && (
                  <Badge className="mt-2">{data.webinar_concept.duration}</Badge>
                )}
              </div>
            )}
            {data.webinar_concept.structure && data.webinar_concept.structure.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Estructura</p>
                <div className="space-y-2">
                  {data.webinar_concept.structure.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg border flex items-start gap-3">
                      <Badge variant="outline" className="flex-shrink-0">{s.duration}</Badge>
                      <div>
                        <p className="font-medium text-sm">{s.section}</p>
                        {s.content && (
                          <p className="text-xs text-muted-foreground">{s.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.webinar_concept.offer_transition && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Transición a la Oferta</p>
                <p className="text-sm">{data.webinar_concept.offer_transition}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Challenge Concept */}
      {data.challenge_concept && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Concepto de Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {data.challenge_concept.name && (
                <h4 className="font-bold text-lg">{data.challenge_concept.name}</h4>
              )}
              {data.challenge_concept.duration && (
                <Badge>{data.challenge_concept.duration}</Badge>
              )}
            </div>
            {data.challenge_concept.daily_structure && data.challenge_concept.daily_structure.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Estructura Diaria</p>
                <div className="space-y-2">
                  {data.challenge_concept.daily_structure.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">Día {d.day}</Badge>
                        <span className="font-medium text-sm">{d.theme}</span>
                      </div>
                      {d.task && (
                        <p className="text-sm text-muted-foreground">{d.task}</p>
                      )}
                      {d.deliverable && (
                        <p className="text-xs text-green-400 mt-1">Entregable: {d.deliverable}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.challenge_concept.community_element && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 mb-1">Elemento de Comunidad</p>
                <p className="text-sm">{data.challenge_concept.community_element}</p>
              </div>
            )}
            {data.challenge_concept.graduation_offer && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Oferta al Graduarse</p>
                <p className="text-sm">{data.challenge_concept.graduation_offer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Distribution Strategy */}
      {data.distribution_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="w-5 h-5 text-cyan-500" />
              Estrategia de Distribución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.distribution_strategy.organic_channels && data.distribution_strategy.organic_channels.length > 0 && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Canales Orgánicos</p>
                  <ul className="space-y-1">
                    {data.distribution_strategy.organic_channels.map((c, i) => (
                      <li key={i} className="text-sm">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.distribution_strategy.paid_channels && data.distribution_strategy.paid_channels.length > 0 && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Canales Pagados</p>
                  <ul className="space-y-1">
                    {data.distribution_strategy.paid_channels.map((c, i) => (
                      <li key={i} className="text-sm">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.distribution_strategy.partnership_opportunities && data.distribution_strategy.partnership_opportunities.length > 0 && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-2">Partnerships</p>
                  <ul className="space-y-1">
                    {data.distribution_strategy.partnership_opportunities.map((c, i) => (
                      <li key={i} className="text-sm">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Upgrades */}
      {data.content_upgrades && data.content_upgrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
