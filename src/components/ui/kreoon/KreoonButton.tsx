import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type KreoonButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type KreoonButtonSize = "sm" | "md" | "lg";

export interface KreoonButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Contenido del botón */
  children: React.ReactNode;
  /** Estilo visual */
  variant?: KreoonButtonVariant;
  /** Tamaño del botón */
  size?: KreoonButtonSize;
  /** Muestra spinner y deshabilita interacción */
  loading?: boolean;
  /** Clases CSS adicionales */
  className?: string;
}

const sizeClasses: Record<KreoonButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
};

const variantClasses: Record<KreoonButtonVariant, string> = {
  primary:
    "bg-kreoon-gradient text-kreoon-text-primary font-medium shadow-kreoon-glow-sm hover:shadow-kreoon-glow active:scale-[0.98] border border-kreoon-border",
  secondary:
    "bg-kreoon-bg-secondary text-kreoon-text-primary border border-kreoon-border hover:bg-kreoon-bg-card hover:border-kreoon-purple-400/30 hover:shadow-kreoon-glow-sm active:scale-[0.98]",
  ghost:
    "bg-transparent text-kreoon-text-primary hover:bg-kreoon-purple-500/10 hover:text-kreoon-text-primary active:scale-[0.98]",
  outline:
    "bg-transparent text-kreoon-text-primary border border-kreoon-purple-500/50 hover:bg-kreoon-purple-500/10 hover:border-kreoon-purple-400 hover:shadow-kreoon-glow-sm active:scale-[0.98]",
};

/**
 * Botón base del Design System Kreoon.
 * Variantes: primary (gradiente + glow), secondary, ghost, outline.
 * Soporta loading con spinner y transiciones suaves.
 */
const KreoonButton = React.forwardRef<HTMLButtonElement, KreoonButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        onClick={loading ? undefined : onClick}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kreoon-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-kreoon-bg-primary",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          variantClasses[variant],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        ) : null}
        {children}
      </button>
    );
  },
);

KreoonButton.displayName = "KreoonButton";

export { KreoonButton };
