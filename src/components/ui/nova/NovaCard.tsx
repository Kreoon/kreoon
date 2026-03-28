import * as React from "react";
import { cn } from "@/lib/utils";

interface NovaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "accent";
  glow?: boolean;
  borderGradient?: boolean;
  hover?: boolean;
}

/**
 * NovaCard - Card con estilo Nova premium
 *
 * Variantes:
 * - default: Fondo sólido surface
 * - glass: Glassmorphism con blur
 * - elevated: Fondo elevated más claro
 * - accent: Borde con color de acento
 *
 * @example
 * <NovaCard variant="glass" glow hover>
 *   <NovaCardHeader>
 *     <NovaCardTitle>Título</NovaCardTitle>
 *   </NovaCardHeader>
 *   <NovaCardContent>Contenido</NovaCardContent>
 * </NovaCard>
 */
const NovaCard = React.forwardRef<HTMLDivElement, NovaCardProps>(
  (
    {
      className,
      variant = "default",
      glow = false,
      borderGradient = false,
      hover = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles (bordes sutilmente redondeados)
          "rounded-sm border transition-all duration-200",
          // Variant styles
          variant === "default" && [
            "bg-[var(--nova-bg-surface)]",
            "border-[var(--nova-border-default)]",
          ],
          variant === "glass" && [
            "nova-glass",
          ],
          variant === "elevated" && [
            "bg-[var(--nova-bg-elevated)]",
            "border-[var(--nova-border-subtle)]",
          ],
          variant === "accent" && [
            "bg-[var(--nova-bg-surface)]",
            "border-[var(--nova-border-accent)]",
          ],
          // Glow effect
          glow && "nova-glow",
          // Border gradient
          borderGradient && "nova-border-gradient",
          // Hover effects
          hover && [
            "hover:border-[var(--nova-border-accent)]",
            "hover:shadow-[var(--nova-shadow-glow)]",
            "hover:-translate-y-0.5",
          ],
          className
        )}
        {...props}
      />
    );
  }
);
NovaCard.displayName = "NovaCard";

const NovaCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
NovaCardHeader.displayName = "NovaCardHeader";

const NovaCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      "text-[var(--nova-text-bright)]",
      "font-['Plus_Jakarta_Sans',_'Inter',_sans-serif]",
      className
    )}
    {...props}
  />
));
NovaCardTitle.displayName = "NovaCardTitle";

const NovaCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-[var(--nova-text-secondary)]",
      className
    )}
    {...props}
  />
));
NovaCardDescription.displayName = "NovaCardDescription";

const NovaCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
NovaCardContent.displayName = "NovaCardContent";

const NovaCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
NovaCardFooter.displayName = "NovaCardFooter";

export {
  NovaCard,
  NovaCardHeader,
  NovaCardTitle,
  NovaCardDescription,
  NovaCardContent,
  NovaCardFooter,
};
