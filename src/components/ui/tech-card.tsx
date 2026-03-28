import * as React from "react";
import { cn } from "@/lib/utils";

interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "glow" | "gradient" | "neon" | "subtle";
  noBorder?: boolean;
}

const TechCard = React.forwardRef<HTMLDivElement, TechCardProps>(
  ({ className, variant = "default", noBorder = false, ...props }, ref) => {
    const variants = {
      default: cn(
        "rounded-sm",
        "bg-card text-card-foreground",
        "border border-border",
        "shadow-sm",
        "transition-all duration-300",
        "hover:border-primary/20",
        "hover:shadow-md"
      ),
      glass: cn(
        "rounded-sm backdrop-blur-2xl",
        "bg-card/70",
        "border border-border/50",
        "shadow-md",
        "transition-all duration-300",
        "hover:bg-card/80",
        "hover:border-primary/15"
      ),
      glow: cn(
        "rounded-sm",
        "bg-card text-card-foreground",
        "border border-primary/20",
        "shadow-md dark:shadow-[0_0_50px_-10px_hsl(270,100%,60%,0.25)]",
        "transition-all duration-300",
        "hover:border-primary/35",
        "hover:shadow-lg dark:hover:shadow-[0_0_70px_-10px_hsl(270,100%,60%,0.4)]"
      ),
      gradient: cn(
        "rounded-sm",
        "bg-gradient-to-br from-primary/5 via-card to-background",
        "border border-primary/15",
        "shadow-lg",
        "transition-all duration-300",
        "hover:from-primary/10"
      ),
      neon: cn(
        "rounded-sm",
        "bg-card text-card-foreground",
        "border-2 border-primary/35",
        "shadow-md dark:shadow-[0_0_30px_-5px_hsl(270,100%,60%,0.35)]",
        "transition-all duration-300",
        "hover:border-primary/50",
        "hover:shadow-lg dark:hover:shadow-[0_0_50px_-5px_hsl(270,100%,60%,0.5)]"
      ),
      subtle: cn(
        "rounded-sm",
        "bg-muted/50",
        "border border-border",
        "transition-all duration-300",
        "hover:bg-muted/70",
        "hover:border-primary/10"
      ),
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
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
      "text-xl font-semibold leading-none tracking-tight text-foreground",
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
