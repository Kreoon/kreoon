/**
 * Tab09Offer
 * Oferta irresistible - estructura y componentes
 * Adaptado a la estructura real del backend adn-research-v3
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Zap,
  Shield,
  Clock,
  Star,
  CheckCircle2,
  Package,
  TrendingUp,
  DollarSign,
  Award,
  AlertTriangle,
  Target,
  Layers,
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";
import { GenericTabContent } from "./GenericTabContent";

// Estructura real del backend (step-09-puv-offer.ts)
interface BackendOfferData {
  offer_name?: string;
  offer_tagline?: string;
  dream_outcome?: string;
  perceived_likelihood?: string;
  time_to_achievement?: string;
  effort_required?: string;
  value_equation?: {
    dream_outcome_score?: number;
    perceived_likelihood_score?: number;
    time_delay_score?: number;
    effort_sacrifice_score?: number;
    total_value_score?: string;
  };
  core_offer?: {
    main_deliverable?: string;
    format?: string;
    duration?: string;
    value_anchor?: string;
  };
  value_stack?: Array<{
    component?: string;
    what_it_is?: string;
    problem_it_solves?: string;
    perceived_value?: string;
    delivery_method?: string;
  }>;
  bonuses?: Array<{
    bonus_name?: string;
    description?: string;
    problem_solved?: string;
    perceived_value?: string;
    scarcity_element?: string;
    fast_action_bonus?: boolean;
  }>;
  guarantee?: {
    type?: string;
    duration?: string;
    conditions?: string;
    name?: string;
    copy?: string;
  };
  risk_reversal?: Array<{
    risk?: string;
    reversal?: string;
  }>;
  pricing_strategy?: {
    anchor_price?: string;
    actual_price?: string;
    payment_options?: Array<{
      option?: string;
      price?: string;
      savings?: string;
    }>;
    price_justification?: string;
    roi_calculation?: string;
  };
  scarcity_urgency?: {
    real_scarcity?: string;
    deadline_type?: string;
    consequence_of_waiting?: string;
    ethical_note?: string;
  };
  offer_summary_copy?: string;
  comparison_to_alternatives?: Array<{
    alternative?: string;
    their_price?: string;
    their_limitation?: string;
    our_advantage?: string;
  }>;
  offer_variations?: Array<{
    tier?: string;
    price_usd?: number;
    main_difference?: string;
    best_for?: string;
  }>;
  objection_killers?: Array<{
    objection?: string;
    killer?: string;
  }>;
  summary?: string;
}

interface Tab09OfferProps {
  data: BackendOfferData | null | undefined;
}

export function Tab09Offer({ data }: Tab09OfferProps) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Gift className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sin oferta estructurada</h3>
        <p className="text-sm text-muted-foreground">
          La oferta irresistible se generará al completar el research.
        </p>
      </div>
    );
  }

  // Verificar estructura del backend
  const rawData = data as Record<string, unknown>;
  const hasBackendStructure =
    rawData.offer_name ||
    rawData.core_offer ||
    rawData.value_stack ||
    rawData.pricing_strategy;

  if (!hasBackendStructure) {
    return (
      <GenericTabContent
        data={rawData}
        title="Oferta Irresistible"
        icon={<Gift className="w-4 h-4" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Offer Header */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-2">
              <Gift className="w-8 h-8 text-yellow-400" />
            </div>
            {data.offer_name && (
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold">{data.offer_name}</h1>
                <CopyButton text={data.offer_name} />
              </div>
            )}
            {data.offer_tagline && (
              <p className="text-lg text-muted-foreground">{data.offer_tagline}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data.summary && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed">{data.summary}</p>
            <CopyButton text={data.summary} className="mt-2" size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Value Equation (Hormozi Style) */}
      {(data.dream_outcome || data.value_equation) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-purple-500" />
              Ecuación de Valor (Hormozi)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {data.dream_outcome && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">Resultado Soñado</p>
                  <p className="text-sm font-medium">{data.dream_outcome}</p>
                </div>
              )}
              {data.perceived_likelihood && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Probabilidad Percibida</p>
                  <p className="text-sm">{data.perceived_likelihood}</p>
                </div>
              )}
              {data.time_to_achievement && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Tiempo para Lograr</p>
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {data.time_to_achievement}
                  </p>
                </div>
              )}
              {data.effort_required && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Esfuerzo Requerido</p>
                  <p className="text-sm">{data.effort_required}</p>
                </div>
              )}
            </div>
            {data.value_equation?.total_value_score && (
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm">{data.value_equation.total_value_score}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Core Offer */}
      {data.core_offer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-5 h-5 text-purple-500" />
              Oferta Principal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              {data.core_offer.main_deliverable && (
                <h3 className="text-xl font-bold mb-3">{data.core_offer.main_deliverable}</h3>
              )}
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                {data.core_offer.format && (
                  <div className="p-2 rounded bg-background/50">
                    <p className="text-xs text-muted-foreground">Formato</p>
                    <p className="font-medium capitalize">{data.core_offer.format}</p>
                  </div>
                )}
                {data.core_offer.duration && (
                  <div className="p-2 rounded bg-background/50">
                    <p className="text-xs text-muted-foreground">Duración</p>
                    <p className="font-medium">{data.core_offer.duration}</p>
                  </div>
                )}
                {data.core_offer.value_anchor && (
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="text-xs text-green-400">Valor Ancla</p>
                    <p className="font-medium text-green-400">{data.core_offer.value_anchor}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Value Stack */}
      {data.value_stack && data.value_stack.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Value Stack
            </CardTitle>
            <CardDescription>
              Componentes que aumentan el valor percibido
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.value_stack.map((component, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-bold text-green-400">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold">{component.component}</h4>
                      {component.perceived_value && (
                        <Badge variant="outline" className="text-xs text-green-400">
                          Valor: {component.perceived_value}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {component.what_it_is && (
                  <p className="text-sm text-muted-foreground mb-2">{component.what_it_is}</p>
                )}
                {component.problem_it_solves && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-purple-400">Problema que resuelve:</span> {component.problem_it_solves}
                  </p>
                )}
                {component.delivery_method && (
                  <Badge variant="secondary" className="mt-2 text-xs">{component.delivery_method}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bonuses */}
      {data.bonuses && data.bonuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="w-5 h-5 text-yellow-500" />
              Bonos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {data.bonuses.map((bonus, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{bonus.bonus_name}</h4>
                    <div className="flex gap-1">
                      {bonus.fast_action_bonus && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">Fast Action</Badge>
                      )}
                      {bonus.perceived_value && (
                        <Badge className="bg-yellow-500/20 text-yellow-400">
                          {bonus.perceived_value}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {bonus.description && (
                    <p className="text-sm text-muted-foreground mb-2">{bonus.description}</p>
                  )}
                  {bonus.problem_solved && (
                    <p className="text-xs text-muted-foreground mb-2">
                      <span className="text-green-400">Resuelve:</span> {bonus.problem_solved}
                    </p>
                  )}
                  {bonus.scarcity_element && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {bonus.scarcity_element}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guarantee */}
      {data.guarantee && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-green-500" />
              Garantía
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {data.guarantee.name && (
                <Badge className="bg-green-500/20 text-green-400 text-base px-3 py-1">
                  {data.guarantee.name}
                </Badge>
              )}
              {data.guarantee.type && (
                <Badge variant="outline">{data.guarantee.type}</Badge>
              )}
              {data.guarantee.duration && (
                <Badge variant="outline">{data.guarantee.duration}</Badge>
              )}
            </div>
            {data.guarantee.copy && (
              <div className="p-4 rounded-lg bg-background/50">
                <p className="font-medium">{data.guarantee.copy}</p>
                <CopyButton text={data.guarantee.copy} className="mt-2" size="sm" />
              </div>
            )}
            {data.guarantee.conditions && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Condiciones:</span> {data.guarantee.conditions}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Reversal */}
      {data.risk_reversal && data.risk_reversal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Reversión de Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.risk_reversal.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Badge variant="destructive" className="flex-shrink-0 text-xs">Riesgo</Badge>
                  <p className="text-sm">{item.risk}</p>
                </div>
                {item.reversal && (
                  <div className="flex items-start gap-3 mt-2">
                    <Badge className="bg-green-500/20 text-green-400 flex-shrink-0 text-xs">Solución</Badge>
                    <p className="text-sm">{item.reversal}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pricing Strategy */}
      {data.pricing_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Estrategia de Precio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data.pricing_strategy.anchor_price || data.pricing_strategy.actual_price) && (
              <div className="flex items-center justify-center gap-8 py-4">
                {data.pricing_strategy.anchor_price && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Valor Percibido</p>
                    <p className="text-2xl font-bold text-muted-foreground line-through">
                      {data.pricing_strategy.anchor_price}
                    </p>
                  </div>
                )}
                {data.pricing_strategy.anchor_price && data.pricing_strategy.actual_price && (
                  <div className="text-4xl text-muted-foreground">→</div>
                )}
                {data.pricing_strategy.actual_price && (
                  <div className="text-center">
                    <p className="text-sm text-green-400">Precio Actual</p>
                    <p className="text-3xl font-bold text-green-400">
                      {data.pricing_strategy.actual_price}
                    </p>
                  </div>
                )}
              </div>
            )}

            {data.pricing_strategy.payment_options && data.pricing_strategy.payment_options.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Opciones de Pago</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {data.pricing_strategy.payment_options.map((option, idx) => (
                    <div key={idx} className="p-3 rounded-lg border">
                      <p className="font-medium text-sm">{option.option}</p>
                      <p className="text-lg font-bold text-green-400">{option.price}</p>
                      {option.savings && (
                        <p className="text-xs text-muted-foreground">Ahorro: {option.savings}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.pricing_strategy.price_justification && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Justificación del Precio</p>
                <p className="text-sm">{data.pricing_strategy.price_justification}</p>
              </div>
            )}

            {data.pricing_strategy.roi_calculation && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Cálculo de ROI</p>
                <p className="text-sm">{data.pricing_strategy.roi_calculation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Offer Tiers */}
      {data.offer_variations && data.offer_variations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="w-5 h-5 text-indigo-500" />
              Variaciones de la Oferta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4">
              {data.offer_variations.map((tier, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    tier.tier?.toLowerCase() === 'pro'
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-card'
                  }`}
                >
                  <div className="text-center mb-3">
                    <Badge className={
                      tier.tier?.toLowerCase() === 'premium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : tier.tier?.toLowerCase() === 'pro'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-muted'
                    }>
                      {tier.tier}
                    </Badge>
                    {tier.price_usd !== undefined && tier.price_usd > 0 && (
                      <p className="text-2xl font-bold mt-2">${tier.price_usd}</p>
                    )}
                  </div>
                  {tier.main_difference && (
                    <p className="text-sm text-muted-foreground mb-2">{tier.main_difference}</p>
                  )}
                  {tier.best_for && (
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-400">Ideal para:</span> {tier.best_for}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scarcity & Urgency */}
      {data.scarcity_urgency && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-red-500" />
              Urgencia y Escasez
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {data.scarcity_urgency.real_scarcity && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-orange-400 mb-1">Escasez Real</p>
                  <p className="text-sm">{data.scarcity_urgency.real_scarcity}</p>
                </div>
              )}
              {data.scarcity_urgency.deadline_type && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 mb-1">Tipo de Deadline</p>
                  <p className="text-sm">{data.scarcity_urgency.deadline_type}</p>
                </div>
              )}
            </div>
            {data.scarcity_urgency.consequence_of_waiting && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">Consecuencia de Esperar</p>
                <p className="text-sm">{data.scarcity_urgency.consequence_of_waiting}</p>
              </div>
            )}
            {data.scarcity_urgency.ethical_note && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 mb-1">Nota Ética</p>
                <p className="text-sm">{data.scarcity_urgency.ethical_note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison to Alternatives */}
      {data.comparison_to_alternatives && data.comparison_to_alternatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-blue-500" />
              Comparación con Alternativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.comparison_to_alternatives.map((comp, idx) => (
                <div key={idx} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{comp.alternative}</h4>
                    {comp.their_price && (
                      <Badge variant="outline">{comp.their_price}</Badge>
                    )}
                  </div>
                  {comp.their_limitation && (
                    <p className="text-sm text-red-400 mb-1">
                      Limitación: {comp.their_limitation}
                    </p>
                  )}
                  {comp.our_advantage && (
                    <p className="text-sm text-green-400">
                      Nuestra ventaja: {comp.our_advantage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objection Killers */}
      {data.objection_killers && data.objection_killers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-purple-500" />
              Destruye-Objeciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.objection_killers.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-xs text-red-400">?</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-400 mb-2">"{item.objection}"</p>
                    {item.killer && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{item.killer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Offer Summary Copy */}
      {data.offer_summary_copy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Copy Resumen de la Oferta</CardTitle>
            <CardDescription>
              Texto listo para usar en landing pages o ads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="whitespace-pre-line text-sm">{data.offer_summary_copy}</p>
            </div>
            <CopyButton text={data.offer_summary_copy} className="mt-3" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
