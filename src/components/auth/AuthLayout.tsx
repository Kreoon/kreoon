import * as React from "react";
import { motion } from "framer-motion";
import { KreoonPageWrapper } from "@/components/ui/kreoon";
import { cn } from "@/lib/utils";
import { useBranding } from "@/contexts/BrandingContext";

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
  const { branding } = useBranding();
  const logoUrl = branding.logo_url || '/favicon.png';
  const platformName = branding.platform_name || 'KREOON';

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
                <div
                  className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full opacity-30"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(124, 58, 237, 0.5) 0%, transparent 70%)",
                    filter: "blur(50px)",
                  }}
                  aria-hidden
                />
                <div
                  className="absolute bottom-1/3 right-1/4 h-48 w-48 rounded-full opacity-25"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)",
                    filter: "blur(40px)",
                  }}
                  aria-hidden
                />
                <div className="relative flex h-full min-h-screen flex-col p-8 lg:p-10">
                  <motion.div
                    variants={leftColumnVariants}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="flex items-center gap-3"
                  >
                    <img
                      src={logoUrl}
                      alt={platformName}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <span className="text-xl font-bold tracking-tight text-kreoon-text-primary">
                      {platformName}
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
                        "kreoon-3d-placeholder flex h-64 w-64 items-center justify-center rounded-2xl",
                        "border border-kreoon-border bg-kreoon-bg-card/30 backdrop-blur-sm",
                        "text-kreoon-text-muted text-sm",
                      )}
                    >
                      Ilustración
                    </div>
                  </motion.div>
                  <motion.p
                    variants={leftColumnVariants}
                    initial="hidden"
                    animate="visible"
                    custom={2}
                    className="text-center text-lg font-medium tracking-wide text-kreoon-purple-400 lg:text-xl"
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
