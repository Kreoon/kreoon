import * as React from "react";
import { motion } from "framer-motion";
import { KreoonPageWrapper } from "@/components/ui/kreoon";
import { TechGrid, TechParticles, TechOrb } from "@/components/ui/tech-effects";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps {
  /** Contenido principal (formulario de login, registro, etc.) */
  children: React.ReactNode;
  /** Muestra la columna izquierda con branding (logo, ilustración, texto). En false solo se renderiza la columna del formulario */
  showBranding?: boolean;
  /** Contenido personalizado para la columna izquierda (p. ej. branding de org). Si se pasa, reemplaza el branding por defecto. */
  leftColumnContent?: React.ReactNode;
  /** Clases adicionales para el contenedor principal */
  className?: string;
}

const leftColumnVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: 0.1 * i, ease: "easeOut" },
  }),
};

const rightColumnVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.15, ease: "easeOut" },
  },
};

/**
 * Layout visual para páginas de autenticación (login, registro, reset password).
 * Dos columnas en desktop: branding a la izquierda, formulario centrado a la derecha.
 * Una columna en mobile (solo formulario). Animaciones de entrada con framer-motion.
 */
export function AuthLayout({
  children,
  showBranding = true,
  leftColumnContent,
  className,
}: AuthLayoutProps) {
  return (
    <KreoonPageWrapper showGradientOrb={!showBranding} className={className}>
      <div className="relative z-0 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Columna izquierda: custom o branding por defecto */}
        {showBranding ? (
          <div className="relative hidden overflow-hidden lg:block">
            {leftColumnContent != null ? (
              leftColumnContent
            ) : (
              <>
                <div
                  className="absolute inset-0 bg-kreoon-gradient-dark"
                  aria-hidden
                />
                {/* Animated orbs replacing static gradient blobs */}
                <TechOrb size="lg" position="top-left" delay={0} />
                <TechOrb size="md" position="bottom-right" delay={1.5} />
                <TechOrb size="sm" position="center" delay={3} />
                {/* SVG grid overlay */}
                <TechGrid />
                {/* Floating particles */}
                <TechParticles count={15} />
                <div className="relative flex h-full min-h-screen flex-col p-8 lg:p-10">
                  <motion.div
                    variants={leftColumnVariants}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="flex items-center gap-3"
                  >
                    <img
                      src="/favicon.png"
                      alt="KREOON"
                      className="h-10 w-10 rounded-lg object-cover shadow-kreoon-glow"
                    />
                    <span className="text-xl font-bold tracking-tight text-kreoon-text-primary">
                      KREOON
                    </span>
                  </motion.div>
                  <motion.div
                    variants={leftColumnVariants}
                    initial="hidden"
                    animate="visible"
                    custom={1}
                    className="flex flex-1 items-center justify-center"
                  >
                    <div
                      className={cn(
                        "flex flex-col items-center justify-center gap-4 rounded-2xl px-10 py-12",
                        "border border-kreoon-purple-400/20 bg-kreoon-bg-card/40 backdrop-blur-xl",
                        "shadow-kreoon-glow",
                      )}
                    >
                      <img
                        src="/favicon.png"
                        alt="KREOON"
                        className="h-20 w-20 rounded-2xl object-cover shadow-kreoon-glow"
                      />
                      <p className="text-sm font-medium text-kreoon-text-secondary tracking-wide">
                        El sistema operativo para creadores
                      </p>
                    </div>
                  </motion.div>
                  <motion.p
                    variants={leftColumnVariants}
                    initial="hidden"
                    animate="visible"
                    custom={2}
                    className="text-center text-lg font-medium tracking-wide text-kreoon-purple-400 lg:text-xl"
                    style={{
                      textShadow:
                        "0 0 10px rgba(124, 58, 237, 0.5), 0 0 20px rgba(124, 58, 237, 0.3)",
                    }}
                  >
                    Conecta. Crea. Crece.
                  </motion.p>
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* Columna derecha: formulario */}
        <motion.div
          variants={rightColumnVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "flex flex-col items-center justify-center p-8 lg:p-12",
            !showBranding && "lg:col-span-1",
          )}
        >
          <div className="w-full max-w-md mx-auto">{children}</div>
        </motion.div>
      </div>
    </KreoonPageWrapper>
  );
}

AuthLayout.displayName = "AuthLayout";
