import * as React from "react";
import { motion, useInView } from "framer-motion";
import {
  Check,
  X,
  Sparkles,
  Building2,
  Users2,
  Info,
  Clock,
  ArrowRight,
  Users,
  RefreshCw,
  Megaphone,
  Brain,
  Crown,
  Rocket,
  Zap,
  Flame,
  Star,
} from "lucide-react";
import { KreoonSectionTitle, KreoonCard, KreoonButton, KreoonBadge } from "@/components/ui/kreoon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type PricingSegment = "marcas" | "creadores" | "agencias";
export type BillingPeriod = "monthly" | "annual";

interface MetricPill {
  icon: React.ElementType;
  label: string;
  value: string;
  disabled?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  badge?: string;
  priceMonthly: string;
  priceAnnual?: string;
  priceCustom?: boolean;
  description: string;
  features: string[];
  limitations?: string[];
  aiTokens: string;
  customApiIncluded?: boolean;
  ctaLabel: string;
  ctaVariant: "primary" | "secondary" | "outline";
  highlighted?: boolean;
  tierIcon?: React.ElementType;
  keyMetrics?: MetricPill[];
}

export interface PricingSectionProps {
  onSelectPlan: (planId: string) => void;
  highlightedPlan?: string;
}

// ─── Visual tier config ───────────────────────────────────────────────────────
const PLAN_TIER: Record<string, {
  borderTop: string;
  accentText: string;
  metricBg: string;
  metricText: string;
  tableAccent: string;
}> = {
  "marcas-free": {
    borderTop: "border-t-slate-600",
    accentText: "text-slate-400",
    metricBg: "bg-slate-800/70",
    metricText: "text-slate-300",
    tableAccent: "text-slate-400",
  },
  "marcas-starter": {
    borderTop: "border-t-blue-500",
    accentText: "text-blue-400",
    metricBg: "bg-blue-950/70",
    metricText: "text-blue-300",
    tableAccent: "text-blue-400",
  },
  "marcas-growth": {
    borderTop: "border-t-purple-500",
    accentText: "text-purple-300",
    metricBg: "bg-purple-950/70",
    metricText: "text-purple-200",
    tableAccent: "text-purple-300",
  },
  "marcas-pro": {
    borderTop: "border-t-orange-500",
    accentText: "text-orange-400",
    metricBg: "bg-orange-950/70",
    metricText: "text-orange-300",
    tableAccent: "text-orange-400",
  },
  "marcas-business": {
    borderTop: "border-t-amber-400",
    accentText: "text-amber-400",
    metricBg: "bg-amber-950/70",
    metricText: "text-amber-200",
    tableAccent: "text-amber-400",
  },
};
const DEFAULT_TIER = {
  borderTop: "border-t-kreoon-purple-400",
  accentText: "text-kreoon-purple-400",
  metricBg: "bg-purple-950/70",
  metricText: "text-purple-200",
  tableAccent: "text-kreoon-purple-400",
};

// ─── Plan data ────────────────────────────────────────────────────────────────
const PLANS_MARCAS: PricingPlan[] = [
  {
    id: "marcas-free",
    name: "Explorar",
    description: "Prueba la plataforma sin pagar nada",
    priceMonthly: "0",
    aiTokens: "500 tokens IA/mes",
    tierIcon: Star,
    keyMetrics: [
      { icon: Users, label: "Contacto/mes", value: "1" },
      { icon: RefreshCw, label: "Canjes/mes", value: "—", disabled: true },
      { icon: Megaphone, label: "Campaña", value: "1" },
      { icon: Brain, label: "Tokens IA", value: "500" },
    ],
    features: [
      "Explorar perfiles y portafolios",
      "1 campaña activa",
      "5 piezas de contenido",
      "Chat básico con creadores",
      "Pagos seguros",
    ],
    limitations: ["Sin canjes", "Sin IA creativa", "Sin analytics"],
    ctaLabel: "Empezar gratis",
    ctaVariant: "secondary",
  },
  {
    id: "marcas-starter",
    name: "Starter",
    badge: "Para empezar",
    description: "Lanza tus primeras campañas con creadores reales",
    priceMonthly: "39",
    priceAnnual: "27",
    aiTokens: "4,000 tokens IA/mes",
    tierIcon: Rocket,
    highlighted: true,
    keyMetrics: [
      { icon: Users, label: "Contactos/mes", value: "5" },
      { icon: RefreshCw, label: "Canjes/mes", value: "5" },
      { icon: Megaphone, label: "Campañas", value: "5" },
      { icon: Brain, label: "Tokens IA", value: "4,000" },
    ],
    features: [
      "5 contactos revelados/mes",
      "5 canjes/mes con creadores",
      "5 campañas activas",
      "Comprar contactos extra",
      "IA creativa básica",
      "Chat con creadores",
      "Soporte por email",
    ],
    ctaLabel: "Suscribirme ahora",
    ctaVariant: "primary",
  },
  {
    id: "marcas-growth",
    name: "Growth",
    badge: "Más popular",
    description: "Escala tus campañas con más poder y creadores",
    priceMonthly: "69",
    priceAnnual: "48",
    aiTokens: "7,500 tokens IA/mes",
    tierIcon: Zap,
    keyMetrics: [
      { icon: Users, label: "Contactos/mes", value: "10" },
      { icon: RefreshCw, label: "Canjes/mes", value: "10" },
      { icon: Megaphone, label: "Campañas", value: "10" },
      { icon: Brain, label: "Tokens IA", value: "7,500" },
    ],
    features: [
      "10 contactos revelados/mes",
      "10 canjes/mes con creadores",
      "10 campañas activas",
      "Comprar contactos extra",
      "IA creativa completa",
      "3 ADN Recargados/mes",
      "20 GB almacenamiento",
      "Analytics básicos",
    ],
    ctaLabel: "Suscribirme ahora",
    ctaVariant: "primary",
  },
  {
    id: "marcas-pro",
    name: "Pro",
    description: "Para marcas con alto volumen de UGC",
    priceMonthly: "129",
    priceAnnual: "90",
    aiTokens: "12,000 tokens IA/mes",
    tierIcon: Flame,
    keyMetrics: [
      { icon: Users, label: "Contactos/mes", value: "20" },
      { icon: RefreshCw, label: "Canjes/mes", value: "20" },
      { icon: Megaphone, label: "Campañas", value: "∞" },
      { icon: Brain, label: "Tokens IA", value: "12,000" },
    ],
    features: [
      "20 contactos revelados/mes",
      "20 canjes/mes con creadores",
      "Campañas ilimitadas",
      "IA creativa avanzada",
      "5 ADN Recargados/mes",
      "Analytics avanzados",
      "Reportes de performance",
      "Soporte prioritario",
    ],
    ctaLabel: "Suscribirme ahora",
    ctaVariant: "outline",
  },
  {
    id: "marcas-business",
    name: "Business",
    description: "Para marcas con alto volumen y necesidades enterprise",
    priceMonthly: "349",
    priceAnnual: "244",
    aiTokens: "40,000 tokens IA/mes",
    tierIcon: Crown,
    customApiIncluded: true,
    keyMetrics: [
      { icon: Users, label: "Contactos/mes", value: "∞" },
      { icon: RefreshCw, label: "Canjes/mes", value: "∞" },
      { icon: Megaphone, label: "Campañas", value: "∞" },
      { icon: Brain, label: "Tokens IA", value: "40,000" },
    ],
    features: [
      "Contactos revelados ilimitados",
      "Canjes ilimitados con creadores",
      "Campañas ilimitadas",
      "API access + API propia IA",
      "Account manager dedicado",
      "Integraciones avanzadas",
      "Reportes personalizados",
      "Onboarding dedicado",
    ],
    ctaLabel: "Contactar ventas",
    ctaVariant: "outline",
  },
];

const PLANS_CREADORES: PricingPlan[] = [
  {
    id: "creadores-basico",
    name: "Básico",
    description: "Empieza a conectar con marcas",
    priceMonthly: "0",
    aiTokens: "500 tokens IA/mes",
    features: [
      "Perfil y portafolio público",
      "Aplicar a campañas",
      "5 aplicaciones por mes",
      "Chat con marcas",
      "Acceso a comunidad",
    ],
    ctaLabel: "Comenzar gratis",
    ctaVariant: "secondary",
  },
  {
    id: "creadores-pro",
    name: "Creator Pro",
    badge: "Badge verificado",
    description: "Destaca y escala tu carrera como creador",
    priceMonthly: "24",
    priceAnnual: "17",
    aiTokens: "6,000 tokens IA/mes",
    features: [
      "Aplicaciones ilimitadas",
      "Herramientas de IA creativa",
      "Posición destacada en búsquedas",
      "Badge verificado en perfil",
      "Analytics de perfil",
      "Soporte prioritario",
    ],
    ctaLabel: "Suscribirme ahora",
    ctaVariant: "primary",
    highlighted: true,
  },
];

const PLANS_AGENCIAS: PricingPlan[] = [
  {
    id: "agencias-starter",
    name: "Agency Starter",
    description: "Para agencias pequeñas y freelancers con clientes",
    priceMonthly: "249",
    priceAnnual: "174",
    aiTokens: "20,000 tokens IA/mes",
    features: [
      "Hasta 5 clientes/marcas",
      "Hasta 10 miembros del equipo",
      "Panel multi-cliente",
      "Gestión de proyectos básica",
      "Reportes por cliente",
      "Acceso a red de creadores",
      "Soporte por email",
    ],
    ctaLabel: "Comenzar prueba",
    ctaVariant: "secondary",
  },
  {
    id: "agencias-pro",
    name: "Agency Pro",
    badge: "Más popular para agencias",
    description: "Para agencias en crecimiento con múltiples clientes",
    priceMonthly: "599",
    priceAnnual: "419",
    aiTokens: "60,000 tokens IA/mes",
    customApiIncluded: true,
    features: [
      "Hasta 20 clientes/marcas",
      "Hasta 30 miembros del equipo",
      "Todo de Agency Starter +",
      "Workflows de aprobación",
      "White-label básico (tu logo)",
      "IA creativa para todo el equipo",
      "Integraciones de marketing",
      "Soporte prioritario",
    ],
    ctaLabel: "Suscribirme ahora",
    ctaVariant: "primary",
    highlighted: true,
  },
  {
    id: "agencias-enterprise",
    name: "Agency Enterprise",
    description: "Para agencias grandes y corporativos",
    priceMonthly: "",
    priceCustom: true,
    aiTokens: "200,000 tokens IA/mes + API propia incluida",
    customApiIncluded: true,
    features: [
      "Clientes ilimitados",
      "Miembros ilimitados",
      "Todo de Agency Pro +",
      "White-label completo",
      "API dedicada + SSO / SAML",
      "Account manager dedicado",
      "Onboarding personalizado",
      "SLA garantizado",
    ],
    ctaLabel: "Contactar ventas",
    ctaVariant: "outline",
    tierIcon: Crown,
  },
];

const SEGMENT_PLANS: Record<PricingSegment, PricingPlan[]> = {
  marcas: PLANS_MARCAS,
  creadores: PLANS_CREADORES,
  agencias: PLANS_AGENCIAS,
};

const SEGMENT_CONFIG: Record<PricingSegment, { label: string; icon: React.ElementType }> = {
  marcas: { label: "Para Marcas", icon: Building2 },
  creadores: { label: "Para Creadores", icon: Sparkles },
  agencias: { label: "Para Agencias", icon: Users2 },
};

const TRUST_ITEMS = [
  "Plan gratuito incluido",
  "Sin tarjeta requerida",
  "Cancela cuando quieras",
  "Garantía de satisfacción",
];

// ─── Comparison table data ────────────────────────────────────────────────────
interface ComparisonFeature {
  name: string;
  category?: string;
  values: Record<string, string | boolean>;
}

const COMPARISON_FEATURES_MARCAS: ComparisonFeature[] = [
  { name: "Contactos revelados/mes", category: "Creadores y Canjes", values: { "marcas-free": "1", "marcas-starter": "5 (+extra)", "marcas-growth": "10 (+extra)", "marcas-pro": "20 (+extra)", "marcas-business": "Ilimitados" } },
  { name: "Canjes (producto × contenido)", values: { "marcas-free": false, "marcas-starter": "5/mes", "marcas-growth": "10/mes", "marcas-pro": "20/mes", "marcas-business": "Ilimitados" } },
  { name: "Campañas activas", category: "Campañas y Contenido", values: { "marcas-free": "1", "marcas-starter": "5", "marcas-growth": "10", "marcas-pro": "Ilimitadas", "marcas-business": "Ilimitadas" } },
  { name: "Piezas de contenido", values: { "marcas-free": "5", "marcas-starter": "30", "marcas-growth": "80", "marcas-pro": "Ilimitadas", "marcas-business": "Ilimitadas" } },
  { name: "Tokens IA mensuales", category: "IA y Analytics", values: { "marcas-free": "500", "marcas-starter": "4,000", "marcas-growth": "7,500", "marcas-pro": "12,000", "marcas-business": "40,000" } },
  { name: "ADN Recargados/mes", values: { "marcas-free": false, "marcas-starter": "2", "marcas-growth": "3", "marcas-pro": "5", "marcas-business": "Ilimitados" } },
  { name: "IA creativa", values: { "marcas-free": false, "marcas-starter": "Básica", "marcas-growth": "Completa", "marcas-pro": "Avanzada", "marcas-business": "Avanzada" } },
  { name: "Analytics avanzados", values: { "marcas-free": false, "marcas-starter": false, "marcas-growth": "Básicos", "marcas-pro": true, "marcas-business": true } },
  { name: "API de IA propia", values: { "marcas-free": false, "marcas-starter": false, "marcas-growth": false, "marcas-pro": false, "marcas-business": true } },
  { name: "API access", category: "Servicios Premium", values: { "marcas-free": false, "marcas-starter": false, "marcas-growth": false, "marcas-pro": false, "marcas-business": true } },
  { name: "Account manager", values: { "marcas-free": false, "marcas-starter": false, "marcas-growth": false, "marcas-pro": false, "marcas-business": true } },
  { name: "Soporte", values: { "marcas-free": "—", "marcas-starter": "Email", "marcas-growth": "Email", "marcas-pro": "Prioritario", "marcas-business": "Dedicado" } },
];

const COMPARISON_FEATURES_CREADORES: ComparisonFeature[] = [
  { name: "Aplicaciones por mes", values: { "creadores-basico": "5", "creadores-pro": "Ilimitadas" } },
  { name: "Tokens IA mensuales", values: { "creadores-basico": "500", "creadores-pro": "6,000" } },
  { name: "IA creativa", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Badge verificado", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Posición destacada", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Analytics de perfil", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Soporte", values: { "creadores-basico": "Comunidad", "creadores-pro": "Prioritario" } },
];

const COMPARISON_FEATURES_AGENCIAS: ComparisonFeature[] = [
  { name: "Número de clientes", values: { "agencias-starter": "5", "agencias-pro": "20", "agencias-enterprise": "Ilimitados" } },
  { name: "Miembros del equipo", values: { "agencias-starter": "10", "agencias-pro": "30", "agencias-enterprise": "Ilimitados" } },
  { name: "Tokens IA mensuales", values: { "agencias-starter": "20,000", "agencias-pro": "60,000", "agencias-enterprise": "200,000" } },
  { name: "API propia de IA", values: { "agencias-starter": false, "agencias-pro": true, "agencias-enterprise": true } },
  { name: "Panel multi-cliente", values: { "agencias-starter": true, "agencias-pro": true, "agencias-enterprise": true } },
  { name: "Workflows de aprobación", values: { "agencias-starter": false, "agencias-pro": true, "agencias-enterprise": true } },
  { name: "White-label", values: { "agencias-starter": false, "agencias-pro": "Básico", "agencias-enterprise": "Completo" } },
  { name: "Integraciones de marketing", values: { "agencias-starter": false, "agencias-pro": true, "agencias-enterprise": true } },
  { name: "API dedicada + SSO", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": true } },
  { name: "Account manager", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": "Dedicado" } },
  { name: "SLA garantizado", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": true } },
  { name: "Soporte", values: { "agencias-starter": "Email", "agencias-pro": "Prioritario", "agencias-enterprise": "Dedicado 24/7" } },
];

const COMPARISON_BY_SEGMENT: Record<PricingSegment, ComparisonFeature[]> = {
  marcas: COMPARISON_FEATURES_MARCAS,
  creadores: COMPARISON_FEATURES_CREADORES,
  agencias: COMPARISON_FEATURES_AGENCIAS,
};

// ─── Plan card component ──────────────────────────────────────────────────────
function PlanCard({
  plan,
  billing,
  isHighlighted,
  onSelect,
  animDelay = 0,
}: {
  plan: PricingPlan;
  billing: BillingPeriod;
  isHighlighted: boolean;
  onSelect: () => void;
  animDelay?: number;
}) {
  const tier = PLAN_TIER[plan.id] ?? DEFAULT_TIER;
  const TierIcon = plan.tierIcon;

  const priceDisplay =
    plan.priceCustom
      ? "A medida"
      : billing === "annual" && plan.priceAnnual != null
        ? `$${plan.priceAnnual}`
        : plan.priceMonthly === "0"
          ? "Gratis"
          : `$${plan.priceMonthly}`;

  const showPeriod = !plan.priceCustom && plan.priceMonthly !== "0";

  // Annual savings hint shown when viewing monthly
  const annualSavings =
    !plan.priceCustom &&
    plan.priceMonthly !== "0" &&
    plan.priceAnnual != null
      ? Math.round((parseInt(plan.priceMonthly) - parseInt(plan.priceAnnual)) * 12)
      : null;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { delay: animDelay, duration: 0.45 } },
      }}
      className="flex flex-col h-full"
    >
      <div
        className={cn(
          "relative flex h-full flex-col rounded-xl border border-kreoon-border/70 bg-kreoon-bg-card/60 p-6 transition-all duration-300",
          "border-t-2",
          tier.borderTop,
          isHighlighted && [
            "border-kreoon-purple-400/50",
            "shadow-[0_0_40px_rgba(124,58,237,0.25)]",
            "ring-2 ring-kreoon-purple-500/25",
          ],
        )}
      >
        {/* Popular badge */}
        {plan.badge && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                isHighlighted
                  ? "bg-kreoon-purple-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]"
                  : "bg-kreoon-bg-secondary border border-kreoon-border text-kreoon-text-secondary",
              )}
            >
              {plan.badge === "Más popular" && <Sparkles className="h-3 w-3" />}
              {plan.badge}
            </span>
          </div>
        )}

        {/* Header: icon + name */}
        <div className="mb-4 flex items-center gap-2.5">
          {TierIcon && (
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tier.metricBg)}>
              <TierIcon className={cn("h-5 w-5", tier.accentText)} />
            </div>
          )}
          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
        </div>

        {/* Price */}
        <div className="mb-1 flex items-baseline gap-1.5">
          <span className={cn("text-4xl font-extrabold", plan.priceMonthly === "0" ? "text-white" : "text-white")}>
            {priceDisplay}
          </span>
          {showPeriod && (
            <span className="text-sm text-kreoon-text-muted">/mes</span>
          )}
        </div>

        {/* Annual toggle hint */}
        {billing === "monthly" && annualSavings != null && (
          <p className="mb-2 text-xs text-emerald-400/80">
            Ahorra ${annualSavings}/año cambiando a anual
          </p>
        )}
        {billing === "annual" && plan.priceAnnual != null && (
          <p className="mb-2 text-xs text-emerald-400/80">
            Precio con descuento anual del 30%
          </p>
        )}

        <p className="mb-5 text-sm text-kreoon-text-secondary leading-snug">
          {plan.description}
        </p>

        {/* Key metrics pills */}
        {plan.keyMetrics && plan.keyMetrics.length > 0 && (
          <div className="mb-5 grid grid-cols-2 gap-2">
            {plan.keyMetrics.map((m) => {
              const MIcon = m.icon;
              return (
                <div
                  key={m.label}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg px-2 py-2.5 text-center",
                    m.disabled ? "bg-kreoon-bg-secondary/40 opacity-50" : tier.metricBg,
                  )}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <MIcon className={cn("h-3.5 w-3.5 shrink-0", m.disabled ? "text-kreoon-text-muted" : tier.metricText)} />
                    <span className={cn("text-lg font-bold leading-none", m.disabled ? "text-kreoon-text-muted" : tier.metricText)}>
                      {m.value}
                    </span>
                  </div>
                  <span className={cn("text-[10px] leading-tight", m.disabled ? "text-kreoon-text-muted/60" : "text-kreoon-text-muted")}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* AI tokens highlight */}
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-kreoon-bg-secondary/50 border border-kreoon-border/50 px-3 py-2">
          <Sparkles className={cn("h-4 w-4 shrink-0", tier.accentText)} />
          <span className="text-sm text-kreoon-text-secondary">
            <span className={cn("font-semibold", tier.accentText)}>
              {plan.aiTokens.replace(" tokens IA/mes", "")}
            </span>{" "}
            tokens IA/mes
          </span>
        </div>

        <div className="mb-5 h-px w-full bg-kreoon-border/40" />

        {/* Features */}
        <ul className="mb-6 flex-1 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-kreoon-text-secondary">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
          {plan.limitations?.map((l) => (
            <li key={l} className="flex items-center gap-2 text-sm text-kreoon-text-muted/60 line-through">
              <X className="h-3.5 w-3.5 shrink-0" />
              {l}
            </li>
          ))}
        </ul>

        <KreoonButton
          variant={plan.ctaVariant}
          size="lg"
          className="w-full"
          onClick={onSelect}
        >
          {plan.ctaLabel}
        </KreoonButton>
      </div>
    </motion.div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function PricingSection({ onSelectPlan, highlightedPlan }: PricingSectionProps) {
  const [billing, setBilling] = React.useState<BillingPeriod>("monthly");
  const [segment, setSegment] = React.useState<PricingSegment>("marcas");
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const navigate = useNavigate();

  const plans = SEGMENT_PLANS[segment];
  const comparisonFeatures = COMPARISON_BY_SEGMENT[segment];
  const effectiveHighlight = highlightedPlan ?? plans.find((p) => p.highlighted)?.id;

  const handleLiveShoppingWaitlist = () => {
    navigate("/coming-soon?feature=Live%20Shopping&description=Vende%20en%20tiempo%20real%20con%20creadores.%20Disponible%20como%20add-on%20para%20todos%20los%20planes.");
  };

  // For marcas: split into 2 rows (3 + 2)
  const isMarcas = segment === "marcas";
  const row1 = isMarcas ? plans.slice(0, 3) : plans;
  const row2 = isMarcas ? plans.slice(3) : [];

  return (
    <section id="pricing" ref={sectionRef} className="relative py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* Header */}
        <div className="mb-10 md:mb-14">
          <KreoonSectionTitle
            title="Planes que se adaptan a ti"
            subtitle="Comienza gratis y escala cuando estés listo"
            align="center"
          />
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-xl border border-kreoon-border bg-kreoon-bg-secondary/80 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
                billing === "monthly"
                  ? "bg-kreoon-purple-500/20 text-white shadow-sm"
                  : "text-kreoon-text-secondary hover:text-white",
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
                billing === "annual"
                  ? "bg-kreoon-purple-500/20 text-white shadow-sm"
                  : "text-kreoon-text-secondary hover:text-white",
              )}
            >
              Anual
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Ahorra 30%
              </span>
            </button>
          </div>
        </div>

        {/* Segment tabs */}
        <div className="mb-12 flex justify-center">
          <div className="inline-flex rounded-xl border border-kreoon-border bg-kreoon-bg-secondary/80 p-1.5 gap-1">
            {(Object.keys(SEGMENT_CONFIG) as PricingSegment[]).map((s) => {
              const config = SEGMENT_CONFIG[s];
              const Icon = config.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegment(s)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                    segment === s
                      ? "bg-kreoon-purple-500/20 text-white shadow-sm"
                      : "text-kreoon-text-secondary hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Plan cards ── */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0 } } }}
          className="space-y-6"
        >
          {isMarcas ? (
            <>
              {/* Row label 1 */}
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-kreoon-border/30" />
                <span className="text-xs font-semibold uppercase tracking-widest text-kreoon-text-muted/60">
                  Planes de inicio
                </span>
                <div className="h-px flex-1 bg-kreoon-border/30" />
              </div>

              {/* Row 1: Explorar + Starter + Growth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {row1.map((plan, i) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billing={billing}
                    isHighlighted={plan.id === effectiveHighlight}
                    onSelect={() => onSelectPlan(plan.id)}
                    animDelay={i * 0.1}
                  />
                ))}
              </div>

              {/* Row label 2 */}
              <div className="flex items-center gap-3 mt-8 mb-2">
                <div className="h-px flex-1 bg-kreoon-border/30" />
                <span className="text-xs font-semibold uppercase tracking-widest text-kreoon-text-muted/60">
                  Planes avanzados
                </span>
                <div className="h-px flex-1 bg-kreoon-border/30" />
              </div>

              {/* Row 2: Pro + Business */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {row2.map((plan, i) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billing={billing}
                    isHighlighted={plan.id === effectiveHighlight}
                    onSelect={() => onSelectPlan(plan.id)}
                    animDelay={(row1.length + i) * 0.1}
                  />
                ))}
              </div>
            </>
          ) : (
            <div
              className={cn(
                "grid gap-5",
                plans.length === 2 && "sm:grid-cols-2 max-w-2xl mx-auto",
                plans.length === 3 && "lg:grid-cols-3",
              )}
            >
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  billing={billing}
                  isHighlighted={plan.id === effectiveHighlight}
                  onSelect={() => onSelectPlan(plan.id)}
                  animDelay={i * 0.1}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Extra tokens note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-kreoon-text-muted"
        >
          ¿Necesitas más? Compra tokens adicionales o conecta tu propia API de IA
        </motion.p>

        {/* Live Shopping notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.55 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 sm:flex-row"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 shrink-0">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm text-kreoon-text-secondary">
                <strong className="text-white">Live Shopping</strong> estará disponible como add-on para todos los planes.
              </span>
            </div>
          </div>
          <button
            onClick={handleLiveShoppingWaitlist}
            className="flex items-center gap-1.5 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300 whitespace-nowrap"
          >
            Únete a la lista de espera
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* ── Comparison table (always visible) ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-white">Comparación completa de planes</h3>
            <p className="mt-1 text-sm text-kreoon-text-muted">Encuentra exactamente lo que necesitas</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-kreoon-border bg-kreoon-bg-card/40">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-kreoon-border bg-kreoon-bg-secondary/80">
                  <th className="p-4 font-semibold text-kreoon-text-secondary w-48">Característica</th>
                  {plans.map((p) => {
                    const tier = PLAN_TIER[p.id] ?? DEFAULT_TIER;
                    const TierIcon = p.tierIcon;
                    return (
                      <th key={p.id} className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {TierIcon && <TierIcon className={cn("h-4 w-4", tier.tableAccent)} />}
                          <span className={cn("font-bold", tier.tableAccent)}>{p.name}</span>
                          {p.id === effectiveHighlight && (
                            <span className="text-[10px] text-kreoon-purple-400 font-medium">★ Popular</span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, idx) => {
                  const isNewCategory = feature.category != null;
                  return (
                    <React.Fragment key={feature.name}>
                      {isNewCategory && (
                        <tr className="bg-kreoon-bg-secondary/30">
                          <td
                            colSpan={plans.length + 1}
                            className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-kreoon-text-muted/60"
                          >
                            {feature.category}
                          </td>
                        </tr>
                      )}
                      <tr
                        className={cn(
                          "border-b border-kreoon-border/30 transition-colors hover:bg-kreoon-bg-secondary/20",
                          idx % 2 === 0 ? "bg-transparent" : "bg-kreoon-bg-secondary/10",
                        )}
                      >
                        <td className="p-4 text-kreoon-text-secondary font-medium">{feature.name}</td>
                        {plans.map((p) => {
                          const value = feature.values[p.id];
                          const isPopular = p.id === effectiveHighlight;
                          return (
                            <td
                              key={p.id}
                              className={cn(
                                "p-4 text-center",
                                isPopular && "bg-kreoon-purple-500/5",
                              )}
                            >
                              {value === true ? (
                                <span className="inline-flex justify-center">
                                  <Check className="h-5 w-5 text-emerald-500" />
                                </span>
                              ) : value === false ? (
                                <span className="inline-flex justify-center">
                                  <X className="h-4 w-4 text-kreoon-text-muted/40" />
                                </span>
                              ) : (
                                <span className={cn("text-sm", isPopular ? "text-white font-medium" : "text-kreoon-text-secondary")}>
                                  {value}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Trust items */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-kreoon-text-muted"
        >
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </span>
          ))}
        </motion.div>

        {/* Canje disclaimer */}
        <p className="mt-6 text-center text-xs text-kreoon-text-muted/60">
          * Los canjes requieren aceptación del creador en todos los planes. Un canje es un acuerdo de producto por contenido, sin intercambio de dinero.
        </p>

      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.25), 0 0 40px rgba(124, 58, 237, 0.3); }
          50% { box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.45), 0 0 50px rgba(124, 58, 237, 0.4); }
        }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
