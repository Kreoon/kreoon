import * as React from "react";
import { cn } from "@/lib/utils";

export type KreoonBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "purple";

export type KreoonBadgeSize = "sm" | "md" | "lg";

export interface KreoonBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Contenido del badge */
  children: React.ReactNode;
  /** Estilo visual */
  variant?: KreoonBadgeVariant;
  /** Tamaño */
  size?: KreoonBadgeSize;
  /** Clases CSS adicionales */
  className?: string;
}

const sizeClasses: Record<KreoonBadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-sm",
};

const variantClasses: Record<KreoonBadgeVariant, string> = {
  default: [
    "bg-kreoon-purple-500/20 text-kreoon-purple-400",
    "border border-kreoon-purple-500/30",
  ].join(" "),
  purple: [
    "bg-kreoon-purple-500/25 text-kreoon-purple-400",
    "border border-kreoon-purple-400/40",
  ].join(" "),
  success: [
    "bg-emerald-500/20 text-emerald-400",
    "border border-emerald-500/30",
  ].join(" "),
  warning: [
    "bg-amber-500/20 text-amber-400",
    "border border-amber-500/30",
  ].join(" "),
  error: [
    "bg-red-500/20 text-red-400",
    "border border-red-500/30",
  ].join(" "),
};

/**
 * Badge base del Design System Kreoon.
 * Variantes: default (púrpura Kreoon), purple, success, warning, error.
 */
const KreoonBadge = React.forwardRef<HTMLSpanElement, KreoonBadgeProps>(
  ({ children, variant = "default", size = "md", className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium rounded-sm",
          "transition-colors duration-200",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

KreoonBadge.displayName = "KreoonBadge";

export { KreoonBadge };
