import * as React from "react";
import { cn } from "@/lib/utils";

export type KreoonGlassIntensity = "light" | "medium" | "strong";

export interface KreoonGlassCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Contenido de la card */
  children: React.ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** Intensidad del glassmorphism: opacidad del fondo y blur */
  intensity?: KreoonGlassIntensity;
}

const intensityClasses: Record<KreoonGlassIntensity, string> = {
  light:
    "bg-kreoon-bg-card/30 backdrop-blur-sm border-white/5",
  medium:
    "bg-kreoon-bg-card/50 backdrop-blur-md border-kreoon-border",
  strong:
    "bg-kreoon-bg-card/70 backdrop-blur-xl border-kreoon-purple-400/20",
};

/**
 * Card con efecto glassmorphism del Design System Kreoon.
 * Borde con gradiente sutil; intensity controla opacidad y blur.
 */
const KreoonGlassCard = React.forwardRef<HTMLDivElement, KreoonGlassCardProps>(
  ({ children, className, intensity = "medium", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border",
          "bg-gradient-to-b from-white/[0.03] to-transparent",
          intensityClasses[intensity],
          "transition-all duration-200",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

KreoonGlassCard.displayName = "KreoonGlassCard";

export { KreoonGlassCard };
