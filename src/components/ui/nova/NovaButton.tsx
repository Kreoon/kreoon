import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface NovaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  glow?: boolean;
  asChild?: boolean;
}

/**
 * NovaButton - Botón con estilo Nova premium
 *
 * Variantes:
 * - primary: Gradiente púrpura→cyan con glow
 * - secondary: Fondo sólido elevated
 * - ghost: Transparente con hover
 * - outline: Borde con transparente
 * - danger: Rojo destructivo
 *
 * @example
 * <NovaButton variant="primary" glow>
 *   Continuar <ArrowRight className="ml-2 h-4 w-4" />
 * </NovaButton>
 */
const NovaButton = React.forwardRef<HTMLButtonElement, NovaButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      glow = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          "relative inline-flex items-center justify-center",
          "font-medium transition-all duration-200",
          "focus-visible:outline-none nova-focus-ring",
          "disabled:pointer-events-none disabled:opacity-50",

          // Size variants (bordes sutilmente redondeados)
          size === "sm" && "h-9 px-4 text-sm rounded-sm gap-1.5",
          size === "md" && "h-11 px-6 text-sm rounded-sm gap-2",
          size === "lg" && "h-13 px-8 text-base rounded-sm gap-2",
          size === "icon" && "h-10 w-10 rounded-sm",

          // Color variants
          variant === "primary" && [
            "bg-gradient-to-r from-[var(--nova-accent-primary)] to-[var(--nova-accent-secondary)]",
            "text-[var(--nova-text-bright)]",
            "shadow-[var(--nova-shadow-glow)]",
            "hover:shadow-[var(--nova-shadow-glow-intense)]",
            "hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-[0.98]",
          ],
          variant === "secondary" && [
            "bg-[var(--nova-bg-elevated)]",
            "text-[var(--nova-text-primary)]",
            "border border-[var(--nova-border-default)]",
            "hover:bg-[var(--nova-bg-hover)]",
            "hover:border-[var(--nova-border-accent)]",
          ],
          variant === "ghost" && [
            "bg-transparent",
            "text-[var(--nova-text-secondary)]",
            "hover:bg-[var(--nova-bg-elevated)]",
            "hover:text-[var(--nova-text-primary)]",
          ],
          variant === "outline" && [
            "bg-transparent",
            "text-[var(--nova-accent-primary)]",
            "border border-[var(--nova-border-accent)]",
            "hover:bg-[rgba(139,92,246,0.1)]",
            "hover:border-[var(--nova-accent-primary)]",
          ],
          variant === "danger" && [
            "bg-[var(--nova-error)]",
            "text-white",
            "hover:bg-[#dc2626]",
            "shadow-[0_0_20px_rgba(239,68,68,0.2)]",
            "hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]",
          ],

          // Glow on primary variant
          glow && variant === "primary" && "nova-animate-glow-pulse",

          className
        )}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </Comp>
    );
  }
);
NovaButton.displayName = "NovaButton";

export { NovaButton };
export type { NovaButtonProps };
