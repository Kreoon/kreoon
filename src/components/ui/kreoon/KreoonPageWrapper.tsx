import * as React from "react";
import { cn } from "@/lib/utils";

export interface KreoonPageWrapperProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Muestra orbe decorativo con gradiente radial púrpura en esquina superior derecha */
  showGradientOrb?: boolean;
}

/**
 * Wrapper de página del Design System Kreoon.
 * Fondo oscuro full-height; opcional orbe de gradiente púrpura difuminado.
 */
const KreoonPageWrapper = React.forwardRef<HTMLDivElement, KreoonPageWrapperProps>(
  ({ children, className, showGradientOrb = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative min-h-screen bg-background overflow-hidden",
          className,
        )}
        {...props}
      >
        <div className="relative z-0">{children}</div>
      </div>
    );
  },
);

KreoonPageWrapper.displayName = "KreoonPageWrapper";

export { KreoonPageWrapper };
