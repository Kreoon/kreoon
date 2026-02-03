import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, ChevronDown, LayoutDashboard, Users, TrendingUp, CheckCircle } from "lucide-react";
import { KreoonBadge, KreoonButton } from "@/components/ui/kreoon";

export interface HeroSectionProps {
  onGetStarted: () => void;
  onWatchDemo?: () => void;
}

const scrollToNext = () => {
  const el = document.getElementById("features");
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

export function HeroSection({ onGetStarted, onWatchDemo }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative min-h-[90vh] overflow-hidden bg-kreoon-bg-primary pt-24 pb-16 md:min-h-screen md:pt-28 md:pb-24"
    >
      {/* Fondo: orbes y patrón */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        {/* Orbe grande superior derecha */}
        <div
          className="absolute -right-[20%] -top-[20%] h-[80vh] w-[80vw] max-w-[800px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.4) 0%, rgba(168, 85, 247, 0.15) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Orbe pequeño inferior izquierda */}
        <div
          className="absolute -bottom-[10%] -left-[10%] h-[40vh] w-[40vw] max-w-[400px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.35) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:gap-16 lg:gap-20 lg:px-8">
        {/* Columna izquierda - texto */}
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="mb-6"
          >
            <KreoonBadge variant="purple" size="md">
              🚀 La plataforma integral de contenido para LATAM
            </KreoonBadge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl"
          >
            <span className="text-white">Contenido que convierte, </span>
            <span
              className="bg-gradient-to-r from-kreoon-purple-400 via-kreoon-purple-300 to-kreoon-purple-400 bg-clip-text text-transparent"
              style={{
                backgroundSize: "200% auto",
                animation: "shimmer 3s linear infinite",
              }}
            >
              equipos que escalan
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-xl text-xl text-kreoon-text-secondary"
          >
            Desde creadores independientes hasta agencias con equipos completos. 
            Contenido, estrategia y gestión en una sola plataforma.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <KreoonButton
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              className="gap-2"
            >
              Comenzar gratis
              <ArrowRight className="h-5 w-5" />
            </KreoonButton>
            {onWatchDemo && (
              <KreoonButton
                variant="outline"
                size="lg"
                onClick={onWatchDemo}
                className="gap-2"
              >
                <Play className="h-5 w-5" />
                Ver demo
              </KreoonButton>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8 flex flex-wrap gap-6 text-sm text-kreoon-text-muted"
          >
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Para marcas y agencias
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Gestión de equipos creativos
            </span>
            <span className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 14 días de prueba gratis
            </span>
          </motion.div>
        </div>

        {/* Columna derecha - visual hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="relative flex min-h-[320px] items-center justify-center md:min-h-[420px]"
        >
          <div className="hero-3d-element relative w-full max-w-lg">
            {/* Glow detrás */}
            <div
              className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(124, 58, 237, 0.5) 0%, transparent 70%)",
              }}
            />

            {/* Card principal - Dashboard */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative rounded-2xl border border-kreoon-purple-500/30 bg-kreoon-bg-card/80 p-6 shadow-kreoon-glow-sm backdrop-blur-xl"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-kreoon-purple-500 to-kreoon-purple-700">
                  <LayoutDashboard className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">Dashboard de Agencia</p>
                  <p className="text-sm text-kreoon-text-secondary">
                    Gestión centralizada
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <div className="flex-1 rounded-lg bg-kreoon-bg-secondary/80 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-kreoon-purple-400">3</p>
                  <p className="text-xs text-kreoon-text-muted">campañas activas</p>
                </div>
                <div className="flex-1 rounded-lg bg-kreoon-bg-secondary/80 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-kreoon-purple-400">12</p>
                  <p className="text-xs text-kreoon-text-muted">creadores</p>
                </div>
                <div className="flex-1 rounded-lg bg-kreoon-bg-secondary/80 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-kreoon-purple-400">5</p>
                  <p className="text-xs text-kreoon-text-muted">clientes</p>
                </div>
              </div>
            </motion.div>

            {/* Card flotante 1 - Nuevo brief */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
              className="absolute -right-2 top-4 rounded-xl border border-kreoon-purple-500/25 bg-kreoon-bg-card/70 px-4 py-3 backdrop-blur-md md:right-8"
            >
              <p className="text-xs font-medium text-kreoon-text-secondary">
                Nuevo brief asignado
              </p>
              <p className="flex items-center gap-1 text-sm font-semibold text-white">
                <CheckCircle className="h-4 w-4 text-green-400" />
                Listo para revisar
              </p>
            </motion.div>

            {/* Card flotante 2 - Equipo */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 3.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.6,
              }}
              className="absolute bottom-8 left-0 rounded-xl border border-kreoon-purple-500/25 bg-kreoon-bg-card/70 px-4 py-3 backdrop-blur-md md:left-4"
            >
              <p className="flex items-center gap-2 text-xs text-kreoon-text-secondary">
                <Users className="h-4 w-4 text-kreoon-purple-400" />
                Equipo activo
              </p>
              <p className="text-sm font-semibold text-white">8 creadores</p>
            </motion.div>

            {/* Card flotante 3 - Engagement */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.9,
              }}
              className="absolute -left-2 bottom-24 rounded-xl border border-kreoon-purple-500/25 bg-kreoon-bg-card/70 px-4 py-3 backdrop-blur-md md:bottom-32 md:left-8"
            >
              <p className="flex items-center gap-1.5 text-xs text-kreoon-text-secondary">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                Engagement
              </p>
              <p className="text-lg font-bold text-green-400">+45%</p>
            </motion.div>
            
            {/* Card flotante 4 - Campaña aprobada */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.2,
              }}
              className="absolute -right-4 bottom-16 rounded-xl border border-green-500/30 bg-kreoon-bg-card/70 px-4 py-2.5 backdrop-blur-md md:right-4"
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
                <CheckCircle className="h-4 w-4" />
                Campaña aprobada
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <button
          type="button"
          onClick={scrollToNext}
          aria-label="Descubre más"
          className="flex flex-col items-center gap-1 text-kreoon-text-muted transition-colors hover:text-kreoon-purple-400"
        >
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ChevronDown className="h-8 w-8" />
          </motion.span>
          <span className="text-xs">Descubre más</span>
        </button>
      </motion.div>

      {/* Keyframes para shimmer del título */}
      <style>{`
        @keyframes hero-shimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 200% center; }
        }
      `}</style>
    </section>
  );
}
