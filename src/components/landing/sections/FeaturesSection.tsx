import * as React from "react";
import { motion, useInView } from "framer-motion";
import {
  Sparkles,
  ShoppingBag,
  Award,
  ShieldCheck,
  Users,
  MessageCircle,
  TrendingUp,
  ArrowRight,
  Clock,
  Check,
} from "lucide-react";
import { KreoonSectionTitle, KreoonBadge, KreoonGlassCard, KreoonButton } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const MAIN_FEATURE = {
  badge: "Potenciado por IA",
  title: "Inteligencia Artificial Creativa",
  description:
    "Genera guiones, hooks y estrategias optimizadas automáticamente.",
  benefits: [
    "Generador de guiones persuasivos",
    "Análisis de tendencias en tiempo real",
    "Predicción de performance",
    "Sugerencias de mejora automáticas",
  ],
} as const;

interface SecondaryFeature {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  badge?: string;
  badgeVariant?: "purple" | "amber" | "blue";
  keyPoints?: string[];
  isComingSoon?: boolean;
  comingSoonCta?: string;
}

const SECONDARY_FEATURES: SecondaryFeature[] = [
  {
    id: "team-management",
    icon: Users,
    title: "Gestión de Equipos Creativos",
    description:
      "Organiza tu equipo, asigna proyectos y gestiona múltiples clientes desde un solo lugar.",
    gradient: "from-amber-500 to-orange-500",
    badge: "Para Agencias",
    badgeVariant: "amber",
    keyPoints: [
      "Roles y permisos personalizados",
      "Asignación de tareas",
      "Tracking de entregas",
      "Reportes por equipo",
    ],
  },
  {
    id: "marketing-strategy",
    icon: TrendingUp,
    title: "Estrategia de Marketing Integrada",
    description:
      "Conecta tu contenido con tu estrategia de tráfico y performance.",
    gradient: "from-blue-500 to-cyan-500",
    keyPoints: [
      "Integración con Meta Ads",
      "Tracking de conversiones",
      "Análisis de ROI por contenido",
      "Optimización basada en datos",
    ],
    isComingSoon: true,
    comingSoonCta: "Únete a la lista de espera",
  },
  {
    id: "rankings",
    icon: Award,
    title: "Rankings y Reputación",
    description:
      "Sistema de niveles e insignias que premia la excelencia.",
    gradient: "from-kreoon-purple-500 to-kreoon-purple-700",
  },
  {
    id: "payments",
    icon: ShieldCheck,
    title: "Pagos Escrow Seguros",
    description:
      "Tu dinero protegido hasta aprobar el contenido.",
    gradient: "from-emerald-500 to-teal-500",
    isComingSoon: true,
    comingSoonCta: "Únete a la lista de espera",
  },
  {
    id: "community",
    icon: MessageCircle,
    title: "Comunidad Activa",
    description:
      "Red interna para conectar, aprender y crecer juntos.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "live-shopping",
    icon: ShoppingBag,
    title: "Live Shopping",
    description:
      "Vende en tiempo real con creadores. Convierte audiencia en clientes al instante.",
    gradient: "from-kreoon-purple-500 to-kreoon-purple-700",
    isComingSoon: true,
    comingSoonCta: "Únete a la lista de espera",
  },
];

interface Integration {
  name: string;
  icon: string;
  isReady: boolean;
}

const INTEGRATIONS: Integration[] = [
  { name: "Meta Ads", icon: "📘", isReady: false },
  { name: "TikTok Ads", icon: "🎵", isReady: false },
  { name: "Google Ads", icon: "🔍", isReady: false },
  { name: "Shopify", icon: "🛒", isReady: false },
  { name: "WooCommerce", icon: "🛍️", isReady: false },
];

function scrollToMore() {
  const el = document.getElementById("how-it-works");
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function FeaturesSection() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const navigate = useNavigate();

  const handleJoinWaitlist = (feature: SecondaryFeature) => {
    const featureName = encodeURIComponent(feature.title);
    const featureDesc = encodeURIComponent(feature.description);
    navigate(`/coming-soon?feature=${featureName}&description=${featureDesc}`);
  };

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <KreoonSectionTitle
            title="Todo lo que necesitas para crear y escalar"
            subtitle="Herramientas para creadores, marcas y agencias con equipos"
            align="center"
          />
        </div>

        {/* Feature principal - 2 columnas (texto | visual) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center"
        >
          {/* Columna texto */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="order-2 lg:order-1"
          >
            <KreoonBadge variant="purple" size="md" className="mb-4">
              {MAIN_FEATURE.badge}
            </KreoonBadge>
            <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
              {MAIN_FEATURE.title}
            </h3>
            <p className="mb-6 text-kreoon-text-secondary">
              {MAIN_FEATURE.description}
            </p>
            <ul className="space-y-3">
              {MAIN_FEATURE.benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-2 text-sm text-kreoon-text-secondary"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-kreoon-purple-400" />
                  {benefit}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Columna visual - mockup IA */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="overflow-hidden rounded-sm border border-kreoon-border bg-kreoon-bg-card/60 p-6 shadow-kreoon-glow-sm backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-kreoon-purple-400" />
                <span className="text-sm font-medium text-kreoon-purple-400">
                  Asistente creativo
                </span>
              </div>
              <div className="mb-4 rounded-sm border border-kreoon-border bg-kreoon-bg-secondary/80 p-3">
                <p className="text-xs text-kreoon-text-muted">
                  Prompt
                </p>
                <p className="mt-1 text-sm text-white">
                  Genera un hook para un video de 15s sobre sostenibilidad...
                </p>
              </div>
              <div className="rounded-sm border border-kreoon-purple-500/30 bg-kreoon-purple-500/10 p-4">
                <p className="text-xs text-kreoon-purple-400">Resultado</p>
                <p className="mt-2 text-sm leading-relaxed text-kreoon-text-secondary">
                  &quot;¿Sabías que tu marca puede reducir su huella un 40%?
                  Te muestro cómo en 15 segundos...&quot;
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Grid de features secundarias - 2x3 */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.1, delayChildren: 0.2 },
            },
          }}
          className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SECONDARY_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <KreoonGlassCard
                  intensity="medium"
                  className={cn(
                    "group relative h-full border-kreoon-border p-6 transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-kreoon-glow-sm",
                    feature.isComingSoon
                      ? "border-dashed border-amber-500/30 opacity-90 hover:border-amber-500/50"
                      : "hover:border-kreoon-purple-400/50",
                  )}
                >
                  {/* Badge superior */}
                  {feature.badge && !feature.isComingSoon && (
                    <div className="absolute -top-2 right-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          feature.badgeVariant === "amber"
                            ? "bg-amber-500/20 text-amber-400"
                            : feature.badgeVariant === "blue"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-kreoon-purple-500/20 text-kreoon-purple-400",
                        )}
                      >
                        {feature.badge}
                      </span>
                    </div>
                  )}

                  {/* Badge "Próximamente" para Coming Soon */}
                  {feature.isComingSoon && (
                    <div className="absolute -top-2 right-4">
                      <motion.span
                        initial={{ scale: 0.95 }}
                        animate={{ scale: [0.95, 1.02, 0.95] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400"
                      >
                        <Clock className="h-3 w-3" />
                        Próximamente
                      </motion.span>
                    </div>
                  )}

                  {/* Icono */}
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br transition-shadow duration-300",
                      feature.gradient,
                      feature.isComingSoon
                        ? "opacity-70"
                        : "group-hover:shadow-[0_0_20px_rgba(124,58,237,0.3)]",
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Título y descripción */}
                  <h4 className="mb-2 font-bold text-white">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-kreoon-text-secondary">
                    {feature.description}
                  </p>

                  {/* Key Points expandibles (mostrar en hover) */}
                  {feature.keyPoints && feature.keyPoints.length > 0 && (
                    <div className="mt-4 hidden space-y-1.5 border-t border-kreoon-border/50 pt-4 group-hover:block">
                      {feature.keyPoints.map((point) => (
                        <p
                          key={point}
                          className="flex items-center gap-2 text-xs text-kreoon-text-muted"
                        >
                          <span className="h-1 w-1 shrink-0 rounded-full bg-kreoon-purple-400" />
                          {point}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* CTA para Coming Soon */}
                  {feature.isComingSoon && feature.comingSoonCta && (
                    <div className="mt-4 border-t border-amber-500/20 pt-4">
                      <button
                        onClick={() => handleJoinWaitlist(feature)}
                        className="flex w-full items-center justify-center gap-2 rounded-sm bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                      >
                        {feature.comingSoonCta}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <p className="mt-2 text-center text-xs text-kreoon-text-muted">
                        Estamos construyendo algo increíble. Sé el primero en probarlo.
                      </p>
                    </div>
                  )}
                </KreoonGlassCard>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Sección de Integraciones - Próximamente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.5 }}
          className="relative mb-12 rounded-sm border border-dashed border-amber-500/30 bg-kreoon-bg-card/40 p-6 opacity-90 md:p-8"
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <motion.span
              initial={{ scale: 0.95 }}
              animate={{ scale: [0.95, 1.02, 0.95] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400"
            >
              <Clock className="h-3 w-3" />
              Próximamente
            </motion.span>
          </div>
          <h4 className="mb-6 mt-2 text-center text-sm font-medium uppercase tracking-wider text-kreoon-text-muted">
            Integraciones disponibles y próximas
          </h4>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className={cn(
                  "flex items-center gap-2 rounded-sm border px-4 py-2.5 transition-colors",
                  integration.isReady
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-kreoon-border bg-kreoon-bg-secondary/30",
                )}
              >
                <span className="text-xl">{integration.icon}</span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    integration.isReady
                      ? "text-white"
                      : "text-kreoon-text-muted",
                  )}
                >
                  {integration.name}
                </span>
                {integration.isReady ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Clock className="h-4 w-4 text-kreoon-text-muted" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center"
        >
          <KreoonButton
            variant="secondary"
            size="lg"
            onClick={scrollToMore}
            className="gap-2"
          >
            Descubre cómo funciona
            <ArrowRight className="h-5 w-5" />
          </KreoonButton>
        </motion.div>
      </div>
    </section>
  );
}
