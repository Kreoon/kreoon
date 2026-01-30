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
        "rounded-2xl backdrop-blur-xl",
        "bg-gradient-to-br from-[hsl(250,20%,6%)] via-[hsl(250,20%,5%)] to-[hsl(250,20%,4%)]",
        "border border-[hsl(270,100%,60%,0.12)]",
        "shadow-[0_0_40px_-15px_hsl(270,100%,60%,0.15)]",
        "transition-all duration-500",
        "hover:border-[hsl(270,100%,60%,0.25)]",
        "hover:shadow-[0_0_60px_-15px_hsl(270,100%,60%,0.25)]"
      ),
      glass: cn(
        "rounded-2xl backdrop-blur-2xl",
        "bg-[hsl(250,20%,5%,0.7)]",
        "border border-[hsl(0,0%,100%,0.04)]",
        "shadow-[0_8px_32px_hsl(0,0%,0%,0.4)]",
        "transition-all duration-500",
        "hover:bg-[hsl(250,20%,6%,0.8)]",
        "hover:border-[hsl(270,100%,60%,0.15)]"
      ),
      glow: cn(
        "rounded-2xl backdrop-blur-xl",
        "bg-gradient-to-br from-[hsl(250,20%,7%)] to-[hsl(250,20%,4%)]",
        "border border-[hsl(270,100%,60%,0.2)]",
        "shadow-[0_0_50px_-10px_hsl(270,100%,60%,0.25)]",
        "transition-all duration-500",
        "hover:border-[hsl(270,100%,60%,0.35)]",
        "hover:shadow-[0_0_70px_-10px_hsl(270,100%,60%,0.4)]"
      ),
      gradient: cn(
        "rounded-2xl backdrop-blur-xl",
        "bg-gradient-to-br from-[hsl(270,100%,60%,0.08)] via-[hsl(250,20%,5%)] to-[hsl(250,20%,4%)]",
        "border border-[hsl(270,100%,60%,0.15)]",
        "shadow-lg",
        "transition-all duration-500",
        "hover:from-[hsl(270,100%,60%,0.12)]"
      ),
      neon: cn(
        "rounded-2xl backdrop-blur-xl",
        "bg-[hsl(250,20%,5%)]",
        "border-2 border-[hsl(270,100%,60%,0.35)]",
        "shadow-[0_0_30px_-5px_hsl(270,100%,60%,0.35),inset_0_1px_0_hsl(270,100%,60%,0.1)]",
        "transition-all duration-500",
        "hover:border-[hsl(270,100%,60%,0.5)]",
        "hover:shadow-[0_0_50px_-5px_hsl(270,100%,60%,0.5)]"
      ),
      subtle: cn(
        "rounded-2xl",
        "bg-[hsl(250,20%,5%,0.5)]",
        "border border-[hsl(250,15%,12%)]",
        "transition-all duration-300",
        "hover:bg-[hsl(250,20%,6%,0.6)]",
        "hover:border-[hsl(270,100%,60%,0.1)]"
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
      "text-xl font-semibold leading-none tracking-tight text-white",
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
    className={cn("text-sm text-[hsl(270,30%,60%)]", className)}
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
