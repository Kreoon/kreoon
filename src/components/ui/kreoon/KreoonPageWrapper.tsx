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
    const orbStyle: React.CSSProperties = {
      background:
        "radial-gradient(circle at 70% 30%, rgba(124, 58, 237, 0.4) 0%, rgba(168, 85, 247, 0.2) 40%, transparent 70%)",
      filter: "blur(60px)",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative min-h-screen bg-kreoon-bg-primary overflow-hidden",
          className,
        )}
        {...props}
      >
        {showGradientOrb ? (
          <div
            className="pointer-events-none absolute -top-1/2 -right-1/4 h-[120%] w-[80%] max-w-[800px] opacity-40"
            aria-hidden
            style={orbStyle}
          />
        ) : null}
        <div className="relative z-0">{children}</div>
      </div>
    );
  },
);

KreoonPageWrapper.displayName = "KreoonPageWrapper";

export { KreoonPageWrapper };
