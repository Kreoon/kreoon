import * as React from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Building2, Sparkles, Users2, Calendar } from "lucide-react";
import { KreoonButton, KreoonCard } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export interface CTASectionProps {
  onGetStarted: () => void;
  onScheduleDemo?: () => void;
  onSelectSegment?: (segment: "brand" | "creator" | "agency") => void;
  showSegmentCards?: boolean;
}

const TRUST_ITEMS = [
  { icon: "🏢", label: "Agencias y marcas" },
  { icon: "👤", label: "Creadores verificados" },
  { icon: "🔒", label: "Pagos con escrow" },
  { icon: "🤖", label: "Herramientas IA incluidas" },
];

const SEGMENT_CARDS = [
  {
    id: "brand" as const,
    icon: Building2,
    title: "Soy Marca",
    description: "Encuentra creadores para tu contenido",
    cta: "Empezar gratis",
    gradient: "from-emerald-500 to-teal-500",
    glowColor: "rgba(16, 185, 129, 0.2)",
  },
  {
    id: "creator" as const,
    icon: Sparkles,
    title: "Soy Creador",
    description: "Monetiza tu talento con marcas reales",
    cta: "Unirme ahora",
    gradient: "from-kreoon-purple-500 to-kreoon-purple-700",
    glowColor: "rgba(124, 58, 237, 0.3)",
    featured: true,
  },
  {
    id: "agency" as const,
    icon: Users2,
    title: "Tengo Agencia",
    description: "Gestiona clientes y equipos",
    cta: "Ver planes de agencia",
    gradient: "from-amber-500 to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.2)",
  },
];

export function CTASection({
  onGetStarted,
  onScheduleDemo,
  onSelectSegment,
  showSegmentCards = true,
}: CTASectionProps) {
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  const handleScheduleDemo = () => {
    if (onScheduleDemo) {
      onScheduleDemo();
    } else {
      // Default: open Calendly or contact form
      window.open("https://calendly.com/kreoon/demo", "_blank");
    }
  };

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="relative py-20 md:py-28"
    >
      {/* Fondos decorativos */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
        aria-hidden
      >
        {/* Gradiente radial central */}
        <div
          className="absolute left-1/2 top-1/2 h-[120%] w-[120%] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, rgba(168, 85, 247, 0.1) 50%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* Orbes en esquinas */}
        <div
          className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        {/* Líneas radiantes desde el centro */}
        <div
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
          style={{
            background: `repeating-conic-gradient(
              from 0deg at 50% 50%,
              transparent 0deg,
              transparent 10deg,
              rgba(124, 58, 237, 0.5) 10deg,
              rgba(124, 58, 237, 0.5) 11deg
            )`,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-kreoon-purple-500/20 bg-kreoon-bg-card/40 px-6 py-12 shadow-kreoon-glow-sm sm:px-8 md:px-12 md:py-16 lg:px-16 lg:py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center"
          >
            {/* Visual arriba */}
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-kreoon-purple-500/30 bg-kreoon-purple-500/10 text-4xl shadow-kreoon-glow-sm">
              🚀
            </div>

            {/* Título */}
            <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              <span className="text-white">Únete al ecosistema de contenido </span>
              <span className="bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-300 bg-clip-text text-transparent">
                más completo de LATAM
              </span>
            </h2>

            {/* Subtítulo */}
            <p className="mx-auto mb-10 max-w-3xl text-lg text-kreoon-text-secondary sm:text-xl">
              Marcas, creadores y agencias de toda LATAM ya confían en Kreoon. Ya sea que
              crees contenido, lo necesites, o gestiones equipos creativos, hay un lugar para ti.
            </p>

            {/* Segment Cards (Opcional) */}
            {showSegmentCards && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-10 grid w-full gap-4 sm:grid-cols-3"
              >
                {SEGMENT_CARDS.map((segment, index) => {
                  const Icon = segment.icon;
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                    >
                      <KreoonCard
                        hover
                        className={cn(
                          "group flex h-full flex-col items-center p-5 text-center transition-all duration-300",
                          "border-kreoon-border hover:border-kreoon-purple-500/40",
                          segment.featured && "ring-1 ring-kreoon-purple-500/30",
                        )}
                        style={{
                          ["--glow-color" as string]: segment.glowColor,
                        }}
                      >
                        <div
                          className={cn(
                            "mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-gradient-to-br transition-shadow duration-300 group-hover:shadow-lg",
                            segment.gradient,
                          )}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="mb-1 font-semibold text-white">
                          {segment.title}
                        </h3>
                        <p className="mb-4 flex-1 text-sm text-kreoon-text-secondary">
                          {segment.description}
                        </p>
                        <KreoonButton
                          variant={segment.featured ? "primary" : "outline"}
                          size="sm"
                          className="w-full gap-1"
                          onClick={() => onSelectSegment?.(segment.id)}
                        >
                          {segment.cta}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </KreoonButton>
                      </KreoonCard>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Botones CTA principales */}
            <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              <motion.div
                animate={{ scale: [1, 1.02, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <KreoonButton
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  className="min-w-[200px] gap-2"
                >
                  Crear cuenta gratis
                  <ArrowRight className="h-4 w-4" />
                </KreoonButton>
              </motion.div>
              <KreoonButton
                variant="outline"
                size="lg"
                onClick={handleScheduleDemo}
                className="min-w-[200px] gap-2"
              >
                <Calendar className="h-4 w-4" />
                Agendar demo
              </KreoonButton>
            </div>

            {/* Link terciario para agencias */}
            <motion.a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("pricing");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-10 inline-flex items-center gap-1.5 text-sm text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300"
            >
              ¿Tienes una agencia? Conoce planes especiales
              <ArrowRight className="h-4 w-4" />
            </motion.a>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-4 text-sm text-kreoon-text-muted sm:gap-6"
            >
              {TRUST_ITEMS.map((item, index) => (
                <motion.span
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ delay: 0.7 + index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-lg" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
