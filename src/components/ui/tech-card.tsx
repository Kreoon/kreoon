import * as React from "react";
import { cn } from "@/lib/utils";

interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glow" | "gradient" | "neon";
  glowColor?: "primary" | "success" | "warning" | "info" | "destructive";
  noBorder?: boolean;
}

const TechCard = React.forwardRef<HTMLDivElement, TechCardProps>(
  ({ className, variant = "default", glowColor = "primary", noBorder = false, ...props }, ref) => {
    const variants = {
      default: cn(
        "rounded-2xl bg-card/80 backdrop-blur-xl",
        "border border-border/40",
        "shadow-lg shadow-black/20",
        "transition-all duration-500",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
      ),
      glass: cn(
        "rounded-2xl backdrop-blur-2xl",
        "bg-gradient-to-br from-white/[0.03] to-white/[0.01]",
        "border border-white/[0.08]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        "transition-all duration-500",
        "hover:from-white/[0.05] hover:to-white/[0.02]",
        "hover:border-primary/20 hover:shadow-[0_8px_40px_rgba(140,0,255,0.15)]"
      ),
      glow: cn(
        "rounded-2xl bg-card/90 backdrop-blur-xl",
        "border border-primary/20",
        "shadow-[0_0_30px_-5px] shadow-primary/20",
        "transition-all duration-500",
        "hover:border-primary/40 hover:shadow-[0_0_50px_-5px] hover:shadow-primary/30"
      ),
      gradient: cn(
        "rounded-2xl backdrop-blur-xl",
        "bg-gradient-to-br from-card via-card to-primary/5",
        "border border-border/40",
        "shadow-lg shadow-black/30",
        "transition-all duration-500",
        "hover:from-card hover:via-card/95 hover:to-primary/10",
        "hover:border-primary/30 hover:shadow-primary/10"
      ),
      neon: cn(
        "rounded-2xl bg-card/95 backdrop-blur-xl",
        "border-2 border-primary/30",
        "shadow-[0_0_20px_-3px] shadow-primary/40",
        "[background-image:radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.1),transparent_50%)]",
        "transition-all duration-500",
        "hover:border-primary/50 hover:shadow-[0_0_40px_-5px] hover:shadow-primary/50"
      ),
    };

    const glowColors = {
      primary: "hover:shadow-primary/30 shadow-primary/20",
      success: "hover:shadow-success/30 shadow-success/20",
      warning: "hover:shadow-warning/30 shadow-warning/20",
      info: "hover:shadow-info/30 shadow-info/20",
      destructive: "hover:shadow-destructive/30 shadow-destructive/20",
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          variant === "glow" && glowColors[glowColor],
          noBorder && "border-0",
          className
        )}
        {...props}
      />
    );
  }
);
TechCard.displayName = "TechCard";

const TechCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
TechCardHeader.displayName = "TechCardHeader";

const TechCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      "bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text",
      className
    )}
    {...props}
  />
));
TechCardTitle.displayName = "TechCardTitle";

const TechCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
TechCardDescription.displayName = "TechCardDescription";

const TechCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
TechCardContent.displayName = "TechCardContent";

const TechCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
TechCardFooter.displayName = "TechCardFooter";

export {
  TechCard,
  TechCardHeader,
  TechCardFooter,
  TechCardTitle,
  TechCardDescription,
  TechCardContent,
};
