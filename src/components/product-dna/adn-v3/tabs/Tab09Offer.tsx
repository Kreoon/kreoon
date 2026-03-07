/**
 * Tab09Offer
 * Oferta irresistible - estructura y componentes
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { CopyButton } from "../ui/CopyButton";

interface OfferComponent {
  name: string;
  description: string;
  perceived_value: string;
  delivery_format: string;
  why_valuable: string;
}

interface OfferData {
  offer_headline: string;
  offer_subheadline: string;
  core_offer: {
    main_product: string;
    description: string;
    transformation_promise: string;
    timeframe: string;
  };
  value_stack: OfferComponent[];
  bonuses: Array<{
    name: string;
    value: string;
    why_included: string;
    scarcity_element?: string;
  }>;
  guarantee: {
    type: string;
    duration: string;
    conditions: string;
    copy: string;
  };
  urgency_scarcity: Array<{
    type: "urgency" | "scarcity";
    element: string;
    justification: string;
  }>;
  pricing_strategy: {
    anchor_price: string;
    actual_price: string;
    payment_options: string[];
    price_justification: string;
    perceived_value_ratio: string;
  };
  objection_busters: Array<{
    objection: string;
    buster: string;
    proof_element?: string;
  }>;
  cta_primary: string;
  cta_variations: string[];
  offer_summary_copy: string;
}

interface Tab09OfferProps {
  data: OfferData | null | undefined;
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

  return (
    <div className="space-y-6">
      {/* Offer Headline Hero */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 mb-2">
              <Gift className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold">{data.offer_headline}</h1>
              <CopyButton text={data.offer_headline} />
            </div>
            <p className="text-lg text-muted-foreground">{data.offer_subheadline}</p>
          </div>
        </CardContent>
      </Card>

      {/* Core Offer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            Oferta Principal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <h3 className="text-xl font-bold mb-2">{data.core_offer?.main_product}</h3>
            <p className="text-muted-foreground mb-4">{data.core_offer?.description}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Promesa de Transformación</p>
                <p className="font-medium text-green-400">{data.core_offer?.transformation_promise}</p>
              </div>
              <div className="p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Timeframe</p>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {data.core_offer?.timeframe}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Value Stack
          </CardTitle>
          <CardDescription>
            Componentes que aumentan el valor percibido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.value_stack?.map((component, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-bold text-green-400">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold">{component.name}</h4>
                      <Badge variant="outline" className="text-xs text-green-400">
                        Valor: {component.perceived_value}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{component.description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{component.delivery_format}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Por qué es valioso: {component.why_valuable}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Bonos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.bonuses?.map((bonus, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{bonus.name}</h4>
                  <Badge className="bg-yellow-500/20 text-yellow-400">
                    {bonus.value}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{bonus.why_included}</p>
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

      {/* Guarantee */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Garantía
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-500/20 text-green-400 text-lg px-4 py-2">
                {data.guarantee?.type}
              </Badge>
              <Badge variant="outline">{data.guarantee?.duration}</Badge>
            </div>
            <div className="p-4 rounded-lg bg-background/50">
              <p className="font-medium mb-2">{data.guarantee?.copy}</p>
              <p className="text-sm text-muted-foreground">
                Condiciones: {data.guarantee?.conditions}
              </p>
            </div>
            <CopyButton text={data.guarantee?.copy || ""} />
          </div>
        </CardContent>
      </Card>

      {/* Urgency & Scarcity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-500" />
            Urgencia y Escasez
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.urgency_scarcity?.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  item.type === "urgency"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-orange-500/5 border-orange-500/20"
                }`}
              >
                <Badge
                  className={
                    item.type === "urgency"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-orange-500/20 text-orange-400"
                  }
                >
                  {item.type === "urgency" ? "Urgencia" : "Escasez"}
                </Badge>
                <p className="font-medium mt-2">{item.element}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Justificación: {item.justification}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Estrategia de Precio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-8 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Valor Percibido</p>
              <p className="text-2xl font-bold text-muted-foreground line-through">
                {data.pricing_strategy?.anchor_price}
              </p>
            </div>
            <div className="text-4xl text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-sm text-green-400">Precio Actual</p>
              <p className="text-3xl font-bold text-green-400">
                {data.pricing_strategy?.actual_price}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm mb-2">
              <strong>Ratio valor/precio:</strong> {data.pricing_strategy?.perceived_value_ratio}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.pricing_strategy?.price_justification}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Opciones de Pago</p>
            <div className="flex flex-wrap gap-2">
              {data.pricing_strategy?.payment_options?.map((option, idx) => (
                <Badge key={idx} variant="secondary">
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objection Busters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            Destruye-Objeciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.objection_busters?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-xs text-red-400">❌</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-400 mb-1">"{item.objection}"</p>
                    <div className="flex items-start gap-2 mt-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{item.buster}</p>
                    </div>
                    {item.proof_element && (
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        Prueba: {item.proof_element}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTAs */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardHeader>
          <CardTitle>Llamadas a la Acción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-background/50 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">CTA Principal</p>
              <p className="text-xl font-bold">{data.cta_primary}</p>
            </div>
            <CopyButton text={data.cta_primary || ""} />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Variaciones</p>
            <div className="space-y-2">
              {data.cta_variations?.map((cta, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded border flex items-center justify-between"
                >
                  <p className="font-medium">{cta}</p>
                  <CopyButton text={cta} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Summary Copy */}
      {data.offer_summary_copy && (
        <Card>
          <CardHeader>
            <CardTitle>Copy Resumen de la Oferta</CardTitle>
            <CardDescription>
              Texto listo para usar en landing pages o ads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="whitespace-pre-line text-sm">{data.offer_summary_copy}</p>
            </div>
            <div className="mt-3">
              <CopyButton text={data.offer_summary_copy} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
