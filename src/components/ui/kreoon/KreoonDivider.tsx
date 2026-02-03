import * as React from "react";
import { cn } from "@/lib/utils";

export interface KreoonDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  /** Añade efecto de brillo sutil en la línea */
  glow?: boolean;
}

/**
 * Divisor horizontal del Design System Kreoon.
 * Línea con gradiente púrpura que se desvanece en los extremos; opcional glow.
 */
const KreoonDivider = React.forwardRef<HTMLDivElement, KreoonDividerProps>(
  ({ className, glow = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn("relative h-px w-full", className)}
        {...props}
      >
        <div
          className={cn(
            "absolute inset-0 h-px w-full bg-gradient-to-r from-transparent via-kreoon-purple-500/60 to-transparent",
            glow && "shadow-[0_0_8px_rgba(124,58,237,0.4)]",
          )}
        />
      </div>
    );
  },
);

KreoonDivider.displayName = "KreoonDivider";

export { KreoonDivider };
