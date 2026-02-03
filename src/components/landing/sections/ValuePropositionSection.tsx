import * as React from "react";
import { Building2, Sparkles, Palette, Users2, Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { KreoonSectionTitle, KreoonCard, KreoonButton } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export interface ValuePropositionSectionProps {
  onSelectSegment?: (segment: 'brand' | 'creator' | 'professional' | 'agency') => void;
}

const SEGMENTS = [
  {
    id: "brand",
    segment: "brand" as const,
    title: "Para Marcas",
    description:
      "Accede a contenido auténtico que convierte. Sin agencias intermediarias.",
    icon: Building2,
    gradient: "from-emerald-500 to-teal-500",
    glowClass:
      "hover:shadow-[0_0_40px_rgba(16,185,129,0.2)] hover:border-emerald-500/30",
    benefits: [
      "Red de creadores verificados",
      "Gestión de campañas simplificada",
      "Métricas de performance en tiempo real",
      "Contenido optimizado para conversión",
    ],
    buttonLabel: "Soy una marca",
  },
  {
    id: "creator",
    segment: "creator" as const,
    title: "Para Creadores",
    description:
      "Monetiza tu talento con marcas reales. Crece con cada proyecto.",
    icon: Sparkles,
    gradient: "from-kreoon-purple-500 to-kreoon-purple-700",
    glowClass:
      "hover:shadow-kreoon-glow-lg hover:border-kreoon-purple-400/40",
    benefits: [
      "Proyectos pagados de marcas top",
      "Sistema de reputación y ranking",
      "Herramientas de IA creativa",
      "Comunidad que te impulsa",
    ],
    buttonLabel: "Soy creador",
    featured: true,
  },
  {
    id: "professional",
    segment: "professional" as const,
    title: "Para Editores y Profesionales",
    description:
      "Conecta con creadores y marcas que necesitan tu talento técnico.",
    icon: Palette,
    gradient: "from-blue-500 to-cyan-500",
    glowClass:
      "hover:shadow-[0_0_40px_rgba(59,130,246,0.25)] hover:border-blue-500/30",
    benefits: [
      "Flujo constante de proyectos",
      "Portafolio público verificado",
      "Pagos seguros garantizados",
      "Especialización reconocida",
    ],
    buttonLabel: "Soy profesional",
  },
  {
    id: "agency",
    segment: "agency" as const,
    title: "Para Agencias y Equipos",
    description:
      "Gestiona tu equipo creativo, clientes y campañas desde una sola plataforma.",
    icon: Users2,
    gradient: "from-amber-500 to-orange-500",
    glowClass:
      "hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] hover:border-amber-500/30",
    benefits: [
      "Panel de control multi-cliente",
      "Gestión de equipos creativos internos",
      "Workflows de aprobación personalizados",
      "Reportes y analytics por cliente",
      "Estrategia de marketing y tráfico integrada",
    ],
    buttonLabel: "Tengo una agencia",
    badge: "Empresas",
    isNew: true,
  },
] as const;

export function ValuePropositionSection({
  onSelectSegment,
}: ValuePropositionSectionProps) {
  return (
    <section
      id="value-proposition"
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Header */}
        <div className="mb-12 md:mb-16">
          <KreoonSectionTitle
            title="Un ecosistema para todos"
            subtitle="Desde creadores independientes hasta agencias con equipos completos"
            align="center"
          />
        </div>

        {/* Grid de 4 pilares */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {SEGMENTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              >
                <KreoonCard
                  glow
                  hover
                  className={cn(
                    "flex h-full flex-col border-kreoon-border p-6 transition-all duration-300",
                    item.glowClass,
                    item.featured && "lg:scale-[1.02]",
                  )}
                >
                  {/* Badge "Nuevo" o "Empresas" */}
                  {(item.isNew || item.badge) && (
                    <div className="mb-3 flex items-center gap-2">
                      {item.isNew && (
                        <motion.span
                          initial={{ scale: 0.9 }}
                          animate={{ scale: [0.9, 1.05, 1] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            repeatDelay: 2,
                          }}
                          className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-xs font-semibold text-white"
                        >
                          Nuevo
                        </motion.span>
                      )}
                      {item.badge && !item.isNew && (
                        <span className="inline-flex items-center rounded-full bg-kreoon-bg-secondary px-2.5 py-0.5 text-xs font-medium text-kreoon-text-secondary">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Icono */}
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
                      item.gradient,
                    )}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Título y descripción */}
                  <h3 className="mb-2 text-xl font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mb-6 text-sm text-kreoon-text-secondary">
                    {item.description}
                  </p>

                  {/* Lista de beneficios */}
                  <ul className="mb-6 flex-1 space-y-3">
                    {item.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2 text-sm text-kreoon-text-secondary"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Botón CTA */}
                  <KreoonButton
                    variant={item.featured ? "primary" : "outline"}
                    size="md"
                    className="w-full"
                    onClick={() => onSelectSegment?.(item.segment)}
                  >
                    {item.buttonLabel}
                  </KreoonButton>
                </KreoonCard>
              </motion.div>
            );
          })}
        </div>

        {/* Nota adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="mx-auto max-w-3xl text-sm text-kreoon-text-secondary">
            ¿Manejas campañas de marketing digital y tráfico? Kreoon integra la gestión de contenido con tu estrategia de performance.
          </p>
          <a
            href="#integrations"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-kreoon-purple-400 transition-colors hover:text-kreoon-purple-300"
          >
            Conoce más sobre nuestras integraciones
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
