import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, ChevronDown, ChevronUp, Sparkles, Building2, Users2, Info, Clock, ArrowRight } from "lucide-react";
import { KreoonSectionTitle, KreoonCard, KreoonButton, KreoonBadge } from "@/components/ui/kreoon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export type PricingSegment = "marcas" | "creadores" | "agencias";
export type BillingPeriod = "monthly" | "annual";

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
  icon?: React.ReactNode;
}

export interface PricingSectionProps {
  onSelectPlan: (planId: string) => void;
  highlightedPlan?: string;
}

const PLANS_MARCAS: PricingPlan[] = [
  {
    id: "marcas-free",
    name: "Explorar",
    description: "Conoce la plataforma sin compromiso",
    priceMonthly: "0",
    priceCustom: false,
    aiTokens: "300 tokens IA/mes",
    features: [
      "Explorar perfiles de creadores",
      "Ver portfolio y estadísticas",
      "Pagos seguros",
    ],
    limitations: ["Sin crear campañas", "Sin revelar contactos", "Sin IA"],
    ctaLabel: "Explorar gratis",
    ctaVariant: "secondary",
  },
  {
    id: "marcas-starter",
    name: "Starter",
    badge: "Para empezar",
    description: "Crear campañas y conectar con creadores",
    priceMonthly: "39",
    priceAnnual: "33",
    priceCustom: false,
    aiTokens: "4,000 tokens IA/mes",
    features: [
      "5 campañas por mes",
      "10 contactos de creadores/mes",
      "Comprar contactos extra si se agotan",
      "Acceso a IA creativa",
      "Chat con creadores",
      "Soporte por email",
    ],
    limitations: ["Sin analytics avanzados"],
    ctaLabel: "Empezar prueba gratis",
    ctaVariant: "primary",
    highlighted: true,
  },
  {
    id: "marcas-pro",
    name: "Pro",
    badge: "Más popular",
    description: "Ideal para marcas en crecimiento",
    priceMonthly: "129",
    priceAnnual: "108",
    priceCustom: false,
    aiTokens: "12,000 tokens IA/mes",
    features: [
      "Campañas ilimitadas",
      "Más contactos incluidos",
      "Acceso completo a IA creativa",
      "Analytics avanzados",
      "Soporte prioritario",
      "Reportes de performance",
    ],
    ctaLabel: "Empezar prueba gratis",
    ctaVariant: "outline",
  },
  {
    id: "marcas-business",
    name: "Business",
    description: "Para marcas con alto volumen de contenido",
    priceMonthly: "349",
    priceAnnual: "291",
    priceCustom: false,
    aiTokens: "40,000 tokens IA/mes",
    customApiIncluded: true,
    features: [
      "Todo de Pro +",
      "Campañas ilimitadas",
      "API access",
      "Account manager",
      "Integraciones avanzadas",
      "Reportes personalizados",
      "Onboarding dedicado",
    ],
    ctaLabel: "Contactar ventas",
    ctaVariant: "outline",
    icon: <Sparkles className="h-5 w-5" />,
  },
];

const PLANS_CREADORES: PricingPlan[] = [
  {
    id: "creadores-basico",
    name: "Básico",
    description: "Empieza a conectar con marcas",
    priceMonthly: "0",
    priceCustom: false,
    features: [
      "Crear perfil y portafolio",
      "Aplicar a campañas",
      "Acceso a comunidad",
      "5 aplicaciones por mes",
      "Chat con marcas",
    ],
    ctaLabel: "Comenzar gratis",
    ctaVariant: "secondary",
  },
  {
    id: "creadores-pro",
    name: "Creator Pro",
    badge: "Badge verificado",
    description: "Destaca y escala tu carrera",
    priceMonthly: "24",
    priceAnnual: "20",
    priceCustom: false,
    aiTokens: "6,000 tokens IA/mes",
    features: [
      "Aplicaciones ilimitadas",
      "Herramientas de IA creativa",
      "Posición destacada en búsquedas",
      "Badge verificado",
      "Analytics de perfil",
      "Soporte prioritario",
    ],
    ctaLabel: "Probar 14 días gratis",
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
    priceAnnual: "208",
    priceCustom: false,
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
    description: "Para agencias en crecimiento",
    priceMonthly: "599",
    priceAnnual: "499",
    priceCustom: false,
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
    ctaLabel: "Comenzar prueba gratis",
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
      "API dedicada",
      "SSO / SAML",
      "Account manager dedicado",
      "Onboarding personalizado",
      "SLA garantizado",
    ],
    ctaLabel: "Contactar ventas",
    ctaVariant: "outline",
    icon: <Sparkles className="h-5 w-5" />,
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
  "14 días de prueba gratis",
  "Sin tarjeta requerida",
  "Cancela cuando quieras",
  "Garantía de satisfacción",
];

// Comparison table features by segment
interface ComparisonFeature {
  name: string;
  values: Record<string, string | boolean>;
}

const COMPARISON_FEATURES_MARCAS: ComparisonFeature[] = [
  { name: "Campañas por mes", values: { "marcas-free": "0", "marcas-starter": "5", "marcas-pro": "Ilimitadas", "marcas-business": "Ilimitadas" } },
  { name: "Contactos creadores/mes", values: { "marcas-free": "0", "marcas-starter": "10 (+ comprar más)", "marcas-pro": "Incluidos", "marcas-business": "Ilimitados" } },
  { name: "Tokens IA mensuales", values: { "marcas-free": "300", "marcas-starter": "4,000", "marcas-pro": "12,000", "marcas-business": "40,000" } },
  { name: "API propia de IA", values: { "marcas-free": false, "marcas-starter": false, "marcas-pro": false, "marcas-business": true } },
  { name: "Analytics avanzados", values: { "marcas-free": false, "marcas-starter": false, "marcas-pro": true, "marcas-business": true } },
  { name: "API access", values: { "marcas-free": false, "marcas-starter": false, "marcas-pro": false, "marcas-business": true } },
  { name: "Account manager", values: { "marcas-free": false, "marcas-starter": false, "marcas-pro": false, "marcas-business": true } },
  { name: "Reportes personalizados", values: { "marcas-free": false, "marcas-starter": false, "marcas-pro": false, "marcas-business": true } },
  { name: "Soporte", values: { "marcas-free": "—", "marcas-starter": "Email", "marcas-pro": "Prioritario", "marcas-business": "Dedicado" } },
];

const COMPARISON_FEATURES_CREADORES: ComparisonFeature[] = [
  { name: "Aplicaciones por mes", values: { "creadores-basico": "5", "creadores-pro": "Ilimitadas" } },
  { name: "Tokens IA mensuales", values: { "creadores-basico": "800", "creadores-pro": "6,000" } },
  { name: "API propia de IA", values: { "creadores-basico": false, "creadores-pro": false } },
  { name: "IA creativa", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Badge verificado", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Posición destacada", values: { "creadores-basico": false, "creadores-pro": true } },
  { name: "Analytics de perfil", values: { "creadores-basico": false, "creadores-pro": true } },
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
  { name: "IA creativa", values: { "agencias-starter": false, "agencias-pro": "Equipo completo", "agencias-enterprise": "Ilimitada" } },
  { name: "API dedicada", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": true } },
  { name: "SSO / SAML", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": true } },
  { name: "Account manager", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": "Dedicado" } },
  { name: "SLA garantizado", values: { "agencias-starter": false, "agencias-pro": false, "agencias-enterprise": true } },
  { name: "Soporte", values: { "agencias-starter": "Email", "agencias-pro": "Prioritario", "agencias-enterprise": "Dedicado 24/7" } },
];

const COMPARISON_BY_SEGMENT: Record<PricingSegment, ComparisonFeature[]> = {
  marcas: COMPARISON_FEATURES_MARCAS,
  creadores: COMPARISON_FEATURES_CREADORES,
  agencias: COMPARISON_FEATURES_AGENCIAS,
};

export function PricingSection({
  onSelectPlan,
  highlightedPlan,
}: PricingSectionProps) {
  const [billing, setBilling] = React.useState<BillingPeriod>("monthly");
  const [segment, setSegment] = React.useState<PricingSegment>("marcas");
  const [comparerOpen, setComparerOpen] = React.useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const navigate = useNavigate();

  const plans = SEGMENT_PLANS[segment];
  const comparisonFeatures = COMPARISON_BY_SEGMENT[segment];
  const effectiveHighlight = highlightedPlan ?? plans.find((p) => p.highlighted)?.id;

  const handleLiveShoppingWaitlist = () => {
    navigate("/coming-soon?feature=Live%20Shopping&description=Vende%20en%20tiempo%20real%20con%20creadores.%20Disponible%20como%20add-on%20para%20todos%20los%20planes.");
  };

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 md:mb-14">
          <KreoonSectionTitle
            title="Planes que se adaptan a ti"
            subtitle="Comienza gratis y escala cuando estés listo"
            align="center"
          />
        </div>

        {/* Billing toggle */}
        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="inline-flex rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/80 p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-sm px-5 py-2.5 text-sm font-medium transition-all",
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
                "relative rounded-sm px-5 py-2.5 text-sm font-medium transition-all",
                billing === "annual"
                  ? "bg-kreoon-purple-500/20 text-white shadow-sm"
                  : "text-kreoon-text-secondary hover:text-white",
              )}
            >
              Anual
              <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                Ahorra 20%
              </span>
            </button>
          </div>
        </div>

        {/* Segment tabs with icons */}
        <div className="mb-10 flex justify-center">
          <div className="inline-flex rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/80 p-1">
            {(Object.keys(SEGMENT_CONFIG) as PricingSegment[]).map((s) => {
              const config = SEGMENT_CONFIG[s];
              const Icon = config.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSegment(s)}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-all",
                    segment === s
                      ? "bg-kreoon-purple-500/20 text-white shadow-sm"
                      : "text-kreoon-text-secondary hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden">
                    {s === "marcas" && "Marcas"}
                    {s === "creadores" && "Creadores"}
                    {s === "agencias" && "Agencias"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de planes */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.1, delayChildren: 0.1 },
            },
          }}
          className={cn(
            "grid gap-6",
            plans.length === 2 && "sm:grid-cols-2 lg:max-w-3xl lg:mx-auto",
            plans.length === 3 && "lg:grid-cols-3",
            plans.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {plans.map((plan) => {
            const isHighlighted = plan.id === effectiveHighlight;
            const price =
              plan.priceCustom
                ? "Personalizado"
                : billing === "annual" && plan.priceAnnual != null
                  ? `$${plan.priceAnnual}`
                  : plan.priceMonthly === "0"
                    ? "Gratis"
                    : `$${plan.priceMonthly}`;
            const period =
              plan.priceCustom || plan.priceMonthly === "0"
                ? ""
                : "/mes";

            return (
              <motion.div
                key={plan.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="flex flex-col"
              >
                <KreoonCard
                  glow={isHighlighted}
                  className={cn(
                    "relative flex h-full flex-col border-kreoon-border p-6 transition-all duration-300",
                    isHighlighted &&
                      "border-kreoon-purple-400/50 shadow-kreoon-glow-lg ring-2 ring-kreoon-purple-500/30",
                    isHighlighted && "animate-pulse-ring",
                  )}
                >
                  {plan.badge && (
                    <div className="mb-4">
                      <KreoonBadge variant="purple" size="sm">
                        {plan.badge}
                      </KreoonBadge>
                    </div>
                  )}
                  <div className="mb-4 flex items-center gap-2">
                    {plan.icon && (
                      <span className="text-kreoon-purple-400">{plan.icon}</span>
                    )}
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  </div>
                  <div className="mb-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">
                      {price}
                    </span>
                    {period && (
                      <span className="text-sm text-kreoon-text-muted">
                        {period}
                      </span>
                    )}
                  </div>
                  <p className="mb-6 text-sm text-kreoon-text-secondary">
                    {plan.description}
                  </p>
                  <div className="mb-6 h-px w-full bg-kreoon-border/60" aria-hidden />
                  <ul className="mb-6 flex-1 space-y-3">
                    <li className="flex items-center gap-2 text-sm text-kreoon-text-secondary">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-help items-center gap-2">
                              <Sparkles className="h-4 w-4 shrink-0 text-kreoon-purple-400" />
                              {plan.aiTokens}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[220px]">
                            <p>Usa IA para generar scripts, research, optimizar contenido y más</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </li>
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-kreoon-text-secondary"
                      >
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.limitations && plan.limitations.length > 0 && (
                    <ul className="mb-6 space-y-2">
                      {plan.limitations.map((l) => (
                        <li
                          key={l}
                          className="flex items-center gap-2 text-sm text-kreoon-text-muted line-through"
                        >
                          <X className="h-4 w-4 shrink-0" />
                          {l}
                        </li>
                      ))}
                    </ul>
                  )}
                  <KreoonButton
                    variant={plan.ctaVariant}
                    size="lg"
                    className="w-full"
                    onClick={() => onSelectPlan(plan.id)}
                  >
                    {plan.ctaLabel}
                  </KreoonButton>
                </KreoonCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Nota tokens y API propia */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-sm text-kreoon-text-muted"
        >
          ¿Necesitas más? Compra tokens adicionales o conecta tu propia API de IA
        </motion.p>

        {/* Nota sobre Live Shopping */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: 0.35 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 rounded-sm border border-amber-500/20 bg-amber-500/5 px-6 py-4 sm:flex-row"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-kreoon-text-secondary">
                <strong className="text-white">Live Shopping</strong> estará disponible como add-on para todos los planes una vez lanzado.
              </span>
            </div>
          </div>
          <button
            onClick={handleLiveShoppingWaitlist}
            className="flex items-center gap-1 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
          >
            Únete a la lista de espera
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Comparador collapsible */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <button
            type="button"
            onClick={() => setComparerOpen((o) => !o)}
            className="flex w-full items-center justify-center gap-2 text-sm text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300"
          >
            {comparerOpen ? (
              <>
                Ocultar comparación
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Ver comparación completa
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
          {comparerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 overflow-x-auto rounded-sm border border-kreoon-border bg-kreoon-bg-card/50">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-kreoon-border bg-kreoon-bg-secondary">
                    <tr>
                      <th className="p-4 font-semibold text-white">Característica</th>
                      {plans.map((p) => (
                        <th key={p.id} className="p-4 font-semibold text-white">
                          {p.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature) => (
                      <tr
                        key={feature.name}
                        className="border-b border-kreoon-border/50"
                      >
                        <td className="p-4 text-kreoon-text-secondary">
                          {feature.name}
                        </td>
                        {plans.map((p) => {
                          const value = feature.values[p.id];
                          return (
                            <td key={p.id} className="p-4">
                              {value === true ? (
                                <Check className="h-5 w-5 text-emerald-500" />
                              ) : value === false ? (
                                <X className="h-4 w-4 text-kreoon-text-muted" />
                              ) : (
                                <span className="text-kreoon-text-secondary">{value}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Trust */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-kreoon-text-muted"
        >
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </span>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.25), 0 0 40px rgba(124, 58, 237, 0.3); }
          50% { box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.45), 0 0 50px rgba(124, 58, 237, 0.4); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
