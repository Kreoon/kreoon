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
    "bg-card border-border",
  medium:
    "bg-card border-border",
  strong:
    "bg-card border-border",
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
          "rounded-[0.125rem] border",
          intensityClasses[intensity],
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
