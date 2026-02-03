import * as React from "react";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { cn } from "@/lib/utils";

export interface ScrollProgressBarProps {
  /** Color o gradiente CSS (default: gradiente púrpura Kreoon) */
  color?: string;
  /** Altura en px (default: 3) */
  height?: number;
  /** Posición fija: top o bottom */
  position?: "top" | "bottom";
  className?: string;
}

const DEFAULT_GRADIENT =
  "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)";

/**
 * Barra de progreso de lectura fija en top o bottom.
 * El ancho refleja el porcentaje de scroll; transición suave.
 */
export function ScrollProgressBar({
  color,
  height = 3,
  position = "top",
  className,
}: ScrollProgressBarProps) {
  const progress = useScrollProgress();

  const style: React.CSSProperties = {
    height: `${height}px`,
    width: `${progress}%`,
    background: color ?? DEFAULT_GRADIENT,
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso de lectura"
      className={cn(
        "fixed left-0 right-0 z-[9998] overflow-hidden",
        position === "top" ? "top-0" : "bottom-0",
        className
      )}
    >
      <div
        className="h-full transition-[width] duration-150 ease-out"
        style={style}
      />
    </div>
  );
}

ScrollProgressBar.displayName = "ScrollProgressBar";
