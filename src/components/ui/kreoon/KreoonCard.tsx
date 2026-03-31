import * as React from "react";
import { cn } from "@/lib/utils";

export interface KreoonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Contenido de la card */
  children: React.ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** Activa box-shadow púrpura (kreoon-glow) */
  glow?: boolean;
  /** Activa hover con más glow y scale 1.02 */
  hover?: boolean;
}

/**
 * Card base del Design System Kreoon.
 * Fondo oscuro, borde púrpura sutil, opcional glow y efecto glass.
 */
const KreoonCard = React.forwardRef<HTMLDivElement, KreoonCardProps>(
  ({ children, className, glow = false, hover = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-sm border border-kreoon-border bg-kreoon-bg-card/80",
          "transition-all duration-300 ease-out",
          glow && "shadow-kreoon-glow",
          hover && "hover:scale-[1.02]",
          hover && (glow ? "hover:shadow-kreoon-glow-lg" : "hover:shadow-kreoon-glow"),
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

KreoonCard.displayName = "KreoonCard";

export { KreoonCard };
