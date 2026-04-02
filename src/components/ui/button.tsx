import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(270,100%,60%,0.5)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary text-primary-foreground font-mono uppercase tracking-widest text-xs",
          "hover:bg-primary/90 hover:shadow-[0_0_15px_var(--shadow-neon)]",
          "active:scale-[0.98]",
          "border border-primary-foreground/20"
        ),
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: cn(
          "border border-border bg-transparent font-mono uppercase tracking-widest text-xs",
          "text-foreground",
          "hover:bg-accent hover:text-accent-foreground",
          "active:scale-[0.98]"
        ),
        secondary: cn(
          "bg-secondary",
          "text-secondary-foreground",
          "border border-border",
          "hover:bg-secondary/80 active:scale-[0.98]"
        ),
        ghost: cn(
          "text-muted-foreground font-mono uppercase tracking-widest text-xs",
          "hover:bg-accent hover:text-foreground",
          "active:scale-[0.98]"
        ),
        link: "text-primary underline-offset-4 hover:underline",
        glow: cn(
          "bg-primary text-primary-foreground font-mono uppercase tracking-widest text-xs",
          "shadow-[0_0_20px_hsl(270,100%,60%,0.4)]",
          "hover:bg-primary/90 hover:shadow-[0_0_40px_hsl(270,100%,60%,0.6)]",
          "active:scale-[0.98]",
          "border border-primary/40"
        ),
        success: "bg-success text-success-foreground hover:bg-success/90",
        tech: cn(
          "bg-card font-mono text-xs uppercase tracking-widest",
          "text-foreground",
          "border border-border",
          "hover:bg-accent hover:border-primary/40",
          "active:scale-[0.98]"
        ),
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10 flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
