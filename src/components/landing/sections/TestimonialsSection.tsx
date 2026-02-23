import * as React from "react";
import { motion, useInView } from "framer-motion";
import { Quote, ChevronLeft, ChevronRight, User } from "lucide-react";
import { KreoonSectionTitle, KreoonGlassCard, KreoonButton } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";

export type TestimonialRole = "Creador" | "Marca" | "Editor" | "Agencia" | "Equipo";

export interface Testimonial {
  id: string;
  name: string;
  role: TestimonialRole;
  company?: string;
  avatar?: string;
  quote: string;
  metric?: { label: string; value: string };
}

export interface TestimonialsSectionProps {
  testimonials?: Testimonial[];
}

const MOCK_TESTIMONIALS: Testimonial[] = [
  // Marcas
  {
    id: "brand-1",
    name: "María González",
    role: "Marca",
    company: "TechStartup",
    quote:
      "Kreoon nos permitió escalar nuestra producción de contenido 10x sin aumentar el equipo.",
    metric: { label: "Aumento en ventas", value: "+340%" },
  },
  {
    id: "brand-2",
    name: "Diego Fernández",
    role: "Marca",
    company: "E-commerce LATAM",
    quote:
      "La IA creativa nos ahorra horas de briefs. Los guiones que genera están listos para producción.",
    metric: { label: "Tiempo ahorrado", value: "60%" },
  },
  // Creadores
  {
    id: "creator-1",
    name: "Carlos Mendoza",
    role: "Creador",
    company: "Creador UGC",
    quote:
      "En 3 meses pasé de 0 a $2,000 mensuales creando contenido para marcas increíbles.",
    metric: { label: "Ingresos mensuales", value: "$2,000/mes" },
  },
  {
    id: "creator-2",
    name: "Laura Vega",
    role: "Creador",
    company: "Content Creator",
    quote:
      "La comunidad y el sistema de reputación me ayudaron a conectar con marcas que encajan con mi estilo.",
    metric: { label: "Campañas cerradas", value: "+48" },
  },
  // Editores
  {
    id: "editor-1",
    name: "Ana Ruiz",
    role: "Editor",
    company: "Editora de Video",
    quote:
      "Finalmente encontré un flujo constante de proyectos con clientes que valoran mi trabajo.",
    metric: { label: "Proyectos al mes", value: "15 proyectos/mes" },
  },
  {
    id: "editor-2",
    name: "Pablo Soto",
    role: "Editor",
    company: "Postproducción",
    quote:
      "Pagos seguros y entregas claras. Kreoon profesionalizó cómo trabajo con creadores.",
    metric: { label: "Clientes recurrentes", value: "12" },
  },
  // Agencias (NUEVOS)
  {
    id: "agency-1",
    name: "Roberto Sánchez",
    role: "Agencia",
    company: "Agencia Creativa MKT",
    quote:
      "Antes gestionábamos el contenido de 3 clientes con dificultad. Con Kreoon manejamos 12 clientes con el mismo equipo. El panel multi-cliente cambió todo.",
    metric: { label: "Clientes gestionados", value: "4x más" },
  },
  {
    id: "agency-2",
    name: "Laura Mejía",
    role: "Agencia",
    company: "Digital Growth Co",
    quote:
      "La integración entre contenido y estrategia de tráfico es exactamente lo que necesitábamos. Ahora vemos qué contenido realmente convierte.",
    metric: { label: "Mejora en ROAS", value: "+85%" },
  },
  // Equipos internos (NUEVO)
  {
    id: "team-1",
    name: "Andrés Gómez",
    role: "Equipo",
    company: "TechStartup CO",
    quote:
      "Mi equipo de 4 personas ahora produce el contenido que antes requería una agencia externa. Los workflows de aprobación nos ahorraron horas de emails.",
    metric: { label: "Ahorro mensual", value: "$3,500 USD" },
  },
];

interface RoleBadgeConfig {
  bg: string;
  text: string;
  border: string;
}

const ROLE_BADGE_STYLES: Record<TestimonialRole, RoleBadgeConfig> = {
  Creador: {
    bg: "bg-kreoon-purple-500/20",
    text: "text-kreoon-purple-400",
    border: "border-kreoon-purple-500/30",
  },
  Marca: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  Editor: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  Agencia: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  Equipo: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
};

function RoleBadge({ role }: { role: TestimonialRole }) {
  const styles = ROLE_BADGE_STYLES[role];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles.bg,
        styles.text,
        styles.border,
      )}
    >
      {role}
    </span>
  );
}

function useCarousel(length: number) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [cardsVisible, setCardsVisible] = React.useState(3);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    const update = () => {
      setCardsVisible(window.innerWidth >= 1024 ? 3 : 1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, length - cardsVisible);
  const goNext = React.useCallback(() => {
    setCurrentIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);
  const goPrev = React.useCallback(() => {
    setCurrentIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);
  const goTo = React.useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
    },
    [maxIndex],
  );

  return { currentIndex, cardsVisible, maxIndex, goNext, goPrev, goTo, isPaused, setIsPaused };
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <KreoonGlassCard
      intensity="medium"
      className="flex h-full flex-col border-kreoon-border p-6 transition-all duration-300 hover:border-kreoon-purple-400/30"
    >
      <Quote className="mb-4 h-8 w-8 shrink-0 text-kreoon-purple-500/50" />
      <p className="mb-4 line-clamp-4 flex-1 text-lg italic leading-relaxed text-white">
        &quot;{testimonial.quote}&quot;
      </p>
      <div className="mb-4 h-px w-full bg-kreoon-border/60" aria-hidden />
      <div className="flex items-center gap-3">
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kreoon-bg-secondary text-kreoon-text-muted">
            <User className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{testimonial.name}</p>
          <p className="truncate text-sm text-kreoon-text-secondary">
            {testimonial.company}
          </p>
        </div>
        <RoleBadge role={testimonial.role} />
      </div>
      {testimonial.metric && (
        <div className="mt-4 rounded-lg border border-kreoon-purple-500/20 bg-kreoon-purple-500/10 p-3">
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-kreoon-purple-400 to-kreoon-purple-300">
            {testimonial.metric.value}
          </p>
          <p className="text-xs text-kreoon-text-muted">
            {testimonial.metric.label}
          </p>
        </div>
      )}
    </KreoonGlassCard>
  );
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const list = testimonials?.length ? testimonials : MOCK_TESTIMONIALS;

  // Don't render if no testimonials provided and we shouldn't show mocks
  if (testimonials && testimonials.length === 0) return null;
  const sectionRef = React.useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const {
    currentIndex,
    cardsVisible,
    maxIndex,
    goNext,
    goPrev,
    goTo,
    isPaused,
    setIsPaused,
  } = useCarousel(list.length);

  React.useEffect(() => {
    if (maxIndex <= 0 || isPaused) return;
    const t = setInterval(goNext, 5000);
    return () => clearInterval(t);
  }, [goNext, maxIndex, isPaused]);

  const innerWidthPercent = list.length > 0 ? (list.length / cardsVisible) * 100 : 100;
  const translatePercent = list.length > 0 ? currentIndex * (100 / list.length) : 0;

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-12 md:mb-16">
          <KreoonSectionTitle
            title="Lo que dicen nuestros usuarios"
            subtitle="Historias reales de marcas, creadores, agencias y equipos que crecen con Kreoon"
            align="center"
          />
        </div>

        {/* Filter by role (opcional) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-wrap items-center justify-center gap-2"
        >
          {(["Marca", "Creador", "Editor", "Agencia", "Equipo"] as TestimonialRole[]).map(
            (role) => {
              const count = list.filter((t) => t.role === role).length;
              if (count === 0) return null;
              return (
                <div key={role} className="flex items-center gap-1.5">
                  <RoleBadge role={role} />
                  <span className="text-xs text-kreoon-text-muted">({count})</span>
                </div>
              );
            },
          )}
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="group/carousel relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-500 ease-out"
              style={{
                width: `${innerWidthPercent}%`,
                transform: `translateX(-${translatePercent}%)`,
              }}
            >
              {list.map((t) => (
                <div
                  key={t.id}
                  className="shrink-0"
                  style={{ width: `${100 / list.length}%` }}
                >
                  <div className="h-full">
                    <TestimonialCard testimonial={t} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flechas - desktop */}
          {maxIndex > 0 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={goPrev}
                className="absolute -left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-kreoon-border bg-kreoon-bg-card/80 text-kreoon-text-secondary shadow-lg backdrop-blur-sm transition-colors hover:border-kreoon-purple-400/50 hover:text-white lg:flex"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={goNext}
                className="absolute -right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-kreoon-border bg-kreoon-bg-card/80 text-kreoon-text-secondary shadow-lg backdrop-blur-sm transition-colors hover:border-kreoon-purple-400/50 hover:text-white lg:flex"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Dots */}
          {maxIndex >= 0 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: maxIndex + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir a testimonio ${i + 1}`}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-200",
                    i === currentIndex
                      ? "w-6 bg-kreoon-purple-500"
                      : "w-2 border border-kreoon-border bg-transparent hover:border-kreoon-purple-400/50",
                  )}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 flex justify-center"
        >
          <KreoonButton variant="secondary" size="lg">
            Únete a la comunidad creativa
          </KreoonButton>
        </motion.div>
      </div>
    </section>
  );
}
