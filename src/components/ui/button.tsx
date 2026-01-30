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
          "bg-gradient-to-r from-[hsl(270,100%,55%)] to-[hsl(280,100%,55%)]",
          "text-white",
          "shadow-[0_0_25px_-5px_hsl(270,100%,60%,0.5)]",
          "hover:shadow-[0_0_35px_-5px_hsl(270,100%,60%,0.7)]",
          "hover:from-[hsl(270,100%,58%)] hover:to-[hsl(280,100%,58%)]",
          "active:scale-[0.98]",
          "border border-[hsl(270,100%,60%,0.3)]"
        ),
        destructive: "bg-[hsl(350,80%,50%)] text-white hover:bg-[hsl(350,80%,55%)] shadow-[0_0_20px_-5px_hsl(350,80%,50%,0.4)]",
        outline: cn(
          "border border-[hsl(270,100%,60%,0.3)] bg-transparent",
          "text-[hsl(270,100%,70%)]",
          "hover:bg-[hsl(270,100%,60%,0.1)]",
          "hover:border-[hsl(270,100%,60%,0.5)]",
          "hover:shadow-[0_0_20px_-5px_hsl(270,100%,60%,0.3)]"
        ),
        secondary: cn(
          "bg-[hsl(250,20%,8%)]",
          "text-[hsl(270,60%,75%)]",
          "border border-[hsl(270,100%,60%,0.15)]",
          "hover:bg-[hsl(250,20%,10%)]",
          "hover:border-[hsl(270,100%,60%,0.25)]"
        ),
        ghost: cn(
          "text-[hsl(270,30%,65%)]",
          "hover:bg-[hsl(270,100%,60%,0.08)]",
          "hover:text-[hsl(270,100%,75%)]"
        ),
        link: "text-[hsl(270,100%,70%)] underline-offset-4 hover:underline",
        glow: cn(
          "bg-gradient-to-r from-[hsl(270,100%,55%)] via-[hsl(275,100%,55%)] to-[hsl(280,100%,55%)]",
          "text-white",
          "shadow-[0_0_40px_-5px_hsl(270,100%,60%,0.6)]",
          "hover:shadow-[0_0_60px_-5px_hsl(270,100%,60%,0.8)]",
          "active:scale-[0.98]",
          "border border-[hsl(270,100%,60%,0.4)]"
        ),
        success: "bg-[hsl(270,80%,55%)] text-white hover:bg-[hsl(270,80%,60%)] shadow-[0_0_20px_-5px_hsl(270,80%,55%,0.4)]",
        tech: cn(
          "bg-[hsl(250,20%,6%)]",
          "text-[hsl(270,60%,75%)]",
          "border border-[hsl(270,100%,60%,0.15)]",
          "hover:bg-[hsl(250,20%,8%)]",
          "hover:border-[hsl(270,100%,60%,0.3)]",
          "hover:shadow-[0_0_20px_-8px_hsl(270,100%,60%,0.3)]",
          "backdrop-blur-xl"
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
