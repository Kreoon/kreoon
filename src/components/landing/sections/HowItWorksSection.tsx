import * as React from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  FileText,
  Users,
  Video,
  TrendingUp,
  UserCircle,
  Search,
  Sparkles,
  Wallet,
  Play,
  Building2,
  Users2,
  FolderPlus,
  GitBranch,
  BarChart3,
  UserPlus,
  CheckCircle,
} from "lucide-react";
import { KreoonSectionTitle } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export type HowItWorksPerspective = "brand" | "creator" | "agency";

export interface HowItWorksSectionProps {
  perspective?: HowItWorksPerspective;
}

interface Step {
  number: string;
  icon: React.ElementType;
  title: string;
  description: string;
  visual: string;
}

const BRAND_STEPS: Step[] = [
  {
    number: "01",
    icon: FileText,
    title: "Crea tu campaña",
    description:
      "Define qué contenido necesitas, tu presupuesto y el estilo que buscas.",
    visual: "form",
  },
  {
    number: "02",
    icon: Users,
    title: "Encuentra creadores",
    description:
      "Nuestra IA te sugiere los creadores perfectos para tu marca.",
    visual: "profiles",
  },
  {
    number: "03",
    icon: Video,
    title: "Recibe contenido",
    description:
      "Los creadores producen y entregan. Tú revisas y apruebas.",
    visual: "video",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Escala y vende",
    description:
      "Publica, mide resultados y activa Live Shopping para convertir.",
    visual: "chart",
  },
];

const CREATOR_STEPS: Step[] = [
  {
    number: "01",
    icon: UserCircle,
    title: "Crea tu perfil",
    description: "Muestra tu talento y estilo. Destaca con tu portafolio.",
    visual: "profile",
  },
  {
    number: "02",
    icon: Search,
    title: "Aplica a campañas",
    description: "Encuentra marcas que te necesitan. Una sola plataforma.",
    visual: "campaigns",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Produce contenido",
    description: "Usa herramientas de IA para destacar y entregar a tiempo.",
    visual: "produce",
  },
  {
    number: "04",
    icon: Wallet,
    title: "Cobra y crece",
    description: "Recibe pagos seguros y sube de nivel con cada campaña.",
    visual: "growth",
  },
];

const AGENCY_STEPS: Step[] = [
  {
    number: "01",
    icon: FolderPlus,
    title: "Configura tus clientes",
    description: "Crea espacios separados para cada marca que gestionas.",
    visual: "clients",
  },
  {
    number: "02",
    icon: UserPlus,
    title: "Organiza tu equipo",
    description: "Invita a tu equipo creativo y asigna roles y permisos.",
    visual: "team",
  },
  {
    number: "03",
    icon: GitBranch,
    title: "Gestiona campañas",
    description: "Crea briefs, asigna creadores internos o externos, y trackea entregas.",
    visual: "kanban",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Reporta y escala",
    description: "Genera reportes por cliente, mide ROI y escala tu operación.",
    visual: "dashboard",
  },
];

const STEPS_BY_PERSPECTIVE: Record<HowItWorksPerspective, Step[]> = {
  brand: BRAND_STEPS,
  creator: CREATOR_STEPS,
  agency: AGENCY_STEPS,
};

const PERSPECTIVE_CONFIG: Record<HowItWorksPerspective, { label: string; icon: React.ElementType }> = {
  brand: { label: "Soy Marca", icon: Building2 },
  creator: { label: "Soy Creador", icon: Sparkles },
  agency: { label: "Tengo Agencia", icon: Users2 },
};

function StepVisual({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  // Brand visuals
  if (type === "form") {
    return (
      <div
        className={cn(
          "rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        <div className="mb-2 h-2 w-3/4 rounded bg-kreoon-border/60" />
        <div className="mb-2 h-2 w-1/2 rounded bg-kreoon-border/40" />
        <div className="h-8 rounded bg-kreoon-purple-500/30" />
      </div>
    );
  }
  if (type === "profiles") {
    return (
      <div
        className={cn(
          "flex gap-2 rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-10 shrink-0 rounded-full bg-kreoon-purple-500/40"
          />
        ))}
      </div>
    );
  }
  if (type === "video") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-6 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-kreoon-purple-500/50">
          <Play className="h-6 w-6 text-white" />
        </div>
      </div>
    );
  }
  if (type === "chart") {
    return (
      <div
        className={cn(
          "flex h-20 items-end gap-1 rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        {[40, 65, 45, 80, 70].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
            className="w-full rounded-t bg-gradient-to-t from-kreoon-purple-500/60 to-kreoon-purple-400/40"
          />
        ))}
      </div>
    );
  }

  // Creator visuals
  if (type === "profile" || type === "campaigns" || type === "produce" || type === "growth") {
    return (
      <div
        className={cn(
          "rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-kreoon-purple-500/40" />
        <div className="mx-auto h-2 w-3/4 rounded bg-kreoon-border/50" />
        <div className="mx-auto mt-1 h-2 w-1/2 rounded bg-kreoon-border/30" />
      </div>
    );
  }

  // Agency visuals
  if (type === "clients") {
    return (
      <div
        className={cn(
          "space-y-2 rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-6 w-6 shrink-0 rounded bg-amber-500/40" />
            <div className="h-2 flex-1 rounded bg-kreoon-border/50" />
            <CheckCircle className="h-4 w-4 text-emerald-500/60" />
          </div>
        ))}
      </div>
    );
  }
  if (type === "team") {
    return (
      <div
        className={cn(
          "rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex items-center justify-center gap-1">
          {["Admin", "Editor", "Creator"].map((role, i) => (
            <div key={role} className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full",
                  i === 0 ? "bg-amber-500/50" : i === 1 ? "bg-blue-500/50" : "bg-kreoon-purple-500/50",
                )}
              />
              <span className="mt-1 text-[10px] text-kreoon-text-muted">{role}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "kanban") {
    return (
      <div
        className={cn(
          "flex gap-2 rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        {["Todo", "In Progress", "Done"].map((col, colIndex) => (
          <div key={col} className="flex-1">
            <div className="mb-1 h-1.5 rounded bg-kreoon-border/60" />
            {[1, 2].slice(0, colIndex === 1 ? 2 : 1).map((item) => (
              <div
                key={item}
                className={cn(
                  "mt-1 h-4 rounded",
                  colIndex === 2 ? "bg-emerald-500/30" : "bg-kreoon-purple-500/30",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (type === "dashboard") {
    return (
      <div
        className={cn(
          "rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-3 backdrop-blur-sm",
          className,
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="h-2 w-12 rounded bg-kreoon-border/60" />
          <div className="text-xs font-bold text-emerald-400">+127%</div>
        </div>
        <div className="flex h-10 items-end gap-0.5">
          {[30, 45, 35, 60, 55, 80, 75].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              whileInView={{ height: `${h}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.03, duration: 0.3 }}
              className="w-full rounded-t bg-gradient-to-t from-amber-500/60 to-amber-400/40"
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

const container = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: i * 0.1,
    },
  }),
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HowItWorksSection({
  perspective: initialPerspective = "brand",
}: HowItWorksSectionProps) {
  const [perspective, setPerspective] =
    React.useState<HowItWorksPerspective>(initialPerspective);

  const steps = STEPS_BY_PERSPECTIVE[perspective];
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-10 md:mb-14">
          <KreoonSectionTitle
            title="Así de fácil funciona"
            subtitle="De la idea al contenido que vende en 4 simples pasos"
            align="center"
          />
        </div>

        {/* Toggle perspectiva con iconos */}
        <div className="mb-12 flex justify-center">
          <div className="inline-flex rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/80 p-1 backdrop-blur-sm">
            {(Object.keys(PERSPECTIVE_CONFIG) as HowItWorksPerspective[]).map((p) => {
              const config = PERSPECTIVE_CONFIG[p];
              const Icon = config.icon;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPerspective(p)}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium transition-all",
                    perspective === p
                      ? "bg-kreoon-purple-500/20 text-white shadow-sm"
                      : "text-kreoon-text-secondary hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden">
                    {p === "brand" && "Marca"}
                    {p === "creator" && "Creador"}
                    {p === "agency" && "Agencia"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: timeline horizontal */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`desktop-${perspective}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="hidden lg:block"
          >
            <motion.div
              variants={container}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              custom={0}
            >
              {/* Fila: línea + círculos encima */}
              <div className="relative grid grid-cols-4 gap-6 pb-8">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-kreoon-border/60" />
                <motion.div
                  key={`line-${perspective}`}
                  className={cn(
                    "absolute left-0 right-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full",
                    perspective === "agency"
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : "bg-gradient-to-r from-kreoon-purple-500 to-kreoon-purple-400",
                  )}
                  initial={{ scaleX: 0 }}
                  animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  style={{ transformOrigin: "left center" }}
                />
                {steps.map((step) => (
                  <motion.div
                    key={`circle-${perspective}-${step.number}`}
                    variants={item}
                    className="relative z-10 flex justify-center"
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-kreoon-bg-primary text-sm font-bold",
                        perspective === "agency"
                          ? "border-amber-500/50 text-amber-400"
                          : "border-kreoon-purple-500/50 text-kreoon-purple-400",
                      )}
                    >
                      {step.number}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={`${perspective}-${step.number}`}
                      variants={item}
                      className="group relative flex flex-col items-center text-center"
                    >
                      <div
                        className={cn(
                          "flex flex-1 flex-col rounded-sm border bg-kreoon-bg-card/50 p-5 transition-all duration-300 hover:-translate-y-1",
                          perspective === "agency"
                            ? "border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                            : "border-kreoon-border hover:shadow-kreoon-glow",
                        )}
                      >
                        <div className="mb-3 flex items-center justify-center gap-2">
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              perspective === "agency"
                                ? "text-amber-400"
                                : "text-kreoon-purple-400",
                            )}
                          />
                          <h3 className="font-semibold text-white">
                            {step.title}
                          </h3>
                        </div>
                        <p className="mb-4 text-left text-sm text-kreoon-text-secondary">
                          {step.description}
                        </p>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="mt-auto"
                        >
                          <StepVisual type={step.visual} className="min-h-[80px]" />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Mobile: timeline vertical */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`mobile-${perspective}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden"
          >
            <motion.div
              variants={container}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="relative pl-8"
            >
              {/* Línea vertical */}
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 rounded-full bg-kreoon-border/60" />
              <motion.div
                key={`mobile-line-${perspective}`}
                className={cn(
                  "absolute left-[23px] top-6 w-0.5 rounded-full",
                  perspective === "agency"
                    ? "bg-gradient-to-b from-amber-500 to-amber-400"
                    : "bg-gradient-to-b from-kreoon-purple-500 to-kreoon-purple-400",
                )}
                initial={{ height: 0 }}
                animate={isInView ? { height: "100%" } : { height: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                style={{ transformOrigin: "center top" }}
              />

              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={`${perspective}-${step.number}-m`}
                    variants={item}
                    className="relative mb-8 last:mb-0"
                  >
                    <div
                      className={cn(
                        "absolute -left-8 top-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-kreoon-bg-primary text-sm font-bold",
                        perspective === "agency"
                          ? "border-amber-500/50 text-amber-400"
                          : "border-kreoon-purple-500/50 text-kreoon-purple-400",
                      )}
                    >
                      {step.number}
                    </div>
                    <div
                      className={cn(
                        "rounded-sm border bg-kreoon-bg-card/50 p-4 transition-all duration-300",
                        perspective === "agency"
                          ? "border-amber-500/20 active:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                          : "border-kreoon-border active:shadow-kreoon-glow",
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            perspective === "agency"
                              ? "text-amber-400"
                              : "text-kreoon-purple-400",
                          )}
                        />
                        <h3 className="font-semibold text-white">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mb-4 text-sm text-kreoon-text-secondary">
                        {step.description}
                      </p>
                      <StepVisual type={step.visual} className="min-h-[70px]" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
