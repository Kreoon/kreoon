import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Sparkles, Zap, Target, FlaskConical, Rocket } from "lucide-react";

interface LandingPageSection {
  section_id?: string;
  section_name?: string;
  headline?: string;
  subheadline?: string;
  cta_primary?: string;
  cta_secondary?: string;
  hero_image_description?: string;
  trust_indicator?: string;
  copy_full?: string;
  product_intro?: string;
  how_it_works?: Array<{ step?: number; title?: string; description?: string }>;
  for_who?: string;
  not_for_who?: string;
  testimonials?: Array<{ name?: string; avatar_match?: string; result?: string; quote?: string }>;
  social_proof_numbers?: string;
  authority_statement?: string;
  origin_story_short?: string;
  core_offer?: string;
  bonuses?: Array<{ name?: string; value_usd?: string; solves_objection?: string }>;
  total_value?: string;
  your_price?: string;
  price_anchor?: string;
  guarantee_type?: string;
  duration_days?: number;
  conditions_simple?: string;
  faqs?: Array<{ question?: string; answer?: string }>;
  recap_promise?: string;
  cta_text?: string;
  reassurance?: string;
  key_insight?: string;
}

interface LandingPage {
  variation?: string;
  variation_name?: string;
  target_consciousness?: string;
  funnel_temperature?: string;
  best_for?: string;
  strategy?: string;
  estimated_conversion_rate?: string;
  sections?: LandingPageSection[];
  seo_title?: string;
  meta_description?: string;
  page_url_suggestion?: string;
  ab_test_hypothesis?: string;
}

interface AbTestingPlan {
  test_1?: { element?: string; variation_a?: string; variation_b?: string; success_metric?: string; minimum_sample?: string };
  test_2?: { element?: string; variation_a?: string; variation_b?: string; success_metric?: string; minimum_sample?: string };
}

interface TechStack {
  builders?: string[];
  analytics?: string[];
  split_testing?: string[];
  hosting_latam?: string;
}

interface LandingPagesTabProps {
  landingPages?: LandingPage[] | null;
  abTesting?: AbTestingPlan | null;
  techStack?: TechStack | null;
}

export function LandingPagesTab({ landingPages, abTesting, techStack }: LandingPagesTabProps) {
  if (!landingPages || landingPages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Las landing pages se generan al activar el ADN Recargado.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            2 variaciones: <strong>Directa</strong> (audiencia caliente) + <strong>Educativa</strong> (audiencia tibia)
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {landingPages.map((lp, idx) => (
        <Card key={idx} className="border-violet-500/20">
          <CardHeader className="bg-gradient-to-r from-violet-500/5 to-pink-500/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Variación {lp.variation || idx === 0 ? "A" : "B"}: {lp.variation_name || "Sin nombre"}
                </CardTitle>
                <CardDescription className="mt-1">{lp.strategy}</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {lp.target_consciousness && (
                  <Badge variant="outline" className="text-xs">
                    Conciencia: {lp.target_consciousness}
                  </Badge>
                )}
                {lp.funnel_temperature && (
                  <Badge variant="secondary" className="text-xs">
                    Tráfico: {lp.funnel_temperature}
                  </Badge>
                )}
                {lp.estimated_conversion_rate && (
                  <Badge variant="default" className="text-xs">
                    Conv: {lp.estimated_conversion_rate}
                  </Badge>
                )}
              </div>
            </div>
            {lp.best_for && (
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Ideal para:</strong> {lp.best_for}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {lp.sections?.map((section, sIdx) => (
              <div key={sIdx} className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Zap className="h-3 w-3 text-amber-500" />
                  {section.section_name || section.section_id}
                </h4>

                {section.headline && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Headline:</span>
                    <p className="font-medium">{section.headline}</p>
                  </div>
                )}

                {section.subheadline && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Subheadline:</span>
                    <p className="text-sm">{section.subheadline}</p>
                  </div>
                )}

                {section.cta_primary && (
                  <div className="mb-2 inline-flex flex-wrap gap-2">
                    <Badge className="bg-violet-600">CTA: {section.cta_primary}</Badge>
                    {section.cta_secondary && <Badge variant="outline">{section.cta_secondary}</Badge>}
                  </div>
                )}

                {section.copy_full && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Copy completo:</span>
                    <p className="text-sm whitespace-pre-wrap">{section.copy_full}</p>
                  </div>
                )}

                {section.how_it_works && section.how_it_works.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Cómo funciona:</span>
                    <ol className="list-decimal list-inside text-sm space-y-1 mt-1">
                      {section.how_it_works.map((step, i) => (
                        <li key={i}>
                          <strong>{step.title}:</strong> {step.description}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {section.testimonials && section.testimonials.length > 0 && (
                  <div className="mb-2 space-y-2">
                    <span className="text-xs text-muted-foreground">Testimoniales:</span>
                    {section.testimonials.map((t, i) => (
                      <div key={i} className="bg-card p-2 rounded border-l-2 border-emerald-500">
                        <p className="text-sm italic">"{t.quote}"</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          — <strong>{t.name}</strong> · {t.result}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {section.bonuses && section.bonuses.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">Bonuses:</span>
                    <ul className="text-sm space-y-1 mt-1">
                      {section.bonuses.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles className="h-3 w-3 text-amber-500 mt-1 flex-shrink-0" />
                          <span>
                            <strong>{b.name}</strong> ({b.value_usd}) — {b.solves_objection}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(section.your_price || section.total_value) && (
                  <div className="mb-2 flex gap-3 text-sm">
                    {section.total_value && <span>Valor total: <strong>{section.total_value}</strong></span>}
                    {section.your_price && <span className="text-emerald-600">Tu precio: <strong>{section.your_price}</strong></span>}
                  </div>
                )}

                {section.guarantee_type && (
                  <Badge variant="outline" className="mb-2">
                    Garantía: {section.guarantee_type} ({section.duration_days} días)
                  </Badge>
                )}

                {section.faqs && section.faqs.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-muted-foreground">FAQ:</span>
                    <div className="space-y-2 mt-1">
                      {section.faqs.map((faq, i) => (
                        <details key={i} className="text-sm">
                          <summary className="cursor-pointer font-medium">{faq.question}</summary>
                          <p className="mt-1 ml-4 text-muted-foreground">{faq.answer}</p>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {(lp.seo_title || lp.meta_description || lp.page_url_suggestion) && (
              <div className="border rounded-lg p-3 bg-blue-500/5">
                <h4 className="text-xs font-semibold mb-2 text-blue-700 dark:text-blue-400">SEO + URL</h4>
                {lp.seo_title && <p className="text-xs"><strong>Título:</strong> {lp.seo_title}</p>}
                {lp.meta_description && <p className="text-xs mt-1"><strong>Meta:</strong> {lp.meta_description}</p>}
                {lp.page_url_suggestion && <p className="text-xs mt-1"><strong>URL:</strong> <code>{lp.page_url_suggestion}</code></p>}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {abTesting && (abTesting.test_1 || abTesting.test_2) && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-amber-500" />
              Plan de A/B Testing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[abTesting.test_1, abTesting.test_2].filter(Boolean).map((test, i) => (
              <div key={i} className="border rounded-lg p-3 bg-muted/30">
                <p className="font-semibold text-sm">Test {i + 1}: {test?.element}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">A:</span> {test?.variation_a}
                  </div>
                  <div>
                    <span className="text-muted-foreground">B:</span> {test?.variation_b}
                  </div>
                </div>
                <p className="text-xs mt-2">
                  <strong>Métrica:</strong> {test?.success_metric} · <strong>Sample:</strong> {test?.minimum_sample}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {techStack && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4 text-violet-500" />
              Tech Stack Recomendado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {techStack.builders && (
              <div><strong>Builders:</strong> {techStack.builders.join(", ")}</div>
            )}
            {techStack.analytics && (
              <div><strong>Analytics:</strong> {techStack.analytics.join(", ")}</div>
            )}
            {techStack.split_testing && (
              <div><strong>Split Testing:</strong> {techStack.split_testing.join(", ")}</div>
            )}
            {techStack.hosting_latam && (
              <div><strong>Hosting LATAM:</strong> {techStack.hosting_latam}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
