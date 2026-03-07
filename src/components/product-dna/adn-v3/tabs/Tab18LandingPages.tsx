/**
 * Tab18LandingPages
 * Estrategia de landing pages
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Layout,
  Target,
  CheckCircle2,
  AlertCircle,
  Zap,
  Eye,
  MousePointer,
  ArrowRight,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface LandingPageSection {
  section: string;
  purpose: string;
  content_guidelines: string[];
  design_tips: string[];
}

interface LandingPageTemplate {
  name: string;
  goal: string;
  target_audience: string;
  hero: {
    headline: string;
    subheadline: string;
    cta_text: string;
    visual_recommendation: string;
  };
  sections: LandingPageSection[];
  social_proof_elements: string[];
  urgency_elements: string[];
  trust_signals: string[];
}

interface LandingPagesData {
  page_strategy: {
    primary_pages_needed: string[];
    traffic_sources: Record<string, string>;
    conversion_goals: string[];
  };
  templates: LandingPageTemplate[];
  headline_variations: Array<{
    type: string;
    headlines: string[];
  }>;
  cta_variations: Array<{
    context: string;
    ctas: string[];
  }>;
  above_fold_checklist: string[];
  common_mistakes: string[];
  mobile_optimization: string[];
  page_speed_tips: string[];
}

interface Tab18LandingPagesProps {
  data: LandingPagesData | null | undefined;
}

export function Tab18LandingPages({ data }: Tab18LandingPagesProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Layout className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin estrategia de landing pages</h3>
        <p className="text-sm text-muted-foreground">
          La estrategia de landing pages se generará al completar el research.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Strategy */}
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-500" />
            Estrategia de Páginas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Páginas Principales Necesarias</p>
            <div className="flex flex-wrap gap-2">
              {data.page_strategy?.primary_pages_needed?.map((page, idx) => (
                <Badge key={idx} className="bg-indigo-500/20 text-indigo-400">{page}</Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Objetivos de Conversión</p>
            <div className="flex flex-wrap gap-2">
              {data.page_strategy?.conversion_goals?.map((goal, idx) => (
                <Badge key={idx} variant="outline">{goal}</Badge>
              ))}
            </div>
          </div>

          {data.page_strategy?.traffic_sources && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Fuentes de Tráfico → Página</p>
              <div className="space-y-2">
                {Object.entries(data.page_strategy.traffic_sources).map(([source, page], idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <span className="text-sm font-medium">{source}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{page}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Above the Fold Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            Checklist Above the Fold
          </CardTitle>
          <CardDescription>
            Elementos críticos visibles sin scroll
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {data.above_fold_checklist?.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Templates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Templates de Landing Pages</h3>
        {data.templates?.map((template, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.goal}</CardDescription>
                </div>
                <Badge variant="outline">{template.target_audience}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hero Section */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                <p className="text-xs text-indigo-400 mb-2">Hero Section</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Headline</p>
                    <p className="font-bold text-lg">{template.hero?.headline}</p>
                    <CopyButton text={template.hero?.headline || ""} size="sm" className="mt-1" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Subheadline</p>
                    <p className="text-sm">{template.hero?.subheadline}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">CTA</p>
                      <Badge className="bg-green-500/20 text-green-400">{template.hero?.cta_text}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Visual</p>
                      <span className="text-sm">{template.hero?.visual_recommendation}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page Sections */}
              <div>
                <p className="text-sm font-medium mb-2">Secciones de la Página</p>
                <div className="space-y-2">
                  {template.sections?.map((section, sIdx) => (
                    <div key={sIdx} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{section.section}</span>
                        <span className="text-xs text-muted-foreground">{section.purpose}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">Contenido</p>
                          <ul className="space-y-0.5">
                            {section.content_guidelines?.map((g, gIdx) => (
                              <li key={gIdx}>• {g}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Diseño</p>
                          <ul className="space-y-0.5">
                            {section.design_tips?.map((t, tIdx) => (
                              <li key={tIdx}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust & Urgency */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Social Proof</p>
                  <ul className="space-y-1">
                    {template.social_proof_elements?.map((el, elIdx) => (
                      <li key={elIdx} className="text-xs">• {el}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Urgencia</p>
                  <ul className="space-y-1">
                    {template.urgency_elements?.map((el, elIdx) => (
                      <li key={elIdx} className="text-xs">• {el}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Trust Signals</p>
                  <ul className="space-y-1">
                    {template.trust_signals?.map((el, elIdx) => (
                      <li key={elIdx} className="text-xs">• {el}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Headline Variations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Variaciones de Headlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.headline_variations?.map((group, idx) => (
              <div key={idx}>
                <p className="text-sm font-medium mb-2">{group.type}</p>
                <div className="space-y-2">
                  {group.headlines?.map((h, hIdx) => (
                    <div key={hIdx} className="p-2 rounded bg-muted/50 flex items-center justify-between">
                      <span className="text-sm">{h}</span>
                      <CopyButton text={h} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA Variations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="w-5 h-5 text-green-500" />
            Variaciones de CTAs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.cta_variations?.map((group, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-card">
                <p className="text-xs text-muted-foreground mb-2">{group.context}</p>
                <div className="flex flex-wrap gap-2">
                  {group.ctas?.map((cta, cIdx) => (
                    <Badge key={cIdx} className="bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30">
                      {cta}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimization Tips */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Errores Comunes a Evitar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.common_mistakes?.map((mistake, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  {mistake}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Optimización Mobile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.mobile_optimization?.map((tip, idx) => (
                <li key={idx} className="text-sm p-2 rounded bg-muted/50">• {tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Page Speed Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Tips de Velocidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.page_speed_tips?.map((tip, idx) => (
              <div key={idx} className="p-2 rounded bg-orange-500/10 border border-orange-500/20 text-sm">
                {tip}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
