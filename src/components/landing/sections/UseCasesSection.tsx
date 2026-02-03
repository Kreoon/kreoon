import * as React from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ShoppingBag,
  Camera,
  Building2,
  Users,
  Check,
  ArrowRight,
  Quote,
  TrendingUp,
  Clock,
  DollarSign,
  Users2,
} from "lucide-react";
import { KreoonSectionTitle, KreoonCard, KreoonButton } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export interface UseCasesSectionProps {
  onSelectUseCase?: (useCase: string) => void;
  className?: string;
}

interface UseCase {
  id: string;
  icon: React.ElementType;
  iconGradient: string;
  title: string;
  subtitle: string;
  scenario: string;
  benefits: string[];
  result: {
    metric: string;
    description: string;
    icon: React.ElementType;
  };
  cta: string;
}

const USE_CASES: UseCase[] = [
  {
    id: "d2c-brand",
    icon: ShoppingBag,
    iconGradient: "from-emerald-500 to-teal-500",
    title: "Marca de ecommerce",
    subtitle: "D2C & Retail",
    scenario:
      "Una marca de skincare necesita 20 videos UGC mensuales para sus ads de Meta y TikTok.",
    benefits: [
      "Publica el brief una vez y recibe múltiples propuestas",
      "Accede a creadores verificados con reviews reales",
      "Aprueba, paga y descarga todo en un solo lugar",
      "Mide qué creador genera mejor ROAS para tus ads",
    ],
    result: {
      metric: "-60%",
      description: "tiempo en gestión de contenido",
      icon: Clock,
    },
    cta: "Soy una marca",
  },
  {
    id: "ugc-creator",
    icon: Camera,
    iconGradient: "from-kreoon-purple-500 to-kreoon-purple-700",
    title: "Creador de contenido",
    subtitle: "UGC & Freelance",
    scenario:
      "Un creador quiere monetizar haciendo UGC para marcas sin necesitar seguidores masivos.",
    benefits: [
      "Crea tu perfil y portafolio profesional",
      "Aplica a campañas pagadas de marcas reales",
      "Recibe feedback y mejora con cada proyecto",
      "Cobra de forma segura con protección escrow",
    ],
    result: {
      metric: "$2,000",
      description: "/mes en 3 meses desde $0",
      icon: DollarSign,
    },
    cta: "Soy creador",
  },
  {
    id: "marketing-agency",
    icon: Building2,
    iconGradient: "from-amber-500 to-orange-500",
    title: "Agencia con múltiples clientes",
    subtitle: "Agencias & Studios",
    scenario:
      "Una agencia de marketing digital gestiona el contenido de 8 marcas con un equipo de 5 personas.",
    benefits: [
      "Un dashboard centralizado para todos tus clientes",
      "Asigna proyectos a tu equipo interno fácilmente",
      "Contrata creadores externos cuando lo necesites",
      "Genera reportes automáticos por cliente",
    ],
    result: {
      metric: "3x",
      description: "más clientes con el mismo equipo",
      icon: TrendingUp,
    },
    cta: "Tengo una agencia",
  },
  {
    id: "inhouse-team",
    icon: Users,
    iconGradient: "from-blue-500 to-cyan-500",
    title: "Equipo creativo in-house",
    subtitle: "Marketing interno",
    scenario:
      "El equipo de marketing de una empresa mediana necesita organizar su producción de contenido.",
    benefits: [
      "Centraliza briefs, assets y entregables",
      "Workflows de aprobación con stakeholders",
      "Biblioteca de contenido organizada y buscable",
      "Métricas de performance por pieza de contenido",
    ],
    result: {
      metric: "-50%",
      description: "emails y reuniones de coordinación",
      icon: Users2,
    },
    cta: "Somos un equipo",
  },
];

export function UseCasesSection({
  onSelectUseCase,
  className,
}: UseCasesSectionProps) {
  const [activeCase, setActiveCase] = React.useState<string>(USE_CASES[0].id);
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const selectedCase = USE_CASES.find((uc) => uc.id === activeCase) ?? USE_CASES[0];

  return (
    <section
      id="use-cases"
      ref={sectionRef}
      className={cn("relative py-16 md:py-24", className)}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <KreoonSectionTitle
            title="Kreoon se adapta a ti"
            subtitle="Descubre cómo diferentes equipos usan la plataforma"
            align="center"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Tabs / Selector lateral */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-4"
          >
            <div className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
              {USE_CASES.map((useCase, index) => {
                const Icon = useCase.icon;
                const isActive = activeCase === useCase.id;

                return (
                  <motion.button
                    key={useCase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    onClick={() => setActiveCase(useCase.id)}
                    className={cn(
                      "group relative flex min-w-[160px] flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-300 lg:min-w-0 lg:flex-row lg:items-center",
                      isActive
                        ? "border-kreoon-purple-500/50 bg-kreoon-purple-500/10 shadow-kreoon-glow-sm"
                        : "border-kreoon-border bg-kreoon-bg-card/50 hover:border-kreoon-purple-500/30 hover:bg-kreoon-bg-card",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br transition-shadow",
                        useCase.iconGradient,
                        isActive && "shadow-lg",
                      )}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4
                        className={cn(
                          "font-semibold transition-colors",
                          isActive ? "text-white" : "text-kreoon-text-secondary",
                        )}
                      >
                        {useCase.title}
                      </h4>
                      <p className="text-xs text-kreoon-text-muted">
                        {useCase.subtitle}
                      </p>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute -right-1 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-full bg-kreoon-purple-500 lg:block"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Content area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-8"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <KreoonCard className="overflow-hidden border-kreoon-border">
                  {/* Header del caso */}
                  <div className="border-b border-kreoon-border/50 bg-gradient-to-r from-kreoon-bg-secondary to-kreoon-bg-card p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                          selectedCase.iconGradient,
                        )}
                      >
                        <selectedCase.icon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider text-kreoon-text-muted">
                          {selectedCase.subtitle}
                        </span>
                        <h3 className="text-xl font-bold text-white">
                          {selectedCase.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-6">
                    {/* Escenario */}
                    <div className="mb-6">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-kreoon-text-muted">
                        <Quote className="h-4 w-4 text-kreoon-purple-400" />
                        Escenario
                      </div>
                      <p className="rounded-lg border-l-2 border-kreoon-purple-500/50 bg-kreoon-bg-secondary/50 py-3 pl-4 pr-3 text-kreoon-text-secondary italic">
                        {selectedCase.scenario}
                      </p>
                    </div>

                    {/* Cómo ayuda Kreoon */}
                    <div className="mb-6">
                      <h4 className="mb-3 text-sm font-medium text-white">
                        Cómo Kreoon ayuda:
                      </h4>
                      <ul className="space-y-2.5">
                        {selectedCase.benefits.map((benefit, index) => (
                          <motion.li
                            key={benefit}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="flex items-start gap-2.5 text-sm text-kreoon-text-secondary"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            {benefit}
                          </motion.li>
                        ))}
                      </ul>
                    </div>

                    {/* Resultado destacado */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mb-6 flex items-center gap-4 rounded-xl bg-gradient-to-r from-kreoon-purple-500/10 via-kreoon-bg-secondary to-kreoon-purple-500/10 p-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-kreoon-purple-500/20">
                        <selectedCase.result.icon className="h-6 w-6 text-kreoon-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-kreoon-purple-400">
                            {selectedCase.result.metric}
                          </span>
                          <span className="text-sm text-kreoon-text-secondary">
                            {selectedCase.result.description}
                          </span>
                        </div>
                        <p className="text-xs text-kreoon-text-muted">
                          Resultado promedio de nuestros usuarios
                        </p>
                      </div>
                    </motion.div>

                    {/* CTA */}
                    <KreoonButton
                      variant="primary"
                      size="lg"
                      className="w-full gap-2 sm:w-auto"
                      onClick={() => onSelectUseCase?.(selectedCase.id)}
                    >
                      {selectedCase.cta}
                      <ArrowRight className="h-4 w-4" />
                    </KreoonButton>
                  </div>
                </KreoonCard>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Nota adicional */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-10 text-center text-sm text-kreoon-text-muted"
        >
          ¿No encuentras tu caso de uso?{" "}
          <a
            href="#contact"
            className="text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300 hover:underline"
          >
            Contáctanos
          </a>{" "}
          y te ayudamos a encontrar la mejor solución.
        </motion.p>
      </div>
    </section>
  );
}
