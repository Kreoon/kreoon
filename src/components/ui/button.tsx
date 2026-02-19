import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(270,100%,60%,0.5)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary text-primary-foreground",
          "shadow-sm",
          "hover:bg-primary/90",
          "active:scale-[0.98]",
          "border border-primary/30"
        ),
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: cn(
          "border border-input bg-transparent",
          "text-foreground",
          "hover:bg-accent",
          "hover:text-accent-foreground",
          "hover:border-primary/40"
        ),
        secondary: cn(
          "bg-secondary",
          "text-secondary-foreground",
          "border border-border",
          "hover:bg-secondary/80"
        ),
        ghost: cn(
          "text-muted-foreground",
          "hover:bg-accent",
          "hover:text-accent-foreground"
        ),
        link: "text-primary underline-offset-4 hover:underline",
        glow: cn(
          "bg-primary text-primary-foreground",
          "shadow-md dark:shadow-[0_0_40px_-5px_hsl(270,100%,60%,0.6)]",
          "hover:bg-primary/90",
          "hover:shadow-lg dark:hover:shadow-[0_0_60px_-5px_hsl(270,100%,60%,0.8)]",
          "active:scale-[0.98]",
          "border border-primary/40"
        ),
        success: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        tech: cn(
          "bg-card",
          "text-secondary-foreground",
          "border border-border",
          "hover:bg-muted",
          "hover:border-primary/20"
        ),
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
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
